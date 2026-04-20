import path from 'path';

const MARKDOWN_IMAGE_REGEX =
  /!\[[^\]]*]\(([^)\s]+)[^)]*\)|<img[^>]*src=["']([^"']+)["'][^>]*>/i;
const MARKDOWN_LINK_REGEX = /\[([^\]]+)]\(([^)]+)\)/g;

export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const toSlug = (input: string) =>
  input
    .trim()
    .toLowerCase()
    .replace(/[\u2019']/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const ensureUniqueSlug = (
  candidate: string,
  suffix: string,
  existing: Set<string>,
) => {
  const base = candidate || suffix.toLowerCase();
  if (!existing.has(base)) {
    existing.add(base);
    return base;
  }

  const next = `${base}-${suffix.toLowerCase()}`;
  existing.add(next);
  return next;
};

export const toBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'y', 'on'].includes(value.toLowerCase());
  }

  return false;
};

export const toStringArray = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

export const stripMarkdown = (value: string) =>
  value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\(([^)]+)\)/g, ' ')
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_\-~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const summarizeMarkdown = (value: string, maxLength = 140) => {
  const text = stripMarkdown(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
};

const normalizeHeadingText = (value: string) =>
  stripMarkdown(value).replace(/\s+/g, ' ').trim().toLowerCase();

export const stripLeadingHeading = (content: string, title: string) => {
  const headingMatch = content.match(/^#\s+(.+?)\n+/);

  if (!headingMatch?.[1]) {
    return content;
  }

  if (normalizeHeadingText(headingMatch[1]) !== normalizeHeadingText(title)) {
    return content;
  }

  return content.slice(headingMatch[0].length).trimStart();
};

export const extractFirstImage = (value: string) => {
  const matched = value.match(MARKDOWN_IMAGE_REGEX);
  return matched?.[1] || matched?.[2] || null;
};

export const calculateReadingTime = (value: string) => {
  const text = stripMarkdown(value);
  if (!text) return 1;

  const words = text.split(/\s+/).filter(Boolean).length;
  const cjkChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const estimated = Math.ceil(words / 220 || cjkChars / 320);

  return Math.max(1, estimated);
};

export const replaceTokens = (
  content: string,
  replacements: Record<string, string>,
) =>
  Object.entries(replacements).reduce((acc, [token, replacement]) => {
    if (!token || token === replacement) return acc;
    return acc.split(token).join(replacement);
  }, content);

export const extractLinkedTokens = (content: string) => {
  const tokens = new Set<string>();
  let match: RegExpExecArray | null = null;

  while ((match = MARKDOWN_LINK_REGEX.exec(content)) !== null) {
    const href = match[2];
    if (/^(https?:|\/)/.test(href)) continue;
    if (href.startsWith('#')) continue;
    tokens.add(href);
  }

  return [...tokens];
};

export const sanitizeFileName = (value: string) =>
  value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');

export const extensionFromType = (
  contentType: string | null,
  fileName?: string | null,
) => {
  const fileExt = fileName ? path.extname(fileName) : '';
  if (fileExt) return fileExt;

  switch (contentType) {
    case 'image/png':
      return '.png';
    case 'image/jpeg':
      return '.jpg';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    case 'image/svg+xml':
      return '.svg';
    case 'application/pdf':
      return '.pdf';
    case 'text/plain':
      return '.txt';
    case 'application/json':
      return '.json';
    default:
      return '';
  }
};

export const parseContentDispositionName = (header?: string | null) => {
  if (!header) return null;

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const basicMatch = header.match(/filename="?([^"]+)"?/i);
  return basicMatch?.[1] || null;
};

export const isHiddenTitle = (title: string) => /\[(hide|隐藏)]/i.test(title);

export const toIsoDate = (value?: string | number | null) => {
  if (!value) return new Date().toISOString();
  const normalizedValue =
    typeof value === 'string' && /^\d+$/.test(value.trim())
      ? Number(value.trim())
      : value;
  const date =
    typeof normalizedValue === 'number'
      ? new Date(
          normalizedValue > 1e12
            ? normalizedValue
            : normalizedValue * 1000,
        )
      : new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
};

export const sortArticlesByDate = <T extends { publishedAt: string }>(
  items: T[],
) =>
  [...items].sort(
    (left, right) =>
      new Date(right.publishedAt).getTime() -
      new Date(left.publishedAt).getTime(),
  );
