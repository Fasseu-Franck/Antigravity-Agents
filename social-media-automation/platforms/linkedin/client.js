/**
 * LinkedIn Platform Client
 * Integrates with LinkedIn via Composio or direct REST API.
 */

export class LinkedInClient {
  constructor(config = {}) {
    this.mcpUrl = config.mcpUrl || "https://connect.composio.dev/mcp";
    this.apiKey = config.apiKey || "ck_jiTcUhCw5ZhBFiAHumBE";
    this.authorUrn = config.authorUrn || "urn:li:person:E0byz8Kzyo";
  }

  async publishPost(formattedText, mediaUrn = null) {
    const payload = {
      author: this.authorUrn,
      commentary: formattedText,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: []
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false
    };

    if (mediaUrn) {
      payload.content = {
        media: {
          id: mediaUrn
        }
      };
    }

    const req = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "COMPOSIO_PROXY_EXECUTE",
        arguments: {
          toolkit_slug: "linkedin",
          method: "POST",
          endpoint: "/rest/posts",
          parameters: [
            { name: "LinkedIn-Version", type: "header", value: "202610" },
            { name: "X-Restli-Protocol-Version", type: "header", value: "2.0.0" }
          ],
          body: payload
        }
      }
    };

    try {
      const res = await fetch(this.mcpUrl, {
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
            const parsed = JSON.parse(dataStr);
            const contentText = parsed.result?.content?.[0]?.text;
            if (contentText) {
              const inner = JSON.parse(contentText);
              const postUrn = inner.data?.headers?.["x-restli-id"] || inner.data?.data?.id;
              if (postUrn) {
                return {
                  success: true,
                  postUrn,
                  url: `https://www.linkedin.com/feed/update/${postUrn}/`
                };
              }
            }
          }
        }
      }

      return { success: false, raw: responseText };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}
