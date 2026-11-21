import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "draft_linkedin_post",
    {
      title: "Draft High-Impact LinkedIn Post",
      description: "Generates an engaging, high-retention LinkedIn post structured according to top creator copywriting practices.",
      argsSchema: z.object({
        topic: z.string().describe("Main topic, story, or message of the post"),
        tone: z
          .string()
          .default("Authentic Founder")
          .describe("Tone of voice: 'Authentic Founder', 'Technical Expert', 'Practical Guide', 'Storyteller'"),
        target_audience: z
          .string()
          .default("Entrepreneurs, Tech professionals, Developers")
          .describe("Primary target audience"),
        call_to_action: z
          .string()
          .default("Ask for community feedback in comments")
          .describe("Desired action (e.g. comment opinion, check link in first comment)"),
      }),
    },
    async ({ topic, tone, target_audience, call_to_action }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please draft a high-impact LinkedIn post following these proven copywriting rules:

**Topic**: ${topic}
**Tone**: ${tone}
**Target Audience**: ${target_audience}
**Call To Action**: ${call_to_action}

### 📐 Structural Rules:
1. **The Hook (First 1-2 lines)**: Must be under 200 characters so it fits before the "...voir plus" (see more) fold. Create intrigue, counter-intuitive insight, or strong curiosity. Never start with "I'm excited to share" or "Today, I want to talk about".
2. **Spacing & Readability**: Use single-line paragraphs and blank line breaks. No big blocks of text.
3. **Core Body**:
   - Provide concrete value, raw feedback from experience, or a relatable lesson.
   - Use bullet points (e.g. ➔, •, or numbers) for lists.
4. **Conclusion & CTA**: Clear, natural invitation to discuss or react.
5. **Links**: If there's an external link, announce it for the **first comment** (e.g., "👇 Le lien complet est dans le premier commentaire") to avoid LinkedIn's algorithmic reach penalty.
6. **Hashtags**: End with exactly 3 to 4 relevant hashtags.

After writing the draft, also provide the suggested First Comment text and invoke 'linkedin_format_post' to audit it.`,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    "schedule_weekly_calendar",
    {
      title: "Generate Weekly LinkedIn Content Plan",
      description: "Generates a structured weekly posting schedule ready to be queued into the MCP scheduler.",
      argsSchema: z.object({
        weekly_theme: z.string().describe("Central theme or objective of the week"),
        start_date: z.string().describe("Starting Monday ISO date (e.g. '2026-11-23')"),
        posts_count: z.string().default("3").describe("Number of posts for the week (e.g. 3 or 5)"),
      }),
    },
    async ({ weekly_theme, start_date, posts_count }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Create a comprehensive ${posts_count}-post LinkedIn weekly calendar based on:
**Theme**: ${weekly_theme}
**Starting Date**: ${start_date}

For each post provide:
1. **Target Date & Time**: (Recommended optimal posting slots: Tuesday, Wednesday, Thursday between 08:00 and 09:00 AM local time).
2. **Post Format**: (Text + carousel PDF, Story text, Visual screenshot/infographic).
3. **Draft Content**: Full hook, body, CTA, and 3 hashtags.
4. **Optional First Comment**: Link or extra context.
5. The exact tool call arguments to run 'linkedin_schedule_post' to queue each post automatically.`,
          },
        },
      ],
    })
  );
}
