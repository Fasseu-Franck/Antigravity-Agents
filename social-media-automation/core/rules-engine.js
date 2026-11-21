/**
 * Rules Engine for Social Media Automation
 * Enforces persona-specific tone, formatting, and CTA logic.
 */

export class RulesEngine {
  constructor(profileConfig) {
    this.profile = profileConfig;
  }

  /**
   * Evaluates if a post is primarily about Onixe product / waitlist
   * - 08:00 morning slot is strictly dedicated to Onixe & EdTech Vision.
   * - Nov 30 08:00 is the grand official launch of Onixe.
   * - 12:00 (Dev Niche / Antigravity / Google Suite) and 18:00 (Mindset / Builder Tips)
   *   are NOT product pitch posts: they MUST engage peers, ask discussion questions,
   *   and NOT push the Onixe waitlist link.
   */
  isPrimaryOnixePost(post) {
    // If the slot is 08:00 (Vision EdTech & Onixe)
    if (post.time === "08:00") {
      return true;
    }

    // Nov 30 launch post
    if (post.day === "2026-11-30" && post.time === "08:00") {
      return true;
    }

    // If title explicitly announces Onixe product features
    const titleLower = (post.title || "").toLowerCase();
    if (titleLower.includes("onixe ouvre ses portes") || titleLower.includes("nucleus")) {
      return true;
    }

    return false;
  }

  /**
   * Formats and adjusts the CTA and post body according to Franck Fasseu's strict rule:
   * - When talking about Onixe -> link to https://onixe.app/waitlist or https://onixe.app
   * - When NOT about Onixe (dev, Antigravity, mindset, tips) -> do NOT link to Onixe, do something else (peer question, engagement)
   */
  enforceRules(post) {
    const isProduct = this.isPrimaryOnixePost(post);
    let finalCta = post.cta || "";
    let finalContent = post.content || "";

    if (isProduct) {
      // Must link to Onixe
      const hasOnixeLink = finalCta.includes("onixe.app") || finalContent.includes("onixe.app");
      if (!hasOnixeLink) {
        finalCta = "Pour tester l'approche Onixe et rejoindre la waitlist : https://onixe.app/waitlist";
      }
    } else {
      // Must NOT link to Onixe or waitlist
      if (finalCta.includes("onixe.app") || finalCta.toLowerCase().includes("waitlist")) {
        // Find question in content or generate peer question
        const lines = finalContent.split("\n").map(l => l.trim()).filter(l => l.length > 0);
        const lastQuestion = lines.reverse().find(l => l.includes("?"));
        if (lastQuestion) {
          finalCta = lastQuestion;
        } else {
          finalCta = "Et vous, quel est votre retour d'expérience sur ce point ? Échangeons en commentaire.";
        }
      }

      // If the content itself had an accidental onixe.app link in a non-Onixe post, strip it
      finalContent = finalContent.replace(/https?:\/\/onixe\.app\/waitlist/g, "");
      finalContent = finalContent.replace(/https?:\/\/onixe\.app/g, "");
      finalContent = finalContent.replace(/onixe\.app\/waitlist/g, "");
      finalContent = finalContent.replace(/onixe\.app/g, "notre produit");
    }

    // Persona constraints: Clean noisy emojis
    if (this.profile?.persona?.banned_elements?.emojis) {
      const noisyEmojis = /[\u{1F680}\u{1F525}\u{1F447}\u{1F4A5}\u{2728}\u{1F4A1}\u{1F92F}\u{1F600}-\u{1F64F}]/gu;
      finalContent = finalContent.replace(noisyEmojis, "");
      finalCta = finalCta.replace(noisyEmojis, "");
    }

    // Clean hashtags
    if (this.profile?.persona?.banned_elements?.hashtags) {
      finalContent = finalContent.replace(/#\w+/g, "").trim();
      finalCta = finalCta.replace(/#\w+/g, "").trim();
    }

    return {
      ...post,
      isAboutProduct: isProduct,
      cta: finalCta.trim(),
      content: finalContent.trim()
    };
  }

  /**
   * Audits text length and compliance
   */
  auditPost(post, platform = "linkedin") {
    const fullText = `${post.hook || ""}\n\n${post.content || ""}\n\n${post.cta || ""}`.trim();
    const length = fullText.length;
    const max = platform === "linkedin" ? 3000 : 5000;

    return {
      characterCount: length,
      isWithinLimit: length <= max,
      exceedsWarning: length > max * 0.85,
      hasBannedEmojis: /[\u{1F680}\u{1F525}\u{1F447}]/gu.test(fullText),
      isAboutProduct: this.isPrimaryOnixePost(post)
    };
  }
}
