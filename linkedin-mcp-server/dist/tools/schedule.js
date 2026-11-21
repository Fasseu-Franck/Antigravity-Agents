import * as z from "zod/v4";
import { addScheduledPost, listScheduledPosts, cancelScheduledPost, publishDuePosts, } from "../queue.js";
import { PostVisibility, QueueStatus, ResponseFormat } from "../types.js";
import { convertMarkdownStylesToUnicode } from "../formatter.js";
export function registerScheduleTools(server) {
    server.registerTool("linkedin_schedule_post", {
        title: "Schedule LinkedIn Post",
        description: `Schedule a post for future automated publishing.
Stores the post in the local automation queue.
The post can be published automatically via 'linkedin_publish_due_posts' or a background scheduler.

Examples:
- Schedule for tomorrow morning:
  scheduled_time="2026-11-19T08:30:00.000Z"
  commentary="🚀 Top 5 AI tools that transformed our workflow this year..."
  first_comment="Full breakdown in my newsletter: https://example.com/newsletter"`,
        inputSchema: z.strictObject({
            scheduled_time: z
                .string()
                .describe("Target ISO 8601 publication datetime (e.g. '2026-11-20T09:00:00Z' or '2026-11-20T10:30:00+01:00')."),
            commentary: z
                .string()
                .min(1)
                .max(3000)
                .describe("Post text content. Markdown **bold** and *italic* will be converted to Unicode."),
            visibility: z
                .enum([PostVisibility.PUBLIC, PostVisibility.CONNECTIONS])
                .default(PostVisibility.PUBLIC)
                .describe("Visibility: 'PUBLIC' or 'CONNECTIONS'. Default is PUBLIC."),
            author_urn: z
                .string()
                .optional()
                .describe("Author URN (personal profile or company page). Defaults to authenticated user."),
            media_urn: z
                .string()
                .optional()
                .describe("URN of an uploaded image or PDF document carousel."),
            article_url: z
                .string()
                .optional()
                .describe("External article/webpage URL to attach."),
            article_title: z
                .string()
                .optional()
                .describe("Custom article preview title."),
            first_comment: z
                .string()
                .optional()
                .describe("Comment to post immediately after publication (e.g., resource link)."),
            convert_markdown_formatting: z
                .boolean()
                .default(true)
                .describe("Convert markdown bold/italic tags into Unicode text. Default: true."),
            response_format: z
                .enum([ResponseFormat.MARKDOWN, ResponseFormat.JSON])
                .default(ResponseFormat.MARKDOWN)
                .describe("'markdown' for readable output, 'json' for raw structured data"),
        }),
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: false,
        },
    }, async ({ scheduled_time, commentary, visibility, author_urn, media_urn, article_url, article_title, first_comment, convert_markdown_formatting, response_format, }) => {
        const formattedCommentary = convert_markdown_formatting
            ? convertMarkdownStylesToUnicode(commentary)
            : commentary;
        const item = await addScheduledPost({
            scheduledTime: scheduled_time,
            authorUrn: author_urn,
            commentary: formattedCommentary,
            visibility,
            mediaUrn: media_urn,
            article: article_url ? { source: article_url, title: article_title } : undefined,
            firstComment: first_comment,
        });
        if (response_format === ResponseFormat.JSON) {
            return {
                content: [{ type: "text", text: JSON.stringify(item, null, 2) }],
                structuredContent: item,
            };
        }
        const lines = [
            "## 🗓️ LinkedIn Post Successfully Scheduled!",
            `- **Task ID**: \`${item.id}\``,
            `- **Scheduled Time**: ${item.scheduledTime}`,
            `- **Status**: ${item.status}`,
            `- **Visibility**: ${item.visibility}`,
        ];
        if (item.mediaUrn) {
            lines.push(`- **Media URN**: \`${item.mediaUrn}\``);
        }
        if (item.firstComment) {
            lines.push(`- **First Comment Queued**: "${item.firstComment}"`);
        }
        lines.push("", "### Preview Snippet", `> ${item.commentary.slice(0, 150)}...`);
        return {
            content: [{ type: "text", text: lines.join("\n") }],
            structuredContent: item,
        };
    });
    server.registerTool("linkedin_list_scheduled_posts", {
        title: "List Scheduled Posts",
        description: "List scheduled posts from the local automation queue with status and preview.",
        inputSchema: z.strictObject({
            status: z
                .enum([
                QueueStatus.SCHEDULED,
                QueueStatus.PUBLISHED,
                QueueStatus.FAILED,
                QueueStatus.CANCELLED,
            ])
                .optional()
                .describe("Filter by status: 'scheduled', 'published', 'failed', or 'cancelled'."),
            limit: z
                .number()
                .int()
                .min(1)
                .max(100)
                .default(20)
                .describe("Maximum number of posts to return."),
            response_format: z
                .enum([ResponseFormat.MARKDOWN, ResponseFormat.JSON])
                .default(ResponseFormat.MARKDOWN)
                .describe("'markdown' for readable summary, 'json' for raw structured array"),
        }),
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
        },
    }, async ({ status, limit, response_format }) => {
        const items = await listScheduledPosts({ status, limit });
        if (response_format === ResponseFormat.JSON) {
            return {
                content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
                structuredContent: { count: items.length, items },
            };
        }
        if (items.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: status
                            ? `No posts found with status '${status}'.`
                            : "The scheduling queue is currently empty.",
                    },
                ],
                structuredContent: { count: 0, items: [] },
            };
        }
        const lines = [`# Scheduled LinkedIn Posts (${items.length})`, ""];
        for (const it of items) {
            const statusEmoji = it.status === QueueStatus.PUBLISHED
                ? "✅"
                : it.status === QueueStatus.SCHEDULED
                    ? "⏳"
                    : it.status === QueueStatus.FAILED
                        ? "❌"
                        : "🚫";
            lines.push(`### ${statusEmoji} [${it.status.toUpperCase()}] ID: \`${it.id}\``);
            lines.push(`- **Target Date**: ${it.scheduledTime}`);
            if (it.postUrn)
                lines.push(`- **Post URN**: \`${it.postUrn}\``);
            if (it.error)
                lines.push(`- **Error**: ${it.error}`);
            lines.push(`- **Commentary**: ${it.commentary.slice(0, 120)}...`);
            lines.push("");
        }
        return {
            content: [{ type: "text", text: lines.join("\n") }],
            structuredContent: { count: items.length, items },
        };
    });
    server.registerTool("linkedin_cancel_scheduled_post", {
        title: "Cancel Scheduled Post",
        description: "Cancel a scheduled post in the local queue by its task ID.",
        inputSchema: z.strictObject({
            id: z.string().describe("The scheduled task ID to cancel (e.g. 'post_1710928392_abc12')."),
        }),
        annotations: {
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: true,
            openWorldHint: false,
        },
    }, async ({ id }) => {
        const ok = await cancelScheduledPost(id);
        if (!ok) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No scheduled post found with ID '${id}'.`,
                    },
                ],
                structuredContent: { success: false, id },
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Scheduled post \`${id}\` was successfully cancelled.`,
                },
            ],
            structuredContent: { success: true, id },
        };
    });
    server.registerTool("linkedin_publish_due_posts", {
        title: "Publish Due Scheduled Posts",
        description: `Scan the local automation queue for posts whose scheduled_time is less than or equal to now, and publish them to LinkedIn.
This tool is ideal for cron jobs, recurring timers, or automated agent checks.`,
        inputSchema: z.strictObject({
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
    }, async ({ response_format }, ctx) => {
        const result = await publishDuePosts(ctx.mcpReq.signal);
        if (response_format === ResponseFormat.JSON) {
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
                structuredContent: result,
            };
        }
        const lines = [
            "## 🚀 Scheduled Posts Check Completed",
            `- **Published Now**: ${result.published.length}`,
            `- **Failed**: ${result.failed.length}`,
            `- **Remaining Pending in Queue**: ${result.pendingCount}`,
        ];
        if (result.published.length > 0) {
            lines.push("", "### Published Posts:");
            for (const p of result.published) {
                lines.push(`- ID \`${p.id}\` -> \`${p.postUrn}\``);
            }
        }
        if (result.failed.length > 0) {
            lines.push("", "### Failed Posts:");
            for (const f of result.failed) {
                lines.push(`- ID \`${f.id}\`: ${f.error}`);
            }
        }
        return {
            content: [{ type: "text", text: lines.join("\n") }],
            structuredContent: result,
        };
    });
}
//# sourceMappingURL=schedule.js.map