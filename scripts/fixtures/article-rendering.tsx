import React from 'react';
import { RouterContext } from 'next/dist/shared/lib/router-context.shared-runtime';
import type { NextRouter } from 'next/router';
import {
  BlockType as B,
  CodeLanguage as L,
  MarkdownRenderer,
} from 'feishu-docx/dist/index.js';
import type { RootContent } from 'hast';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import rehypeParse from 'rehype-parse';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import { unified } from 'unified';

import { CodeBlockBase } from '@/common/components/elements/CodeBlock';
import MDXComponent from '@/common/components/elements/MDXComponent';
import { feishuHtmlSanitizeSchema } from '@/common/libs/htmlSanitizer';
import { createFeishuArticleSource } from '@/server/blog/source';
import { calculateReadingTime, stripMarkdown } from '@/server/blog/utils';

Object.assign(globalThis, { React });
const router = { locale: 'en' } as NextRouter;
const render = (node: React.ReactNode) =>
  renderToStaticMarkup(
    <RouterContext.Provider value={router}>{node}</RouterContext.Provider>,
  );

const sanitized = String(
  unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeSanitize, feishuHtmlSanitizeSchema)
    .use(rehypeStringify)
    .processSync(
      '<pre><code class="language-js injected" onclick="bad()">const n = 1;</code></pre>',
    ),
);
assert.match(sanitized, /class="language-js"/);
assert.doesNotMatch(sanitized, /onclick|injected/);
for (const [language, label, code] of [
  ['js', 'JavaScript', 'const n = 1;'],
  ['ts', 'TypeScript', 'const n: number = 1;'],
  ['jsx', 'JSX', '<button>hello</button>'],
  ['tsx', 'TSX', 'const el = <button />;'],
  ['html', 'HTML', '<button>hello</button>'],
  ['css', 'CSS', '.a { color: red; }'],
  ['json', 'JSON', '{"ok":true}'],
  ['sh', 'Bash', 'if true; then echo hi; fi'],
  ['py', 'Python', 'def hi(): return True'],
  ['java', 'Java', 'class Main {}'],
  ['go', 'Go', 'package main'],
  ['rs', 'Rust', 'fn main() {}'],
  ['sql', 'SQL', 'SELECT * FROM posts;'],
  ['yml', 'YAML', 'title: hello'],
  ['md', 'Markdown', '# hello'],
  ['diff', 'diff', '+ added'],
]) {
  const html = render(
    <CodeBlockBase isBlock className={`language-${language}`}>
      {code}
    </CodeBlockBase>,
  );
  assert.ok(html.includes(`>${label}<`), `${language}: visible language label`);
  assert.match(html, /class="token(?:\s|")/, `${language}: real syntax tokens`);
}
const unknown = render(
  <CodeBlockBase isBlock className='language-future-lang'>
    {'const <unknown> = 1;'}
  </CodeBlockBase>,
);
assert.ok(unknown.includes('>future-lang<'));
assert.doesNotMatch(unknown, /class="token(?:\s|")/);
assert.ok(unknown.includes('&lt;unknown&gt;'));
assert.ok(
  render(<CodeBlockBase isBlock>hello</CodeBlockBase>).includes('>Plain Text<'),
);

const text = '  const value = "😀<&|>";\nreturn value;\r\n';
const codeBlock = (id: string, color: number) => ({
  block_id: id,
  block_type: B.Code,
  code: {
    style: { language: L.JavaScript },
    elements: [
      { text_run: { content: '  ', text_element_style: {} } },
      {
        text_run: {
          content: 'const value = "😀<&|>";\nreturn',
          text_element_style: { background_color: color },
        },
      },
      { text_run: { content: ' value;\r\n', text_element_style: {} } },
    ],
  },
});
const blocks = [
  {
    block_id: 'doc',
    block_type: B.Page,
    page: {
      elements: [{ text_run: { content: 'Title', text_element_style: {} } }],
    },
    children: [
      'meta',
      'bare',
      'grid',
      'callout',
      'bullet',
      'quote',
      'table',
      'simple',
      'synced',
    ],
  },
  {
    block_id: 'meta',
    block_type: B.Code,
    code: {
      style: { language: L.YAML },
      elements: [
        { text_run: { content: 'title: Kept', text_element_style: {} } },
      ],
    },
  },
  codeBlock('bare', 3),
  {
    block_id: 'grid',
    block_type: B.Grid,
    grid: { column_size: 2 },
    children: ['col'],
  },
  {
    block_id: 'col',
    block_type: B.GridColumn,
    grid_column: { width_ratio: 50 },
    children: ['cg'],
  },
  codeBlock('cg', 4),
  { block_id: 'callout', block_type: B.Callout, callout: {}, children: ['cc'] },
  codeBlock('cc', 5),
  {
    block_id: 'bullet',
    block_type: B.Bullet,
    bullet: {
      elements: [{ text_run: { content: 'List', text_element_style: {} } }],
    },
    children: ['cl'],
  },
  codeBlock('cl', 6),
  { block_id: 'quote', block_type: B.QuoteContainer, children: ['cq'] },
  codeBlock('cq', 7),
  {
    block_id: 'table',
    block_type: B.Table,
    table: {
      cells: ['cell'],
      property: {
        column_size: 1,
        column_width: [200],
        merge_info: [{ row_span: 1, col_span: 1 }],
      },
    },
  },
  { block_id: 'cell', block_type: B.TableCell, children: ['ct'] },
  codeBlock('ct', 8),
  {
    block_id: 'simple',
    block_type: B.Table,
    table: {
      cells: ['simple-cell'],
      property: {
        column_size: 1,
        column_width: [100],
        merge_info: [{ row_span: 1, col_span: 1 }],
      },
    },
  },
  { block_id: 'simple-cell', block_type: B.TableCell, children: ['cs'] },
  codeBlock('cs', 9),
  { block_id: 'synced', block_type: B.SyncedBlock, children: ['cy'] },
  codeBlock('cy', 10),
];
const getText = (node: RootContent): string =>
  node.type === 'text'
    ? node.value
    : 'children' in node
      ? node.children.map(getText).join('')
      : '';

assert.ok(
  render(<MDXComponent>{'<pre>  one\n  two</pre>'}</MDXComponent>).includes(
    '<pre>  one\n  two</pre>',
  ),
);
assert.equal(
  stripMarkdown(
    '<div class="callout"><pre><code class="language-js">searchableword</code></pre></div>',
  ),
  'searchableword',
);
const headings = render(
  <MDXComponent withHeadingAnchors>
    {
      '# 使用 `useState` 更新\n\n## 重複\n\n## 重複-2\n\n## 重複\n\n<div class="callout"><h3 id="evil">Raw <code>HTML</code></h3></div>\n\n#### 不收錄\n\n```md\n# 假標題\n```'
    }
  </MDXComponent>,
);
assert.ok(headings.includes('id="article-section-使用-usestate-更新"'));
assert.ok(headings.includes('data-toc-label="使用 useState 更新"'));
assert.ok(headings.includes('id="article-section-重複-3"'));
assert.ok(headings.includes('id="article-section-raw-html"'));
assert.doesNotMatch(
  headings,
  /id="evil"|id="article-section-不收錄"|id="article-section-假標題"/,
);
assert.doesNotMatch(
  render(<MDXComponent># 其他消費端</MDXComponent>),
  /article-section-/,
);

async function verifyBackgrounds() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input) => {
    const url = String(input);
    if (url.includes('/auth/v3/tenant_access_token'))
      return Promise.resolve(
        new Response(
          JSON.stringify({
            code: 0,
            tenant_access_token: 'fixture',
            expire: 7200,
          }),
        ),
      );
    assert.ok(
      url.includes('/docx/v1/documents/doc/blocks'),
      'only the expected read API may be called',
    );
    return Promise.resolve(
      new Response(
        JSON.stringify({ code: 0, data: { items: blocks, has_more: false } }),
      ),
    );
  };
  try {
    const source = createFeishuArticleSource({
      appId: 'fixture',
      appSecret: 'fixture',
      spaceId: 'space',
    });
    const result = await source.readDocument({
      title: 'Title',
      sourceNodeToken: 'node',
      sourceDocumentId: 'doc',
      sourceSpaceId: 'space',
    });
    assert.equal(result.meta.title, 'Kept');
    const previousMarkdown = new MarkdownRenderer({
      document: { document_id: 'doc' },
      blocks,
    }).parse();
    assert.equal(
      stripMarkdown(result.markdown),
      stripMarkdown(previousMarkdown),
    );
    assert.equal(
      calculateReadingTime(result.markdown),
      calculateReadingTime(previousMarkdown),
    );
    const renderedCodes: string[] = [];
    const html = render(
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, feishuHtmlSanitizeSchema]]}
        components={{
          code: ({ node, children, className }) => {
            const code = String(children);
            const metadata = node?.properties.dataFeishuCodeBackground;
            renderedCodes.push(code);
            assert.equal(
              metadata,
              JSON.stringify([[2, 32, renderedCodes.length + 2]]),
            );
            return (
              <CodeBlockBase
                isBlock
                className={className}
                backgroundMetadata={metadata}
              >
                {code}
              </CodeBlockBase>
            );
          },
        }}
      >
        {result.markdown}
      </ReactMarkdown>,
    );
    assert.equal(renderedCodes.length, 8);
    renderedCodes.forEach((code) => assert.equal(code, text));
    const tree = unified().use(rehypeParse, { fragment: true }).parse(html);
    const painted: string[] = [];
    const visit = (node: RootContent) => {
      if (node.type !== 'element') return;
      if (
        Array.isArray(node.properties.className) &&
        node.properties.className.some((name) =>
          String(name).startsWith('feishu-code-bg-'),
        )
      )
        painted.push(getText(node));
      node.children.forEach(visit);
    };
    tree.children.forEach(visit);
    assert.equal(painted.join(''), 'const value = "😀<&|>";\nreturn'.repeat(8));
    const plain = 'before\n\n```js\nconst n = 1;\n```\n\nafter';
    const enriched =
      'before\n\n<pre><code data-feishu-code-background="[[0,5,3]]">const n = 1;&#10;</code></pre>\n\nafter';
    assert.equal(stripMarkdown(enriched), stripMarkdown(plain));
    assert.equal(calculateReadingTime(enriched), calculateReadingTime(plain));
    for (const bad of [
      'not-json',
      '[[0,100,3]]',
      '[[0,2,99]]',
      '[[-1,2,3]]',
      '[[2,4,3],[1,3,4]]',
    ]) {
      const fallback = render(
        <CodeBlockBase isBlock backgroundMetadata={bad}>
          hello
        </CodeBlockBase>,
      );
      assert.doesNotMatch(fallback, /feishu-code-bg-/);
      assert.ok(fallback.includes('hello'));
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
}
void verifyBackgrounds()
  .then(() => {
    process.stdout.write('article rendering verified\n');
  })
  .catch((error: unknown) => {
    process.stderr.write(String(error));
    process.exitCode = 1;
  });
