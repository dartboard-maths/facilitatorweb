"use client";

import { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import styles from "./SchoolMap.module.scss";

export type SchoolQuery = {
  school?: string;
  name?: string;
  lat?: string;
  lng?: string;
  learners?: string;
  courses?: string;
  completion?: string;
  grade?: string;
  competencies?: string;
  badges?: string;
};

type SchoolPin = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

const FALLBACK_CENTER = { latitude: -33.9249, longitude: 18.4241 };
const UNKNOWN = "—";

const STATS: Array<{ key: keyof SchoolQuery; label: string }> = [
  { key: "learners", label: "Learners" },
  { key: "courses", label: "Courses" },
  { key: "completion", label: "Completion" },
  { key: "grade", label: "Average grade" },
  { key: "competencies", label: "Competencies" },
  { key: "badges", label: "Badges" },
];

function figure(value: string | undefined): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return text || UNKNOWN;
}

function schoolPin(query: SchoolQuery): SchoolPin | null {
  const id = (query.school ?? "").trim();
  const latitude = Number(query.lat);
  const longitude = Number(query.lng);
  if (
    !id ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return {
    id,
    name: (query.name ?? "").replace(/\s+/g, " ").trim() || id,
    latitude,
    longitude,
  };
}

export function SchoolMap({ query }: { query: SchoolQuery }) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapboxToken = useMemo(() => process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "", []);
  const pin = useMemo(() => schoolPin(query), [query]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    const center = pin ?? FALLBACK_CENTER;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [center.longitude, center.latitude],
      zoom: pin ? 14 : 4,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    if (pin) {
      new mapboxgl.Marker({ color: "#1a2c4e" })
        .setLngLat([pin.longitude, pin.latitude])
        .setPopup(new mapboxgl.Popup({ offset: 24 }).setText(`${pin.name} (${pin.id})`))
        .addTo(map);
    }
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapboxToken, pin]);

  return (
    <section className={styles["school-map"]} aria-label="Find a school">
      <div ref={mapContainerRef} className={styles["school-map__canvas"]} />
      <aside className={styles["school-map__panel"]}>
        {pin ? (
          <>
            <h1 className={styles["school-map__title"]}>{pin.name}</h1>
            <p className={styles["school-map__id"]}>{pin.id}</p>
            <dl className={styles["school-map__stats"]}>
              {STATS.map((stat) => (
                <div className={styles["school-map__stat"]} key={stat.key}>
                  <dt>{stat.label}</dt>
                  <dd>{figure(query[stat.key])}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <>
            <h1 className={styles["school-map__title"]}>Find a school</h1>
            <p className={styles["school-map__prompt"]}>
              Choose a school from the inspector map to see it here.
            </p>
          </>
        )}
        {!mapboxToken ? (
          <p className={styles["school-map__prompt"]}>
            Map unavailable: set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN.
          </p>
        ) : null}
      </aside>
    </section>
  );
}
