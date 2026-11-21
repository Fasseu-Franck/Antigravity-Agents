import { API_CONSTANTS } from "./constants.js";
// Unicode offsets for Mathematical Bold Sans-Serif
const BOLD_UPPER_OFFSET = 0x1d5d4 - 0x41; // 'A' -> '𝗔'
const BOLD_LOWER_OFFSET = 0x1d5ee - 0x61; // 'a' -> '𝗮'
const BOLD_DIGIT_OFFSET = 0x1d7ec - 0x30; // '0' -> '𝟬'
// Unicode offsets for Mathematical Italic Sans-Serif
const ITALIC_UPPER_OFFSET = 0x1d608 - 0x41; // 'A' -> '𝘈'
const ITALIC_LOWER_OFFSET = 0x1d622 - 0x61; // 'a' -> '𝘢'
export function toUnicodeBold(text) {
    let result = "";
    for (const char of text) {
        const code = char.codePointAt(0) || 0;
        if (code >= 0x41 && code <= 0x5a) {
            result += String.fromCodePoint(code + BOLD_UPPER_OFFSET);
        }
        else if (code >= 0x61 && code <= 0x7a) {
            result += String.fromCodePoint(code + BOLD_LOWER_OFFSET);
        }
        else if (code >= 0x30 && code <= 0x39) {
            result += String.fromCodePoint(code + BOLD_DIGIT_OFFSET);
        }
        else {
            result += char;
        }
    }
    return result;
}
export function toUnicodeItalic(text) {
    let result = "";
    for (const char of text) {
        const code = char.codePointAt(0) || 0;
        if (code >= 0x41 && code <= 0x5a) {
            result += String.fromCodePoint(code + ITALIC_UPPER_OFFSET);
        }
        else if (code >= 0x61 && code <= 0x7a) {
            result += String.fromCodePoint(code + ITALIC_LOWER_OFFSET);
        }
        else {
            result += char;
        }
    }
    return result;
}
export function convertMarkdownStylesToUnicode(text) {
    // Replace **bold** with Unicode bold
    let converted = text.replace(/\*\*(.*?)\*\*/g, (_, p1) => toUnicodeBold(p1));
    // Replace *italic* with Unicode italic
    converted = converted.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, (_, p1) => toUnicodeItalic(p1));
    return converted;
}
export function auditAndFormatPost(rawText, convertMarkdown = true) {
    const cleanFormattedText = convertMarkdown ? convertMarkdownStylesToUnicode(rawText) : rawText;
    const characterCount = Array.from(cleanFormattedText).length;
    const maxCharacters = API_CONSTANTS.MAX_POST_LENGTH;
    const charactersRemaining = maxCharacters - characterCount;
    const isWithinLimit = characterCount <= maxCharacters;
    // Hook analysis (first 2-3 lines or ~210 characters before "...voir plus" / "see more")
    const lines = cleanFormattedText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const firstLines = lines.slice(0, 3).join("\n");
    const previewText = firstLines.slice(0, API_CONSTANTS.OPTIMAL_HOOK_LENGTH);
    const hookCharacterCount = Array.from(previewText).length;
    const hookRecommendations = [];
    let cutoffRisk = "low";
    if (firstLines.length > 210) {
        cutoffRisk = "high";
        hookRecommendations.push("The hook text exceeds 210 characters. On mobile and desktop, LinkedIn will truncate the text with '...voir plus'. Shorten the first 2-3 lines so your value proposition or punchline appears before the fold.");
    }
    else if (lines.length >= 1 && lines[0].length < 30) {
        hookRecommendations.push("First line is very short. Make sure it creates high curiosity or asks a compelling question.");
    }
    // Hashtag analysis
    const hashtagRegex = /#([\p{L}\p{N}_]+)/gu;
    const foundTags = [];
    let match;
    while ((match = hashtagRegex.exec(cleanFormattedText)) !== null) {
        foundTags.push(match[1]);
    }
    const hashtagRecommendations = [];
    if (foundTags.length === 0) {
        hashtagRecommendations.push("No hashtags detected. Adding 3 to 5 targeted hashtags improves algorithmic discovery on LinkedIn.");
    }
    else if (foundTags.length > 5) {
        hashtagRecommendations.push(`You have ${foundTags.length} hashtags. LinkedIn's algorithm penalizes posts with more than 5 hashtags as spam. Reduce to 3-5 high-relevance hashtags.`);
    }
    // Call to action check
    const ctaIndicators = [
        "comment", "dites-moi", "partagez", "avis", "lien", "qu'en pensez-vous",
        "share your", "what do you think", "let me know", "link", "?", "👇"
    ];
    const lower = cleanFormattedText.toLowerCase();
    const hasCallToAction = ctaIndicators.some((indicator) => lower.includes(indicator));
    return {
        characterCount,
        maxCharacters,
        charactersRemaining,
        isWithinLimit,
        hook: {
            previewText,
            hookCharacterCount,
            linesInHook: lines.slice(0, 3).length,
            cutoffRisk,
            recommendations: hookRecommendations,
        },
        hashtags: {
            count: foundTags.length,
            tags: foundTags,
            recommendations: hashtagRecommendations,
        },
        hasCallToAction,
        cleanFormattedText,
    };
}
//# sourceMappingURL=formatter.js.map