"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { createClient } from "../../lib/supabase/client";
import styles from "./TutorMap.module.scss";

type TutorMapProps = {
  initialRadiusKm?: number;
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
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

const FALLBACK_COORDINATES: Coordinates = {
  latitude: 37.7749,
  longitude: -122.4194,
};

export function TutorMap({ initialRadiusKm = 20 }: TutorMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const tutorMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [distanceKm, setDistanceKm] = useState<number>(initialRadiusKm);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [maxPriceFilter, setMaxPriceFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [tutors, setTutors] = useState<TutorSearchResult[]>([]);
  const [selectedTutor, setSelectedTutor] = useState<TutorSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        setTutors((data ?? []) as TutorSearchResult[]);
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
        ? tutor.subjects.some((subject) =>
            subject.toLowerCase().includes(normalizedSubject),
          )
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
    if (!mapContainerRef.current || mapRef.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [FALLBACK_COORDINATES.longitude, FALLBACK_COORDINATES.latitude],
      zoom: 10,
    });

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
  }, [filteredTutors]);

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

  return (
    <section className={styles["tutor-map"]}>
      {!mapboxToken && (
        <div className={`${styles["tutor-map__token-warning"]} alert alert-warning`} role="alert">
          Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in your environment.
        </div>
      )}

      <div ref={mapContainerRef} className={styles["tutor-map__canvas"]} />

      <div className={styles["tutor-map__panel"]}>
        <div className={styles["tutor-map__header"]}>
          <h2 className={styles["tutor-map__title"]}>Tutors Near You</h2>
          <p className={styles["tutor-map__subtitle"]}>
            Filter by subject, distance, price, and level.
          </p>
        </div>

        <div className="row g-2">
          <div className="col-12">
            <label htmlFor="subject" className="form-label mb-1">
              Subject
            </label>
            <input
              id="subject"
              className="form-control"
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
              placeholder="e.g. Math"
            />
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

          <div className="col-12">
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
        </div>

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
                <p className="mb-1 text-secondary">${tutor.hourly_rate}/hr</p>
                <p className="mb-1 small text-secondary">{tutor.subjects.join(", ")}</p>
                <p className="mb-0 small">{tutor.levels.join(", ")}</p>
              </button>
            ))}
        </div>
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
            <p className="mb-1">
              <strong>Subjects:</strong> {selectedTutor.subjects.join(", ")}
            </p>
            <p className="mb-1">
              <strong>Levels:</strong> {selectedTutor.levels.join(", ")}
            </p>
            <p className="mb-0">
              <strong>Rate:</strong> ${selectedTutor.hourly_rate}/hr
            </p>
          </div>
        </article>
      )}
    </section>
  );
}
