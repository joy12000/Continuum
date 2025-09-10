export declare function ensureLocalReady(): Promise<boolean>;
export declare function embedLocal(texts: string[] | string, _opts?: any): Promise<number[][]>;
export declare function findSimilar(text: string, topK: number): Promise<any>;
export declare class SemWorkerClient {
    ensure(_?: any): Promise<boolean>;
    ensureReady(_?: any): Promise<boolean>;
    ensureLocalReady(): Promise<boolean>;
    embed(texts: string[] | string, opts?: any): Promise<number[][]>;
    similar(text: string, topK: number): Promise<any>;
    static ensure(_?: any): Promise<boolean>;
    static ensureReady(_?: any): Promise<boolean>;
    static ensureLocalReady(): Promise<boolean>;
    static embed(texts: string[] | string, opts?: any): Promise<number[][]>;
    static similar(text: string, topK: number): Promise<any>;
}
//# sourceMappingURL=semWorkerClient.d.ts.map