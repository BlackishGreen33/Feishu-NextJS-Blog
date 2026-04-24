import axios from 'axios';
import querystring from 'querystring';

import { PAIR_DEVICES } from '@/common/constant/devices';
import {
  AccessTokenResponseProps,
  DeviceDataProps,
  DeviceResponseProps,
  NowPlayingResponseProps,
  SongProps,
  TopTracksResponseProps,
  TrackProps,
} from '@/common/types/spotify';
import { getServerEnv } from '@/server/env';

const BASE_URL = 'https://api.spotify.com/v1';
const AVAILABLE_DEVICES_ENDPOINT = `${BASE_URL}/me/player/devices`;
const NOW_PLAYING_ENDPOINT = `${BASE_URL}/me/player/currently-playing`;
const TOP_TRACKS_ENDPOINT = `${BASE_URL}/me/top/tracks`;
const TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`;

const getSpotifyCredentials = () => {
  const { spotify } = getServerEnv();

  return {
    clientId: spotify.clientId,
    clientSecret: spotify.clientSecret,
    refreshToken: spotify.refreshToken,
  };
};

const hasSpotifyCredentials = () => {
  const { clientId, clientSecret, refreshToken } = getSpotifyCredentials();
  return Boolean(clientId && clientSecret && refreshToken);
};

const getAccessToken = async (): Promise<AccessTokenResponseProps> => {
  if (!hasSpotifyCredentials()) {
    return {
      access_token: '',
    };
  }

  const { clientId, clientSecret, refreshToken } = getSpotifyCredentials();
  const token = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await axios.post(
    TOKEN_ENDPOINT,
    querystring.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
    {
      headers: {
        Authorization: `Basic ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );

  return response.data;
};

export const getAvailableDevices = async (): Promise<DeviceResponseProps> => {
  if (!hasSpotifyCredentials()) {
    return { status: 200, data: [] };
  }

  const { access_token } = await getAccessToken();

  const response = await axios.get(AVAILABLE_DEVICES_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });

  const status = response.status;

  if (status === 204 || status > 400) {
    return { status, data: [] };
  }

  const responseData: DeviceDataProps = response.data;

  const devices = responseData?.devices?.map((device) => ({
    name: device.name,
    is_active: device.is_active,
    type: device.type,
    model: PAIR_DEVICES[device?.type]?.model || 'Unknown Device',
    id: PAIR_DEVICES[device?.type]?.id || 'device-unknown',
  }));

  return {
    status,
    data: devices,
  };
};

export const getNowPlaying = async (): Promise<NowPlayingResponseProps> => {
  if (!hasSpotifyCredentials()) {
    return { status: 200, isPlaying: false, data: null };
  }

  const { access_token } = await getAccessToken();

  const response = await axios.get(NOW_PLAYING_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });

  const status = response.status;

  if (status === 204 || status > 400) {
    return { status, isPlaying: false, data: null };
  }

  const responseData: SongProps = response.data;

  if (!responseData.item) {
    return { status, isPlaying: false, data: null };
  }

  const isPlaying: boolean = responseData?.is_playing;
  const album: string = responseData?.item?.album.name ?? '';
  const albumImageUrl: string | undefined =
    responseData?.item?.album?.images?.find((image) => image?.width === 640)
      ?.url ?? undefined;
  const artist: string =
    responseData?.item?.artists?.map((artist) => artist?.name).join(', ') ?? '';
  const songUrl: string = responseData?.item?.external_urls?.spotify ?? '';
  const title: string = responseData?.item?.name ?? '';

  return {
    status,
    isPlaying,
    data: {
      album,
      albumImageUrl,
      artist,
      songUrl,
      title,
    },
  };
};

export const getTopTracks = async (): Promise<TopTracksResponseProps> => {
  if (!hasSpotifyCredentials()) {
    return { status: 200, data: [] };
  }

  const { access_token } = await getAccessToken();

  const response = await axios.get(`${TOP_TRACKS_ENDPOINT}?limit=10`, {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });

  const status = response.status;

  if (status === 204 || status > 400) {
    return { status, data: [] };
  }

  const responseData = response.data;

  const tracks: TrackProps[] = responseData.items.map((track: any) => ({
    album: {
      name: track.album.name,
      image: track.album.images.find(
        (image: { width: number }) => image.width === 64,
      ),
    },
    artist: track.artists
      .map((artist: { name: string }) => artist.name)
      .join(', '),
    songUrl: track.external_urls.spotify,
    title: track.name,
  }));

  return { status, data: tracks };
};
