import {
  type Block,
  BlockType,
  getCodeLanguage,
  MarkdownRenderer,
} from 'feishu-docx/dist/index.js';

import type { CodeBackgroundRange } from '@/common/libs/codeBackgrounds';

const escapeCode = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\r/g, '&#13;')
    .replace(/\n/g, '&#10;')
    .replace(/\|/g, '&#124;');

export class ArticleMarkdownRenderer extends MarkdownRenderer {
  parseBlock(block: Block, indent: number): string {
    if (block?.block_type !== BlockType.Code) {
      const rendered = super.parseBlock(block, indent);
      if (
        block &&
        [BlockType.Grid, BlockType.Callout, BlockType.Table].includes(
          block.block_type,
        ) &&
        rendered.trimStart().startsWith('<')
      ) {
        // These containers already included HTML code in legacy text extraction.
        return rendered.replace(
          /<code (?=class="language-[^"]+" data-feishu-code-background=)/g,
          '<code data-feishu-code-searchable="true" ',
        );
      }
      return rendered;
    }
    if (block.code.elements.some((element) => !element.text_run))
      return super.parseBlock(block, indent);

    let text = '';
    const ranges: CodeBackgroundRange[] = [];
    for (const element of block.code.elements) {
      const content = element.text_run?.content || '';
      const color = element.text_run?.text_element_style?.background_color;
      const start = text.length;
      text += content;
      if (
        content &&
        Number.isInteger(color) &&
        color !== undefined &&
        color >= 1 &&
        color <= 15
      ) {
        ranges.push([start, text.length, color]);
      }
    }
    if (!ranges.length) return super.parseBlock(block, indent);

    this.indent = indent;
    this.currentBlock = block;
    const language = getCodeLanguage(block.code.style.language) || 'text';
    // Entities keep the code on one structural line through list/table renderers.
    return `${' '.repeat(indent * 4)}<pre><code class="language-${language}" data-feishu-code-background="${JSON.stringify(ranges)}">${escapeCode(text)}</code></pre>\n`;
  }
}
