/** @jest-environment node */
import { spawnSync } from 'node:child_process';

it('reads compatible MDX in a temporary content root and rejects traversal and invalid metadata', () => {
  const result = spawnSync(
    process.execPath,
    [
      require.resolve('tsx/cli'),
      '--eval',
      String.raw`
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import os from 'node:os';
    import path from 'node:path';
    import { loadMdxFiles, getMdxFileCount } from './src/common/libs/mdx';
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-learn-contract-'));
    try {
      fs.mkdirSync(path.join(root, 'src/contents/learn/js'), { recursive: true });
      fs.writeFileSync(path.join(root, 'src/contents/learn/js/a.mdx'), '---\nid: 0\ntitle: Lesson A\ncategory: js\ncreated_at: ""\nupdated_at: ""\n---\n# Lesson body\n');
      process.chdir(root);
      assert.equal(loadMdxFiles('js')[0].frontMatter.title, 'Lesson A');
      assert.equal(getMdxFileCount('js'), 1);
      assert.equal(getMdxFileCount('missing'), 0);
      assert.deepEqual(loadMdxFiles('missing'), []);
      assert.throws(() => loadMdxFiles('../js'));
      fs.writeFileSync(path.join(root, 'src/contents/learn/js/b.mdx'), '---\nid: wrong\n---\nInvalid');
      assert.throws(() => loadMdxFiles('js'));
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  `,
    ],
    { cwd: process.cwd(), encoding: 'utf8', timeout: 15000 },
  );
  expect(result.stderr).toBe('');
  expect(result.status).toBe(0);
});
