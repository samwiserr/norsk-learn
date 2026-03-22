// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'
import { webcrypto } from 'node:crypto'

if (!globalThis.crypto?.getRandomValues) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
    writable: true,
  })
}

jest.mock('server-only', () => ({}))




