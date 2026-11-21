/**
 * Facebook Formatter
 * Formats posts for Facebook Pages and feeds.
 */

export class FacebookFormatter {
  static format(post) {
    const parts = [];

    // On Facebook, hooks and clear opening sentences are key
    const hook = post.hook?.trim();
    const content = post.content?.trim();

    if (hook && content && !content.startsWith(hook)) {
      parts.push(hook);
      parts.push("");
    }

    if (content) {
      parts.push(content);
    }

    const cta = post.cta?.trim();
    if (cta && !content.includes(cta)) {
      parts.push("");
      parts.push(cta);
    }

    return parts.join("\n");
  }
}
