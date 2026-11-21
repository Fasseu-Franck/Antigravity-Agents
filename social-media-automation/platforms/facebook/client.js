/**
 * Facebook Platform Client
 * Integrates with Facebook Graph API / Pages via Composio or direct tokens.
 */

export class FacebookClient {
  constructor(config = {}) {
    this.mcpUrl = config.mcpUrl || "https://connect.composio.dev/mcp";
    this.apiKey = config.apiKey || "ck_jiTcUhCw5ZhBFiAHumBE";
    this.pageId = config.pageId || "me";
  }

  async publishPost(formattedText, linkUrl = null) {
    const payload = {
      message: formattedText
    };

    if (linkUrl) {
      payload.link = linkUrl;
    }

    const req = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "COMPOSIO_PROXY_EXECUTE",
        arguments: {
          toolkit_slug: "facebook",
          method: "POST",
          endpoint: `/${this.pageId}/feed`,
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
              const postId = inner.data?.data?.id || inner.data?.id;
              if (postId) {
                return {
                  success: true,
                  postId,
                  url: `https://facebook.com/${postId}`
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
