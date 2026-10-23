/** @jest-environment node */
import { cert } from 'firebase-admin/app';
import { strictEqual, throws } from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { createRequire } from 'node:module';

it.each(['shadow-root', 'xhtml'])(
  'keeps DOMPurify output compatible and blocks the %s regression',
  (scenario) => {
    const result = spawnSync(
      process.execPath,
      [
        '--eval',
        `
          const assert = require('node:assert/strict');
          const { createRequire } = require('node:module');
          const fromReact = createRequire(require.resolve('@monaco-editor/react/package.json'));
          const fromMonaco = createRequire(fromReact.resolve('monaco-editor/package.json'));
          const fromJest = createRequire(require.resolve('jest-environment-jsdom'));
          const { JSDOM } = fromJest('jsdom');
          const window = new JSDOM('').window;
          try {
            // Exercise the installed dependency, not Monaco's separate vendored/CDN code.
            const purify = fromMonaco('dompurify')(window);
            assert.equal(purify.sanitize('<p>hello <strong>world</strong></p>'), '<p>hello <strong>world</strong></p>');
            if (process.argv[1] === 'shadow-root') {
              const host = window.document.createElement('div');
              const shadow = host.attachShadow({ mode: 'open' });
              shadow.append(
                window.document.createTextNode('$'),
                window.document.createElement('object'),
                window.document.createTextNode('{value}'),
              );
              purify.sanitize(host, { IN_PLACE: true, SAFE_FOR_TEMPLATES: true });
              assert(!shadow.textContent.includes('$' + '{'), shadow.textContent);
            } else {
              const clean = purify.sanitize(
                '<svg xmlns="http://www.w3.org/2000/svg"><a><animate attributeName="href" values="x;javascript:alert(1)"/><text>click</text></a></svg>',
                {
                  PARSER_MEDIA_TYPE: 'application/xhtml+xml',
                  ALLOWED_TAGS: ['svg', 'a', 'animate', 'text'],
                  ALLOWED_ATTR: ['attributeName', 'values'],
                },
              );
              assert(!clean.includes('attributeName="href"'), clean);
              assert(clean.includes('click'), clean);
            }
          } finally {
            window.close();
          }
        `,
        scenario,
      ],
      { encoding: 'utf8', timeout: 10_000 },
    );
    expect(result.error).toBeUndefined();
    strictEqual(result.status, 0, result.stderr);
  },
);

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
