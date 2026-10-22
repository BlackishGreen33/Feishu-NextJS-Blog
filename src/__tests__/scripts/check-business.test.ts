/** @jest-environment node */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('business knowledge index CLI', () => {
  let root: string;
  const script = path.join(process.cwd(), 'scripts/check-business.mjs');
  const write = (file: string, content: string) => {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };
  const run = () =>
    spawnSync(process.execPath, [script, root], { encoding: 'utf8' });

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'business-index-'));
    write('BUSINESS.md', '# 業務索引\n\n- [內容](src/BUSINESS.md)\n');
    write(
      'src/BUSINESS.md',
      '# 內容規則\n\n參考[實作][source]及[外部來源](https://example.com)。\n\n[source]: ./entry.ts\n',
    );
    write('src/entry.ts', 'export {};\n');
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('accepts a reachable owner with inline and reference links', () => {
    const result = run();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Business knowledge index is valid');
  });

  it.each([
    ['missing root', 'Missing root BUSINESS.md'],
    ['broken link', 'Broken local link'],
    ['unreachable owner', 'Unreachable business document'],
    [
      'root rule',
      'Root BUSINESS.md must contain only headings and index lists',
    ],
    ['empty owner', 'Empty business document'],
  ])('rejects %s', (scenario, message) => {
    if (scenario === 'missing root')
      fs.unlinkSync(path.join(root, 'BUSINESS.md'));
    if (scenario === 'broken link')
      fs.unlinkSync(path.join(root, 'src/entry.ts'));
    if (scenario === 'unreachable owner') {
      write('other/BUSINESS.md', '# 其他規則\n\n這是獨立規則。\n');
    }
    if (scenario === 'root rule') {
      fs.appendFileSync(
        path.join(root, 'BUSINESS.md'),
        '\n根目錄的業務規則。\n',
      );
    }
    if (scenario === 'empty owner') write('src/BUSINESS.md', '# 尚未完成\n');

    const result = run();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(message);
  });
});
