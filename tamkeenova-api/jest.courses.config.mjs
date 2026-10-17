import config from './jest.certificates.config.mjs';
export default { ...config, testMatch: ['**/src/modules/courses/*.spec.ts', '**/src/modules/course-categories/*.spec.ts'] };
