import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { addLinkedInComment, getLinkedInPostMetrics } from "../api.js";
import { ResponseFormat } from "../types.js";

export function registerEngagementTools(server: McpServer): void {
  server.registerTool(
    "linkedin_add_comment",
    {
      title: "Add Comment to LinkedIn Post",
      description: `Add a comment to any LinkedIn post.
Useful for sharing additional resources, external links ("lien en premier commentaire"), or responding to community interactions.`,
      inputSchema: z.strictObject({
        post_urn: z
          .string()
          .min(1)
          .describe("The target LinkedIn Post URN (e.g. 'urn:li:share:12345' or 'urn:li:ugcPost:12345')."),
        comment_text: z
          .string()
          .min(1)
          .max(1250)
          .describe("The comment text to post."),
        actor_urn: z
          .string()
          .optional()
          .describe("URN of the commenter (Person or Organization). Defaults to the authenticated user."),
        response_format: z
          .enum([ResponseFormat.MARKDOWN, ResponseFormat.JSON])
          .default(ResponseFormat.MARKDOWN)
          .describe("'markdown' for readable summary, 'json' for raw structured data"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ post_urn, comment_text, actor_urn, response_format }, ctx) => {
      const result = await addLinkedInComment(post_urn, comment_text, actor_urn, ctx.mcpReq.signal);

      const structured = {
        success: result.success,
        commentUrn: result.commentUrn,
        postUrn: post_urn,
      };

      if (response_format === ResponseFormat.JSON) {
        return {
          content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
          structuredContent: structured,
        };
      }

      const lines = [
        "## ✅ Comment Successfully Posted on LinkedIn!",
        `- **Post URN**: \`${post_urn}\``,
      ];
      if (result.commentUrn) {
        lines.push(`- **Comment URN**: \`${result.commentUrn}\``);
      }
      lines.push("", "### Content", `> ${comment_text}`);

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        structuredContent: structured,
      };
    }
  );

  server.registerTool(
    "linkedin_get_post_analytics",
    {
      title: "Get LinkedIn Post Analytics",
      description: "Retrieve social engagement metrics for a post: likes/reactions count, comments count, and shares count.",
      inputSchema: z.strictObject({
        post_urn: z.string().describe("The LinkedIn Post URN to analyze."),
        response_format: z
          .enum([ResponseFormat.MARKDOWN, ResponseFormat.JSON])
          .default(ResponseFormat.MARKDOWN)
          .describe("'markdown' for readable report, 'json' for raw structured metrics"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ post_urn, response_format }, ctx) => {
      const metrics = await getLinkedInPostMetrics(post_urn, ctx.mcpReq.signal);

      if (response_format === ResponseFormat.JSON) {
        return {
          content: [{ type: "text", text: JSON.stringify(metrics, null, 2) }],
          structuredContent: metrics,
        };
      }

      const lines = [
        `# 📊 Analytics for Post: \`${post_urn}\``,
        `- **Reactions / Likes**: ${metrics.numLikes}`,
        `- **Comments**: ${metrics.numComments}`,
        `- **Shares**: ${metrics.numShares}`,
        `- **Total Interactions**: ${metrics.numLikes + metrics.numComments + metrics.numShares}`,
      ];

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        structuredContent: metrics,
      };
    }
  );
}
