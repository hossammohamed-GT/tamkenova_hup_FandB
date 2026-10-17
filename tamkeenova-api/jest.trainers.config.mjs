import config from './jest.certificates.config.mjs';
export default {
  ...config,
  testMatch: ['**/src/modules/trainers/*.spec.ts'],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
};
