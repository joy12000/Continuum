type Toast = {
    id: string;
    text: string;
    ts: number;
    type: 'info' | 'success' | 'error' | 'warn';
};
type Sub = (items: Toast[]) => void;
export declare const toast: {
    info: (text: string) => void;
    success: (text: string) => void;
    error: (text: string) => void;
    warn: (text: string) => void;
};
export declare function subscribe(fn: Sub): () => void;
export {};
//# sourceMappingURL=toast.d.ts.map