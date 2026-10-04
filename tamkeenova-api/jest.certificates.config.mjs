// Nest 12 is ESM. Run this suite with Node's VM module support.
export default {
  testEnvironment: 'node',
  testMatch: ['**/src/modules/admin/*certificate*.spec.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          rootDir: '.',
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          esModuleInterop: true,
          isolatedModules: true,
        },
      },
    ],
  },
};
