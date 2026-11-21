import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { uploadLinkedInImage, uploadLinkedInDocument } from "../api.js";
import { ResponseFormat } from "../types.js";

export function registerMediaTools(server: McpServer): void {
  server.registerTool(
    "linkedin_upload_image",
    {
      title: "Upload LinkedIn Image",
      description: `Upload an image to LinkedIn and obtain an image URN (urn:li:image:...).
Supports local image file paths (.png, .jpg, .jpeg, .webp, .gif) or web URLs.
The returned image URN can be directly attached to a post via 'linkedin_create_post' or 'linkedin_schedule_post'.`,
      inputSchema: z.strictObject({
        image_path_or_url: z
          .string()
          .min(1)
          .describe("Local file path (e.g. 'C:/images/chart.png' or './banner.jpg') or a public HTTPS image URL."),
        owner_urn: z
          .string()
          .optional()
          .describe("Author or Organization URN who will own the image. Defaults to authenticated user."),
        response_format: z
          .enum([ResponseFormat.MARKDOWN, ResponseFormat.JSON])
          .default(ResponseFormat.MARKDOWN)
          .describe("'markdown' for readable summary, 'json' for raw structured data"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ image_path_or_url, owner_urn, response_format }, ctx) => {
      const result = await uploadLinkedInImage(image_path_or_url, owner_urn, ctx.mcpReq.signal);

      const structured = {
        success: true,
        imageUrn: result.imageUrn,
        source: image_path_or_url,
      };

      if (response_format === ResponseFormat.JSON) {
        return {
          content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
          structuredContent: structured,
        };
      }

      const text = [
        "## ✅ LinkedIn Image Uploaded Successfully!",
        `- **Image URN**: \`${result.imageUrn}\``,
        `- **Source**: ${image_path_or_url}`,
        "",
        "You can now use this URN as `media_urn` in `linkedin_create_post` or `linkedin_schedule_post`.",
      ].join("\n");

      return {
        content: [{ type: "text", text }],
        structuredContent: structured,
      };
    }
  );

  server.registerTool(
    "linkedin_upload_document",
    {
      title: "Upload LinkedIn Document / Carousel",
      description: `Upload a PDF document or presentation to LinkedIn and obtain a document URN (urn:li:document:...).
On LinkedIn, multi-page PDFs are displayed as native interactive carousels / slide decks.
Supports local PDF file paths or public web URLs.`,
      inputSchema: z.strictObject({
        document_path_or_url: z
          .string()
          .min(1)
          .describe("Local file path (e.g. './presentation.pdf') or a public HTTPS PDF URL."),
        title: z
          .string()
          .min(1)
          .max(255)
          .default("Document")
          .describe("Title of the document / carousel displayed in the LinkedIn post."),
        owner_urn: z
          .string()
          .optional()
          .describe("Author or Organization URN who will own the document. Defaults to authenticated user."),
        response_format: z
          .enum([ResponseFormat.MARKDOWN, ResponseFormat.JSON])
          .default(ResponseFormat.MARKDOWN)
          .describe("'markdown' for readable summary, 'json' for raw structured data"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ document_path_or_url, title, owner_urn, response_format }, ctx) => {
      const result = await uploadLinkedInDocument(
        document_path_or_url,
        title,
        owner_urn,
        ctx.mcpReq.signal
      );

      const structured = {
        success: true,
        documentUrn: result.documentUrn,
        title,
        source: document_path_or_url,
      };

      if (response_format === ResponseFormat.JSON) {
        return {
          content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
          structuredContent: structured,
        };
      }

      const text = [
        "## ✅ LinkedIn Document Carousel Uploaded Successfully!",
        `- **Document URN**: \`${result.documentUrn}\``,
        `- **Title**: ${title}`,
        `- **Source**: ${document_path_or_url}`,
        "",
        "You can now use this URN as `media_urn` in `linkedin_create_post` or `linkedin_schedule_post`.",
      ].join("\n");

      return {
        content: [{ type: "text", text }],
        structuredContent: structured,
      };
    }
  );
}
