/**
 * Local Exporter
 * Exports posts from generator or Notion to clean local Markdown & JSON files
 * in profiles/<Profile>/<Platform>/scheduled/
 */

import fs from "node:fs";
import path from "node:path";
import { RulesEngine } from "./rules-engine.js";
import { LinkedInFormatter } from "../platforms/linkedin/formatter.js";
import { FacebookFormatter } from "../platforms/facebook/formatter.js";

export class LocalExporter {
  constructor(profilePath) {
    this.profilePath = profilePath;
    this.profileConfig = JSON.parse(fs.readFileSync(path.join(profilePath, "profile.json"), "utf8"));
    this.rulesEngine = new RulesEngine(this.profileConfig);
  }

  exportPosts(posts) {
    console.log(`[LocalExporter] Exporting ${posts.length} posts for profile "${this.profileConfig.name}"...`);

    let exportedLinkedIn = 0;
    let exportedFacebook = 0;

    for (const rawPost of posts) {
      // 1. Enforce strict CTA rules
      const post = this.rulesEngine.enforceRules(rawPost);

      // Clean filename slug
      const safeTime = post.time.replace(":", "-");
      const safeSlug = (post.title || "post")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 45);

      const filename = `${post.day}_${safeTime}_${safeSlug}.md`;

      // 2. LinkedIn Export
      if (post.platforms.includes("LinkedIn")) {
        const formattedText = LinkedInFormatter.format(post);
        const mdContent = `---
title: "${post.title.replace(/"/g, '\\"')}"
day: "${post.day}"
time: "${post.time}"
date: "${post.date}"
platform: "LinkedIn"
theme: "${post.theme}"
category: "${post.category}"
status: "${post.status}"
priority: "${post.priority}"
isAboutProduct: ${post.isAboutProduct}
tags: "${post.tags}"
cta: "${post.cta.replace(/"/g, '\\"')}"
---

# ${post.title}

${formattedText}
`;

        const targetDir = path.join(this.profilePath, "linkedin", "scheduled");
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        fs.writeFileSync(path.join(targetDir, filename), mdContent, "utf8");
        exportedLinkedIn++;
      }

      // 3. Facebook Export
      if (post.platforms.includes("Facebook")) {
        const formattedText = FacebookFormatter.format(post);
        const mdContent = `---
title: "${post.title.replace(/"/g, '\\"')}"
day: "${post.day}"
time: "${post.time}"
date: "${post.date}"
platform: "Facebook"
theme: "${post.theme}"
category: "${post.category}"
status: "${post.status}"
priority: "${post.priority}"
isAboutProduct: ${post.isAboutProduct}
tags: "${post.tags}"
cta: "${post.cta.replace(/"/g, '\\"')}"
---

# ${post.title}

${formattedText}
`;

        const targetDir = path.join(this.profilePath, "facebook", "scheduled");
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        fs.writeFileSync(path.join(targetDir, filename), mdContent, "utf8");
        exportedFacebook++;
      }
    }

    console.log(`[LocalExporter] Successfully generated:`);
    console.log(`  - ${exportedLinkedIn} markdown files in linkedin/scheduled/`);
    console.log(`  - ${exportedFacebook} markdown files in facebook/scheduled/`);

    return { exportedLinkedIn, exportedFacebook };
  }
}
