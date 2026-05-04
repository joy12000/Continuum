import React from "react";
import { Note } from "../types/common";
interface Props {
    year: number;
    month: number;
    weekLabels: string[];
    notesByDate: Record<string, Note[]>;
    selectedDate: string;
    onSelectDate: (k: string) => void;
}
declare const CalendarMonth: React.FC<Props>;
export default CalendarMonth;
//# sourceMappingURL=CalendarMonth.d.ts.map
