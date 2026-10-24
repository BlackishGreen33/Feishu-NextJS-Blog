// Adapted from Aceternity Timeline: https://ui.aceternity.com/components/timeline
// Licensed under the Aceternity License; see the shared THIRD_PARTY_NOTICES.md.
import { type ReactNode, useRef } from 'react';
import { motion, useReducedMotion, useScroll } from 'framer-motion';

interface TimelineEntry {
  id: string;
  title: string;
  content: ReactNode;
}

const Timeline = ({
  data,
  label,
}: {
  data: TimelineEntry[];
  label: string;
}) => {
  const container = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: container,
    // The About timeline is shorter than the full-page Aceternity demo.
    offset: ['start 70%', 'end 35%'],
    trackContentSize: true,
  });

  return (
    <div ref={container} className='relative'>
      <ol aria-label={label}>
        {data.map((item) => (
          <li
            key={item.id}
            className='relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 pb-16 last:pb-8 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-x-8 sm:gap-y-0'
          >
            <div className='relative z-10 col-span-2 flex items-start gap-3 self-start sm:sticky sm:top-28 sm:col-span-1 sm:gap-6'>
              <div className='bg-light dark:bg-dark flex size-10 shrink-0 items-center justify-center rounded-full'>
                <span className='size-3 rounded-full border-[0.5px] border-(--reader-muted) bg-(--reader-control)' />
              </div>
              <h3 className='pt-2 text-sm leading-6 font-medium text-(--reader-muted) tabular-nums'>
                {item.title}
              </h3>
            </div>
            <div className='col-start-2 min-w-0 pt-1 sm:row-start-1'>
              {item.content}
            </div>
          </li>
        ))}
      </ol>
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-y-0 left-5 w-0.5 overflow-hidden bg-(--reader-border) [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]'
      >
        <motion.div
          className='absolute inset-0 origin-top bg-linear-to-t from-(--reader-accent) via-(--reader-accent) to-transparent'
          style={{ scaleY: reducedMotion ? 1 : scrollYProgress }}
        />
      </div>
    </div>
  );
};

export default Timeline;
