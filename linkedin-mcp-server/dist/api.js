import { API_CONSTANTS, CONFIG } from "./constants.js";
import { PostVisibility, PostLifecycleState, } from "./types.js";
import fs from "node:fs/promises";
import path from "node:path";
export class LinkedInApiError extends Error {
    status;
    statusText;
    responseBody;
    constructor(status, statusText, responseBody, customMessage) {
        super(customMessage || formatLinkedInErrorMessage(status, responseBody));
        this.status = status;
        this.statusText = statusText;
        this.responseBody = responseBody;
        this.name = "LinkedInApiError";
    }
}
function formatLinkedInErrorMessage(status, responseBody) {
    const details = typeof responseBody === "object" && responseBody !== null
        ? JSON.stringify(responseBody)
        : String(responseBody || "");
    switch (status) {
        case 400:
            return `LinkedIn API Bad Request (400). The request parameters were invalid. Details: ${details}`;
        case 401:
            return "LinkedIn Authentication Error (401): The access token is missing, expired, or invalid. Please check your LINKEDIN_ACCESS_TOKEN environment variable.";
        case 403:
            return `LinkedIn Permission Error (403): Missing required OAuth 2.0 scopes. Ensure your application has 'w_member_social' (or 'w_organization_social'), 'openid', 'profile', and 'email'. Details: ${details}`;
        case 404:
            return `LinkedIn Resource Not Found (404): The requested post, profile, or media URN was not found. Details: ${details}`;
        case 422:
            return `LinkedIn Validation Error (422): Unprocessable entity. Check commentary length (max 3000 chars), URN format, or media attachments. Details: ${details}`;
        case 429:
            return "LinkedIn Rate Limit Exceeded (429): You have exceeded your LinkedIn API quota. Please wait before retrying.";
        default:
            return `LinkedIn API returned HTTP ${status}: ${details}`;
    }
}
async function request(endpoint, options = {}) {
    const token = CONFIG.accessToken;
    if (!token) {
        throw new LinkedInApiError(401, "Unauthorized", undefined, "LINKEDIN_ACCESS_TOKEN is not configured. Please define the LINKEDIN_ACCESS_TOKEN environment variable with a valid OAuth 2.0 token.");
    }
    const { method = "GET", headers = {}, body, isRestApi = true, signal } = options;
    const baseUrl = isRestApi ? API_CONSTANTS.REST_BASE_URL : API_CONSTANTS.V2_BASE_URL;
    const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}/${endpoint.replace(/^\//, "")}`;
    const requestHeaders = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...headers,
    };
    if (isRestApi) {
        requestHeaders["LinkedIn-Version"] = CONFIG.apiVersion;
        requestHeaders["X-Restli-Protocol-Version"] = "2.0.0";
    }
    let requestBody = undefined;
    if (body !== undefined) {
        requestHeaders["Content-Type"] = "application/json";
        requestBody = JSON.stringify(body);
    }
    const combinedSignal = signal
        ? AbortSignal.any([signal, AbortSignal.timeout(30_000)])
        : AbortSignal.timeout(30_000);
    let response;
    try {
        response = await fetch(url, {
            method,
            headers: requestHeaders,
            body: requestBody,
            signal: combinedSignal,
        });
    }
    catch (err) {
        if (err instanceof DOMException && err.name === "TimeoutError") {
            throw new Error("LinkedIn API request timed out after 30 seconds.");
        }
        throw err;
    }
    let parsedBody;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        try {
            parsedBody = await response.json();
        }
        catch {
            parsedBody = null;
        }
    }
    else {
        parsedBody = await response.text();
    }
    if (!response.ok) {
        throw new LinkedInApiError(response.status, response.statusText, parsedBody);
    }
    return { data: parsedBody, headers: response.headers };
}
// ---------------------------------------------------------------------------
// PROFILE & ORGANIZATIONS
// ---------------------------------------------------------------------------
export async function getAuthenticatedProfile(signal) {
    // 1. Try OpenID userinfo endpoint
    try {
        const { data } = await request("userinfo", { isRestApi: false, signal });
        if (data && data.sub) {
            return {
                id: data.sub,
                urn: `urn:li:person:${data.sub}`,
                name: data.name || `${data.given_name || ""} ${data.family_name || ""}`.trim() || "LinkedIn User",
                firstName: data.given_name,
                lastName: data.family_name,
                email: data.email,
                picture: data.picture,
            };
        }
    }
    catch {
        // fallback to /v2/me if OpenID endpoint fails
    }
    // 2. Try legacy /v2/me
    const { data: meData } = await request("me", { isRestApi: false, signal });
    const name = `${meData.localizedFirstName || ""} ${meData.localizedLastName || ""}`.trim() || meData.vanityName || meData.id;
    return {
        id: meData.id,
        urn: `urn:li:person:${meData.id}`,
        name,
        firstName: meData.localizedFirstName,
        lastName: meData.localizedLastName,
    };
}
export async function getManagedOrganizations(signal) {
    try {
        const { data } = await request("organizationalEntityAcls?q=roleAssignee", { isRestApi: false, signal });
        if (!data.elements || !Array.isArray(data.elements)) {
            return [];
        }
        return data.elements.map((el) => {
            const urn = el.organizationalTarget || "";
            const id = urn.replace("urn:li:organization:", "");
            return {
                id,
                urn,
                role: el.role,
            };
        });
    }
    catch {
        return [];
    }
}
export async function createLinkedInPost(options) {
    let author = options.authorUrn || CONFIG.defaultAuthorUrn;
    if (!author) {
        const profile = await getAuthenticatedProfile(options.signal);
        author = profile.urn;
    }
    const visibility = options.visibility || PostVisibility.PUBLIC;
    const payload = {
        author,
        commentary: options.commentary,
        visibility,
        distribution: {
            feedDistribution: "MAIN_FEED",
            targetEntities: [],
            thirdPartyDistributionChannels: [],
        },
        lifecycleState: PostLifecycleState.PUBLISHED,
    };
    if (options.mediaUrn) {
        payload.content = {
            media: {
                id: options.mediaUrn,
            },
        };
    }
    else if (options.article?.source) {
        payload.content = {
            article: {
                source: options.article.source,
                title: options.article.title || undefined,
                description: options.article.description || undefined,
                thumbnail: options.article.thumbnail || undefined,
            },
        };
    }
    const { headers, data } = await request("posts", {
        method: "POST",
        body: payload,
        isRestApi: true,
        signal: options.signal,
    });
    // Post URN is returned in the 'x-restli-id' header or response body
    const postUrn = headers.get("x-restli-id") ||
        (typeof data === "object" && data !== null && data.id) ||
        "";
    return {
        postUrn,
        id: postUrn.replace("urn:li:share:", "").replace("urn:li:ugcPost:", "").replace("urn:li:post:", ""),
    };
}
export async function getLinkedInPost(postUrn, signal) {
    const encoded = encodeURIComponent(postUrn);
    const { data } = await request(`posts/${encoded}`, {
        method: "GET",
        isRestApi: true,
        signal,
    });
    return data;
}
export async function deleteLinkedInPost(postUrn, signal) {
    const encoded = encodeURIComponent(postUrn);
    await request(`posts/${encoded}`, {
        method: "DELETE",
        isRestApi: true,
        signal,
    });
    return true;
}
export async function listLinkedInPosts(authorUrn, count = 10, signal) {
    let author = authorUrn || CONFIG.defaultAuthorUrn;
    if (!author) {
        const profile = await getAuthenticatedProfile(signal);
        author = profile.urn;
    }
    const encodedAuthor = encodeURIComponent(author);
    const { data } = await request(`posts?author=${encodedAuthor}&q=author&count=${count}`, {
        method: "GET",
        isRestApi: true,
        signal,
    });
    return data.elements || [];
}
// ---------------------------------------------------------------------------
// MEDIA UPLOAD (IMAGES & DOCUMENTS / CAROUSELS)
// ---------------------------------------------------------------------------
export async function uploadLinkedInImage(imagePathOrUrl, ownerUrn, signal) {
    let owner = ownerUrn || CONFIG.defaultAuthorUrn;
    if (!owner) {
        const profile = await getAuthenticatedProfile(signal);
        owner = profile.urn;
    }
    // 1. Initialize image upload
    const initPayload = {
        initializeUploadRequest: {
            owner,
        },
    };
    const { data: initData } = await request("images?action=initializeUpload", {
        method: "POST",
        body: initPayload,
        isRestApi: true,
        signal,
    });
    const uploadUrl = initData.value.uploadUrl;
    const imageUrn = initData.value.image;
    // 2. Read image buffer
    let imageBuffer;
    let contentType = "image/jpeg";
    if (imagePathOrUrl.startsWith("http://") || imagePathOrUrl.startsWith("https://")) {
        const imgRes = await fetch(imagePathOrUrl, { signal });
        if (!imgRes.ok) {
            throw new Error(`Failed to fetch image from URL: ${imagePathOrUrl} (${imgRes.status})`);
        }
        const arrayBuf = await imgRes.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuf);
        contentType = imgRes.headers.get("content-type") || "image/jpeg";
    }
    else {
        const resolvedPath = path.resolve(imagePathOrUrl);
        imageBuffer = await fs.readFile(resolvedPath);
        const ext = path.extname(resolvedPath).toLowerCase();
        if (ext === ".png")
            contentType = "image/png";
        else if (ext === ".webp")
            contentType = "image/webp";
        else if (ext === ".gif")
            contentType = "image/gif";
        else
            contentType = "image/jpeg";
    }
    // 3. Upload binary to LinkedIn uploadUrl
    const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
            "Content-Type": contentType,
        },
        body: new Uint8Array(imageBuffer),
        signal,
    });
    if (!uploadRes.ok) {
        throw new LinkedInApiError(uploadRes.status, "Failed to upload image binary to LinkedIn", await uploadRes.text());
    }
    return { imageUrn };
}
export async function uploadLinkedInDocument(docPathOrUrl, title, ownerUrn, signal) {
    let owner = ownerUrn || CONFIG.defaultAuthorUrn;
    if (!owner) {
        const profile = await getAuthenticatedProfile(signal);
        owner = profile.urn;
    }
    // 1. Initialize document upload
    const initPayload = {
        initializeUploadRequest: {
            owner,
        },
    };
    const { data: initData } = await request("documents?action=initializeUpload", {
        method: "POST",
        body: initPayload,
        isRestApi: true,
        signal,
    });
    const uploadUrl = initData.value.uploadUrl;
    const documentUrn = initData.value.document;
    // 2. Read document buffer
    let docBuffer;
    let contentType = "application/pdf";
    if (docPathOrUrl.startsWith("http://") || docPathOrUrl.startsWith("https://")) {
        const docRes = await fetch(docPathOrUrl, { signal });
        if (!docRes.ok) {
            throw new Error(`Failed to fetch document from URL: ${docPathOrUrl} (${docRes.status})`);
        }
        const arrayBuf = await docRes.arrayBuffer();
        docBuffer = Buffer.from(arrayBuf);
        contentType = docRes.headers.get("content-type") || "application/pdf";
    }
    else {
        const resolvedPath = path.resolve(docPathOrUrl);
        docBuffer = await fs.readFile(resolvedPath);
        contentType = "application/pdf";
    }
    // 3. Upload binary
    const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
            "Content-Type": contentType,
        },
        body: new Uint8Array(docBuffer),
        signal,
    });
    if (!uploadRes.ok) {
        throw new LinkedInApiError(uploadRes.status, "Failed to upload document binary to LinkedIn", await uploadRes.text());
    }
    return { documentUrn };
}
// ---------------------------------------------------------------------------
// SOCIAL ACTIONS & ENGAGEMENT (COMMENTS, ANALYTICS)
// ---------------------------------------------------------------------------
export async function addLinkedInComment(postUrn, text, actorUrn, signal) {
    let actor = actorUrn || CONFIG.defaultAuthorUrn;
    if (!actor) {
        const profile = await getAuthenticatedProfile(signal);
        actor = profile.urn;
    }
    const encodedPost = encodeURIComponent(postUrn);
    const { headers } = await request(`socialActions/${encodedPost}/comments`, {
        method: "POST",
        body: {
            actor,
            message: {
                text,
            },
        },
        isRestApi: true,
        signal,
    });
    const commentUrn = headers.get("x-restli-id") || undefined;
    return { commentUrn, success: true };
}
export async function getLinkedInPostMetrics(postUrn, signal) {
    const encoded = encodeURIComponent(postUrn);
    try {
        const { data } = await request(`socialMetadata/${encoded}`, {
            method: "GET",
            isRestApi: true,
            signal,
        });
        return {
            postUrn,
            numLikes: data.likesSummary?.totalLikes || 0,
            numComments: data.commentsSummary?.totalComments || 0,
            numShares: data.sharesSummary?.totalShares || 0,
        };
    }
    catch {
        // If socialMetadata fails, return zeros
        return {
            postUrn,
            numLikes: 0,
            numComments: 0,
            numShares: 0,
        };
    }
}
//# sourceMappingURL=api.js.map