import {
  MdOutlineFullscreen as FullScreenIcon,
  MdOutlineFullscreenExit as ExitFullScreenIcon,
} from 'react-icons/md';

import Tooltip from '@/common/components/elements/Tooltip';
import { SITE_URL, useSiteConfig } from '@/common/config/site';

interface PanelFooterProps {
  isFullScreen?: boolean;
  onCloseFullScreen?: () => void;
  onFullScreen?: () => void;
}

const PanelFooter = ({
  isFullScreen,
  onCloseFullScreen,
  onFullScreen,
}: PanelFooterProps) => {
  const site = useSiteConfig();

  return (
    <div className='flex items-center justify-between rounded-b-md border border-t-0 border-neutral-700 bg-neutral-900 px-2 py-1'>
      <div className='items-center text-sm text-neutral-500'>
        &copy; <a href={SITE_URL}>{site.name}</a>
      </div>
      {isFullScreen ? (
        <Tooltip title='Close'>
          <ExitFullScreenIcon
            size={22}
            onClick={onCloseFullScreen}
            className='cursor-pointer text-neutral-500'
            data-umami-event='Open Fullscreen Playground'
          />
        </Tooltip>
      ) : (
        <Tooltip title='Fullscreen'>
          <FullScreenIcon
            size={22}
            onClick={onFullScreen}
            className='cursor-pointer text-neutral-500'
            data-umami-event='Exit Fullscreen Playground'
          />
        </Tooltip>
      )}
    </div>
  );
};

export default PanelFooter;
