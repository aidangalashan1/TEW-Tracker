import { describe, it, expect, afterEach, vi } from 'vitest'
import { api, ApiError } from './api'

afterEach(() => vi.restoreAllMocks())

describe('API error contract', () => {
  it('throws a typed ApiError parsed from the { error } envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => JSON.stringify({ error: { code: 'internal_error', message: 'boom' } }),
        json: async () => ({}),
      })),
    )

    const err = await api.game.version().catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 500, code: 'internal_error', message: 'boom' })
  })

  it('falls back to a generic message when the body is not an envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'plain text error',
        json: async () => ({}),
      })),
    )

    const err = await api.game.version().catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(404)
    expect(err.code).toBe('http_error')
    expect(err.message).toContain('plain text error')
  })
})
