import { McpServer } from "@modelcontextprotocol/server";
import { getAuthenticatedProfile, getManagedOrganizations } from "./api.js";
import { listScheduledPosts } from "./queue.js";
import { CONFIG } from "./constants.js";

export function registerResources(server: McpServer): void {
  server.registerResource(
    "linkedin-profile",
    "linkedin://profile",
    {
      title: "LinkedIn Profile & Organizations",
      description: "Information about the authenticated user and managed company pages.",
      mimeType: "application/json",
    },
    async (uri, ctx) => {
      try {
        const profile = await getAuthenticatedProfile(ctx.mcpReq.signal);
        const organizations = await getManagedOrganizations(ctx.mcpReq.signal);
        const payload = { profile, organizations };
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify(payload, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify({ error: message }),
            },
          ],
        };
      }
    }
  );

  server.registerResource(
    "linkedin-queue",
    "linkedin://queue",
    {
      title: "LinkedIn Scheduled Posts Queue",
      description: "List of all posts scheduled in the local automation queue.",
      mimeType: "application/json",
    },
    async (uri) => {
      const items = await listScheduledPosts();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({ count: items.length, items }, null, 2),
          },
        ],
      };
    }
  );

  server.registerResource(
    "linkedin-status",
    "linkedin://status",
    {
      title: "LinkedIn MCP Server Status",
      description: "Runtime configuration and environment status.",
      mimeType: "application/json",
    },
    async (uri) => {
      const status = {
        hasAccessToken: Boolean(CONFIG.accessToken),
        defaultAuthorUrn: CONFIG.defaultAuthorUrn || null,
        apiVersion: CONFIG.apiVersion,
        queueFilePath: CONFIG.queueFilePath,
        transport: CONFIG.transport,
      };
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(status, null, 2),
          },
        ],
      };
    }
  );
}
