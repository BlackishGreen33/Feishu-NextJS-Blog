// Adapted from Animata Fluid Tabs; see THIRD_PARTY_NOTICES.md.
import { type KeyboardEvent, useId, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import cn from '@/common/libs/cn';

interface TabProps {
  label: React.ReactNode;
  children: React.ReactNode;
}

interface TabsProps {
  tabs: TabProps[];
  label: string;
}

export const Tabs = ({ tabs, label }: TabsProps) => {
  const [activeTab, setActiveTab] = useState(0);
  const tabList = useRef<HTMLDivElement>(null);
  const id = useId();
  const reducedMotion = useReducedMotion();

  // Manual activation: arrows move focus, native Enter / Space selects.
  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (index + 1) % tabs.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (index - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = tabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    tabList.current
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus();
  };

  return (
    <div>
      <div
        ref={tabList}
        role='tablist'
        aria-label={label}
        className='relative isolate mx-auto flex w-full gap-1 rounded-full bg-(--reader-control) p-1 sm:w-fit'
      >
        {tabs.map((tab, index) => {
          const selected = activeTab === index;
          return (
            <button
              key={index}
              type='button'
              role='tab'
              id={`${id}-tab-${index}`}
              aria-selected={selected}
              aria-controls={`${id}-panel-${index}`}
              tabIndex={selected ? 0 : -1}
              className={cn(
                'relative flex min-h-11 flex-1 items-center justify-center rounded-full px-1 text-xs font-medium whitespace-nowrap outline-offset-2 outline-(--reader-accent) focus-visible:outline-2 min-[380px]:text-sm sm:px-5',
                selected
                  ? 'text-(--reader-text)'
                  : 'text-(--reader-muted) hover:text-(--reader-text)',
              )}
              onClick={() => setActiveTab(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {selected && (
                <motion.span
                  {...(!reducedMotion ? { layoutId: `${id}-indicator` } : {})}
                  className='absolute inset-0 rounded-full bg-(--reader-surface) shadow-sm'
                  transition={{
                    type: 'spring',
                    stiffness: 380,
                    damping: 34,
                    mass: 0.75,
                  }}
                  aria-hidden='true'
                />
              )}
              <motion.span
                className='relative z-10'
                animate={{ scale: selected || reducedMotion ? 1 : 0.98 }}
                transition={{
                  duration: reducedMotion ? 0 : 0.25,
                  ease: 'easeOut',
                }}
              >
                {tab.label}
              </motion.span>
            </button>
          );
        })}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={index}
          role='tabpanel'
          id={`${id}-panel-${index}`}
          aria-labelledby={`${id}-tab-${index}`}
          hidden={activeTab !== index}
          tabIndex={0}
          className='pt-8 outline-offset-4 outline-(--reader-accent) focus-visible:outline-2'
        >
          {activeTab === index ? tab.children : null}
        </div>
      ))}
    </div>
  );
};
