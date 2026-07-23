"use client";

import { useRef } from "react";
import type { PointerEvent } from "react";

interface LongPressHandlers {
  onPointerDown: (event: PointerEvent) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
}

/**
 * Returns pointer-event handlers that fire `onLongPress` after holding for
 * `thresholdMs`, and cancel cleanly on release/leave/cancel — used to enter
 * multi-select mode on touch devices without hijacking a normal tap/click.
 */
export function useLongPress(onLongPress: () => void, thresholdMs = 500): LongPressHandlers {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clear() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  return {
    onPointerDown: () => {
      clear();
      timeoutRef.current = setTimeout(onLongPress, thresholdMs);
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
  };
}
