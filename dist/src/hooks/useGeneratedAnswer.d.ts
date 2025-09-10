import { AnswerData } from '../types/common';
export declare function useGeneratedAnswer(): {
    answerOpen: boolean;
    setAnswerOpen: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    generatedAnswer: {
        data: AnswerData | null;
        isLoading: boolean;
        error: string | null;
    };
    answerSignal: number;
};
//# sourceMappingURL=useGeneratedAnswer.d.ts.map