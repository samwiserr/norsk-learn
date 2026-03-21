const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Track B2: incremental coverage enforcement for backend-critical + key client glue.
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/e2e/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/src/(.*)$': '<rootDir>/src/$1',
  },
  // Keep this set intentionally narrow so we can enforce coverage incrementally.
  collectCoverageFrom: [
    'lib/api/**/*.ts',
    'lib/contracts/realtime.ts',
    'lib/contracts/speech.ts',
    'lib/contracts/pronunciation.ts',
    'lib/contracts/sessionSync.ts',
    'lib/contracts/conversation.ts',
    'lib/contracts/initial-question.ts',
    'lib/contracts/streaming.ts',
    'lib/contracts/primitives.ts',
    'app/api/openai-realtime/route.ts',
    'app/api/azure-speech-token/route.ts',
    'app/api/sessions/sync/route.ts',
    'src/server/application/conversationTurnUseCase.ts',
    'src/services/apiService.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  coverageDirectory: '<rootDir>/.coverage/backend-qa',
  coverageReporters: ['json-summary', 'text', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 5,
      functions: 5,
      lines: 5,
      statements: 5,
    },
  },
}

module.exports = createJestConfig(customJestConfig)

