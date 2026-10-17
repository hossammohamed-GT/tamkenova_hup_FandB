import { describe, expect, it } from '@jest/globals';
import { redactLog } from './log-redaction';

describe('Log secret redaction', () => {
  it('redacts nested credentials, bearer values and query PII', () => {
    const result = redactLog({
      password: 'hash',
      nested: { otp_code: '123456', authorization: 'Bearer token' },
      url: '/auth?email=secret@example.test&code=123456',
      message: 'Bearer abc.def.sig',
    });
    expect(JSON.stringify(result)).not.toMatch(
      /hash|123456|secret@example|abc\.def/,
    );
  });
  it('redacts database credentials in exception messages and handles circular values', () => {
    const item: any = {
      error: new Error('postgresql://user:password@host/db'),
    };
    item.self = item;
    expect(JSON.stringify(redactLog(item))).not.toContain('user:password');
    expect(JSON.stringify(redactLog(item))).toContain('TRUNCATED');
  });
});
