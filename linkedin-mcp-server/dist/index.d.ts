#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/server";
/**
 * Server factory: returns a fresh McpServer instance on every invocation.
 */
export declare function createServer(): McpServer;
