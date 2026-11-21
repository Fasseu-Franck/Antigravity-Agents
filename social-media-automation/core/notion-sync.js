/**
 * Notion Two-Way Sync Module
 * Syncs posts between Notion Content Hub and local automation profile directories.
 */

import fs from "node:fs";
import path from "node:path";

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

export class NotionSync {
  constructor(config = {}) {
    this.mcpUrl = config.mcpUrl || "https://connect.composio.dev/mcp";
    this.apiKey = config.apiKey || "ck_jiTcUhCw5ZhBFiAHumBE";
    this.databaseId = config.databaseId || "346fb75f-5244-8082-abd6-ca783b5c4666";
  }

  async fetchWithRetry(url, options, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(url, options);
        return res;
      } catch (err) {
        if (attempt === maxRetries) throw err;
        await sleep(1000 * attempt);
      }
    }
  }

  async fetchAllPages() {
    const req = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "COMPOSIO_PROXY_EXECUTE",
        arguments: {
          toolkit_slug: "notion",
          method: "POST",
          endpoint: `/v1/databases/${this.databaseId}/query`,
          parameters: [
            { name: "Notion-Version", type: "header", value: "2022-06-28" }
          ],
          body: { page_size: 100 }
        }
      }
    };

    const res = await this.fetchWithRetry(this.mcpUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "x-consumer-api-key": this.apiKey
      },
      body: JSON.stringify(req)
    });

    const responseText = await res.text();
    const lines = responseText.split("\n");
    for (const line of lines) {
      if (line.startsWith("data:")) {
        const dataStr = line.slice(5).trim();
        if (dataStr) {
          try {
            const parsed = JSON.parse(dataStr);
            const contentText = parsed.result?.content?.[0]?.text;
            if (contentText) {
              const inner = JSON.parse(contentText);
              if (inner.successful && inner.data?.data?.results) {
                return inner.data.data.results;
              }
            }
          } catch (e) {
            // continue
          }
        }
      }
    }

    return [];
  }

  async updatePageCta(pageId, newCta) {
    const req = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "COMPOSIO_PROXY_EXECUTE",
        arguments: {
          toolkit_slug: "notion",
          method: "PATCH",
          endpoint: `/v1/pages/${pageId}`,
          parameters: [
            { name: "Notion-Version", type: "header", value: "2022-06-28" }
          ],
          body: {
            properties: {
              "CTA": {
                rich_text: [{ type: "text", text: { content: newCta } }]
              }
            }
          }
        }
      }
    };

    const res = await this.fetchWithRetry(this.mcpUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "x-consumer-api-key": this.apiKey
      },
      body: JSON.stringify(req)
    });

    return res.status === 200;
  }
}
