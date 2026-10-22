import { ReactNode } from 'react';
import type { z } from 'zod';

import type {
  deviceSchema,
  nowPlayingSchema,
  spotifyDevicesSchema,
  spotifyTokenSchema,
  trackSchema,
} from '@/common/schemas/spotify';

export type AccessTokenResponseProps = z.infer<typeof spotifyTokenSchema>;
export type DeviceProps = z.infer<typeof deviceSchema> & { icon?: ReactNode };
export type DeviceInfoProps = Pick<DeviceProps, 'icon' | 'model' | 'id'>;
export type DeviceDataProps = z.infer<typeof spotifyDevicesSchema>;

export interface DeviceResponseProps {
  status: number;
  data: DeviceProps[];
}

export type TrackProps = z.infer<typeof trackSchema>;
export type NowPlayingProps = z.infer<typeof nowPlayingSchema>;
export interface NowPlayingResponseProps {
  status: number;
  isPlaying: boolean;
  data: NowPlayingProps | null;
}

export interface TopTracksResponseProps {
  status: number;
  data: TrackProps[];
}
