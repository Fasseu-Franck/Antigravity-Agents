import * as z from "zod/v4";
export declare enum ResponseFormat {
    MARKDOWN = "markdown",
    JSON = "json"
}
export declare enum PostVisibility {
    PUBLIC = "PUBLIC",
    CONNECTIONS = "CONNECTIONS"
}
export declare enum PostLifecycleState {
    PUBLISHED = "PUBLISHED",
    DRAFT = "DRAFT"
}
export declare enum QueueStatus {
    SCHEDULED = "scheduled",
    PUBLISHED = "published",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export declare const ProfileSchema: z.ZodObject<{
    id: z.ZodString;
    urn: z.ZodString;
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    picture: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type Profile = z.infer<typeof ProfileSchema>;
export declare const OrganizationSchema: z.ZodObject<{
    id: z.ZodString;
    urn: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    vanityName: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type Organization = z.infer<typeof OrganizationSchema>;
export declare const PostArticleSchema: z.ZodObject<{
    source: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    thumbnail: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ScheduledPostItemSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    scheduledTime: z.ZodString;
    status: z.ZodEnum<{
        scheduled: QueueStatus.SCHEDULED;
        published: QueueStatus.PUBLISHED;
        failed: QueueStatus.FAILED;
        cancelled: QueueStatus.CANCELLED;
    }>;
    authorUrn: z.ZodString;
    commentary: z.ZodString;
    visibility: z.ZodEnum<{
        PUBLIC: PostVisibility.PUBLIC;
        CONNECTIONS: PostVisibility.CONNECTIONS;
    }>;
    article: z.ZodOptional<z.ZodObject<{
        source: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        thumbnail: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    mediaUrn: z.ZodOptional<z.ZodString>;
    firstComment: z.ZodOptional<z.ZodString>;
    publishedAt: z.ZodOptional<z.ZodString>;
    postUrn: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ScheduledPostItem = z.infer<typeof ScheduledPostItemSchema>;
export declare const PostMetricsSchema: z.ZodObject<{
    postUrn: z.ZodString;
    numLikes: z.ZodDefault<z.ZodNumber>;
    numComments: z.ZodDefault<z.ZodNumber>;
    numShares: z.ZodDefault<z.ZodNumber>;
    numImpressions: z.ZodOptional<z.ZodNumber>;
    numClicks: z.ZodOptional<z.ZodNumber>;
    engagementRate: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type PostMetrics = z.infer<typeof PostMetricsSchema>;
