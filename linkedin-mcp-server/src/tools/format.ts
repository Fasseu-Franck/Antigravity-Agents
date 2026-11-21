import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { auditAndFormatPost } from "../formatter.js";
import { ResponseFormat } from "../types.js";

export function registerFormatTools(server: McpServer): void {
  server.registerTool(
    "linkedin_format_post",
    {
      title: "Format & Audit LinkedIn Post",
      description: `Format and audit a LinkedIn post draft before publishing.
- Converts Markdown **bold** and *italic* formatting to LinkedIn-compatible Unicode styled characters (e.g. 𝘁𝗲𝘅𝘁 or 𝑡𝑒𝑥𝑡).
- Audits the hook (the first ~210 characters visible before the '...voir plus' / 'see more' fold).
- Checks overall length against the 3,000 character limit.
- Audits hashtag usage (flags if missing or if > 5 hashtags to prevent algorithmic spam penalty).
- Checks presence of a Call To Action (CTA).`,
      inputSchema: z.strictObject({
        text: z
          .string()
          .min(1)
          .describe("The draft post text to audit and format."),
        convert_markdown: z
          .boolean()
          .default(true)
          .describe("Convert **bold** and *italic* into Unicode bold and italic characters. Default is true."),
        response_format: z
          .enum([ResponseFormat.MARKDOWN, ResponseFormat.JSON])
          .default(ResponseFormat.MARKDOWN)
          .describe("'markdown' for human-readable audit report, 'json' for raw structured audit result"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ text, convert_markdown, response_format }) => {
      const audit = auditAndFormatPost(text, convert_markdown);

      if (response_format === ResponseFormat.JSON) {
        return {
          content: [{ type: "text", text: JSON.stringify(audit, null, 2) }],
          structuredContent: audit,
        };
      }

      const lines = [
        "## 📝 LinkedIn Post Format & Audit Report",
        "",
        `### 📏 Length: ${audit.characterCount} / ${audit.maxCharacters} characters (${audit.charactersRemaining} remaining)`,
        audit.isWithinLimit
          ? "✅ Within LinkedIn character limit."
          : "❌ EXCEEDS LIMIT! Please shorten the text before publishing.",
        "",
        `### 🪝 Hook Analysis (Before '...voir plus' fold)`,
        `- **Characters in Preview**: ${audit.hook.hookCharacterCount} / 210`,
        `- **Cutoff Risk**: \`${audit.hook.cutoffRisk.toUpperCase()}\``,
        `- **Preview Text**:`,
        `> ${audit.hook.previewText.replace(/\n/g, " ")}`,
      ];

      if (audit.hook.recommendations.length > 0) {
        lines.push("- **Recommendations**:");
        for (const rec of audit.hook.recommendations) {
          lines.push(`  - ⚠️ ${rec}`);
        }
      }

      lines.push("", `### 🏷️ Hashtags: ${audit.hashtags.count} detected`);
      if (audit.hashtags.tags.length > 0) {
        lines.push(`- Tags: ${audit.hashtags.tags.map((t) => `#${t}`).join(" ")}`);
      }
      if (audit.hashtags.recommendations.length > 0) {
        for (const rec of audit.hashtags.recommendations) {
          lines.push(`- 💡 ${rec}`);
        }
      }

      lines.push("", `### 📢 Call To Action (CTA): ${audit.hasCallToAction ? "✅ Detected" : "⚠️ None detected"}`);

      lines.push("", "---", "### ✨ Ready-to-Publish Formatted Text:", "```text", audit.cleanFormattedText, "```");

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        structuredContent: audit,
      };
    }
  );
}
