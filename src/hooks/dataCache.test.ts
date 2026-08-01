import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getCached, setCached, prefetch, clearCache } from './dataCache'

beforeEach(() => clearCache())

describe('getCached / setCached', () => {
  it('returns undefined for a key that was never set', () => {
    expect(getCached('missing', 1)).toBeUndefined()
  })

  it('returns the cached value when the version matches', () => {
    setCached('k', 1, { a: 1 })
    expect(getCached('k', 1)).toEqual({ a: 1 })
  })

  it('treats a version mismatch as a cache miss', () => {
    setCached('k', 1, { a: 1 })
    expect(getCached('k', 2)).toBeUndefined()
  })
})

describe('prefetch', () => {
  it('calls the fetcher and caches the result on a miss', async () => {
    const fetcher = vi.fn().mockResolvedValue({ v: 42 })
    const result = await prefetch('k', 1, fetcher)
    expect(result).toEqual({ v: 42 })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(getCached('k', 1)).toEqual({ v: 42 })
  })

  it('returns the cached value without calling the fetcher again on a hit', async () => {
    setCached('k', 1, { v: 1 })
    const fetcher = vi.fn().mockResolvedValue({ v: 2 })
    const result = await prefetch('k', 1, fetcher)
    expect(result).toEqual({ v: 1 })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('dedupes concurrent calls for the same key — only invokes the fetcher once', async () => {
    let resolveFetch: (v: number) => void
    const fetcher = vi.fn(() => new Promise<number>(resolve => { resolveFetch = resolve }))

    const p1 = prefetch('k', 1, fetcher)
    const p2 = prefetch('k', 1, fetcher)
    resolveFetch!(7)

    const [r1, r2] = await Promise.all([p1, p2])
    expect(r1).toBe(7)
    expect(r2).toBe(7)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('does not cache a rejected fetch, so a later call retries', async () => {
    const failing = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ ok: true })
    await expect(prefetch('k', 1, failing)).rejects.toThrow('boom')
    expect(getCached('k', 1)).toBeUndefined()
    const result = await prefetch('k', 1, failing)
    expect(result).toEqual({ ok: true })
    expect(failing).toHaveBeenCalledTimes(2)
  })
})

describe('clearCache', () => {
  it('removes all cached entries', () => {
    setCached('k', 1, { v: 1 })
    clearCache()
    expect(getCached('k', 1)).toBeUndefined()
  })
})
