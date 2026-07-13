import { describe, it, expect, beforeEach } from 'vitest'
import { loadLayout, defaultLayout, STORAGE_VERSION } from './storage'

const KEY = 'tew-layouts'

beforeEach(() => localStorage.clear())

describe('defaultLayout', () => {
  it('provides seeded defaults for known pages', () => {
    const roster = defaultLayout('roster')
    expect(roster.page).toBe('roster')
    expect(roster.items.length).toBeGreaterThan(0)
  })

  it('returns an empty layout for unknown pages', () => {
    expect(defaultLayout('nope')).toEqual({ page: 'nope', items: [] })
  })
})

describe('loadLayout migration guard', () => {
  it('falls back to defaults when nothing is stored', () => {
    expect(loadLayout('roster')).toEqual(defaultLayout('roster'))
  })

  it('returns the stored layout when the version is current', () => {
    const stored = { page: 'roster', items: [{ i: 'x', moduleId: 'schedule', x: 0, y: 0, w: 2, h: 2 }] }
    localStorage.setItem(KEY, JSON.stringify({ _v: STORAGE_VERSION, roster: stored }))
    expect(loadLayout('roster')).toEqual(stored)
  })

  it('discards a layout from an older version (e.g. pre finance-module split)', () => {
    const stored = { page: 'finances', items: [{ i: 'finance-1', moduleId: 'finance', x: 0, y: 0, w: 16, h: 14 }] }
    localStorage.setItem(KEY, JSON.stringify({ _v: STORAGE_VERSION - 1, finances: stored }))
    expect(loadLayout('finances')).toEqual(defaultLayout('finances'))
  })

  it('discards pre-versioning data (no _v) and returns defaults', () => {
    // The bug we fixed: an old blob without `_v` must not be trusted — the guard
    // has to read `_v` as a number, not as one of the page layouts.
    const stale = { page: 'roster', items: [{ i: 'old', moduleId: 'x', x: 0, y: 0, w: 1, h: 1 }] }
    localStorage.setItem(KEY, JSON.stringify({ roster: stale }))
    expect(loadLayout('roster')).toEqual(defaultLayout('roster'))
  })

  it('falls back to defaults on corrupt JSON', () => {
    localStorage.setItem(KEY, '{not valid json')
    expect(loadLayout('roster')).toEqual(defaultLayout('roster'))
  })
})
