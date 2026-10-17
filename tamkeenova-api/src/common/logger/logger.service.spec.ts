import fs from 'node:fs';
import { jest } from '@jest/globals';
import * as winston from 'winston';
import { LoggerService } from './logger.service';
import { createLoggerConfig, LogCategory } from './winston.config';

const categories: LogCategory[] = ['auth', 'errors', 'security'];

describe('LoggerService deployment compatibility', () => {
  const originalVercel = process.env.VERCEL;
  let service: LoggerService | undefined;

  afterEach(() => {
    service?.onModuleDestroy();
    service = undefined;
    jest.restoreAllMocks();
    if (originalVercel === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = originalVercel;
    }
  });

  it('starts and logs on Vercel without creating directories or files', () => {
    process.env.VERCEL = '1';
    const readOnlyFilesystem = () => {
      throw Object.assign(new Error('read-only file system'), {
        code: 'EROFS',
      });
    };
    const mkdir = jest
      .spyOn(fs, 'mkdirSync')
      .mockImplementation(readOnlyFilesystem);
    const stream = jest
      .spyOn(fs, 'createWriteStream')
      .mockImplementation(readOnlyFilesystem);
    const fileTransport = jest.spyOn(winston.transports, 'File');
    const output: unknown[] = [];
    jest
      .spyOn(winston.transports.Console.prototype, 'log')
      .mockImplementation((info, callback) => {
        output.push(JSON.parse(info[Symbol.for('message')]));
        callback?.();
      });

    service = new LoggerService();
    service.logAuth({ event: 'login_success', userId: 'test-user' });
    service.logSecurity({ event: 'access_denied', endpoint: '/api/admin' });
    const error = new Error('test failure');
    service.logError({ event: 'request_failed', error, endpoint: '/api/test' });

    expect(fileTransport).not.toHaveBeenCalled();
    expect(mkdir).not.toHaveBeenCalled();
    expect(stream).not.toHaveBeenCalled();

    expect(output).toEqual([
      expect.objectContaining({
        category: 'auth',
        level: 'info',
        message: { event: 'login_success', userId: 'test-user' },
        timestamp: expect.any(String),
      }),
      expect.objectContaining({
        category: 'security',
        level: 'warn',
        message: { event: 'access_denied', endpoint: '/api/admin' },
      }),
      expect.objectContaining({
        category: 'errors',
        level: 'error',
        event: 'request_failed',
        message: 'test failure',
        stack: error.stack,
        endpoint: '/api/test',
      }),
    ]);
  });

  it.each(categories)(
    'uses a console transport for %s on Vercel',
    (category) => {
      process.env.VERCEL = '1';
      const config = createLoggerConfig(category);
      expect(config.defaultMeta).toEqual({ category });
      const transports = config.transports as winston.transport[];
      expect(transports).toHaveLength(1);
      expect(transports[0]).toBeInstanceOf(winston.transports.Console);
      transports[0].close?.();
    },
  );

  it.each([undefined, '0'])(
    'preserves local file paths when VERCEL=%s',
    (vercel) => {
      if (vercel === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = vercel;

      const fileTransport = jest
        .spyOn(winston.transports, 'File')
        .mockImplementation(
          () =>
            new winston.transports.Console({
              silent: true,
            }) as unknown as winston.transports.FileTransportInstance,
        );

      service = new LoggerService();

      expect(fileTransport.mock.calls).toEqual([
        [{ filename: 'logs/auth/auth.log' }],
        [{ filename: 'logs/errors/errors.log' }],
        [{ filename: 'logs/security/security.log' }],
      ]);
    },
  );
});
