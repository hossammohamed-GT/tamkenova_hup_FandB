import config from './jest.trainers.config.mjs';
export default {
  ...config,
  testMatch: [
    '**/src/common/security/*.spec.ts',
    '**/src/common/logger/log-redaction.spec.ts',
    '**/src/modules/auth/*.spec.ts',
  ],
};
