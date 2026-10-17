import esmConfig from './jest.certificates.config.mjs';


export default {
  ...esmConfig,
  testMatch: ['**/src/common/logger/*.spec.ts'],
};
