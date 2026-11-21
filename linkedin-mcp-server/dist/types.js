import * as z from "zod/v4";
export var ResponseFormat;
(function (ResponseFormat) {
    ResponseFormat["MARKDOWN"] = "markdown";
    ResponseFormat["JSON"] = "json";
})(ResponseFormat || (ResponseFormat = {}));
export var PostVisibility;
(function (PostVisibility) {
    PostVisibility["PUBLIC"] = "PUBLIC";
    PostVisibility["CONNECTIONS"] = "CONNECTIONS";
})(PostVisibility || (PostVisibility = {}));
export var PostLifecycleState;
(function (PostLifecycleState) {
    PostLifecycleState["PUBLISHED"] = "PUBLISHED";
    PostLifecycleState["DRAFT"] = "DRAFT";
})(PostLifecycleState || (PostLifecycleState = {}));
export var QueueStatus;
(function (QueueStatus) {
    QueueStatus["SCHEDULED"] = "scheduled";
    QueueStatus["PUBLISHED"] = "published";
    QueueStatus["FAILED"] = "failed";
    QueueStatus["CANCELLED"] = "cancelled";
})(QueueStatus || (QueueStatus = {}));
export const ProfileSchema = z.object({
    id: z.string(),
    urn: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    name: z.string(),
    email: z.string().optional(),
    picture: z.string().optional(),
});
export const OrganizationSchema = z.object({
    id: z.string(),
    urn: z.string(),
    name: z.string().optional(),
    vanityName: z.string().optional(),
    role: z.string().optional(),
});
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
export const PostMetricsSchema = z.object({
    postUrn: z.string(),
    numLikes: z.number().default(0),
    numComments: z.number().default(0),
    numShares: z.number().default(0),
    numImpressions: z.number().optional(),
    numClicks: z.number().optional(),
    engagementRate: z.number().optional(),
});
//# sourceMappingURL=types.js.map