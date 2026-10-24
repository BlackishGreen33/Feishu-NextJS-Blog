// Adapted from Magic UI's circle Theme Toggler (MIT).
// https://magicui.design/docs/components/animated-theme-toggler
// Copyright (c) Magic UI. Full notice in THIRD_PARTY_NOTICES.md.
import { useCallback, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { MdDarkMode, MdLightMode } from 'react-icons/md';

type Theme = 'light' | 'dark';

const AnimatedThemeToggler = ({
  theme,
  onThemeChange,
  label,
  title,
}: {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  label: string;
  title: string;
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const transitionRef = useRef<ViewTransition | null>(null);
  const animationRef = useRef<Animation | null>(null);
  const ownsTransition = useRef(false);

  const cleanup = useCallback(() => {
    if (!ownsTransition.current) return;
    ownsTransition.current = false;
    animationRef.current?.cancel();
    animationRef.current = null;
    transitionRef.current = null;
    const root = document.documentElement;
    delete root.dataset.magicuiThemeVt;
    root.style.removeProperty('--magicui-theme-toggle-vt-duration');
    root.style.removeProperty('--magicui-theme-vt-clip-from');
  }, []);

  useEffect(
    () => () => {
      transitionRef.current?.skipTransition();
      cleanup();
    },
    [cleanup],
  );

  const toggle = async () => {
    const button = buttonRef.current;
    const root = document.documentElement;
    if (!button || root.dataset.magicuiThemeVt === 'active') return;
    const next = theme === 'dark' ? 'light' : 'dark';
    if (
      typeof document.startViewTransition !== 'function' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      onThemeChange(next);
      return;
    }
    const { left, top, width, height } = button.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const radius = Math.hypot(Math.max(x, w - x), Math.max(y, h - y));
    const percent = (radius / (Math.hypot(w, h) / Math.SQRT2)) * 100;
    const origin = `${(x / w) * 100}% ${(y / h) * 100}%`;
    const clipFrom = `circle(0% at ${origin})`;
    const clipPath = [clipFrom, `circle(${percent}% at ${origin})`];
    root.dataset.magicuiThemeVt = 'active';
    ownsTransition.current = true;
    root.style.setProperty('--magicui-theme-toggle-vt-duration', '250ms');
    root.style.setProperty('--magicui-theme-vt-clip-from', clipFrom);
    let applied = false;
    try {
      const transition = document.startViewTransition(() => {
        flushSync(() => {
          root.classList.toggle('dark', next === 'dark');
          root.classList.toggle('light', next === 'light');
          onThemeChange(next);
          applied = true;
        });
      });
      transitionRef.current = transition;
      await transition.ready;
      if (!ownsTransition.current) return;
      const animation = root.animate(
        { clipPath },
        {
          duration: 250,
          easing: 'ease-out',
          fill: 'forwards',
          pseudoElement: '::view-transition-new(root)',
        },
      );
      animationRef.current = animation;
      await animation.finished;
      await transition.finished;
    } catch {
      transitionRef.current?.skipTransition();
      if (!applied) onThemeChange(next);
    } finally {
      cleanup();
    }
  };

  return (
    <button
      ref={buttonRef}
      type='button'
      aria-label={label}
      title={title}
      onClick={() => {
        void toggle();
      }}
      className='reader-theme-toggle inline-flex aspect-square size-10 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2'
      data-umami-event={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
    >
      {theme === 'dark' ? <MdLightMode size={18} /> : <MdDarkMode size={18} />}
    </button>
  );
};

export default AnimatedThemeToggler;
