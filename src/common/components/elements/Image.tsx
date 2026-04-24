'use client';

import { useEffect, useState } from 'react';
import NextImage, { ImageProps as NextImageProps } from 'next/image';
import clsx from 'clsx';

import cn from '@/common/libs/cn';

type ImageProps = {
  rounded?: string;
  fallbackSrc?: NextImageProps['src'];
} & NextImageProps;

const shouldBypassOptimizer = (src: NextImageProps['src']) =>
  typeof src === 'string' &&
  (src.startsWith('/feishu-assets/') ||
    src.startsWith('/local-feishu-assets/'));

const Image = (props: ImageProps) => {
  const { alt, src, className, rounded, priority, fallbackSrc, ...rest } =
    props;
  const [isLoading, setLoading] = useState(true);
  const [currentSrc, setCurrentSrc] = useState(src);
  const isFillImage = Boolean(rest.fill);

  useEffect(() => {
    setLoading(true);
    setCurrentSrc(src);
  }, [src]);

  return (
    <div
      className={clsx(
        'overflow-hidden',
        isFillImage && 'relative h-full w-full',
        isLoading ? 'animate-pulse' : '',
        rounded,
      )}
    >
      <NextImage
        className={cn(
          'duration-700 ease-in-out',
          isLoading
            ? 'scale-[1.02] blur-xl grayscale'
            : 'blur-0 scale-100 grayscale-0',
          rounded,
          className,
        )}
        src={currentSrc}
        alt={alt}
        priority={priority}
        unoptimized={shouldBypassOptimizer(currentSrc)}
        onLoad={() => setLoading(false)}
        onError={() => {
          if (fallbackSrc && currentSrc !== fallbackSrc) {
            setCurrentSrc(fallbackSrc);
            return;
          }

          setLoading(false);
        }}
        {...rest}
      />
    </div>
  );
};
export default Image;
