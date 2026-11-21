import * as z from "zod/v4";

export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json",
}

export enum PostVisibility {
  PUBLIC = "PUBLIC",
  CONNECTIONS = "CONNECTIONS",
}

export enum PostLifecycleState {
  PUBLISHED = "PUBLISHED",
  DRAFT = "DRAFT",
}

export enum QueueStatus {
  SCHEDULED = "scheduled",
  PUBLISHED = "published",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export const ProfileSchema = z.object({
  id: z.string(),
  urn: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  name: z.string(),
  email: z.string().optional(),
  picture: z.string().optional(),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const OrganizationSchema = z.object({
  id: z.string(),
  urn: z.string(),
  name: z.string().optional(),
  vanityName: z.string().optional(),
  role: z.string().optional(),
});
export type Organization = z.infer<typeof OrganizationSchema>;

export const PostArticleSchema = z.object({
  source: z.string().describe("Target article or webpage URL"),
  title: z.string().optional().describe("Preview title"),
  description: z.string().optional().describe("Preview description"),
  thumbnail: z.string().optional().describe("Thumbnail image URN or URL"),
});

export const ScheduledPostItemSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  scheduledTime: z.string().describe("ISO 8601 target publish date & time"),
  status: z.enum([
    QueueStatus.SCHEDULED,
    QueueStatus.PUBLISHED,
    QueueStatus.FAILED,
    QueueStatus.CANCELLED,
  ]),
  authorUrn: z.string(),
  commentary: z.string(),
  visibility: z.enum([PostVisibility.PUBLIC, PostVisibility.CONNECTIONS]),
  article: PostArticleSchema.optional(),
  mediaUrn: z.string().optional().describe("Image or document URN"),
  firstComment: z.string().optional().describe("Optional comment to post immediately after publication"),
  publishedAt: z.string().optional(),
  postUrn: z.string().optional(),
  error: z.string().optional(),
});
export type ScheduledPostItem = z.infer<typeof ScheduledPostItemSchema>;

export const PostMetricsSchema = z.object({
  postUrn: z.string(),
  numLikes: z.number().default(0),
  numComments: z.number().default(0),
  numShares: z.number().default(0),
  numImpressions: z.number().optional(),
  numClicks: z.number().optional(),
  engagementRate: z.number().optional(),
});
export type PostMetrics = z.infer<typeof PostMetricsSchema>;
