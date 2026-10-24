import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import diff from 'react-syntax-highlighter/dist/esm/languages/prism/diff';
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism-light';

SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('diff', diff);
SyntaxHighlighter.registerLanguage('go', go);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('markup', markup);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('rust', rust);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('yaml', yaml);

const labels: Record<string, string> = {
  bash: 'Bash',
  css: 'CSS',
  diff: 'diff',
  go: 'Go',
  java: 'Java',
  javascript: 'JavaScript',
  json: 'JSON',
  jsx: 'JSX',
  markdown: 'Markdown',
  markup: 'HTML',
  python: 'Python',
  rust: 'Rust',
  sql: 'SQL',
  tsx: 'TSX',
  typescript: 'TypeScript',
  yaml: 'YAML',
  text: 'Plain Text',
};
const aliases: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  html: 'markup',
  htm: 'markup',
  sh: 'bash',
  shell: 'bash',
  py: 'python',
  rs: 'rust',
  yml: 'yaml',
  md: 'markdown',
  plaintext: 'text',
  txt: 'text',
};

export const getCodeLanguage = (className: string) => {
  const source = /(?:^|\s)language-([^\s]+)/.exec(className)?.[1] || '';
  const normalized = source.toLowerCase();
  const language =
    (Object.hasOwn(aliases, normalized) ? aliases[normalized] : normalized) ||
    'text';
  const supported = Object.hasOwn(labels, language);
  return {
    language: supported ? language : 'text',
    label: (supported ? labels[language] : source) || 'Plain Text',
  };
};

export { SyntaxHighlighter };
