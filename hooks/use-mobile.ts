import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/** True for tablet-width viewports (>=768px and <1024px) — desktop stays fully expanded, mobile uses the drawer. */
function subscribeTablet(callback: () => void) {
  const mql = window.matchMedia(
    `(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${TABLET_BREAKPOINT - 1}px)`
  )
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

function getTabletSnapshot() {
  return window.innerWidth >= MOBILE_BREAKPOINT && window.innerWidth < TABLET_BREAKPOINT
}

export function useIsTablet() {
  return React.useSyncExternalStore(subscribeTablet, getTabletSnapshot, getServerSnapshot)
}
