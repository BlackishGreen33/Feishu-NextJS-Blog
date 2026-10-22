import { z } from 'zod';

export const spotifyCredentialsSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  refreshToken: z.string().min(1),
});
export const spotifyTokenSchema = z.looseObject({ access_token: z.string() });
export const deviceSchema = z.looseObject({
  is_active: z.boolean(),
  name: z.string(),
  type: z.string(),
  id: z.string().optional(),
  model: z.string().optional(),
});
export const spotifyDevicesSchema = z.looseObject({
  devices: z.array(deviceSchema.omit({ id: true, model: true })),
});
const imageSchema = z.looseObject({ width: z.number(), url: z.string() });
const spotifyTrackSchema = z.looseObject({
  album: z.looseObject({
    name: z.string(),
    images: z.array(imageSchema.extend({ width: z.number().nullable() })),
  }),
  artists: z.array(z.looseObject({ name: z.string() })),
  external_urls: z.looseObject({ spotify: z.string() }),
  name: z.string(),
});
export const spotifyPlayingSchema = z.looseObject({
  is_playing: z.boolean().optional(),
  item: spotifyTrackSchema.nullish(),
});
export const spotifyTopTracksSchema = z.looseObject({
  items: z.array(spotifyTrackSchema),
});
export const nowPlayingSchema = z.object({
  songUrl: z.string(),
  albumImageUrl: z.string().optional(),
  album: z.string(),
  title: z.string(),
  artist: z.string(),
});
export const trackSchema = z.object({
  album: z.object({ name: z.string(), image: imageSchema.optional() }),
  artist: z.string(),
  songUrl: z.string(),
  title: z.string(),
});
