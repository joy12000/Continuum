/**
 * Parses a raw search query string to extract keywords, exclusions, and filters.
 *
 * - Exclusions are denoted by a leading hyphen, e.g., "-work".
 * - Date filters use "date>=" or "date<=" followed by YYYY-MM-DD, e.g., "date>=2024-01-15".
 *
 * @param {string} query - The raw query string from the user.
 * @returns {ParsedQuery} A structured object representing the parsed query.
 */
export function parseQuery(query) {
    const tokens = query.split(/\s+/);
    const keywords = [];
    const excludedKeywords = [];
    let dateFilter = null;
    const dateRegex = /^(date)(>=|<=)(\d{4}-\d{2}-\d{2})$/;
    for (const token of tokens) {
        if (token.startsWith('-')) {
            if (token.length > 1) {
                excludedKeywords.push(token.substring(1).toLowerCase());
            }
        }
        else {
            const dateMatch = token.match(dateRegex);
            if (dateMatch) {
                const [, , operator, dateStr] = dateMatch;
                const date = new Date(dateStr);
                // Adjust to the start or end of the day depending on the operator
                if (operator === '>=') {
                    date.setHours(0, 0, 0, 0);
                }
                else { // '<='
                    date.setHours(23, 59, 59, 999);
                }
                if (!isNaN(date.getTime())) {
                    dateFilter = { operator: operator, value: date };
                }
            }
            else {
                keywords.push(token);
            }
        }
    }
    return {
        keywords: keywords.join(' '),
        excludedKeywords,
        dateFilter,
    };
}
