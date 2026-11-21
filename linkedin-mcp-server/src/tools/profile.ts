import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { getAuthenticatedProfile, getManagedOrganizations } from "../api.js";
import { ResponseFormat } from "../types.js";

export function registerProfileTools(server: McpServer): void {
  server.registerTool(
    "linkedin_get_profile",
    {
      title: "Get LinkedIn Profile",
      description:
        "Retrieve the authenticated user's LinkedIn profile information (Person URN, full name, vanity name, email, profile picture) and any managed company pages (Organization URNs). Use this tool to discover the author URNs required for publishing posts.",
      inputSchema: z.strictObject({
        response_format: z
          .enum([ResponseFormat.MARKDOWN, ResponseFormat.JSON])
          .default(ResponseFormat.MARKDOWN)
          .describe("'markdown' for readable overview, 'json' for raw structured data"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ response_format }, ctx) => {
      const profile = await getAuthenticatedProfile(ctx.mcpReq.signal);
      const organizations = await getManagedOrganizations(ctx.mcpReq.signal);

      const structured = {
        profile,
        organizations,
      };

      if (response_format === ResponseFormat.JSON) {
        return {
          content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
          structuredContent: structured,
        };
      }

      const lines = [
        `# LinkedIn Profile: ${profile.name}`,
        `- **Person URN**: \`${profile.urn}\``,
        `- **ID**: ${profile.id}`,
      ];

      if (profile.email) {
        lines.push(`- **Email**: ${profile.email}`);
      }

      lines.push("", "## Managed Company Pages (Organizations)");
      if (organizations.length === 0) {
        lines.push("No managed company pages found for this account.");
      } else {
        for (const org of organizations) {
          lines.push(`- **${org.name || org.id}**: \`${org.urn}\` (Role: ${org.role || "N/A"})`);
        }
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        structuredContent: structured,
      };
    }
  );
}
