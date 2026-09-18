import { act, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StrictMode } from 'react'
import { EventsProvider } from './EventsProvider'
import { useSSE, type SSEMessage } from '@/hooks/useSSE'

vi.mock('@/auth/authService', () => ({ getAccessToken: () => null }))

function Listener({ onMessage, enabled = true }: {
  onMessage: (message: SSEMessage) => void
  enabled?: boolean
}) {
  useSSE(onMessage, { enabled })
  return null
}

function mockStreams() {
  const streams: Array<{
    controller: ReadableStreamDefaultController<Uint8Array>
    signal: AbortSignal
    cancel: ReturnType<typeof vi.fn>
  }> = []
  const fetch = vi.fn(async (_url: string, options: RequestInit) => {
    const cancel = vi.fn()
    const body = new ReadableStream<Uint8Array>({
      start(controller) { streams.push({ controller, signal: options.signal as AbortSignal, cancel }) },
      cancel,
    })
    return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } })
  })
  vi.stubGlobal('fetch', fetch)
  const emit = async (index: number) => {
    await act(async () => {
      streams[index].controller.enqueue(new TextEncoder().encode('data: {"type":"refresh_messages"}\n\n'))
    })
  }
  return { fetch, streams, emit }
}

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('shared events connection', () => {
  it('keeps one connection across page changes and drawer open/close, delivering only to active listeners', async () => {
    const { fetch, streams, emit } = mockStreams()
    const workflow = vi.fn()
    const submission = vi.fn()
    const notes = vi.fn()
    const tree = (page: 'workflow' | 'submission', open: boolean) => (
      <EventsProvider token="access">
        <Listener key={page} onMessage={page === 'workflow' ? workflow : submission} />
        <Listener onMessage={notes} enabled={open} />
      </EventsProvider>
    )
    const view = render(tree('workflow', false))
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce())
    await emit(0)
    expect(workflow).toHaveBeenCalledOnce()
    expect(notes).not.toHaveBeenCalled()
    view.rerender(tree('workflow', true))
    await emit(0)
    expect(workflow).toHaveBeenCalledTimes(2)
    expect(notes).toHaveBeenCalledOnce()
    view.rerender(tree('submission', false))
    await emit(0)
    expect(submission).toHaveBeenCalledOnce()
    expect(workflow).toHaveBeenCalledTimes(2)
    expect(notes).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledOnce()
    expect(streams[0].signal.aborted).toBe(false)
    view.unmount()
    expect(streams[0].signal.aborted).toBe(true)
    expect(streams[0].cancel).toHaveBeenCalledOnce()
  })

  it('connects without listeners and closes on logout; endpoint/token changes replace the old connection', async () => {
    const { fetch, streams } = mockStreams()
    const view = render(<EventsProvider token={null} enabled={false}>{null}</EventsProvider>)
    expect(fetch).not.toHaveBeenCalled()
    view.rerender(<EventsProvider token="access">{null}</EventsProvider>)
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    view.rerender(<EventsProvider token="new-token" endpoint="/new/events/">{null}</EventsProvider>)
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
    expect(streams[0].signal.aborted).toBe(true)
    expect(streams[0].cancel).toHaveBeenCalledOnce()
    expect(fetch.mock.calls[1][0]).toBe('/new/events/')
    expect(new Headers(fetch.mock.calls[1][1].headers).get('Authorization')).toBe('Bearer new-token')
    view.rerender(<EventsProvider token={null} enabled={false}>{null}</EventsProvider>)
    expect(streams[1].signal.aborted).toBe(true)
    expect(streams[1].cancel).toHaveBeenCalledOnce()
    view.unmount()
  })

  it('isolates listener failures and uses updated callbacks without reconnecting', async () => {
    const { fetch, emit } = mockStreams()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const failing = () => { throw new Error('listener failed') }
    const first = vi.fn()
    const updated = vi.fn()
    const tree = (handler: (message: SSEMessage) => void) => (
      <EventsProvider token="access"><Listener onMessage={failing} /><Listener onMessage={handler} /></EventsProvider>
    )
    const view = render(tree(first))
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce())
    await emit(0)
    expect(first).toHaveBeenCalledOnce()
    view.rerender(tree(updated))
    await emit(0)
    expect(first).toHaveBeenCalledOnce()
    expect(updated).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledOnce()
    view.unmount()
  })

  it('leaves only one active stream after Strict Mode effect replay', async () => {
    const { streams, emit } = mockStreams()
    const onMessage = vi.fn()
    const view = render(<StrictMode><EventsProvider token="access"><Listener onMessage={onMessage} /></EventsProvider></StrictMode>)
    await waitFor(() => expect(streams.filter((stream) => !stream.signal.aborted)).toHaveLength(1))
    await emit(streams.findIndex((stream) => !stream.signal.aborted))
    expect(onMessage).toHaveBeenCalledOnce()
    view.unmount()
    expect(streams.every((stream) => stream.signal.aborted)).toBe(true)
  })
})
