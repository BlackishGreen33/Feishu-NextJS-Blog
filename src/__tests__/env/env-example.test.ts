/** @jest-environment node */

import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const ROOT_DIR = process.cwd();
const RUNTIME_DIRS = ['scripts', 'src'];
const ROOT_FILES = ['next.config.js', 'next-sitemap.config.js'];
const IGNORED_DIRS = new Set([
  '.cache',
  '.git',
  '.next',
  'data',
  'node_modules',
  'output',
  'public',
]);
const PLATFORM_ENV_VARS = new Set(['VERCEL']);

const resolveScriptKind = (filePath: string) => {
  if (filePath.endsWith('.tsx')) {
    return ts.ScriptKind.TSX;
  }

  if (filePath.endsWith('.ts')) {
    return ts.ScriptKind.TS;
  }

  if (filePath.endsWith('.jsx')) {
    return ts.ScriptKind.JSX;
  }

  return ts.ScriptKind.JS;
};

const walkRuntimeFiles = (directoryPath: string, collected: string[] = []) => {
  if (!fs.existsSync(directoryPath)) {
    return collected;
  }

  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    if (entry.name === '__tests__') {
      continue;
    }

    const nextPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) {
        continue;
      }

      walkRuntimeFiles(nextPath, collected);
      continue;
    }

    if (/\.(c|m)?(t|j)sx?$/.test(entry.name)) {
      collected.push(nextPath);
    }
  }

  return collected;
};

const isProcessEnv = (node: ts.Node) =>
  ts.isPropertyAccessExpression(node) &&
  ts.isIdentifier(node.expression) &&
  node.expression.text === 'process' &&
  node.name.text === 'env';

const collectEnvNamesFromFile = (filePath: string) => {
  const sourceText = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    resolveScriptKind(filePath),
  );
  const envNames = new Set<string>();

  const visit = (node: ts.Node) => {
    if (ts.isPropertyAccessExpression(node) && isProcessEnv(node.expression)) {
      envNames.add(node.name.text);
    }

    if (
      ts.isElementAccessExpression(node) &&
      isProcessEnv(node.expression) &&
      ts.isStringLiteral(node.argumentExpression)
    ) {
      envNames.add(node.argumentExpression.text);
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return envNames;
};

const collectRuntimeEnvNames = () => {
  const runtimeFiles = [
    ...RUNTIME_DIRS.flatMap((directory) =>
      walkRuntimeFiles(path.join(ROOT_DIR, directory)),
    ),
    ...ROOT_FILES.map((fileName) => path.join(ROOT_DIR, fileName)).filter(
      (filePath) => fs.existsSync(filePath),
    ),
  ];
  const envNames = new Set<string>();

  runtimeFiles.forEach((filePath) => {
    collectEnvNamesFromFile(filePath).forEach((envName) => {
      if (!PLATFORM_ENV_VARS.has(envName)) {
        envNames.add(envName);
      }
    });
  });

  return [...envNames].sort();
};

const collectExampleEnvNames = () =>
  [
    ...fs
      .readFileSync(path.join(ROOT_DIR, '.env.example'), 'utf8')
      .matchAll(/^([A-Z0-9_]+)=/gm),
  ]
    .map((match) => match[1])
    .sort();

describe('.env.example coverage', () => {
  it('covers every runtime env var used by the project', () => {
    const runtimeEnvNames = collectRuntimeEnvNames();
    const exampleEnvNames = collectExampleEnvNames();
    const missingEnvNames = runtimeEnvNames.filter(
      (envName) => !exampleEnvNames.includes(envName),
    );

    expect(missingEnvNames).toEqual([]);
  });
});
