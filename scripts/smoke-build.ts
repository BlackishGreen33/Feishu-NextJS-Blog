import assert from 'node:assert/strict';
import { type ChildProcess, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import fs from 'node:fs/promises';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';

import {
  articleListResponseSchema,
  articleSchema,
} from '../src/common/schemas/blog';
import {
  buildArticleSearchEntry,
  toArticleSummary,
} from '../src/server/blog/search';

const children = new Set<ChildProcess>();
let cancelled = false;
const stop = (child: ChildProcess) => {
  if (child.exitCode !== null || child.signalCode !== null || !child.pid)
    return;
  try {
    if (process.platform === 'win32') child.kill('SIGTERM');
    else process.kill(-child.pid, 'SIGTERM');
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ESRCH'))
      throw error;
  }
};

const waitForExit = (child: ChildProcess): Promise<void> =>
  new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) =>
      code === 0
        ? resolve()
        : reject(new Error(`Child process failed: ${String(code ?? signal)}`)),
    );
  });

const main = async () => {
  const packageManager = process.env.npm_execpath;
  assert(packageManager, 'Run the smoke check through pnpm test:smoke');
  const source = process.cwd();
  const workspace = await fs.mkdtemp(
    path.join(os.tmpdir(), 'blog-production-smoke-'),
  );
  let server: ChildProcess | undefined;
  const env: NodeJS.ProcessEnv = {
    NODE_ENV: 'production',
    ...Object.fromEntries(
      Object.entries(process.env).filter(([key]) =>
        /^(PATH|HOME|TMPDIR|TEMP|TMP|LANG|LC_.*|PNPM_HOME|FNM_.*|COREPACK_HOME|NODE_EXTRA_CA_CERTS|SSL_CERT_FILE|https?_proxy|HTTPS?_PROXY|ALL_PROXY|NO_PROXY|no_proxy|SystemRoot|ComSpec|PATHEXT)$/.test(
          key,
        ),
      ),
    ),
  };
  Object.assign(env, {
    HUSKY: '0',
    CI: '1',
    NEXT_TELEMETRY_DISABLED: '1',
    COREPACK_ENABLE_NETWORK: '0',
  });

  try {
    // Copy only build inputs. Existing local cache, env files and output never enter the fixture.
    for (const name of [
      'src',
      'scripts',
      'data',
      'public',
      'patches',
      'package.json',
      'pnpm-lock.yaml',
      'tsconfig.json',
      'next.config.js',
      'next-sitemap.config.js',
      'postcss.config.js',
      'tailwind.config.js',
    ]) {
      await fs.cp(path.join(source, name), path.join(workspace, name), {
        recursive: true,
        mode: constants.COPYFILE_FICLONE,
        filter: (file) =>
          !cancelled &&
          !path.basename(file).startsWith('.env') &&
          !file.startsWith(path.join(source, 'public/local-feishu-assets')),
      });
    }
    // Keep pnpm's relative symlinks within this isolated tree; use native copy-on-write where supported.
    await fs.cp(
      path.join(source, 'node_modules'),
      path.join(workspace, 'node_modules'),
      {
        recursive: true,
        verbatimSymlinks: true,
        mode: constants.COPYFILE_FICLONE,
        filter: () => !cancelled,
      },
    );

    assert(!cancelled, 'Smoke was cancelled');
    const id = randomUUID();
    const marker = `body${id.replaceAll('-', '')}`;
    const slug = '10-個初學-css-必須掌握的小技巧';
    const alias = '10-個-css-小技巧';
    const encodedSlug =
      '10-%E5%80%8B%E5%88%9D%E5%AD%B8-css-%E5%BF%85%E9%A0%88%E6%8E%8C%E6%8F%A1%E7%9A%84%E5%B0%8F%E6%8A%80%E5%B7%A7';
    const timestamp = '2026-01-01T00:00:00.000Z';
    const article = articleSchema.parse({
      id,
      slug,
      title: 'Architecture governance smoke',
      summary: 'Local production fixture',
      cover: null,
      publishedAt: timestamp,
      updatedAt: timestamp,
      tags: [],
      featured: true,
      draft: false,
      readingTimeMinutes: 1,
      sourceNodeToken: id,
      sourceDocumentId: id,
      content: `# Architecture governance smoke\n\nRuntime reading ${marker}`,
      contentFormat: 'markdown',
    });
    const draft = {
      ...article,
      id: `draft-${id}`,
      slug: `draft-${id}`,
      sourceNodeToken: `draft-${id}`,
      draft: true,
    };
    const cache = path.join(workspace, '.cache/feishu-blog');
    await fs.mkdir(path.join(cache, 'articles'), { recursive: true });
    await Promise.all([
      fs.writeFile(
        path.join(cache, 'index.json'),
        JSON.stringify({
          generatedAt: timestamp,
          source: 'fixture',
          articles: [article, draft].map(toArticleSummary),
          redirects: {
            [alias]: { sourceNodeToken: id, targetSlug: slug },
            [`invalid-${alias}`]: {
              sourceNodeToken: 'other-node',
              targetSlug: slug,
            },
          },
        }),
      ),
      fs.writeFile(
        path.join(cache, 'search-index.json'),
        JSON.stringify({
          generatedAt: timestamp,
          source: 'fixture',
          articles: [article, draft].map(buildArticleSearchEntry),
        }),
      ),
      ...[article, draft].map((value) =>
        fs.writeFile(
          path.join(cache, 'articles', `${value.slug}.json`),
          JSON.stringify(value),
        ),
      ),
    ]);

    // Standalone CI installs may not warm Corepack's cache; reuse the active pnpm CLI.
    const build = spawn(process.execPath, [packageManager, 'run', 'build'], {
      cwd: workspace,
      env,
      stdio: 'inherit',
      detached: process.platform !== 'win32',
    });
    children.add(build);
    const deadline = setTimeout(() => stop(build), 8 * 60_000);
    try {
      await waitForExit(build);
    } finally {
      clearTimeout(deadline);
      children.delete(build);
    }

    const reservation = createServer();
    await new Promise<void>((resolve, reject) => {
      reservation.once('error', reject);
      reservation.listen(0, '127.0.0.1', resolve);
    });
    const address = reservation.address();
    assert(address && typeof address !== 'string');
    const port = address.port;
    await new Promise<void>((resolve, reject) =>
      reservation.close((error) => (error ? reject(error) : resolve())),
    );
    server = spawn(
      process.execPath,
      [
        path.join(workspace, 'node_modules/next/dist/bin/next'),
        'start',
        '--hostname',
        '127.0.0.1',
        '--port',
        String(port),
      ],
      {
        cwd: workspace,
        env,
        stdio: 'inherit',
        detached: process.platform !== 'win32',
      },
    );
    children.add(server);
    let serverError: Error | undefined;
    server.once('error', (error) => {
      serverError = error;
    });
    const origin = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let attempt = 0; attempt < 150; attempt++) {
      assert(!cancelled, 'Smoke was cancelled');
      if (serverError) throw serverError;
      if (server.exitCode !== null || server.signalCode !== null)
        throw new Error('Production server exited before readiness');
      try {
        const response = await fetch(`${origin}/api/blog?search=${marker}`, {
          signal: AbortSignal.timeout(1000),
        });
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
        /* Connection refusal during startup is expected; assertions follow readiness. */
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    assert(ready, 'Production server did not become ready');
    for (const prefix of ['', '/en', '/zh-CN']) {
      const page = await fetch(`${origin}${prefix}/blog/${slug}`, {
        signal: AbortSignal.timeout(10_000),
      });
      assert.equal(page.status, 200);
      assert(
        (await page.text()).includes(marker),
        'Article HTML must contain fixture body',
      );
      const redirect = await fetch(`${origin}${prefix}/blog/${alias}`, {
        redirect: 'manual',
        signal: AbortSignal.timeout(10_000),
      });
      assert.equal(redirect.status, 308);
      assert.equal(
        redirect.headers.get('location'),
        `${prefix}/blog/${encodedSlug}`,
      );
      process.stdout.write(
        `Permanent Unicode alias redirect passed: ${prefix || 'zh-TW'}\n`,
      );
    }
    const response = await fetch(`${origin}/api/blog?search=${marker}`, {
      signal: AbortSignal.timeout(10_000),
    });
    assert.equal(response.status, 200);
    const payload = articleListResponseSchema.parse(
      (await response.json()) as unknown,
    );
    assert(payload.status);
    assert.deepEqual(
      payload.data.posts.map((item) => item.slug),
      [slug],
    );
    assert(
      payload.data.posts[0]?.matchedExcerpt?.includes(marker),
      'Search must match body content',
    );
    for (const hidden of [draft.slug, `invalid-${alias}`]) {
      const response = await fetch(`${origin}/blog/${hidden}`, {
        redirect: 'manual',
        signal: AbortSignal.timeout(10_000),
      });
      assert.equal(response.status, 404);
    }
    process.stdout.write(
      'Production HTTP smoke passed: reading, body search, permanent locale aliases, draft and identity boundaries.\n',
    );
  } finally {
    for (const child of children) stop(child);
    const runningServer = server;
    if (
      runningServer &&
      runningServer.exitCode === null &&
      runningServer.signalCode === null
    ) {
      await Promise.race([
        new Promise<void>((resolve) =>
          runningServer.once('exit', () => resolve()),
        ),
        new Promise<void>((resolve) => setTimeout(resolve, 3000)),
      ]);
      if (
        runningServer.exitCode === null &&
        runningServer.signalCode === null &&
        runningServer.pid
      ) {
        if (process.platform === 'win32') runningServer.kill('SIGKILL');
        else {
          try {
            process.kill(-runningServer.pid, 'SIGKILL');
          } catch {
            /* Already exited. */
          }
        }
      }
    }
    await fs.rm(workspace, { recursive: true, force: true });
  }
};

for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => {
    cancelled = true;
    for (const child of children) stop(child);
  });
void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
