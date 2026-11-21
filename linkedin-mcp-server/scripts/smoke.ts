/**
 * Smoke test for linkedin-mcp-server
 * Verifies server startup, tool registration, execution, and schema validation over stdio.
 */
import { strict as assert } from "node:assert";
import { Client } from "@modelcontextprotocol/client";
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/client/stdio";

async function main() {
  console.error("Starting LinkedIn MCP Server smoke test...");

  const client = new Client({ name: "smoke-test-client", version: "1.0.0" });
  await client.connect(
    new StdioClientTransport({
      command: "node",
      args: ["dist/index.js"],
      env: {
        ...getDefaultEnvironment(),
        LINKEDIN_ACCESS_TOKEN: process.env.LINKEDIN_ACCESS_TOKEN || "",
        LINKEDIN_QUEUE_FILE: "./dist/.test-queue.json",
      },
    })
  );

  // 1. Verify tools list
  const { tools } = await client.listTools();
  const toolNames = tools.map((t) => t.name).sort();
  console.error(`Registered tools (${toolNames.length}):`, toolNames);

  const expectedTools = [
    "linkedin_add_comment",
    "linkedin_cancel_scheduled_post",
    "linkedin_create_post",
    "linkedin_delete_post",
    "linkedin_format_post",
    "linkedin_get_post",
    "linkedin_get_post_analytics",
    "linkedin_get_profile",
    "linkedin_list_posts",
    "linkedin_list_scheduled_posts",
    "linkedin_publish_due_posts",
    "linkedin_schedule_post",
    "linkedin_upload_document",
    "linkedin_upload_image",
  ];

  for (const expected of expectedTools) {
    assert.ok(toolNames.includes(expected), `Missing expected tool: ${expected}`);
  }

  // 2. Test linkedin_format_post tool
  console.error("Testing linkedin_format_post...");
  const formatRes = await client.callTool({
    name: "linkedin_format_post",
    arguments: {
      text: "🚀 **Exciting news!** Here is our new product announcement.\n\n*Check it out below* 👇\n#Tech #AI #Innovation",
      convert_markdown: true,
      response_format: "json",
    },
  });
  assert.ok(!formatRes.isError, `Format tool failed: ${JSON.stringify(formatRes)}`);
  const formatContent = formatRes.structuredContent as {
    characterCount: number;
    cleanFormattedText: string;
    hashtags: { count: number };
  };
  assert.equal(formatContent.hashtags.count, 3, "Should detect 3 hashtags");
  assert.ok(formatContent.cleanFormattedText.includes("𝗘𝘅𝗰𝗶𝘁𝗶𝗻𝗴"), "Should contain bold unicode text");

  // 3. Test scheduling tool
  console.error("Testing linkedin_schedule_post...");
  const targetDate = new Date(Date.now() + 86400000).toISOString();
  const scheduleRes = await client.callTool({
    name: "linkedin_schedule_post",
    arguments: {
      scheduled_time: targetDate,
      commentary: "Automated test post from MCP server #Automation #Test",
      visibility: "PUBLIC",
      response_format: "json",
    },
  });
  assert.ok(!scheduleRes.isError, `Schedule tool failed: ${JSON.stringify(scheduleRes)}`);
  const scheduledItem = scheduleRes.structuredContent as { id: string; status: string };
  assert.ok(scheduledItem.id, "Should return scheduled item id");
  assert.equal(scheduledItem.status, "scheduled");

  // 4. Test listing scheduled posts
  console.error("Testing linkedin_list_scheduled_posts...");
  const listRes = await client.callTool({
    name: "linkedin_list_scheduled_posts",
    arguments: {
      response_format: "json",
    },
  });
  assert.ok(!listRes.isError, `List schedule failed: ${JSON.stringify(listRes)}`);
  const listContent = listRes.structuredContent as { count: number; items: Array<{ id: string }> };
  assert.ok(listContent.count >= 1, "Should list at least 1 scheduled post");

  // 5. Test cancelling scheduled post
  console.error("Testing linkedin_cancel_scheduled_post...");
  const cancelRes = await client.callTool({
    name: "linkedin_cancel_scheduled_post",
    arguments: {
      id: scheduledItem.id,
    },
  });
  assert.ok(!cancelRes.isError, `Cancel failed: ${JSON.stringify(cancelRes)}`);

  // 6. Test argument validation (reject invalid input)
  console.error("Testing schema validation...");
  const invalidRes = await client.callTool({
    name: "linkedin_format_post",
    arguments: {
      text: "", // min(1) constraint must reject empty string
    },
  });
  assert.equal(invalidRes.isError, true, "Empty text must be rejected with an error");

  // 7. Test resources
  const { resources } = await client.listResources();
  console.error(`Registered resources (${resources.length}):`, resources.map((r) => r.uri));
  assert.ok(resources.some((r) => r.uri === "linkedin://queue"));
  assert.ok(resources.some((r) => r.uri === "linkedin://status"));

  // 8. Test prompts
  const { prompts } = await client.listPrompts();
  console.error(`Registered prompts (${prompts.length}):`, prompts.map((p) => p.name));
  assert.ok(prompts.some((p) => p.name === "draft_linkedin_post"));

  await client.close();
  console.error("🎉 All smoke tests passed successfully!");
}

main().catch((err) => {
  console.error("Smoke test failed with error:", err);
  process.exit(1);
});
