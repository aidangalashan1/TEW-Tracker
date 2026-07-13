import { describe, it, expect } from 'vitest'
import { parseEntityPage } from './entityRoute'

describe('parseEntityPage', () => {
  it('parses a numeric entity id as a number', () => {
    expect(parseEntityPage('entity-worker-123')).toEqual({ type: 'worker', id: 123 })
    expect(parseEntityPage('entity-belt-7')).toEqual({ type: 'belt', id: 7 })
  })

  it('parses a non-numeric id tail as a string (e.g. module ids)', () => {
    expect(parseEntityPage('entity-module-worker-list-1')).toEqual({
      type: 'module',
      id: 'worker-list-1',
    })
    expect(parseEntityPage('entity-worker-abc')).toEqual({ type: 'worker', id: 'abc' })
  })

  it('returns null for non-entity pages', () => {
    expect(parseEntityPage('roster')).toBeNull()
    expect(parseEntityPage('settings')).toBeNull()
    expect(parseEntityPage('')).toBeNull()
  })

  it('returns null for malformed entity strings', () => {
    expect(parseEntityPage('entity-worker')).toBeNull() // missing id
    expect(parseEntityPage('entity-')).toBeNull()
  })
})
