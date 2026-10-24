import { act, waitFor } from '@testing-library/react';
import { spawnSync } from 'node:child_process';
import { hydrateRoot } from 'react-dom/client';

import useIsMobile from '@/common/hooks/useIsMobile';

const Probe = () => <div>{useIsMobile() ? 'mobile' : 'desktop'}</div>;

it.each([390, 800, 1000])(
  'hydrates at %ipx before applying the existing viewport breakpoint',
  async (width) => {
    const result = spawnSync(
      process.execPath,
      [
        require.resolve('tsx/cli'),
        '--eval',
        `
    import React from 'react';
    import { renderToString } from 'react-dom/server';
    import useIsMobile from './src/common/hooks/useIsMobile';
    const Probe = () => React.createElement('div', null, useIsMobile() ? 'mobile' : 'desktop');
    process.stdout.write(renderToString(React.createElement(Probe)));
  `,
      ],
      { cwd: process.cwd(), encoding: 'utf8', timeout: 15000 },
    );
    expect(result.status).toBe(0);
    const previousWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: width,
    });
    const container = document.createElement('div');
    container.innerHTML = result.stdout;
    document.body.append(container);
    const recoveries: unknown[] = [];
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, <Probe />, {
        onRecoverableError: (error) => {
          recoveries.push(error);
        },
      });
    });
    await waitFor(() =>
      expect(container.textContent).toBe(width < 821 ? 'mobile' : 'desktop'),
    );
    act(() => root?.unmount());
    container.remove();
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: previousWidth,
    });
    expect(recoveries).toHaveLength(0);
  },
);
