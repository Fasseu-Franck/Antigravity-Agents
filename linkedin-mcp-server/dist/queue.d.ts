import { QueueStatus, ScheduledPostItem, PostVisibility } from "./types.js";
export declare function addScheduledPost(params: {
    scheduledTime: string;
    authorUrn?: string;
    commentary: string;
    visibility?: PostVisibility;
    mediaUrn?: string;
    article?: {
        source: string;
        title?: string;
        description?: string;
        thumbnail?: string;
    };
    firstComment?: string;
}): Promise<ScheduledPostItem>;
export declare function listScheduledPosts(filter?: {
    status?: QueueStatus;
    limit?: number;
}): Promise<ScheduledPostItem[]>;
export declare function cancelScheduledPost(id: string): Promise<boolean>;
export declare function publishDuePosts(signal?: AbortSignal): Promise<{
    published: Array<{
        id: string;
        postUrn: string;
    }>;
    failed: Array<{
        id: string;
        error: string;
    }>;
    pendingCount: number;
}>;
