import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import {
  createLinkedInPost,
  getLinkedInPost,
  deleteLinkedInPost,
  listLinkedInPosts,
  addLinkedInComment,
} from "../api.js";
import { PostVisibility, ResponseFormat } from "../types.js";
import { convertMarkdownStylesToUnicode } from "../formatter.js";

export function registerPostTools(server: McpServer): void {
  server.registerTool(
    "linkedin_create_post",
    {
      title: "Create LinkedIn Post",
      description: `Publish a post immediately to LinkedIn.
Supports text content with Unicode formatting, article links, image attachments, or PDF document carousels.
Can be published either to personal profile or a company page by providing author_urn.

Examples:
- Standard text post: commentary="Excited to announce our new launch! 🚀 #Tech #Innovation"
- Post with link: commentary="Check out our latest research paper:" article_url="https://example.com/paper" article_title="State of AI 2026"
- Post with image: commentary="Infographic of our benchmark results:" media_urn="urn:li:image:C4D22AQF..."`,
      inputSchema: z.strictObject({
        commentary: z
          .string()
          .min(1)
          .max(3000)
          .describe("The text content of the post. Supports markdown **bold** and *italic* (automatically converted to Unicode). Max 3000 characters."),
        visibility: z
          .enum([PostVisibility.PUBLIC, PostVisibility.CONNECTIONS])
          .default(PostVisibility.PUBLIC)
          .describe("Audience visibility: 'PUBLIC' (anyone on LinkedIn) or 'CONNECTIONS' (1st-degree network only). Default: PUBLIC."),
        author_urn: z
          .string()
          .optional()
          .describe("Author URN, e.g. 'urn:li:person:12345' or company page 'urn:li:organization:67890'. Defaults to the authenticated user."),
        media_urn: z
          .string()
          .optional()
          .describe("URN of pre-uploaded media (image 'urn:li:image:...' or document 'urn:li:document:...'). Use linkedin_upload_image first."),
        article_url: z
          .string()
          .optional()
          .describe("URL of an external article or webpage to attach as preview card."),
        article_title: z
          .string()
          .optional()
          .describe("Custom preview title for the article card."),
        article_description: z
          .string()
          .optional()
          .describe("Custom preview description for the article card."),
        first_comment: z
          .string()
          .optional()
          .describe("Optional comment to publish immediately under the post (recommended for sharing links without triggering LinkedIn reach penalty)."),
        convert_markdown_formatting: z
          .boolean()
          .default(true)
          .describe("If true, automatically converts **bold** and *italic* markdown tags to Unicode styled text for LinkedIn."),
        response_format: z
          .enum([ResponseFormat.MARKDOWN, ResponseFormat.JSON])
          .default(ResponseFormat.MARKDOWN)
          .describe("'markdown' for readable output, 'json' for raw structured data"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (
      {
        commentary,
        visibility,
        author_urn,
        media_urn,
        article_url,
        article_title,
        article_description,
        first_comment,
        convert_markdown_formatting,
        response_format,
      },
      ctx
    ) => {
      const formattedCommentary = convert_markdown_formatting
        ? convertMarkdownStylesToUnicode(commentary)
        : commentary;

      const result = await createLinkedInPost({
        authorUrn: author_urn,
        commentary: formattedCommentary,
        visibility,
        mediaUrn: media_urn,
        article: article_url
          ? {
              source: article_url,
              title: article_title,
              description: article_description,
            }
          : undefined,
        signal: ctx.mcpReq.signal,
      });

      let firstCommentResult: { commentUrn?: string } | undefined;
      if (first_comment && result.postUrn) {
        try {
          firstCommentResult = await addLinkedInComment(
            result.postUrn,
            first_comment,
            author_urn,
            ctx.mcpReq.signal
          );
        } catch (commErr) {
          console.error("Failed to add first comment:", commErr);
        }
      }

      const structured = {
        success: true,
        postUrn: result.postUrn,
        postId: result.id,
        firstCommentUrn: firstCommentResult?.commentUrn,
        url: result.postUrn
          ? `https://www.linkedin.com/feed/update/${result.postUrn}`
          : undefined,
      };

      if (response_format === ResponseFormat.JSON) {
        return {
          content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
          structuredContent: structured,
        };
      }

      const lines = [
        "## ✅ LinkedIn Post Successfully Published!",
        `- **Post URN**: \`${result.postUrn}\``,
        `- **Direct Link**: ${structured.url || "Available on your LinkedIn feed"}`,
      ];
      if (firstCommentResult?.commentUrn) {
        lines.push(`- **First Comment**: Published (\`${firstCommentResult.commentUrn}\`)`);
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        structuredContent: structured,
      };
    }
  );

  server.registerTool(
    "linkedin_get_post",
    {
      title: "Get LinkedIn Post",
      description: "Retrieve post details and content for a given LinkedIn Post URN.",
      inputSchema: z.strictObject({
        post_urn: z
          .string()
          .describe("The URN of the LinkedIn post (e.g. 'urn:li:share:12345' or 'urn:li:ugcPost:12345' or 'urn:li:post:12345')."),
        response_format: z
          .enum([ResponseFormat.MARKDOWN, ResponseFormat.JSON])
          .default(ResponseFormat.MARKDOWN)
          .describe("'markdown' for human-readable output, 'json' for raw structured data"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ post_urn, response_format }, ctx) => {
      const data = await getLinkedInPost(post_urn, ctx.mcpReq.signal);

      if (response_format === ResponseFormat.JSON) {
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data,
        };
      }

      const lines = [
        `# LinkedIn Post: ${post_urn}`,
        `- **Author**: ${data.author || "Unknown"}`,
        `- **Lifecycle State**: ${data.lifecycleState || "N/A"}`,
        `- **Visibility**: ${data.visibility || "N/A"}`,
        "",
        "### Commentary",
        String(data.commentary || "No text content"),
      ];

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        structuredContent: data,
      };
    }
  );

  server.registerTool(
    "linkedin_delete_post",
    {
      title: "Delete LinkedIn Post",
      description: "Delete a post on LinkedIn by its Post URN.",
      inputSchema: z.strictObject({
        post_urn: z.string().describe("The URN of the LinkedIn post to delete."),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ post_urn }, ctx) => {
      await deleteLinkedInPost(post_urn, ctx.mcpReq.signal);
      return {
        content: [
          {
            type: "text",
            text: `Successfully deleted LinkedIn post with URN: \`${post_urn}\`.`,
          },
        ],
        structuredContent: { success: true, postUrn: post_urn },
      };
    }
  );

  server.registerTool(
    "linkedin_list_posts",
    {
      title: "List LinkedIn Posts",
      description: "List recent posts published by an author (personal profile or company page).",
      inputSchema: z.strictObject({
        author_urn: z
          .string()
          .optional()
          .describe("Author URN to list posts for. Defaults to the authenticated user."),
        count: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(10)
          .describe("Number of recent posts to retrieve (max 50)."),
        response_format: z
          .enum([ResponseFormat.MARKDOWN, ResponseFormat.JSON])
          .default(ResponseFormat.MARKDOWN)
          .describe("'markdown' for readable summary, 'json' for raw structured array"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ author_urn, count, response_format }, ctx) => {
      const posts = await listLinkedInPosts(author_urn, count, ctx.mcpReq.signal);

      if (response_format === ResponseFormat.JSON) {
        return {
          content: [{ type: "text", text: JSON.stringify(posts, null, 2) }],
          structuredContent: { count: posts.length, posts },
        };
      }

      if (posts.length === 0) {
        return {
          content: [{ type: "text", text: "No recent posts found for this author." }],
          structuredContent: { count: 0, posts: [] },
        };
      }

      const lines = [`# Recent LinkedIn Posts (${posts.length})`, ""];
      for (const p of posts) {
        const urn = p.id || p.urn || "N/A";
        const commentary = (p.commentary as string) || "(No commentary)";
        const snippet = commentary.length > 120 ? `${commentary.slice(0, 120)}...` : commentary;
        lines.push(`- **${urn}**`);
        lines.push(`  > ${snippet.replace(/\n/g, " ")}`);
        lines.push(`  State: ${p.lifecycleState || "PUBLISHED"} | Visibility: ${p.visibility || "PUBLIC"}`);
        lines.push("");
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        structuredContent: { count: posts.length, posts },
      };
    }
  );
}
