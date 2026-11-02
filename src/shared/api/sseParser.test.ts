import { describe, expect, it, vi } from 'vitest'
import { createSSEParser } from './sseParser'

describe('SSE wire parsing', () => {
  it('parses split CRLF, comments, multiline data, IDs and retry without assuming JSON', () => {
    const message = vi.fn(), id = vi.fn(), retry = vi.fn()
    const parse = createSSEParser(message, id, retry)
    for (const char of ': comment\r\nid: 42\r\nretry: 250\r\ndata: connected\r\n\r\ndata: ping\n\ndata: {"text":\ndata: "café"}\n\n') parse(char)
    expect(message.mock.calls).toEqual([['connected'], ['ping'], ['{"text":\n"café"}']])
    expect(id).toHaveBeenCalledExactlyOnceWith('42')
    expect(retry).toHaveBeenCalledExactlyOnceWith(250)
  })

  it('ignores invalid IDs and retry values and accepts an explicit ID reset', () => {
    const id = vi.fn(), retry = vi.fn()
    const parse = createSSEParser(vi.fn(), id, retry)
    parse('id: forbidden\0id\nretry: -1\nretry: 1.5\nretry: Infinity\nretry: 999999999999999999999\nid:\nretry: 0\n\n')
    expect(id.mock.calls).toEqual([['']])
    expect(retry.mock.calls).toEqual([[0]])
  })
})
