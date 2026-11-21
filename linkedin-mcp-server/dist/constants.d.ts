export declare const API_CONSTANTS: {
    REST_BASE_URL: string;
    V2_BASE_URL: string;
    DEFAULT_API_VERSION: string;
    MAX_POST_LENGTH: number;
    OPTIMAL_HOOK_LENGTH: number;
    CHARACTER_LIMIT: number;
};
export declare const CONFIG: {
    readonly accessToken: string | undefined;
    readonly defaultAuthorUrn: string | undefined;
    readonly apiVersion: string;
    readonly queueFilePath: string;
    readonly transport: "stdio" | "http";
    readonly port: number;
};
