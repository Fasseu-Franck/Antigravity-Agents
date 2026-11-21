import path from "node:path";
export const API_CONSTANTS = {
    REST_BASE_URL: "https://api.linkedin.com/rest",
    V2_BASE_URL: "https://api.linkedin.com/v2",
    DEFAULT_API_VERSION: "202401",
    MAX_POST_LENGTH: 3000,
    OPTIMAL_HOOK_LENGTH: 210,
    CHARACTER_LIMIT: 25_000, // MCP response character cap
};
export const CONFIG = {
    get accessToken() {
        return process.env.LINKEDIN_ACCESS_TOKEN;
    },
    get defaultAuthorUrn() {
        return process.env.LINKEDIN_AUTHOR_URN;
    },
    get apiVersion() {
        return process.env.LINKEDIN_API_VERSION || API_CONSTANTS.DEFAULT_API_VERSION;
    },
    get queueFilePath() {
        return (process.env.LINKEDIN_QUEUE_FILE ||
            path.resolve(process.cwd(), "linkedin-queue.json"));
    },
    get transport() {
        return process.env.TRANSPORT === "http" ? "http" : "stdio";
    },
    get port() {
        return Number(process.env.PORT || 3000);
    },
};
//# sourceMappingURL=constants.js.map