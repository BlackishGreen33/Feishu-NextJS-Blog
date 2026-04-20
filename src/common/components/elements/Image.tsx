'use client';

import { useState } from 'react';
import NextImage, { ImageProps as NextImageProps } from 'next/image';
import clsx from 'clsx';

import cn from '@/common/libs/cn';

type ImageProps = {
  rounded?: string;
} & NextImageProps;

const Image = (props: ImageProps) => {
  const { alt, src, className, rounded, priority, ...rest } = props;
  const [isLoading, setLoading] = useState(true);
  const isFillImage = Boolean(rest.fill);

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
            : 'scale-100 blur-0 grayscale-0',
          rounded,
          className,
        )}
        src={src}
        alt={alt}
        priority={priority}
        onLoad={() => setLoading(false)}
        {...rest}
      />
    </div>
  );
};
export default Image;
