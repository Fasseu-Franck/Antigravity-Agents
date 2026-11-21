export declare function toUnicodeBold(text: string): string;
export declare function toUnicodeItalic(text: string): string;
export declare function convertMarkdownStylesToUnicode(text: string): string;
export interface PostAuditResult {
    characterCount: number;
    maxCharacters: number;
    charactersRemaining: number;
    isWithinLimit: boolean;
    hook: {
        previewText: string;
        hookCharacterCount: number;
        linesInHook: number;
        cutoffRisk: "low" | "medium" | "high";
        recommendations: string[];
    };
    hashtags: {
        count: number;
        tags: string[];
        recommendations: string[];
    };
    hasCallToAction: boolean;
    cleanFormattedText: string;
}
export declare function auditAndFormatPost(rawText: string, convertMarkdown?: boolean): PostAuditResult;
