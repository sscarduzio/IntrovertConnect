/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/shared/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
    }]
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'server/**/*.ts',
    '!server/vite.ts',
    '!server/index.ts'
  ],
  coverageDirectory: 'coverage',
  testMatch: ['**/__tests__/**/*.test.ts'],
};