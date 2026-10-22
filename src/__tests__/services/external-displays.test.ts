/** @jest-environment node */
import axios from 'axios';

import { fetchGithubData } from '@/services/github';
import {
  getAvailableDevices,
  getNowPlaying,
  getTopTracks,
} from '@/services/spotify';
import { getAllTimeSinceToday, getReadStats } from '@/services/wakatime';

jest.mock('axios');
const env = process.env;
beforeEach(() => {
  jest.resetAllMocks();
  process.env = {
    ...env,
    SPOTIFY_CLIENT_ID: '',
    SPOTIFY_CLIENT_SECRET: '',
    SPOTIFY_REFRESH_TOKEN: '',
    WAKATIME_API_KEY: '',
  };
});
afterEach(() => {
  process.env = env;
});

it('keeps optional integrations empty without contacting providers', async () => {
  await expect(getNowPlaying()).resolves.toMatchObject({
    data: null,
    isPlaying: false,
  });
  await expect(getAvailableDevices()).resolves.toMatchObject({ data: [] });
  await expect(getTopTracks()).resolves.toMatchObject({ data: [] });
  await expect(getReadStats()).resolves.toMatchObject({
    data: { configured: false, languages: [] },
  });
  expect(axios.get).not.toHaveBeenCalled();
  expect(axios.post).not.toHaveBeenCalled();
});

it('keeps public GitHub contributions and falls back after invalid GraphQL data', async () => {
  jest.mocked(axios.post).mockResolvedValue({
    status: 200,
    data: {
      data: {
        user: { contributionsCollection: { contributionCalendar: 'broken' } },
      },
    },
  });
  jest.mocked(axios.get).mockResolvedValue({
    data: '<h2 id="js-contribution-activity-description">12 contributions</h2>',
  });
  await expect(fetchGithubData('example', 'test-token')).resolves.toMatchObject(
    {
      data: {
        configured: false,
        contributionsCollection: {
          contributionCalendar: { totalContributions: 12 },
        },
      },
    },
  );
  jest.mocked(axios.get).mockRejectedValue(new Error('offline'));
  await expect(fetchGithubData('example', undefined)).resolves.toEqual({
    status: 200,
    data: { configured: false, contributionsCollection: null },
  });
  await expect(fetchGithubData('example', 'test-token')).resolves.toEqual({
    status: 200,
    data: { configured: true, contributionsCollection: null },
  });
});

it('limits WakaTime languages and returns configured empty data on malformed or failed responses', async () => {
  process.env.WAKATIME_API_KEY = 'test-key';
  const languages = ['A', 'B', 'C', 'D'].map((name) => ({
    name,
    hours: 1,
    minutes: 2,
    percent: 25,
  }));
  jest
    .mocked(axios.get)
    .mockResolvedValueOnce({ status: 200, data: { data: { languages } } })
    .mockResolvedValueOnce({
      status: 200,
      data: { data: { languages: 'broken' } },
    })
    .mockRejectedValueOnce(new Error('offline'));
  await expect(getReadStats()).resolves.toMatchObject({
    data: { languages: languages.slice(0, 3) },
  });
  await expect(getReadStats()).resolves.toMatchObject({
    data: { configured: true, languages: [] },
  });
  await expect(getAllTimeSinceToday()).resolves.toMatchObject({
    data: { configured: true, text: null, total_seconds: 0 },
  });
});

it('maps Spotify tracks/devices and keeps no-content and failed transport semantics', async () => {
  Object.assign(process.env, {
    SPOTIFY_CLIENT_ID: 'id',
    SPOTIFY_CLIENT_SECRET: 'secret',
    SPOTIFY_REFRESH_TOKEN: 'refresh',
  });
  jest
    .mocked(axios.post)
    .mockResolvedValue({ data: { access_token: 'token' } });
  const track = {
    album: {
      name: 'album',
      images: [
        { width: 640, url: 'large' },
        { width: 64, url: 'small' },
      ],
    },
    artists: [{ name: 'artist' }],
    external_urls: { spotify: 'song' },
    name: 'title',
  };
  jest
    .mocked(axios.get)
    .mockResolvedValueOnce({
      status: 200,
      data: { is_playing: true, item: track },
    })
    .mockResolvedValueOnce({
      status: 200,
      data: { devices: [{ name: 'box', type: 'Other', is_active: true }] },
    })
    .mockResolvedValueOnce({ status: 200, data: { items: [track] } })
    .mockResolvedValueOnce({ status: 204 })
    .mockRejectedValueOnce(new Error('offline'));
  await expect(getNowPlaying()).resolves.toMatchObject({
    isPlaying: true,
    data: { albumImageUrl: 'large', title: 'title' },
  });
  await expect(getAvailableDevices()).resolves.toMatchObject({
    data: [{ id: 'device-unknown', model: 'Unknown Device' }],
  });
  await expect(getTopTracks()).resolves.toMatchObject({
    data: [{ album: { image: { url: 'small' } } }],
  });
  await expect(getNowPlaying()).resolves.toMatchObject({ data: null });
  await expect(getNowPlaying()).rejects.toThrow('offline');
});

it('rejects invalid Spotify credentials responses before using them as bearer tokens', async () => {
  Object.assign(process.env, {
    SPOTIFY_CLIENT_ID: 'id',
    SPOTIFY_CLIENT_SECRET: 'secret',
    SPOTIFY_REFRESH_TOKEN: 'refresh',
  });
  jest.mocked(axios.post).mockResolvedValue({ data: { access_token: 42 } });
  jest.mocked(axios.get).mockResolvedValue({ status: 204 });
  await expect(getNowPlaying()).rejects.toThrow();
  expect(axios.get).not.toHaveBeenCalled();
});

it('keeps local device identifiers when Spotify returns a nullable provider id', async () => {
  Object.assign(process.env, {
    SPOTIFY_CLIENT_ID: 'id',
    SPOTIFY_CLIENT_SECRET: 'secret',
    SPOTIFY_REFRESH_TOKEN: 'refresh',
  });
  jest
    .mocked(axios.post)
    .mockResolvedValue({ data: { access_token: 'token' } });
  jest.mocked(axios.get).mockResolvedValue({
    status: 200,
    data: {
      devices: [{ id: null, name: 'box', type: 'Other', is_active: true }],
    },
  });
  await expect(getAvailableDevices()).resolves.toEqual({
    status: 200,
    data: [
      {
        name: 'box',
        type: 'Other',
        is_active: true,
        id: 'device-unknown',
        model: 'Unknown Device',
      },
    ],
  });
});

it('keeps tracks without a selected image when Spotify returns a nullable width', async () => {
  Object.assign(process.env, {
    SPOTIFY_CLIENT_ID: 'id',
    SPOTIFY_CLIENT_SECRET: 'secret',
    SPOTIFY_REFRESH_TOKEN: 'refresh',
  });
  jest
    .mocked(axios.post)
    .mockResolvedValue({ data: { access_token: 'token' } });
  const track = {
    album: { name: 'album', images: [{ width: null, url: 'unknown-size' }] },
    artists: [{ name: 'artist' }],
    external_urls: { spotify: 'song' },
    name: 'title',
  };
  jest
    .mocked(axios.get)
    .mockResolvedValueOnce({
      status: 200,
      data: { is_playing: true, item: track },
    })
    .mockResolvedValueOnce({ status: 200, data: { items: [track] } });
  await expect(getNowPlaying()).resolves.toMatchObject({
    isPlaying: true,
    data: { title: 'title', albumImageUrl: undefined },
  });
  await expect(getTopTracks()).resolves.toMatchObject({
    data: [{ title: 'title', album: { name: 'album', image: undefined } }],
  });
});
