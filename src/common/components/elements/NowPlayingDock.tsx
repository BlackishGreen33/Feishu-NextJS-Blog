import useSWR from 'swr';

import { DeviceProps, NowPlayingProps } from '@/common/types/spotify';
import { fetcher } from '@/services/fetcher';

import NowPlayingBar from './NowPlayingBar';
import NowPlayingCard from './NowPlayingCard';

const NowPlayingDock = () => {
  const { data: playingData } = useSWR<NowPlayingProps | null>(
    '/api/now-playing',
    fetcher,
  );
  const { data: devicesData = [] } = useSWR<DeviceProps[]>(
    '/api/available-devices',
    fetcher,
  );

  if (!playingData?.songUrl) {
    return null;
  }

  return (
    <>
      <NowPlayingBar devicesData={devicesData} playingData={playingData} />
      <NowPlayingCard playingData={playingData} />
    </>
  );
};

export default NowPlayingDock;
