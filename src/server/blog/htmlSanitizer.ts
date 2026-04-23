import type { Options as RehypeSanitizeSchema } from 'rehype-sanitize';

import { commentHtmlSanitizeSchema } from '@/common/libs/htmlSanitizer';

type SanitizableComment = {
  body_html?: unknown;
  children?: SanitizableComment[];
  [key: string]: unknown;
};

type SanitizerModules = {
  rehypeParse: typeof import('rehype-parse').default;
  rehypeSanitize: typeof import('rehype-sanitize').default;
  rehypeStringify: typeof import('rehype-stringify').default;
  unified: typeof import('unified').unified;
};

let sanitizerModulesPromise: Promise<SanitizerModules> | null = null;

const loadSanitizerModules = async (): Promise<SanitizerModules> => {
  if (!sanitizerModulesPromise) {
    sanitizerModulesPromise = Promise.all([
      import('rehype-parse'),
      import('rehype-sanitize'),
      import('rehype-stringify'),
      import('unified'),
    ]).then(
      ([
        rehypeParseModule,
        rehypeSanitizeModule,
        rehypeStringifyModule,
        unifiedModule,
      ]) => ({
        rehypeParse: rehypeParseModule.default,
        rehypeSanitize: rehypeSanitizeModule.default,
        rehypeStringify: rehypeStringifyModule.default,
        unified: unifiedModule.unified,
      }),
    );
  }

  return sanitizerModulesPromise;
};

const sanitizeHtmlFragment = async (
  html: string,
  schema: RehypeSanitizeSchema,
) => {
  const { rehypeParse, rehypeSanitize, rehypeStringify, unified } =
    await loadSanitizerModules();

  return unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeSanitize, schema)
    .use(rehypeStringify)
    .process(html)
    .then((file) => file.toString());
};

export const sanitizeCommentHtml = async (html: unknown) =>
  typeof html === 'string'
    ? sanitizeHtmlFragment(html, commentHtmlSanitizeSchema)
    : '';

export const sanitizeCommentTree = <T extends SanitizableComment>(
  comment: T,
): Promise<T> =>
  Promise.all([
    sanitizeCommentHtml(comment.body_html),
    Array.isArray(comment.children)
      ? Promise.all(comment.children.map((child) => sanitizeCommentTree(child)))
      : Promise.resolve(comment.children),
  ]).then(([bodyHtml, children]) => ({
    ...comment,
    body_html: bodyHtml,
    children,
  }));

export const sanitizeCommentList = <T extends SanitizableComment>(
  comments: T[],
): Promise<T[]> =>
  Promise.all(comments.map((comment) => sanitizeCommentTree(comment)));
