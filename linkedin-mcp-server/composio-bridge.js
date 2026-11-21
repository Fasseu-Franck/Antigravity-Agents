#!/usr/bin/env node
/**
 * Composio MCP Stdio Bridge
 * Bridges local stdio JSON-RPC requests to Composio's remote SSE endpoint.
 */
import readline from "node:readline";

const COMPOSIO_URL = process.env.COMPOSIO_MCP_URL || "https://connect.composio.dev/mcp";
const API_KEY = process.env.COMPOSIO_API_KEY || "ck_jiTcUhCw5ZhBFiAHumBE";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const jsonReq = JSON.parse(trimmed);

    // If it's a notification without id, we can still forward it
    const response = await fetch(COMPOSIO_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "x-consumer-api-key": API_KEY,
      },
      body: JSON.stringify(jsonReq),
    });

    const responseText = await response.text();
    // Parse SSE messages
    const lines = responseText.split("\n");
    for (const l of lines) {
      if (l.startsWith("data:")) {
        const dataStr = l.slice(5).trim();
        if (dataStr) {
          process.stdout.write(dataStr + "\n");
        }
      }
    }
  } catch (err) {
    console.error("Composio bridge error:", err);
  }
});
