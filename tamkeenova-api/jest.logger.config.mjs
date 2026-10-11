import esmConfig from './jest.certificates.config.mjs';

// Reuse the existing Nest 12 ESM transform without changing legacy test suites.
export default {
  ...esmConfig,
  testMatch: ['**/src/common/logger/*.spec.ts'],
};
