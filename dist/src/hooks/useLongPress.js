import { useCallback, useEffect, useRef } from 'react';
/**
 * useLongPress
 * - onLongPress fires after `delay` ms while pointer is down (touch or mouse)
 * - returns handlers to spread onto target element
 */
export function useLongPress(onLongPress, { delay = 350 } = {}) {
    const timerRef = useRef(null);
    const pressedRef = useRef(false);
    const saved = useRef(onLongPress);
    saved.current = onLongPress;
    const clear = () => {
        if (timerRef.current) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        pressedRef.current = false;
    };
    useEffect(() => () => clear(), []);
    const onPointerDown = useCallback((e) => {
        pressedRef.current = true;
        e.target.setPointerCapture?.(e.pointerId);
        timerRef.current = window.setTimeout(() => {
            if (pressedRef.current)
                saved.current(e.nativeEvent || e);
        }, delay);
    }, [delay]);
    const onPointerUp = useCallback((e) => {
        pressedRef.current = false;
        e.target.releasePointerCapture?.(e.pointerId);
        clear();
    }, []);
    const onPointerCancel = useCallback(() => clear(), []);
    return { onPointerDown, onPointerUp, onPointerCancel };
}
