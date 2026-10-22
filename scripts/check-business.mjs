import { glob, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

const root = path.resolve(process.argv[2] || '.');
const files = new Map();
const errors = [];
const parser = unified().use(remarkParse);
const visit = (node, callback) => {
  callback(node);
  for (const child of node.children || []) visit(child, callback);
};

for await (const file of glob('**/BUSINESS.md', {
  cwd: root,
  exclude: [
    'node_modules/**',
    '.git/**',
    '.next/**',
    '.scratch/**',
    '.cache/**',
    'output/**',
  ],
})) {
  files.set(path.resolve(root, file), []);
}

const entry = path.join(root, 'BUSINESS.md');
if (!files.has(entry)) errors.push('Missing root BUSINESS.md');

for (const [file, edges] of files) {
  const tree = parser.parse(await readFile(file, 'utf8'));
  const label = path.relative(root, file);
  if (tree.children.every((node) => node.type === 'heading')) {
    errors.push(`Empty business document: ${label}`);
  }
  if (
    file === entry &&
    tree.children.some(
      (node) => !['heading', 'list', 'definition'].includes(node.type),
    )
  ) {
    errors.push('Root BUSINESS.md must contain only headings and index lists');
  }

  const definitions = new Map();
  visit(tree, (node) => {
    if (node.type === 'definition') definitions.set(node.identifier, node.url);
  });
  const urls = [];
  visit(tree, (node) => {
    if (node.type === 'link') urls.push(node.url);
    if (node.type === 'linkReference') {
      const url = definitions.get(node.identifier);
      if (url) urls.push(url);
    }
  });
  for (const url of urls) {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url)) continue;
    const target = path.resolve(
      path.dirname(file),
      decodeURIComponent(url.split(/[?#]/)[0]),
    );
    if (
      !target.startsWith(`${root}${path.sep}`) ||
      !(await stat(target).catch(() => null))
    ) {
      errors.push(`Broken local link: ${label} -> ${url}`);
    } else if (files.has(target)) {
      edges.push(target);
    }
  }
}

const reachable = new Set();
const follow = (file) => {
  if (reachable.has(file)) return;
  reachable.add(file);
  for (const target of files.get(file) || []) follow(target);
};
follow(entry);
for (const file of files.keys()) {
  if (!reachable.has(file)) {
    errors.push(`Unreachable business document: ${path.relative(root, file)}`);
  }
}

if (errors.length) {
  process.stderr.write(`${errors.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('Business knowledge index is valid.\n');
}
