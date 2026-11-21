#!/usr/bin/env node
/**
 * Social Media Automation CLI
 * Unified command-line runner for Franck Fasseu and multi-client social posting.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LocalExporter } from "./core/local-exporter.js";
import { Publisher } from "./core/publisher.js";
import { RulesEngine } from "./core/rules-engine.js";
import { NotionSync } from "./core/notion-sync.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to parse arguments
function parseArgs(args) {
  const options = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        options[key] = next;
        i++;
      } else {
        options[key] = true;
      }
    } else {
      options._.push(arg);
    }
  }
  return options;
}

const args = parseArgs(process.argv.slice(2));
const command = args._[0] || "status";
const targetProfile = args.profile || "Fasseu-Franck";

const profilesDir = path.join(__dirname, "profiles");
const currentProfilePath = path.join(profilesDir, targetProfile);

async function main() {
  console.log("==================================================");
  console.log("🚀 SOCIAL MEDIA AUTOMATION ENGINE");
  console.log(`Active Profile: [${targetProfile}] | Command: [${command}]`);
  console.log("==================================================\n");

  switch (command) {
    case "status": {
      if (!fs.existsSync(currentProfilePath)) {
        console.error(`Profile "${targetProfile}" not found in ${profilesDir}`);
        process.exit(1);
      }
      const config = JSON.parse(fs.readFileSync(path.join(currentProfilePath, "profile.json"), "utf8"));
      console.log(`👤 Profile: ${config.name} (${config.role})`);
      console.log(`📍 Timezone: ${config.timezone} (${config.timezoneOffset})`);
      console.log(`🎯 Active Notion Database: ${config.notion?.database_id || "None"}\n`);

      const platforms = ["linkedin", "facebook"];
      for (const p of platforms) {
        const scheduledPath = path.join(currentProfilePath, p, "scheduled");
        const publishedPath = path.join(currentProfilePath, p, "published");
        const draftsPath = path.join(currentProfilePath, p, "drafts");

        const scheduledCount = fs.existsSync(scheduledPath) ? fs.readdirSync(scheduledPath).filter(f => f.endsWith(".md")).length : 0;
        const publishedCount = fs.existsSync(publishedPath) ? fs.readdirSync(publishedPath).filter(f => f.endsWith(".md")).length : 0;
        const draftsCount = fs.existsSync(draftsPath) ? fs.readdirSync(draftsPath).filter(f => f.endsWith(".md")).length : 0;

        console.log(`📱 Platform [${p.toUpperCase()}]:`);
        console.log(`   - Scheduled (ready): ${scheduledCount} posts`);
        console.log(`   - Drafts (review):    ${draftsCount} posts`);
        console.log(`   - Published:          ${publishedCount} posts`);
      }
      break;
    }

    case "export-local": {
      // Import the 36 posts generator
      const generatorPath = "file:///C:/Users/HP/.gemini/antigravity/brain/6f9e4c08-5b0f-4664-9e80-744fb6b1609f/posts_generator_full.mjs";
      try {
        const { allPosts } = await import(generatorPath);
        const exporter = new LocalExporter(currentProfilePath);
        exporter.exportPosts(allPosts);
      } catch (err) {
        console.error("Error loading posts generator:", err.message);
      }
      break;
    }

    case "audit-cta": {
      const config = JSON.parse(fs.readFileSync(path.join(currentProfilePath, "profile.json"), "utf8"));
      const rulesEngine = new RulesEngine(config);

      console.log(`🔍 Auditing CTA compliance for profile "${config.name}"...`);
      const scheduledDir = path.join(currentProfilePath, "linkedin", "scheduled");
      if (!fs.existsSync(scheduledDir)) {
        console.log("No scheduled posts found to audit.");
        break;
      }

      const files = fs.readdirSync(scheduledDir).filter(f => f.endsWith(".md"));
      let compliant = 0;
      let nonCompliant = 0;

      for (const file of files) {
        const content = fs.readFileSync(path.join(scheduledDir, file), "utf8");
        const isProduct = content.includes("isAboutProduct: true");
        const hasOnixeLink = content.includes("onixe.app");

        if (isProduct) {
          if (hasOnixeLink) {
            compliant++;
          } else {
            console.warn(`⚠️ [ONIXE POST WITHOUT LINK]: ${file}`);
            nonCompliant++;
          }
        } else {
          if (!hasOnixeLink) {
            compliant++;
          } else {
            console.warn(`⚠️ [NON-ONIXE POST WITH LINK]: ${file}`);
            nonCompliant++;
          }
        }
      }

      console.log(`\nAudit Complete: ${compliant} compliant posts, ${nonCompliant} issues.`);
      break;
    }

    case "publish-due": {
      const publisher = new Publisher(currentProfilePath);
      const isDryRun = !!args["dry-run"];
      const results = await publisher.publishDuePosts({ dryRun: isDryRun });
      console.log(`\nProcessed ${results.length} due posts.`);
      break;
    }

    case "create-client": {
      const clientName = args.name;
      if (!clientName) {
        console.error("Please specify client name: node cli.js create-client --name <ClientName>");
        process.exit(1);
      }

      const templateDir = path.join(profilesDir, "_template_client");
      const newClientDir = path.join(profilesDir, clientName);

      if (fs.existsSync(newClientDir)) {
        console.error(`Profile directory "${clientName}" already exists!`);
        process.exit(1);
      }

      // Copy directory recursively
      fs.cpSync(templateDir, newClientDir, { recursive: true });

      // Update profile.json with new name and id
      const profileJsonPath = path.join(newClientDir, "profile.json");
      const clientConfig = JSON.parse(fs.readFileSync(profileJsonPath, "utf8"));
      clientConfig.id = clientName;
      clientConfig.name = clientName.replace(/[-_]/g, " ");
      fs.writeFileSync(profileJsonPath, JSON.stringify(clientConfig, null, 2), "utf8");

      console.log(`✅ Successfully created profile for client: "${clientName}"!`);
      console.log(`📁 Location: ${newClientDir}`);
      console.log(`👉 Edit profile.json to configure accounts, tone, and platforms.`);
      break;
    }

    case "list-profiles": {
      const profiles = fs.readdirSync(profilesDir).filter(f => fs.statSync(path.join(profilesDir, f)).isDirectory());
      console.log("Available profiles:");
      profiles.forEach(p => console.log(`  - ${p}`));
      break;
    }

    default:
      console.log(`Unknown command: "${command}"`);
      console.log("Usage:");
      console.log("  node cli.js status [--profile <name>]");
      console.log("  node cli.js export-local [--profile <name>]");
      console.log("  node cli.js audit-cta [--profile <name>]");
      console.log("  node cli.js publish-due [--profile <name>] [--dry-run]");
      console.log("  node cli.js create-client --name <ClientName>");
      console.log("  node cli.js list-profiles");
  }
}

main().catch(console.error);
