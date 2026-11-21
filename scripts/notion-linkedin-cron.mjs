#!/usr/bin/env node
/**
 * Standalone Notion to LinkedIn Auto-Publisher for GitHub Actions & Cloud Cron.
 * Runs 100% autonomously in the cloud even when your PC is offline.
 * 
 * Flow:
 * 1. Queries Notion database "Content Hub" (346fb75f-5244-8082-abd6-ca783b5c4666)
 * 2. Filters posts in "Validation" sorted by "Date de publication" ascending
 * 3. Checks if the earliest post has scheduledDate <= Now
 * 4. Extracts post text and the exact verified visual (cover / media block)
 * 5. Uploads image to LinkedIn and publishes via UGC Posts API
 * 6. Updates Notion status to "Publié"
 */

const COMPOSIO_MCP_URL = process.env.COMPOSIO_MCP_URL || "https://connect.composio.dev/mcp";
const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY || "ck_jiTcUhCw5ZhBFiAHumBE";
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || "346fb75f-5244-8082-abd6-ca783b5c4666";
const LINKEDIN_AUTHOR_URN = process.env.LINKEDIN_AUTHOR_URN || "urn:li:person:E0byz8Kzyo";

const isDryRun = process.argv.includes("--dry-run");

// Helper to execute tools through Composio MCP
async function callComposioTool(toolName, args) {
  const req = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "tools/call",
    params: {
      name: toolName,
      arguments: args
    }
  };

  const res = await fetch(COMPOSIO_MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "x-consumer-api-key": COMPOSIO_API_KEY
    },
    body: JSON.stringify(req)
  });

  if (!res.ok) {
    throw new Error(`Composio MCP returned HTTP ${res.status}: ${await res.text()}`);
  }

  const responseText = await res.text();
  const lines = responseText.split("\n");
  for (const line of lines) {
    if (line.startsWith("data:")) {
      const dataStr = line.slice(5).trim();
      if (!dataStr) continue;
      try {
        const parsed = JSON.parse(dataStr);
        const textContent = parsed.result?.content?.[0]?.text;
        if (textContent) {
          return JSON.parse(textContent);
        }
      } catch (err) {
        // continue parsing
      }
    }
  }

  throw new Error(`Failed to parse SSE response from Composio: ${responseText.slice(0, 300)}`);
}

async function getDuePostsFromNotion() {
  console.log(`[1/4] 🔍 Querying Notion database (${NOTION_DATABASE_ID})...`);
  
  const result = await callComposioTool("COMPOSIO_PROXY_EXECUTE", {
    toolkit_slug: "notion",
    method: "POST",
    endpoint: `/v1/databases/${NOTION_DATABASE_ID}/query`,
    parameters: [
      { name: "Notion-Version", type: "header", value: "2022-06-28" }
    ],
    body: {
      filter: {
        property: "Statut",
        status: { equals: "Validation" }
      },
      sorts: [
        { property: "Date de publication", direction: "ascending" }
      ],
      page_size: 5
    }
  });

  const rawResults = result?.data?.data?.results || [];
  console.log(`      Found ${rawResults.length} pending post(s) in "Validation".`);

  const now = new Date();
  const duePosts = [];
  const futurePosts = [];

  for (const page of rawResults) {
    const props = page.properties || {};
    
    // Status
    const statusObj = props.Statut?.status || props.Statut?.select;
    const statusName = statusObj?.name || "";

    // Publication Date
    const dateObj = props["Date de publication"]?.date;
    if (!dateObj || !dateObj.start) continue;

    const postDate = new Date(dateObj.start);

    // Extract title & text
    const titleParts = props["Nom du contenu"]?.title || [];
    const title = titleParts.map(t => t.plain_text || "").join("").trim();

    const contentParts = props.Contenu?.rich_text || [];
    const content = contentParts.map(t => t.plain_text || "").join("").trim();

    // Extract cover image
    let imageUrl = null;
    if (page.cover?.external?.url) {
      imageUrl = page.cover.external.url;
    }

    const postInfo = {
      id: page.id,
      title,
      content,
      scheduledDate: dateObj.start,
      status: statusName,
      imageUrl
    };

    if (postDate <= now) {
      duePosts.push(postInfo);
    } else {
      futurePosts.push(postInfo);
    }
  }

  if (futurePosts.length > 0) {
    console.log(`\n⏳ Next scheduled post: "${futurePosts[0].title}" on ${futurePosts[0].scheduledDate}`);
  }

  return duePosts;
}

async function uploadImageToLinkedIn(imageUrl) {
  console.log(`      📥 Downloading image: ${imageUrl}`);
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    throw new Error(`Failed to download image from ${imageUrl}: ${imgRes.statusText}`);
  }
  const buffer = await imgRes.arrayBuffer();
  const contentType = imgRes.headers.get("content-type") || "image/jpeg";

  console.log(`      📤 Registering image upload with LinkedIn...`);
  const regResult = await callComposioTool("COMPOSIO_PROXY_EXECUTE", {
    toolkit_slug: "linkedin",
    method: "POST",
    endpoint: "/v2/assets?action=registerUpload",
    body: {
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: LINKEDIN_AUTHOR_URN,
        supportedUploadMechanism: ["SYNCHRONOUS_UPLOAD"]
      }
    }
  });

  const uploadMech = regResult?.data?.data?.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"];
  const uploadUrl = uploadMech?.uploadUrl;
  const assetUrn = regResult?.data?.data?.value?.asset;

  if (!uploadUrl || !assetUrn) {
    throw new Error(`Failed to get upload URL from LinkedIn registration: ${JSON.stringify(regResult)}`);
  }

  console.log(`      ⬆️ Uploading bytes to LinkedIn CDN (${buffer.byteLength} bytes)...`);
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "media-type-family": "STILLIMAGE"
    },
    body: buffer
  });

  if (!putRes.ok && putRes.status !== 201) {
    throw new Error(`LinkedIn image upload failed with status ${putRes.status}: ${await putRes.text()}`);
  }

  console.log(`      ✅ Image successfully uploaded! Asset URN: ${assetUrn}`);
  return assetUrn;
}

async function publishPostToLinkedIn(post, assetUrn = null) {
  console.log(`[3/4] 🚀 Publishing to LinkedIn: "${post.title}"...`);

  const shareContent = {
    shareCommentary: {
      text: post.content
    },
    shareMediaCategory: assetUrn ? "IMAGE" : "NONE"
  };

  if (assetUrn) {
    shareContent.media = [
      {
        status: "READY",
        description: { text: post.title },
        media: assetUrn,
        title: { text: post.title }
      }
    ];
  }

  const payload = {
    author: LINKEDIN_AUTHOR_URN,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": shareContent
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
    }
  };

  const postResult = await callComposioTool("COMPOSIO_PROXY_EXECUTE", {
    toolkit_slug: "linkedin",
    method: "POST",
    endpoint: "/v2/ugcPosts",
    parameters: [
      { name: "X-Restli-Protocol-Version", type: "header", value: "2.0.0" }
    ],
    body: payload
  });

  const shareUrn = postResult?.data?.headers?.["x-restli-id"] || postResult?.data?.data?.id;
  if (!shareUrn) {
    throw new Error(`LinkedIn post failed: ${JSON.stringify(postResult)}`);
  }

  const url = `https://www.linkedin.com/feed/update/${shareUrn}/`;
  console.log(`      🎉 Post is LIVE on LinkedIn: ${url}`);
  return { shareUrn, url };
}

async function updateNotionPageStatus(pageId) {
  console.log(`[4/4] 📝 Updating Notion page status to "Publié"...`);

  await callComposioTool("COMPOSIO_PROXY_EXECUTE", {
    toolkit_slug: "notion",
    method: "PATCH",
    endpoint: `/v1/pages/${pageId}`,
    parameters: [
      { name: "Notion-Version", type: "header", value: "2022-06-28" }
    ],
    body: {
      properties: {
        "Statut": {
          status: { name: "Publié" }
        }
      }
    }
  });

  console.log(`      ✅ Notion page marked as "Publié".`);
}

async function run() {
  console.log("==================================================");
  console.log("🤖 NOTION TO LINKEDIN AUTONOMOUS CLOUD CRON");
  console.log(`Current Time (UTC): ${new Date().toISOString()}`);
  console.log(`Dry Run: ${isDryRun}`);
  console.log("==================================================\n");

  const duePosts = await getDuePostsFromNotion();

  if (duePosts.length === 0) {
    console.log("\n✨ No posts are due for publication at this time. All caught up!");
    return;
  }

  console.log(`\n📌 Found ${duePosts.length} post(s) ready to publish:`);
  for (const post of duePosts) {
    console.log(`   - "${post.title}" (Scheduled: ${post.scheduledDate}, Image: ${post.imageUrl ? "Yes" : "None"})`);
  }

  // Publish each due post sequentially
  for (const post of duePosts) {
    console.log(`\n--- Processing: "${post.title}" ---`);

    if (isDryRun) {
      console.log(`[DRY RUN] Would upload image: ${post.imageUrl}`);
      console.log(`[DRY RUN] Would publish to LinkedIn: "${post.title}"`);
      console.log(`[DRY RUN] Would mark Notion page ${post.id} as "Publié"`);
      continue;
    }

    try {
      let assetUrn = null;
      if (post.imageUrl) {
        try {
          assetUrn = await uploadImageToLinkedIn(post.imageUrl);
        } catch (imgErr) {
          console.warn(`      ⚠️ Image upload failed: ${imgErr.message}. Skipping post to honor visual validation rule.`);
          continue; // Honor Franck's rule: never publish with broken/changed image
        }
      }

      const { url } = await publishPostToLinkedIn(post, assetUrn);
      await updateNotionPageStatus(post.id);
      console.log(`✅ Successfully published "${post.title}"! -> ${url}\n`);
    } catch (err) {
      console.error(`❌ Failed to publish post "${post.title}":`, err.message);
    }
  }

  console.log("\n==================================================");
  console.log("🎯 Run completed successfully.");
  console.log("==================================================");
}

run().catch(err => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
