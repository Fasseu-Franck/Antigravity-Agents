/**
 * Publisher Engine
 * Dispatches due posts to active platforms and handles archiving & status updates.
 */

import fs from "node:fs";
import path from "node:path";
import { LinkedInClient } from "../platforms/linkedin/client.js";
import { FacebookClient } from "../platforms/facebook/client.js";
import { NotionSync } from "./notion-sync.js";

export class Publisher {
  constructor(profilePath) {
    this.profilePath = profilePath;
    this.profileConfig = JSON.parse(fs.readFileSync(path.join(profilePath, "profile.json"), "utf8"));
    this.linkedinClient = new LinkedInClient({
      authorUrn: this.profileConfig.platforms?.linkedin?.account_urn
    });
    this.facebookClient = new FacebookClient({
      pageId: this.profileConfig.platforms?.facebook?.page_id
    });
    this.notionSync = new NotionSync({
      databaseId: this.profileConfig.notion?.database_id
    });
  }

  async publishDuePosts(options = { dryRun: false }) {
    console.log(`[Publisher] Checking due posts for profile "${this.profileConfig.name}"... (dryRun: ${options.dryRun})`);

    const now = new Date();
    const platforms = ["linkedin", "facebook"];
    const results = [];

    for (const platform of platforms) {
      if (!this.profileConfig.platforms?.[platform]?.enabled) continue;

      const scheduledDir = path.join(this.profilePath, platform, "scheduled");
      const publishedDir = path.join(this.profilePath, platform, "published");
      if (!fs.existsSync(scheduledDir)) continue;
      if (!fs.existsSync(publishedDir)) fs.mkdirSync(publishedDir, { recursive: true });

      const files = fs.readdirSync(scheduledDir).filter(f => f.endsWith(".md"));

      for (const file of files) {
        const filePath = path.join(scheduledDir, file);
        const rawContent = fs.readFileSync(filePath, "utf8");

        // Parse date from frontmatter
        const dateMatch = rawContent.match(/date:\s*"([^"]+)"/);
        const titleMatch = rawContent.match(/title:\s*"([^"]+)"/);
        const title = titleMatch ? titleMatch[1] : file;

        if (dateMatch) {
          const postDate = new Date(dateMatch[1]);
          if (postDate <= now) {
            console.log(`[Publisher] Post is DUE: "${title}" (${platform}) - scheduled for ${dateMatch[1]}`);

            // Extract post body (below second '---')
            const bodyParts = rawContent.split("---");
            const postBody = bodyParts.slice(2).join("---").trim();

            if (options.dryRun) {
              console.log(`  [DRY RUN] Would publish to ${platform}: "${title}"`);
              results.push({ file, platform, status: "dry-run", title });
              continue;
            }

            // Actual publishing
            let pubResult;
            if (platform === "linkedin") {
              pubResult = await this.linkedinClient.publishPost(postBody);
            } else if (platform === "facebook") {
              pubResult = await this.facebookClient.publishPost(postBody);
            }

            if (pubResult && pubResult.success) {
              console.log(`  -> SUCCESS! Published to ${platform}: ${pubResult.url}`);
              // Move file to published
              const targetPath = path.join(publishedDir, file);
              fs.renameSync(filePath, targetPath);

              // Update history
              const historyPath = path.join(publishedDir, "history.json");
              const history = fs.existsSync(historyPath) ? JSON.parse(fs.readFileSync(historyPath, "utf8")) : [];
              history.push({
                file,
                title,
                platform,
                publishedAt: new Date().toISOString(),
                url: pubResult.url,
                urn: pubResult.postUrn || pubResult.postId
              });
              fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), "utf8");

              results.push({ file, platform, status: "published", url: pubResult.url });
            } else {
              console.error(`  -> ERROR publishing "${title}" to ${platform}:`, pubResult?.error || pubResult?.raw);
              results.push({ file, platform, status: "failed", error: pubResult?.error });
            }
          }
        }
      }
    }

    return results;
  }
}
