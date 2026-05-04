/**
 * useLongPress
 * - onLongPress fires after `delay` ms while pointer is down (touch or mouse)
 * - returns handlers to spread onto target element
 */
export declare function useLongPress(onLongPress: (e: PointerEvent) => void, { delay }?: {
    delay?: number;
}): {
    onPointerDown: (e: any) => void;
    onPointerUp: (e: any) => void;
    onPointerCancel: () => void;
};
//# sourceMappingURL=useLongPress.d.ts.map
