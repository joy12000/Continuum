/**
 * Represents the structured result of parsing a search query.
 */
export interface ParsedQuery {
    /** The main keywords for the search. */
    keywords: string;
    /** Keywords to exclude from the results. */
    excludedKeywords: string[];
    /** Date filter to apply to the notes. */
    dateFilter: {
        operator: '>=' | '<=';
        value: Date;
    } | null;
}
/**
 * Parses a raw search query string to extract keywords, exclusions, and filters.
 *
 * - Exclusions are denoted by a leading hyphen, e.g., "-work".
 * - Date filters use "date>=" or "date<=" followed by YYYY-MM-DD, e.g., "date>=2024-01-15".
 *
 * @param {string} query - The raw query string from the user.
 * @returns {ParsedQuery} A structured object representing the parsed query.
 */
export declare function parseQuery(query: string): ParsedQuery;
//# sourceMappingURL=parser.d.ts.map
