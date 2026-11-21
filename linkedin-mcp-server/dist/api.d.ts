import { Profile, Organization, PostVisibility, PostMetrics } from "./types.js";
export declare class LinkedInApiError extends Error {
    readonly status: number;
    readonly statusText: string;
    readonly responseBody?: unknown | undefined;
    constructor(status: number, statusText: string, responseBody?: unknown | undefined, customMessage?: string);
}
export declare function getAuthenticatedProfile(signal?: AbortSignal): Promise<Profile>;
export declare function getManagedOrganizations(signal?: AbortSignal): Promise<Organization[]>;
export interface CreatePostOptions {
    authorUrn?: string;
    commentary: string;
    visibility?: PostVisibility;
    article?: {
        source: string;
        title?: string;
        description?: string;
        thumbnail?: string;
    };
    mediaUrn?: string;
    signal?: AbortSignal;
}
export declare function createLinkedInPost(options: CreatePostOptions): Promise<{
    postUrn: string;
    id: string;
}>;
export declare function getLinkedInPost(postUrn: string, signal?: AbortSignal): Promise<Record<string, unknown>>;
export declare function deleteLinkedInPost(postUrn: string, signal?: AbortSignal): Promise<boolean>;
export declare function listLinkedInPosts(authorUrn?: string, count?: number, signal?: AbortSignal): Promise<Array<Record<string, unknown>>>;
export declare function uploadLinkedInImage(imagePathOrUrl: string, ownerUrn?: string, signal?: AbortSignal): Promise<{
    imageUrn: string;
}>;
export declare function uploadLinkedInDocument(docPathOrUrl: string, title: string, ownerUrn?: string, signal?: AbortSignal): Promise<{
    documentUrn: string;
}>;
export declare function addLinkedInComment(postUrn: string, text: string, actorUrn?: string, signal?: AbortSignal): Promise<{
    commentUrn?: string;
    success: boolean;
}>;
export declare function getLinkedInPostMetrics(postUrn: string, signal?: AbortSignal): Promise<PostMetrics>;
