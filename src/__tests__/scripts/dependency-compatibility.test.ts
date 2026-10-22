/** @jest-environment node */
import { cert } from 'firebase-admin/app';
import { throws } from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { createRequire } from 'node:module';

it('keeps the patched brace expansion callable for legacy minimatch', () => {
  const fromEslint = createRequire(require.resolve('eslint/package.json'));
  const fromMinimatch = createRequire(fromEslint.resolve('minimatch'));
  const expand: unknown = fromMinimatch('brace-expansion');
  const minimatch: unknown = fromEslint('minimatch');

  if (typeof expand !== 'function' || typeof minimatch !== 'function') {
    throw new Error('Legacy CommonJS dependencies must remain callable');
  }

  expect((expand as (input: string) => unknown)('src/{a,b}.js')).toEqual([
    'src/a.js',
    'src/b.js',
  ]);
  expect(Reflect.get(expand, 'expand')).toBe(expand);
  expect(
    (minimatch as (input: string, pattern: string) => unknown)(
      'src/a.js',
      'src/{a,b}.js',
    ),
  ).toBe(true);
});

it('keeps Firebase service-account RSA formats and invalid-credential errors compatible', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  const account = {
    projectId: 'demo-compatibility',
    clientEmail: 'fixture@demo-compatibility.iam.gserviceaccount.com',
  };
  const pkcs8 = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
  const pkcs1 = privateKey.export({ format: 'pem', type: 'pkcs1' }).toString();
  for (const pem of [pkcs8, pkcs1, pkcs8.replace(/\n/g, '\r\n')]) {
    expect(() => cert({ ...account, privateKey: pem })).not.toThrow();
  }
  for (const pem of [
    'malformed',
    publicKey.export({ format: 'pem', type: 'spki' }).toString(),
  ]) {
    throws(() => cert({ ...account, privateKey: pem }), {
      code: 'app/invalid-credential',
    });
  }
});
