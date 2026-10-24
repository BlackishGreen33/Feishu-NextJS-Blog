import { useCallback, useState } from 'react';

export type ArticleHeading = { id: string; label: string; level: number };

export const getArticleReadingLine = (element: HTMLElement) =>
  Math.max(
    Number.parseFloat(getComputedStyle(element).scrollMarginTop) || 112,
    window.innerHeight / 4,
  );

export const useArticleToc = (content: string) => {
  const [headings, setHeadings] = useState<ArticleHeading[]>([]);
  const [activeId, setActiveId] = useState('');
  const contentRef = useCallback(
    (container: HTMLDivElement | null) => {
      if (!container) return;
      if (!content) {
        setHeadings([]);
        setActiveId('');
        return;
      }
      const elements = Array.from(
        container.querySelectorAll<HTMLElement>(
          'h1[data-toc-label],h2[data-toc-label],h3[data-toc-label]',
        ),
      );
      setHeadings(
        elements.map((element) => ({
          id: element.id,
          label: element.dataset.tocLabel || '',
          level: Number(element.tagName[1]),
        })),
      );
      const first = elements[0];
      if (!first) {
        setActiveId('');
        return;
      }

      const readingLine = () => getArticleReadingLine(first);
      const update = () => {
        let current = first;
        const top = readingLine();
        for (const element of elements) {
          if (element.getBoundingClientRect().top <= top + 1) current = element;
        }
        const page = document.documentElement;
        if (
          page.scrollHeight > window.innerHeight &&
          window.scrollY + window.innerHeight >= page.scrollHeight - 1
        )
          current = elements.at(-1) || current;
        setActiveId(current.id);
      };
      let observer: IntersectionObserver | undefined;
      const connect = () => {
        observer?.disconnect();
        if (typeof IntersectionObserver !== 'undefined') {
          const top = readingLine();
          observer = new IntersectionObserver(update, {
            rootMargin: `-${top}px 0px -${Math.max(0, window.innerHeight - top - 1)}px 0px`,
          });
          elements.forEach((element) => observer?.observe(element));
        }
        update();
      };
      const scrollToHash = () => {
        try {
          const target = decodeURIComponent(window.location.hash.slice(1));
          elements
            .find((element) => element.id === target)
            ?.scrollIntoView({ block: 'start' });
        } catch {
          /* Ignore malformed external fragments. */
        }
        connect();
      };
      // Wait for heading metadata and page layout before restoring a fragment.
      const frame = requestAnimationFrame(scrollToHash);
      let scrollFrame: number | undefined;
      // Large scroll jumps can skip a heading's IntersectionObserver region.
      const onScroll = () => {
        if (scrollFrame !== undefined) return;
        scrollFrame = requestAnimationFrame(() => {
          scrollFrame = undefined;
          update();
        });
      };
      connect();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', connect);
      window.addEventListener('hashchange', update);
      return () => {
        cancelAnimationFrame(frame);
        if (scrollFrame !== undefined) cancelAnimationFrame(scrollFrame);
        observer?.disconnect();
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', connect);
        window.removeEventListener('hashchange', update);
      };
    },
    [content],
  );
  return { headings, activeId, contentRef };
};
