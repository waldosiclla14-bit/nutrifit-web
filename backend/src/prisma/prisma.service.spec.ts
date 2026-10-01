import { resolveDatabaseUrl } from './prisma.service';

describe('resolveDatabaseUrl', () => {
  it('rewrites Neon direct host to pooler', () => {
    const out = resolveDatabaseUrl('postgresql://u:p@ep-test.sa-east-1.aws.neon.tech/db?sslmode=require');
    expect(out).toContain('-pooler.sa-east-1.aws.neon.tech');
    expect(out).toContain('pgbouncer=true');
  });

  it('leaves Neon pooler host untouched', () => {
    const out = resolveDatabaseUrl(
      'postgresql://u:p@ep-test-pooler.sa-east-1.aws.neon.tech/db?sslmode=require',
    );
    expect(out).not.toContain('-pooler-pooler');
  });

  it('leaves Supabase pooler host untouched (no double pooler)', () => {
    const out = resolveDatabaseUrl(
      'postgresql://postgres.x:pw@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
    );
    expect(out).not.toContain('-pooler.pooler');
    expect(out).toContain('aws-0-sa-east-1.pooler.supabase.com');
    expect(out).toContain('pgbouncer=true');
  });
});
