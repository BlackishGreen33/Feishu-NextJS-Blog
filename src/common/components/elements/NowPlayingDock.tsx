import useSWR from 'swr';

import { deviceSchema, nowPlayingSchema } from '@/common/schemas/spotify';
import { fetchValidated } from '@/services/fetcher';

import NowPlayingBar from './NowPlayingBar';
import NowPlayingCard from './NowPlayingCard';

const NowPlayingDock = () => {
  const { data: playingData } = useSWR('/api/now-playing', (url: string) =>
    fetchValidated(url, nowPlayingSchema.nullable().parse),
  );
  const { data: devicesData = [] } = useSWR(
    '/api/available-devices',
    (url: string) => fetchValidated(url, deviceSchema.array().parse),
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
