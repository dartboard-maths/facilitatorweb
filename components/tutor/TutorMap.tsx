"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Link from "next/link";
import { SUBJECT_OPTIONS } from "../../lib/tutor/subject-level-options";
import { createClient } from "../../lib/supabase/client";
import styles from "./TutorMap.module.scss";

type TutorMapProps = {
  initialRadiusKm?: number;
  canBook?: boolean;
};

type TutorSearchResult = {
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
  has_active_slots: boolean;
  /** Bayesian-smoothed public average when rating_count > 0 */
  avg_rating?: number;
  rating_count?: number;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type AddressFeature = {
  id: string;
  place_name: string;
  center?: [number, number];
};

const FALLBACK_COORDINATES: Coordinates = {
  latitude: -33.9249,
  longitude: 18.4241,
};

function zoomForDistanceKm(distanceKm: number): number {
  if (distanceKm <= 5) return 13;
  if (distanceKm <= 10) return 12;
  if (distanceKm <= 20) return 11;
  if (distanceKm <= 50) return 10;
  return 9;
}

export function TutorMap({ initialRadiusKm = 20, canBook = false }: TutorMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const tutorMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [distanceKm, setDistanceKm] = useState<number>(initialRadiusKm);
  const [addressQuery, setAddressQuery] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressFeature[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMobilePanelExpanded, setIsMobilePanelExpanded] = useState(false);
  const [isMobilePanelPinned, setIsMobilePanelPinned] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [maxPriceFilter, setMaxPriceFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [tutors, setTutors] = useState<TutorSearchResult[]>([]);
  const [selectedTutor, setSelectedTutor] = useState<TutorSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRecentering, setIsRecentering] = useState(false);

  const mapboxToken = useMemo(
    () => process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "",
    [],
  );

  const loadTutors = useCallback(
    async (location: Coordinates, radiusKm: number) => {
      try {
        setIsLoading(true);
        setError(null);

        const supabase = createClient();
        const { data, error: queryError } = await supabase.rpc(
          "search_tutors_within_radius",
          {
            p_latitude: location.latitude,
            p_longitude: location.longitude,
            p_radius_km: radiusKm,
          },
        );

        if (queryError) {
          throw queryError;
        }

        const normalizedRows = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
          ...(row as unknown as TutorSearchResult),
          has_active_slots: row.has_active_slots === undefined ? true : Boolean(row.has_active_slots),
        }));

        let merged: TutorSearchResult[] = normalizedRows;
        try {
          const ids = normalizedRows.map((r) => r.user_id).filter(Boolean);
          if (ids.length > 0) {
            const res = await fetch(`/api/tutors/ratings?userIds=${encodeURIComponent(ids.join(","))}`);
            if (res.ok) {
              const json = (await res.json()) as Record<
                string,
                { avgDisplay: number; count: number }
              >;
              merged = normalizedRows.map((row) => {
                const s = json[row.user_id];
                return {
                  ...row,
                  avg_rating: s?.avgDisplay ?? 0,
                  rating_count: s?.count ?? 0,
                };
              });
            }
          }
        } catch {
          merged = normalizedRows;
        }

        setTutors(merged);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load tutors.";
        setError(message);
        setTutors([]);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const levelOptions = useMemo(() => {
    const values = new Set<string>();
    tutors.forEach((tutor) => tutor.levels.forEach((level) => values.add(level)));
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [tutors]);

  const filteredTutors = useMemo(() => {
    const normalizedSubject = subjectFilter.trim().toLowerCase();
    const normalizedLevel = levelFilter.trim().toLowerCase();
    const maxPrice = maxPriceFilter ? Number(maxPriceFilter) : null;

    return tutors.filter((tutor) => {
      const subjectMatches = normalizedSubject
        ? tutor.subjects.some((subject) => subject.toLowerCase() === normalizedSubject)
        : true;
      const levelMatches = normalizedLevel
        ? tutor.levels.some((level) => level.toLowerCase() === normalizedLevel)
        : true;
      const priceMatches =
        maxPrice !== null && Number.isFinite(maxPrice)
          ? Number(tutor.hourly_rate) <= maxPrice
          : true;

      return subjectMatches && levelMatches && priceMatches;
    });
  }, [levelFilter, maxPriceFilter, subjectFilter, tutors]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 991.98px)");
    const handleMediaQuery = (event: MediaQueryListEvent | MediaQueryList) => {
      const matches = "matches" in event ? event.matches : mediaQuery.matches;
      setIsMobileViewport(matches);
      setIsMobilePanelExpanded((prev) => (matches ? prev : true));
      if (!matches) {
        setIsMobilePanelPinned(false);
      }
    };

    handleMediaQuery(mediaQuery);
    mediaQuery.addEventListener("change", handleMediaQuery);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaQuery);
    };
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [FALLBACK_COORDINATES.longitude, FALLBACK_COORDINATES.latitude],
      zoom: 10,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      tutorMarkersRef.current.forEach((marker) => marker.remove());
      userMarkerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [mapboxToken]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLocation(FALLBACK_COORDINATES);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setUserLocation(FALLBACK_COORDINATES);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  useEffect(() => {
    if (!userLocation) return;
    const map = mapRef.current;
    if (map) {
      map.flyTo({
        center: [userLocation.longitude, userLocation.latitude],
        zoom: zoomForDistanceKm(distanceKm),
        essential: true,
      });
    }
    void loadTutors(userLocation, distanceKm);
  }, [distanceKm, loadTutors, userLocation]);

  useEffect(() => {
    if (!userLocation) return;
    const map = mapRef.current;
    if (!map) return;

    map.flyTo({
      center: [userLocation.longitude, userLocation.latitude],
      zoom: 12,
      essential: true,
    });

    if (!userMarkerRef.current) {
      const userEl = document.createElement("div");
      userEl.className = styles["tutor-map__user-marker"];
      userMarkerRef.current = new mapboxgl.Marker({ element: userEl })
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([userLocation.longitude, userLocation.latitude]);
    }
  }, [userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    tutorMarkersRef.current.forEach((marker) => marker.remove());
    tutorMarkersRef.current = [];

    filteredTutors.forEach((tutor) => {
      const markerEl = document.createElement("button");
      markerEl.className = styles["tutor-map__tutor-marker"];
      if (!tutor.has_active_slots) {
        markerEl.classList.add(styles["tutor-map__tutor-marker--inactive"]);
      }
      if (selectedTutor?.tutor_id === tutor.tutor_id) {
        markerEl.classList.add(styles["tutor-map__tutor-marker--selected"]);
      }
      markerEl.type = "button";
      markerEl.setAttribute("aria-label", `Open ${tutor.name} profile`);
      markerEl.addEventListener("click", () => {
        setSelectedTutor(tutor);
      });

      const marker = new mapboxgl.Marker({ element: markerEl })
        .setLngLat([tutor.longitude, tutor.latitude])
        .addTo(map);

      tutorMarkersRef.current.push(marker);
    });
  }, [filteredTutors, selectedTutor]);

  useEffect(() => {
    if (!selectedTutor) return;
    const stillVisible = filteredTutors.some(
      (tutor) => tutor.tutor_id === selectedTutor.tutor_id,
    );
    if (!stillVisible) {
      setSelectedTutor(null);
    }
  }, [filteredTutors, selectedTutor]);

  const handleTutorSelect = (tutor: TutorSearchResult) => {
    setSelectedTutor(tutor);
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [tutor.longitude, tutor.latitude],
      zoom: 13,
      essential: true,
    });
  };

  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map || isRecentering) return;

    const moveToTarget = (target: Coordinates) => {
      map.flyTo({
        center: [target.longitude, target.latitude],
        zoom: 12,
        essential: true,
      });
      setUserLocation(target);
      void loadTutors(target, distanceKm);
    };

    if (!navigator.geolocation) {
      moveToTarget(userLocation ?? FALLBACK_COORDINATES);
      return;
    }

    setIsRecentering(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const liveLocation: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        moveToTarget(liveLocation);
        setIsRecentering(false);
      },
      () => {
        moveToTarget(userLocation ?? FALLBACK_COORDINATES);
        setIsRecentering(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const geocodeAddress = useCallback(
    async (query: string, limit: number, signal?: AbortSignal): Promise<AddressFeature[]> => {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?limit=${limit}&access_token=${encodeURIComponent(mapboxToken)}`,
        { signal },
      );

      if (!response.ok) {
        throw new Error("Address search failed.");
      }

      const data = (await response.json()) as {
        features?: AddressFeature[];
      };

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
    if (!center || center.length < 2) return;

    const [longitude, latitude] = center;
    setAddressQuery(feature.place_name);
    setAddressSuggestions([]);
    setShowSuggestions(false);
    setAddressError(null);
    setUserLocation({ latitude, longitude });
  };

  const handleAddressSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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
      const message =
        err instanceof Error ? err.message : "Could not search this address.";
      setAddressError(message);
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <section className={styles["tutor-map"]}>
      {!mapboxToken && (
        <div className={`${styles["tutor-map__token-warning"]} alert alert-warning`} role="alert">
          Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in your environment.
        </div>
      )}

      <div ref={mapContainerRef} className={styles["tutor-map__canvas"]} />

      <button
        type="button"
        className={`${styles["tutor-map__recenter-btn"]} ${styles["tutor-map__recenter-btn--desktop"]} btn btn-sm btn-light`}
        onClick={handleRecenter}
        disabled={isRecentering}
      >
        {isRecentering ? "Centering..." : "Recenter"}
      </button>

      <div
        className={`${styles["tutor-map__panel"]} ${
          isMobileViewport && !isMobilePanelExpanded
            ? styles["tutor-map__panel--collapsed"]
            : ""
        }`}
      >
        <div className={styles["tutor-map__header"]}>
          <div className="d-flex align-items-center gap-2">
            <Link href="/" className="btn btn-link p-0 text-decoration-none" aria-label="Back to homepage">
              ←
            </Link>
            <h2 className={styles["tutor-map__title"]}>Tutors Near You</h2>
          </div>
          <p className={styles["tutor-map__subtitle"]}>
            Filter by subject, distance, price, and level.
          </p>
        </div>

        <div className="row g-2">
          <div className="col-12">
            <label htmlFor="address-search" className="form-label mb-1">
              Address
            </label>
            <form className="d-flex gap-2" onSubmit={handleAddressSearch}>
              <input
                id="address-search"
                className="form-control"
                value={addressQuery}
                onChange={(event) => {
                  setAddressQuery(event.target.value);
                  setAddressError(null);
                }}
                onFocus={() => {
                  setShowSuggestions(true);
                }}
                onBlur={() => {
                  if (!isMobileViewport || isMobilePanelPinned) return;
                  window.setTimeout(() => {
                    setIsMobilePanelExpanded(false);
                    setShowSuggestions(false);
                  }, 120);
                }}
                placeholder="Search address or suburb"
              />
              <button className="btn btn-primary" type="submit" disabled={isGeocoding}>
                {isGeocoding ? "..." : "Go"}
              </button>
            </form>
            {isMobileViewport && (
              <div className={styles["tutor-map__mobile-actions"]}>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    setIsMobilePanelPinned((prev) => {
                      const nextPinned = !prev;
                      setIsMobilePanelExpanded(nextPinned);
                      return nextPinned;
                    });
                  }}
                >
                  {isMobilePanelPinned ? "Hide filters" : "Show filters"}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-light"
                  onClick={handleRecenter}
                  disabled={isRecentering}
                >
                  {isRecentering ? "Centering..." : "Recenter"}
                </button>
              </div>
            )}
            {showSuggestions && addressSuggestions.length > 0 && (
              <div className={styles["tutor-map__suggestions"]} role="listbox">
                {addressSuggestions.map((feature) => (
                  <button
                    key={feature.id}
                    type="button"
                    className={styles["tutor-map__suggestion-item"]}
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

          {(isMobilePanelExpanded || !isMobileViewport) && (
            <>
              <div className="col-12 col-md-6">
                <label htmlFor="subject" className="form-label mb-1">
                  Subject
                </label>
                <select
                  id="subject"
                  className="form-select"
                  value={subjectFilter}
                  onChange={(event) => setSubjectFilter(event.target.value)}
                >
                  <option value="">All subjects</option>
                  {SUBJECT_OPTIONS.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-6">
                <label htmlFor="level" className="form-label mb-1">
                  Level
                </label>
                <select
                  id="level"
                  className="form-select"
                  value={levelFilter}
                  onChange={(event) => setLevelFilter(event.target.value)}
                >
                  <option value="">All levels</option>
                  {levelOptions.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-6">
                <label htmlFor="distance" className="form-label mb-1">
                  Distance
                </label>
                <select
                  id="distance"
                  className="form-select"
                  value={distanceKm}
                  onChange={(event) => setDistanceKm(Number(event.target.value))}
                >
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={20}>20 km</option>
                  <option value={50}>50 km</option>
                  <option value={100}>100 km</option>
                </select>
              </div>

              <div className="col-6">
                <label htmlFor="price" className="form-label mb-1">
                  Max price
                </label>
                <input
                  id="price"
                  type="number"
                  min="0"
                  step="1"
                  className="form-control"
                  value={maxPriceFilter}
                  onChange={(event) => setMaxPriceFilter(event.target.value)}
                  placeholder="Any"
                />
              </div>
            </>
          )}
        </div>

        {(isMobilePanelExpanded || !isMobileViewport) && (
          <>
            <div className={styles["tutor-map__status"]}>
              {isLoading && <span>Loading tutors...</span>}
              {!isLoading && !error && <span>{filteredTutors.length} tutors found.</span>}
              {error && (
                <span className="text-danger" role="alert">
                  {error}
                </span>
              )}
            </div>

            <div className={styles["tutor-map__list"]}>
              {!isLoading &&
                filteredTutors.map((tutor) => (
                  <button
                    key={tutor.tutor_id}
                    type="button"
                    className={`${styles["tutor-map__list-item"]} ${
                      selectedTutor?.tutor_id === tutor.tutor_id
                        ? styles["tutor-map__list-item--active"]
                        : ""
                    }`}
                    onClick={() => handleTutorSelect(tutor)}
                  >
                    <div className={styles["tutor-map__list-row"]}>
                      <h3 className="h6 mb-1">{tutor.name}</h3>
                      <span className="badge text-bg-light">{tutor.distance_km.toFixed(1)} km</span>
                    </div>
                    {(tutor.rating_count ?? 0) > 0 && (
                      <p className="mb-1 small text-warning">
                        ★ {tutor.avg_rating?.toFixed(1)} ({tutor.rating_count} review
                        {(tutor.rating_count ?? 0) === 1 ? "" : "s"})
                      </p>
                    )}
                    <p className="mb-1 text-secondary">${tutor.hourly_rate}/hr</p>
                    <p className="mb-1 small text-secondary">{tutor.subjects.join(", ")}</p>
                    <p className="mb-1 small">{tutor.levels.join(", ")}</p>
                    {!tutor.has_active_slots && (
                      <p className="mb-0 small text-secondary">No active booking slots</p>
                    )}
                  </button>
                ))}
            </div>
          </>
        )}
      </div>

      {selectedTutor && (
        <article className={`${styles["tutor-map__card"]} card`}>
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start gap-3">
              <div>
                <h3 className="h5 mb-1">{selectedTutor.name}</h3>
                <p className="text-secondary mb-2">
                  {selectedTutor.distance_km.toFixed(2)} km away
                </p>
              </div>
              <button
                className="btn-close"
                aria-label="Close tutor card"
                type="button"
                onClick={() => setSelectedTutor(null)}
              />
            </div>
            <p className="mb-2">{selectedTutor.bio}</p>
            {(selectedTutor.rating_count ?? 0) > 0 && (
              <p className="mb-2 small">
                <strong>Rating:</strong> ★ {selectedTutor.avg_rating?.toFixed(1)} / 5 (
                {selectedTutor.rating_count} public review
                {(selectedTutor.rating_count ?? 0) === 1 ? "" : "s"})
              </p>
            )}
            <p className="mb-1">
              <strong>Subjects:</strong> {selectedTutor.subjects.join(", ")}
            </p>
            <p className="mb-1">
              <strong>Levels:</strong> {selectedTutor.levels.join(", ")}
            </p>
            <p className="mb-0">
              <strong>Rate:</strong> ${selectedTutor.hourly_rate}/hr
            </p>
            {canBook && selectedTutor.has_active_slots && (
              <div className="mt-3">
                <Link
                  href={`/bookings/new?tutorId=${encodeURIComponent(selectedTutor.tutor_id)}`}
                  className="btn btn-primary btn-sm"
                >
                  Book tutor
                </Link>
              </div>
            )}
            {canBook && !selectedTutor.has_active_slots && (
              <div className="mt-3 small text-secondary">
                No active booking slots available for this tutor right now.
              </div>
            )}
          </div>
        </article>
      )}
    </section>
  );
}
