"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { TutorProfileFormState } from "../../app/tutors/new/actions";
import { LEVEL_OPTIONS, SUBJECT_OPTIONS } from "../../lib/tutor/subject-level-options";
import styles from "./TutorProfileForm.module.scss";

type TutorProfileFormProps = {
  action: (
    state: TutorProfileFormState,
    payload: FormData,
  ) => Promise<TutorProfileFormState>;
  initialName?: string;
  initialFirstName?: string;
  initialLastName?: string;
  hasMoodlePhoto?: boolean;
  moodlePhotoUrl?: string | null;
  initialPhotoUrl?: string | null;
  initialBio?: string;
  initialSubjects?: string[];
  initialLevels?: string[];
  initialHourlyRate?: number | null;
  initialTravelRadiusKm?: number | null;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  initialWeeklyAvailability?: Array<{
    weekday: number;
    startTime: string;
    endTime: string;
    recurrenceStartDate?: string;
    recurrenceEndDate?: string;
  }>;
  initialAvailabilityTimezone?: string;
  initialBlockedDates?: string;
  hasExistingProfile?: boolean;
};

const initialState: TutorProfileFormState = {};
const defaultCenter = { lng: -98.5795, lat: 39.8283 };

type AddressFeature = {
  id: string;
  place_name: string;
  center?: [number, number];
};

const WEEKDAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

function toLocalDateString(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save profile"}
    </button>
  );
}

export function TutorProfileForm({
  action,
  initialName = "",
  initialFirstName = "",
  initialLastName = "",
  hasMoodlePhoto = false,
  moodlePhotoUrl = null,
  initialPhotoUrl = null,
  initialBio = "",
  initialSubjects = [],
  initialLevels = [],
  initialHourlyRate = null,
  initialTravelRadiusKm = null,
  initialLatitude = null,
  initialLongitude = null,
  initialWeeklyAvailability = [],
  initialAvailabilityTimezone = "UTC",
  initialBlockedDates = "",
  hasExistingProfile = false,
}: TutorProfileFormProps) {
  const normalizedInitialLng =
    Number.isFinite(initialLongitude) && initialLongitude !== null ? initialLongitude : defaultCenter.lng;
  const normalizedInitialLat =
    Number.isFinite(initialLatitude) && initialLatitude !== null ? initialLatitude : defaultCenter.lat;
  const [formState, formAction] = useFormState(action, initialState);
  const [lng, setLng] = useState<number>(normalizedInitialLng);
  const [lat, setLat] = useState<number>(normalizedInitialLat);
  const [hasPickedLocation, setHasPickedLocation] = useState(
    initialLatitude !== null && initialLongitude !== null,
  );
  const [addressQuery, setAddressQuery] = useState(
    initialLatitude !== null && initialLongitude !== null
      ? `${normalizedInitialLat.toFixed(6)}, ${normalizedInitialLng.toFixed(6)}`
      : "",
  );
  const [addressSuggestions, setAddressSuggestions] = useState<AddressFeature[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [availabilityTimezone, setAvailabilityTimezone] = useState(initialAvailabilityTimezone);
  const [defaultRecurrenceStartDate, setDefaultRecurrenceStartDate] = useState("");
  const [defaultRecurrenceEndDate, setDefaultRecurrenceEndDate] = useState("");
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const mapboxToken = useMemo(
    () => process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "",
    [],
  );
  const availabilityByDay = useMemo(() => {
    const map = new Map<
      number,
      {
        startTime: string;
        endTime: string;
        recurrenceStartDate?: string;
        recurrenceEndDate?: string;
      }
    >();
    initialWeeklyAvailability.forEach((slot) => {
      map.set(slot.weekday, {
        startTime: slot.startTime,
        endTime: slot.endTime,
        recurrenceStartDate: slot.recurrenceStartDate,
        recurrenceEndDate: slot.recurrenceEndDate,
      });
    });
    return map;
  }, [initialWeeklyAvailability]);
  const effectivePhotoUrl = formState.photoUrl ?? initialPhotoUrl ?? moodlePhotoUrl ?? null;
  const formTitle = hasExistingProfile ? "Edit Tutor Profile" : "Create Tutor Profile";
  const formSubtitle = hasExistingProfile
    ? "Update your teaching profile, rates, availability, and map location."
    : "Add your teaching profile, set your rates, and pin your map location.";
  const headerInitials = useMemo(() => {
    const first = initialFirstName.trim()[0] ?? "";
    const last = initialLastName.trim()[0] ?? "";
    const composed = `${first}${last}`.toUpperCase();
    if (composed) return composed;
    const fromName = initialName.trim()[0] ?? "?";
    return fromName.toUpperCase();
  }, [initialFirstName, initialLastName, initialName]);

  useEffect(() => {
    const hasSavedAvailability = initialWeeklyAvailability.length > 0;
    if (hasSavedAvailability) {
      return;
    }

    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTimezone) {
      setAvailabilityTimezone(browserTimezone);
    }

    const today = new Date();
    const startDate = toLocalDateString(today);
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 3);
    const endDateString = toLocalDateString(endDate);

    setDefaultRecurrenceStartDate(startDate);
    setDefaultRecurrenceEndDate(endDateString);
  }, [initialWeeklyAvailability.length]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [normalizedInitialLng, normalizedInitialLat],
      zoom: hasPickedLocation ? 12 : 3,
    });

    const marker = new mapboxgl.Marker({ draggable: true })
      .setLngLat([normalizedInitialLng, normalizedInitialLat])
      .addTo(map);

    const updateCoordinates = (nextLng: number, nextLat: number) => {
      setLng(Number(nextLng.toFixed(6)));
      setLat(Number(nextLat.toFixed(6)));
      setHasPickedLocation(true);
    };

    marker.on("dragend", () => {
      const markerLngLat = marker.getLngLat();
      updateCoordinates(markerLngLat.lng, markerLngLat.lat);
    });

    map.on("click", (event) => {
      marker.setLngLat(event.lngLat);
      updateCoordinates(event.lngLat.lng, event.lngLat.lat);
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      marker.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [mapboxToken, normalizedInitialLat, normalizedInitialLng, hasPickedLocation]);

  const geocodeAddress = useCallback(
    async (query: string, limit: number, signal?: AbortSignal): Promise<AddressFeature[]> => {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?limit=${limit}&access_token=${encodeURIComponent(mapboxToken)}`,
        { signal },
      );

      if (!response.ok) {
        throw new Error("Address search failed.");
      }

      const data = (await response.json()) as { features?: AddressFeature[] };
      return data.features ?? [];
    },
    [mapboxToken],
  );

  useEffect(() => {
    const query = addressQuery.trim();
    if (!query || !mapboxToken) {
      setAddressSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const suggestions = await geocodeAddress(query, 5, controller.signal);
        setAddressSuggestions(suggestions);
        setShowSuggestions(true);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setAddressSuggestions([]);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [addressQuery, geocodeAddress, mapboxToken]);

  const applyAddressFeature = (feature: AddressFeature) => {
    const center = feature.center;
    if (!center || center.length < 2) {
      return;
    }

    const [nextLng, nextLat] = center;
    const normalizedLng = Number(nextLng.toFixed(6));
    const normalizedLat = Number(nextLat.toFixed(6));

    setLng(normalizedLng);
    setLat(normalizedLat);
    setAddressQuery(feature.place_name);
    setAddressSuggestions([]);
    setShowSuggestions(false);
    setAddressError(null);
    setHasPickedLocation(true);

    markerRef.current?.setLngLat([normalizedLng, normalizedLat]);
    mapRef.current?.flyTo({
      center: [normalizedLng, normalizedLat],
      zoom: 13,
      essential: true,
    });
  };

  const handleAddressSearch = async () => {
    const query = addressQuery.trim();
    if (!query) return;
    if (!mapboxToken) {
      setAddressError("Missing map token for address search.");
      return;
    }

    try {
      setIsGeocoding(true);
      setAddressError(null);

      const selectedFeature = addressSuggestions[0]
        ? addressSuggestions[0]
        : (await geocodeAddress(query, 1))[0];

      if (!selectedFeature?.center || selectedFeature.center.length < 2) {
        throw new Error("No matching address found.");
      }

      applyAddressFeature(selectedFeature);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not search this address.";
      setAddressError(message);
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <form action={formAction} encType="multipart/form-data" className={styles["tutor-profile-form"]}>
      <div className="d-flex align-items-center gap-3 mb-4">
        {effectivePhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={effectivePhotoUrl}
            alt="Tutor profile"
            width={72}
            height={72}
            className="rounded-circle border flex-shrink-0"
          />
        ) : (
          <div
            className="rounded-circle border bg-light d-flex align-items-center justify-content-center text-secondary flex-shrink-0 fw-semibold"
            style={{ width: 72, height: 72 }}
            aria-label="No profile photo"
          >
            {headerInitials}
          </div>
        )}
        <div>
          <h1 className="mb-1">{formTitle}</h1>
          <p className="text-secondary mb-0">
            {formSubtitle}
          </p>
        </div>
      </div>
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <div className="row g-2">
            <div className="col-12">
              <label className="form-label" htmlFor="first_name">
                First name
              </label>
              <input
                id="first_name"
                type="text"
                className="form-control"
                defaultValue={initialFirstName}
                disabled
              />
            </div>

            <div className="col-12">
              <label className="form-label" htmlFor="last_name">
                Last name
              </label>
              <input
                id="last_name"
                type="text"
                className="form-control"
                defaultValue={initialLastName}
                disabled
              />
            </div>

            <div className="col-12">
              <label className="form-label" htmlFor="name">
                Display name
              </label>
              <input
                id="name"
                type="text"
                className="form-control"
                defaultValue={initialName || `${initialFirstName} ${initialLastName}`.trim()}
                disabled
              />
              <div className="form-text">
                This value comes from your Moodle profile.
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="bio">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            className="form-control"
            rows={8}
            defaultValue={initialBio}
            required
          />
        </div>

        {!hasMoodlePhoto && (
          <div className="col-12">
            <label className="form-label" htmlFor="photo">
              Tutor photo
            </label>
            <input
              id="photo"
              name="photo"
              type="file"
              className="form-control"
              accept="image/jpeg,image/png,image/webp"
            />
            <div className="form-text">
              Optional. JPG, PNG, or WebP up to 5MB.
            </div>
          </div>
        )}

        {hasMoodlePhoto && (
          <div className="col-12">
            <label className="form-label">Tutor photo</label>
            <div className="d-flex align-items-center gap-3">
              {moodlePhotoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={moodlePhotoUrl}
                  alt="Moodle profile"
                  width={64}
                  height={64}
                  className="rounded-circle border"
                />
              )}
              <div className="form-text m-0">
                Using your Moodle profile photo.
              </div>
            </div>
          </div>
        )}

        <div className="col-12">
          <fieldset>
            <legend className="form-label mb-2">Subjects</legend>
            <div className="row g-2">
              {SUBJECT_OPTIONS.map((subject) => (
                <div className="col-12 col-md-6" key={subject}>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      value={subject}
                      id={`subject-${subject.replace(/\s+/g, "-").toLowerCase()}`}
                      name="subjects"
                      defaultChecked={initialSubjects.includes(subject)}
                    />
                    <label
                      className="form-check-label"
                      htmlFor={`subject-${subject.replace(/\s+/g, "-").toLowerCase()}`}
                    >
                      {subject}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="col-12">
          <fieldset>
            <legend className="form-label mb-2">Levels</legend>
            <div className="row g-2">
              {LEVEL_OPTIONS.map((level) => (
                <div className="col-12 col-md-6" key={level}>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      value={level}
                      id={`level-${level.replace(/\s+/g, "-").toLowerCase()}`}
                      name="levels"
                      defaultChecked={initialLevels.includes(level)}
                    />
                    <label
                      className="form-check-label"
                      htmlFor={`level-${level.replace(/\s+/g, "-").toLowerCase()}`}
                    >
                      {level}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="col-12">
          <fieldset>
            <legend className="form-label mb-2">Weekly availability</legend>
            <div className="row g-2 mb-3">
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="availability_timezone">
                  Timezone
                </label>
                <input
                  id="availability_timezone"
                  name="availability_timezone"
                  className="form-control"
                  value={availabilityTimezone}
                  onChange={(event) => setAvailabilityTimezone(event.target.value)}
                  placeholder="e.g. Africa/Johannesburg"
                />
              </div>
              <div className="col-12">
                <div className="small text-secondary">
                  Select days and provide time plus recurrence start/end dates for each day.
                </div>
              </div>
            </div>
            <div className="row g-2">
              {WEEKDAYS.map((day) => {
                const initialDay = availabilityByDay.get(day.value);
                return (
                  <div className="col-12" key={day.value}>
                    <div className="row g-2 align-items-center">
                      <div className="col-12 col-md-2">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`availability-day-${day.value}`}
                            name={`availability_day_${day.value}_enabled`}
                            defaultChecked={Boolean(initialDay)}
                          />
                          <label
                            className="form-check-label"
                            htmlFor={`availability-day-${day.value}`}
                          >
                            {day.label}
                          </label>
                        </div>
                      </div>
                      <div className="col-6 col-md-2">
                        <input
                          type="time"
                          className="form-control"
                          name={`availability_day_${day.value}_start`}
                          defaultValue={initialDay?.startTime ?? "15:00"}
                        />
                      </div>
                      <div className="col-6 col-md-2">
                        <input
                          type="time"
                          className="form-control"
                          name={`availability_day_${day.value}_end`}
                          defaultValue={initialDay?.endTime ?? "17:00"}
                        />
                      </div>
                      <div className="col-6 col-md-3">
                        <input
                          type="date"
                          className="form-control"
                          name={`availability_day_${day.value}_start_date`}
                          defaultValue={initialDay?.recurrenceStartDate ?? defaultRecurrenceStartDate}
                        />
                      </div>
                      <div className="col-6 col-md-3">
                        <input
                          type="date"
                          className="form-control"
                          name={`availability_day_${day.value}_end_date`}
                          defaultValue={initialDay?.recurrenceEndDate ?? defaultRecurrenceEndDate}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </fieldset>
        </div>

        <div className="col-12">
          <label className="form-label" htmlFor="blocked_dates">
            Unavailable dates
          </label>
          <input
            id="blocked_dates"
            name="blocked_dates"
            className="form-control"
            defaultValue={initialBlockedDates}
            placeholder="YYYY-MM-DD, YYYY-MM-DD"
          />
          <div className="form-text">
            Optional comma-separated blocked dates. Example: 2026-05-01, 2026-05-15
          </div>
        </div>

        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="travel_radius_km">
            Travel radius (km)
          </label>
          <input
            id="travel_radius_km"
            name="travel_radius_km"
            type="number"
            step="1"
            min="0"
            className="form-control"
            defaultValue={initialTravelRadiusKm ?? undefined}
            required
          />
        </div>

        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="hourly_rate">
            Hourly rate
          </label>
          <div className="input-group">
            <span className="input-group-text">$</span>
            <input
              id="hourly_rate"
              name="hourly_rate"
              type="number"
              step="0.01"
              min="0"
              className="form-control"
              defaultValue={initialHourlyRate ?? undefined}
              required
            />
          </div>
        </div>

        <div className="col-12">
          <label className="form-label" htmlFor="address-search">
            Address
          </label>
          <div className="d-flex gap-2">
            <input
              id="address-search"
              className="form-control"
              value={addressQuery}
              onChange={(event) => {
                setAddressQuery(event.target.value);
                setAddressError(null);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                window.setTimeout(() => setShowSuggestions(false), 120);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleAddressSearch();
                }
              }}
              placeholder="Search address or suburb"
            />
            <button
              className="btn btn-outline-primary"
              type="button"
              disabled={isGeocoding}
              onClick={() => {
                void handleAddressSearch();
              }}
            >
              {isGeocoding ? "..." : "Go"}
            </button>
          </div>
          {showSuggestions && addressSuggestions.length > 0 && (
            <div className="border rounded mt-1 bg-white">
              {addressSuggestions.map((feature) => (
                <button
                  key={feature.id}
                  type="button"
                  className="btn btn-link text-start w-100 text-decoration-none"
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onClick={() => applyAddressFeature(feature)}
                >
                  {feature.place_name}
                </button>
              ))}
            </div>
          )}
          {addressError && (
            <div className="text-danger small mt-1" role="alert">
              {addressError}
            </div>
          )}
        </div>

        <div className="col-12">
          <div className={styles["tutor-profile-form__map-header"]}>
            <h2 className={styles["tutor-profile-form__map-title"]}>Location</h2>
            <p className={styles["tutor-profile-form__map-help"]}>
              Click the map or drag the marker to choose your tutoring location.
            </p>
          </div>

          {!mapboxToken && (
            <div className="alert alert-warning mb-3" role="alert">
              Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN. Add it to .env.local.
            </div>
          )}

          <div
            ref={mapContainerRef}
            className={styles["tutor-profile-form__map"]}
            aria-label="Map picker"
          />
          <div className="mt-2 text-secondary small">
            {hasPickedLocation
              ? `Selected: ${lat}, ${lng}`
              : "Default location set. Choose your exact spot on the map."}
          </div>
        </div>
      </div>

      <input name="latitude" type="hidden" value={lat} />
      <input name="longitude" type="hidden" value={lng} />

      <div className={styles["tutor-profile-form__footer"]}>
        <SubmitButton />
        {formState.error && (
          <p className="text-danger mb-0" role="alert">
            {formState.error}
          </p>
        )}
        {formState.success && (
          <p className="text-success mb-0" role="status">
            {formState.success}
          </p>
        )}
      </div>
    </form>
  );
}
