export declare function semanticScoreFromDistance(distance?: number): number;
export declare function keywordScore(text: string, query: string): number;
export declare function hybridScore({ distance, text, query, alpha, beta }: {
    distance?: number;
    text: string;
    query: string;
    alpha?: number;
    beta?: number;
}): number;
//# sourceMappingURL=hybridScore.d.ts.map