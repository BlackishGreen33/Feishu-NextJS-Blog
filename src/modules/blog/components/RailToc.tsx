// Rail TOC adapted from Rare UI, Copyright (c) 2026 Swami Malode.
// https://www.rareui.com/components/railtoc
// MIT + Commons Clause + Attribution: see RARE_UI_LICENSE.md.
// Uses existing heading metadata, controlled activeId and native anchors; no visible title.
'use client';

import * as React from 'react';
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
} from 'framer-motion';

import cn from '@/common/libs/cn';

import { getArticleReadingLine } from './useArticleToc';

export type RailTocItem = { id: string; label: string; depth?: number };

const RAIL_X = 5;
const LABEL_GAP = 14;
const TRAVEL_SPRING = { stiffness: 140, damping: 26, mass: 0.6 };
const TURN_SPRING = { stiffness: 260, damping: 30 };
// rail length the plane must back up before it turns around, so scroll jitter can't flip it
const TURN_SLACK = 2;

const PLANE = 'M12 2 20.5 21 12 17.5 3.5 21z';
// the plane is narrower than a dot, so the rail and dots under it are cut away
const PLANE_HOLE = 4;

const useIsoLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

type Point = { x: number; y: number };
type Geometry = { nodes: Point[]; d: string; width: number; height: number };

function buildPath(nodes: Point[]) {
  const first = nodes[0];
  if (!first) return '';
  const points: Point[] = [{ x: first.x, y: 0 }, first];
  let from = first;
  for (const to of nodes.slice(1)) {
    if (from.x !== to.x) {
      const bend = (to.y - from.y) * 0.3;
      points.push({ x: from.x, y: from.y + bend }, { x: to.x, y: to.y - bend });
    }
    points.push(to);
    from = to;
  }
  return points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
}

// the rail only ever runs downward, so y is monotonic along its length
function lengthAtY(path: SVGPathElement, total: number, y: number) {
  let lo = 0;
  let hi = total;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (path.getPointAtLength(mid).y < y) lo = mid;
    else hi = mid;
  }
  return hi;
}

export type RailTocProps = React.ComponentProps<'nav'> & {
  items: RailTocItem[];
  activeId: string;
  indent?: number;
  title?: string;
};

const RailToc = ({
  className,
  items,
  activeId,
  indent = 14,
  title = 'On this page',
  ...props
}: RailTocProps) => {
  const reduceMotion = useReducedMotion();
  const maskId = `rail-toc-${React.useId().replace(/[^\w-]/g, '')}`;

  const listRef = React.useRef<HTMLUListElement>(null);
  const rowRefs = React.useRef<(HTMLLIElement | null)[]>([]);
  const pathRef = React.useRef<SVGPathElement>(null);
  const holeRefs = React.useRef<(SVGCircleElement | null)[]>([]);

  const [geometry, setGeometry] = React.useState<Geometry>();
  const [reached, setReached] = React.useState(1);

  const lengths = React.useRef<number[]>([]);
  const total = React.useRef(0);
  const placed = React.useRef(false);
  const facing = React.useRef<1 | -1>(1);
  const turnFrom = React.useRef(0);

  const target = useMotionValue(0);
  const travel = useSpring(target, TRAVEL_SPRING);
  const distance = reduceMotion ? target : travel;

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const heading = useMotionValue(180);
  const turn = useSpring(heading, TURN_SPRING);
  const filled = useMotionValue(0);

  const pose = React.useCallback(
    (l: number) => {
      const path = pathRef.current;
      const length = total.current;
      if (!path || !length) return;
      const at = path.getPointAtLength(l);
      const behind = path.getPointAtLength(Math.max(0, l - 1));
      const ahead = path.getPointAtLength(Math.min(length, l + 1));
      x.set(at.x);
      holeRefs.current.forEach((hole) => {
        hole?.setAttribute('cx', `${at.x}`);
        hole?.setAttribute('cy', `${at.y}`);
      });
      y.set(at.y);
      const angle =
        (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI +
        90 +
        (facing.current < 0 ? 180 : 0);
      // unwrapped against the current heading so the turn spring takes the short way round
      const prev = heading.get();
      heading.set(angle + 360 * Math.round((prev - angle) / 360));
      filled.set(l / length);
      setReached(lengths.current.filter((n) => n <= l + 0.5).length);
    },
    [x, y, heading, filled],
  );

  useMotionValueEvent(distance, 'change', pose);

  const aim = React.useCallback(
    (next: number) => {
      const from = turnFrom.current;
      if ((next - from) * facing.current > 0) turnFrom.current = next;
      else if (Math.abs(next - from) > TURN_SLACK) {
        facing.current = facing.current > 0 ? -1 : 1;
        turnFrom.current = next;
      }
      target.set(next);
    },
    [target],
  );

  const sync = React.useCallback(() => {
    const nodes = lengths.current;
    const first = nodes[0];
    const item = items[0];
    if (first === undefined || !item) return;
    const index = Math.max(
      0,
      items.findIndex((item) => item.id === activeId),
    );
    const current = document.getElementById(items[index]?.id ?? item.id);
    const nextItem = items[index + 1];
    const following = nextItem ? document.getElementById(nextItem.id) : null;
    const from = nodes[index] ?? first;
    const to = nodes[index + 1] ?? from;
    let next = from;
    if (current && following) {
      const top = current.getBoundingClientRect().top;
      const span = following.getBoundingClientRect().top - top;
      const progress =
        span > 0 ? (getArticleReadingLine(current) - top) / span : 0;
      next += Math.min(1, Math.max(0, progress)) * (to - from);
    }
    aim(next);
    if (!placed.current) {
      placed.current = true;
      travel.jump(next);
      pose(next);
      turn.jump(heading.get());
    }
  }, [items, activeId, aim, travel, turn, heading, pose]);

  useIsoLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !items.length) return;

    let disposed = false;
    const measure = () => {
      if (disposed) return;
      const nodes = items.map((item, i) => {
        const row = rowRefs.current[i];
        return {
          x: RAIL_X + (item.depth ?? 0) * indent,
          y: row ? row.offsetTop + row.offsetHeight / 2 : 0,
        };
      });
      setGeometry({
        nodes,
        d: buildPath(nodes),
        width: Math.max(...nodes.map((n) => n.x)) + RAIL_X + 4,
        height: list.offsetHeight,
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      disposed = true;
      ro.disconnect();
    };
  }, [items, indent]);

  useIsoLayoutEffect(() => {
    const path = pathRef.current;
    if (!path || !geometry) return;
    total.current = path.getTotalLength();
    lengths.current = geometry.nodes.map((n) =>
      lengthAtY(path, total.current, n.y),
    );
    sync();
    pose(distance.get());
  }, [geometry, sync, pose, distance]);

  React.useEffect(() => {
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, [sync]);

  const active = Math.max(
    0,
    items.findIndex((item) => item.id === activeId),
  );

  return (
    <nav
      data-slot='rail-toc'
      aria-label={title}
      className={cn('rail-toc w-full text-sm', className)}
      {...props}
    >
      <ul ref={listRef} data-slot='rail-toc-list' className='relative'>
        {geometry && (
          <svg
            className='pointer-events-none absolute top-0 left-0 overflow-visible'
            width={geometry.width}
            height={geometry.height}
            aria-hidden
          >
            <linearGradient
              id={`${maskId}-fade`}
              gradientUnits='userSpaceOnUse'
              x1={0}
              y1={0}
              x2={0}
              y2={(geometry.nodes[0]?.y ?? 4) - 4}
            >
              <stop offset='0' stopColor='black' />
              <stop offset='1' stopColor='white' />
            </linearGradient>
            <mask
              id={maskId}
              maskUnits='userSpaceOnUse'
              x={-8}
              y={-8}
              width={geometry.width + 16}
              height={geometry.height + 16}
            >
              <rect
                x={-8}
                y={-8}
                width={geometry.width + 16}
                height={geometry.height + 16}
                fill={`url(#${maskId}-fade)`}
              />
              {geometry.nodes.map((node, i) => (
                <circle key={i} cx={node.x} cy={node.y} r={4} fill='black' />
              ))}
              <circle
                ref={(el) => {
                  holeRefs.current[0] = el;
                }}
                r={PLANE_HOLE}
                fill='black'
              />
            </mask>
            <mask
              id={`${maskId}-nodes`}
              maskUnits='userSpaceOnUse'
              x={-8}
              y={-8}
              width={geometry.width + 16}
              height={geometry.height + 16}
            >
              <rect
                x={-8}
                y={-8}
                width={geometry.width + 16}
                height={geometry.height + 16}
                fill='white'
              />
              <circle
                ref={(el) => {
                  holeRefs.current[1] = el;
                }}
                r={PLANE_HOLE}
                fill='black'
              />
            </mask>
            <g mask={`url(#${maskId})`}>
              <path
                ref={pathRef}
                d={geometry.d}
                fill='none'
                strokeWidth='1.25'
                strokeDasharray='2 5'
                strokeLinecap='round'
                strokeLinejoin='round'
                stroke='var(--reader-border)'
              />
              <motion.path
                d={geometry.d}
                fill='none'
                strokeWidth='1.25'
                stroke='var(--reader-muted)'
                strokeLinejoin='round'
                style={{ pathLength: filled }}
              />
            </g>
            <g mask={`url(#${maskId}-nodes)`}>
              {geometry.nodes.map((node, i) => {
                const covered = i < reached;
                return (
                  <circle
                    key={items[i]?.id ?? i}
                    cx={node.x}
                    cy={node.y}
                    r={covered ? 3 : 3.25}
                    strokeWidth='1.25'
                    className={cn(
                      'transition-[fill,stroke] duration-200',
                      covered
                        ? 'fill-(--reader-muted) stroke-(--reader-muted)'
                        : 'fill-transparent stroke-(--reader-border)',
                    )}
                  />
                );
              })}
            </g>
          </svg>
        )}

        {geometry && (
          <motion.div
            data-slot='rail-toc-plane'
            className='rail-toc-plane pointer-events-none absolute top-0 left-0 -mt-2 -ml-2 h-4 w-4'
            style={{ x, y, rotate: reduceMotion ? heading : turn }}
            aria-hidden
          >
            <svg viewBox='0 0 24 24' className='h-4 w-4 overflow-visible'>
              <path
                d={PLANE}
                fill='currentColor'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinejoin='round'
              />
            </svg>
          </motion.div>
        )}

        {items.map((item, i) => {
          const isActive = i === active;
          return (
            <li
              key={item.id}
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
            >
              <a
                href={`#${item.id}`}
                aria-current={isActive ? 'location' : undefined}
                className={cn(
                  'block w-full py-1.5 pr-2 text-left leading-5 break-words transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none',
                  isActive ? 'font-medium' : 'font-normal',
                )}
                style={{
                  paddingLeft: RAIL_X + (item.depth ?? 0) * indent + LABEL_GAP,
                }}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export { RailToc };
export default RailToc;
