"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Owns local input state and debounces writes to a single URL search param,
 * merging with whatever other params are currently in the URL. Meant to be
 * called from a small leaf component rather than a full table — isolating
 * this state to its own component means typing only re-renders the input,
 * not the whole row list beneath it.
 */
export function useDebouncedSearchParam(
  paramName: string,
  pathname: string,
  delayMs = 300,
): readonly [string, (value: string) => void] {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(paramName) ?? "");

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (value.trim()) params.set(paramName, value.trim());
      else params.delete(paramName);
      router.replace(`${pathname}?${params.toString()}`);
    }, delayMs);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run only when the debounced value changes
  }, [value]);

  return [value, setValue] as const;
}
