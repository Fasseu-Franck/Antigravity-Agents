/**
 * LinkedIn Formatter
 * Formats posts for maximum readability and algorithmic reach on LinkedIn.
 */

export class LinkedInFormatter {
  static format(post) {
    const parts = [];

    // 1. Hook (if not already included at start of content)
    const hook = post.hook?.trim();
    const content = post.content?.trim();

    if (hook && content && !content.startsWith(hook)) {
      parts.push(hook);
      parts.push(""); // blank line
    }

    // 2. Content
    if (content) {
      parts.push(content);
    }

    // 3. CTA (if distinct and not already at end of content)
    const cta = post.cta?.trim();
    if (cta && !content.includes(cta)) {
      parts.push("");
      parts.push(cta);
    }

    let fullText = parts.join("\n");

    // Enforce max 3000 characters
    if (fullText.length > 3000) {
      console.warn(`[LinkedInFormatter] Post length (${fullText.length}) exceeds 3000 chars. Truncating cleanly.`);
      fullText = fullText.slice(0, 2990) + "...";
    }

    return fullText;
  }
}
