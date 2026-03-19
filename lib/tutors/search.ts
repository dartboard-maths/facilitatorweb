import { createClient } from "../supabase/server";

export type TutorSearchInput = {
  latitude: number;
  longitude: number;
  radiusKm: number;
};

export type TutorSearchResult = {
  tutor_id: string;
  user_id: string;
  name: string;
  bio: string;
  subjects: string[];
  levels: string[];
  hourly_rate: number;
  travel_radius_km: number;
  distance_km: number;
  latitude: number;
  longitude: number;
};

export async function fetchTutorsByGeolocation(
  input: TutorSearchInput,
): Promise<TutorSearchResult[]> {
  const { latitude, longitude, radiusKm } = input;

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(radiusKm) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    radiusKm <= 0
  ) {
    throw new Error("Invalid geolocation search input.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_tutors_within_radius", {
    p_latitude: latitude,
    p_longitude: longitude,
    p_radius_km: radiusKm,
  });

  if (error) {
    throw new Error(`Tutor search failed: ${error.message}`);
  }

  return (data ?? []) as TutorSearchResult[];
}
