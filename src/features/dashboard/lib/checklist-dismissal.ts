import { useSyncExternalStore } from 'react'

/*
 * The setup checklist's «بعداً» (later): hidden for the rest of this browser
 * session only (presentation `StudioChecklistCard` @ d843c3b, FQ-28 B). A
 * per-viewer convenience, so `sessionStorage`; when storage is unavailable
 * the dismissal lasts until the page is reloaded.
 */
const KEY = 'fellowa:setup-checklist-dismissed'
const listeners = new Set<() => void>()
let dismissedInMemory = false

function read(): boolean {
  if (dismissedInMemory) return true
  try {
    return window.sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function dismissChecklistForSession() {
  dismissedInMemory = true
  try {
    window.sessionStorage.setItem(KEY, '1')
  } catch {
    // Storage blocked: the in-memory flag still hides it until a reload.
  }
  for (const listener of listeners) listener()
}

/** Whether the checklist was dismissed this session; `false` on the server. */
export function useChecklistDismissed(): boolean {
  return useSyncExternalStore(subscribe, read, () => false)
}

/** Test helper: forget the dismissal. */
export function resetChecklistDismissal() {
  dismissedInMemory = false
  try {
    window.sessionStorage.removeItem(KEY)
  } catch {
    // nothing stored
  }
}
