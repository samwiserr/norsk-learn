/**
 * @jest-environment jest-environment-jsdom
 */

import { ApiService } from '@/src/services/apiService'
import { TextDecoder, TextEncoder } from 'util'

jest.mock('@/lib/firebase/auth', () => ({
  getCurrentUser: jest.fn(() => null),
}))

jest.mock('@/src/utils/deviceId', () => ({
  getOrCreateDeviceId: jest.fn(() => 'device-test-1'),
}))

function sseEventString(obj: unknown) {
  return `data: ${JSON.stringify(obj)}\n\n`
}

function createMockReader(eventStrings: string[]) {
  let index = 0
  const releaseLock = jest.fn()

  return {
    releaseLock,
    read: jest.fn(async () => {
      if (index >= eventStrings.length) return { done: true, value: undefined }

      const s = eventStrings[index++]
      const value = new TextEncoder().encode(s)
      return { done: false, value }
    }),
  }
}

function createMockResponseWithReader(reader: { read: Function; releaseLock: Function }) {
  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => reader,
    },
  } as any
}

describe('ApiService.sendMessageStreaming (SSE)', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    ;(global as any).fetch = jest.fn()
    // Jest+jsdom in this repo doesn't always provide Web TextDecoder/TextEncoder.
    ;(global as any).TextDecoder = TextDecoder
    ;(global as any).TextEncoder = TextEncoder
  })

  it('parses chunk events and returns final done result', async () => {
    const reader = createMockReader([
      sseEventString({ type: 'chunk', text: 'Hello' }),
      sseEventString({ type: 'done', result: { nextQuestion: 'Next?' } }),
    ])

    ;(global as any).fetch.mockResolvedValue(createMockResponseWithReader(reader))

    const onChunk = jest.fn()

    const result = await ApiService.sendMessageStreaming(
      'Hi',
      'A1',
      0,
      'en',
      [],
      onChunk
    )

    expect(onChunk).toHaveBeenCalledTimes(1)
    expect(onChunk).toHaveBeenCalledWith('Hello')
    expect(result.nextQuestion).toBe('Next?')
    expect(reader.releaseLock).toHaveBeenCalled()
  })

  it('throws when stream sends an error event', async () => {
    const reader = createMockReader([
      sseEventString({
        type: 'error',
        error: 'Boom',
        code: 'STREAM_ERROR',
        retryable: false,
      }),
    ])

    ;(global as any).fetch.mockResolvedValue(createMockResponseWithReader(reader))

    const onChunk = jest.fn()

    await expect(
      ApiService.sendMessageStreaming('Hi', 'A1', 0, 'en', [], onChunk)
    ).rejects.toThrow('Boom')

    expect(reader.releaseLock).toHaveBeenCalled()
    expect(onChunk).not.toHaveBeenCalled()
  })
})

