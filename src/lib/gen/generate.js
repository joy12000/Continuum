export async function generateWithFallback(prompt, apiBase = "/api") {
    try {
        const r = await fetch(`${apiBase}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
        });
        if (r.ok) {
            const data = await r.json();
            // Ensure the response has the expected structure
            if (data && Array.isArray(data.answerSegments) && Array.isArray(data.sourceNotes)) {
                return data;
            }
        }
        // Throw an error if the response is not ok or malformed
        throw new Error(`API request failed with status ${r.status}`);
    }
    catch (e) {
        console.error("Generation API call failed, using fallback.", e);
        // Fallback response conforms to the new structure
        return {
            answerSegments: [
                { sentence: "The generation API is not available.", sourceNoteId: "fallback-1" },
                { sentence: "This is a local fallback response.", sourceNoteId: "fallback-2" },
                { sentence: "Please check your settings for the Generate API endpoint.", sourceNoteId: "fallback-3" },
            ],
            sourceNotes: [],
        };
    }
}
