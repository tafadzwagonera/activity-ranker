import { z } from "zod";

export const activityIds = [
  "skiing",
  "surfing",
  "outdoorSightseeing",
  "indoorSightseeing",
] as const;

export type ActivityId = (typeof activityIds)[number];

export const transportModeSchema = z.enum(["rest", "graphql"]);
export type TransportMode = z.infer<typeof transportModeSchema>;

export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const locationSuggestionSchema = z.object({
  id: z.number(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  country: z.string().optional(),
  admin1: z.string().optional(),
});

export const activityScoreSchema = z.object({
  activity: z.enum(activityIds),
  score: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string()),
});

export const rankedDaySchema = z.object({
  date: z.string(),
  activities: z.array(activityScoreSchema),
});

export const rankedActivitiesResponseSchema = z.object({
  location: z.object({
    name: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    country: z.string().optional(),
    admin1: z.string().optional(),
  }),
  days: z.array(rankedDaySchema),
});

export const errorResponseSchema = z.object({
  statusCode: z.number(),
  message: z.string(),
  path: z.string(),
  code: z.string(),
});

export const headerNames = {
  xApiKey: "XApiKey",
  xInternalKey: "XInternalKey",
} as const;

export type Coordinates = z.infer<typeof coordinatesSchema>;
export type LocationSuggestion = z.infer<typeof locationSuggestionSchema>;
export type ActivityScore = z.infer<typeof activityScoreSchema>;
export type RankedDay = z.infer<typeof rankedDaySchema>;
export type RankedActivitiesResponse = z.infer<
  typeof rankedActivitiesResponseSchema
>;
