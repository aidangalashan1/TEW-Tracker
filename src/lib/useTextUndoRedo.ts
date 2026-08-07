import { useCallback, useRef, useState } from 'react'

export interface TextSnapshot {
  text: string
  selStart: number
  selEnd: number
}

const COALESCE_MS = 700
const MAX_HISTORY = 200

/** Undo/redo for a single text field, independent of the browser's native
 *  undo stack. The native stack only sees real keystrokes — toolbar commands
 *  (bold, insert segment, insert image, …) mutate the textarea's value via
 *  React state, which the browser never registers as an undoable edit, so
 *  Ctrl+Z after clicking "Bold" would otherwise do nothing. Typing is
 *  coalesced into one history entry per pause so every keystroke doesn't
 *  become its own undo step; toolbar commands always push a discrete entry.
 *
 *  Backed by plain refs (not state) for the history stacks themselves, since
 *  mutating one piece of state from inside another's updater — needed for
 *  undo/redo's "pop from one stack, push onto the other" — doesn't play well
 *  with React StrictMode's double-invoked updaters. `version` just forces a
 *  re-render after each ref mutation. */
export function useTextUndoRedo(initial: string) {
  const past = useRef<TextSnapshot[]>([])
  const future = useRef<TextSnapshot[]>([])
  const present = useRef<TextSnapshot>({ text: initial, selStart: initial.length, selEnd: initial.length })
  const lastPushAt = useRef(0)
  const [, setVersion] = useState(0)
  const bump = () => setVersion(v => v + 1)

  const set = useCallback((next: TextSnapshot, discrete: boolean) => {
    const now = Date.now()
    if (discrete || !past.current.length || now - lastPushAt.current >= COALESCE_MS) {
      past.current = [...past.current, present.current].slice(-MAX_HISTORY)
    }
    lastPushAt.current = now
    future.current = []
    present.current = next
    bump()
  }, [])

  const reset = useCallback((text: string) => {
    present.current = { text, selStart: text.length, selEnd: text.length }
    past.current = []
    future.current = []
    bump()
  }, [])

  const undo = useCallback((): TextSnapshot | null => {
    if (!past.current.length) return null
    const prev = past.current[past.current.length - 1]
    past.current = past.current.slice(0, -1)
    future.current = [...future.current, present.current]
    present.current = prev
    bump()
    return prev
  }, [])

  const redo = useCallback((): TextSnapshot | null => {
    if (!future.current.length) return null
    const next = future.current[future.current.length - 1]
    future.current = future.current.slice(0, -1)
    past.current = [...past.current, present.current]
    present.current = next
    bump()
    return next
  }, [])

  return {
    text: present.current.text,
    set, undo, redo, reset,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  }
}
