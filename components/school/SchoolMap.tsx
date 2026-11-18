"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { InspectorDirectoryAccess, InspectorSchoolFigures, InspectorSchoolPin } from "../../lib/schools/inspector-directory";
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

const FALLBACK_CENTER = { latitude: -33.9249, longitude: 18.4241 };
const UNKNOWN = "—";

const STATS: Array<{ key: keyof InspectorSchoolFigures; label: string }> = [
  { key: "learners", label: "Learners" },
  { key: "courses", label: "Courses" },
  { key: "completion", label: "Completion" },
  { key: "grade", label: "Average grade" },
  { key: "competencies", label: "Competencies" },
  { key: "badges", label: "Badges" },
];

function schoolId(value: string | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

function figure(value: string | undefined): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return text || UNKNOWN;
}

function figuresFromQuery(query: SchoolQuery): InspectorSchoolFigures {
  return {
    learners: figure(query.learners),
    courses: figure(query.courses),
    completion: figure(query.completion),
    grade: figure(query.grade),
    competencies: figure(query.competencies),
    badges: figure(query.badges),
  };
}

function frameSchools(map: mapboxgl.Map, schoolPins: InspectorSchoolPin[], duration: number) {
  map.stop();
  map.getContainer().querySelectorAll(".mapboxgl-popup").forEach((popup) => popup.remove());

  const bounds = new mapboxgl.LngLatBounds();
  schoolPins.forEach((pin) => {
    if (Number.isFinite(pin.longitude) && Number.isFinite(pin.latitude)) {
      bounds.extend([pin.longitude, pin.latitude]);
    }
  });
  if (bounds.isEmpty()) {
    map.easeTo({
      center: [FALLBACK_CENTER.longitude, FALLBACK_CENTER.latitude],
      zoom: 4,
      bearing: 0,
      pitch: 0,
      duration,
      essential: true,
    });
    return;
  }

  const size = Math.min(map.getContainer().clientWidth, map.getContainer().clientHeight);
  const padding = Math.max(24, Math.min(80, Math.floor(size / 6)));
  const camera = map.cameraForBounds(bounds, { padding, maxZoom: schoolPins.length === 1 ? 14 : 12 });
  if (!camera?.center || camera.zoom == null || !Number.isFinite(camera.zoom)) {
    return;
  }
  map.easeTo({
    center: camera.center,
    zoom: camera.zoom,
    bearing: 0,
    pitch: 0,
    duration,
    essential: true,
  });
}

function promptFor(access: InspectorDirectoryAccess, hasSchools: boolean, hasSelection: boolean): string {
  if (access === "not_inspector") {
    return "This account is not a region inspector.";
  }
  if (access !== "ready") {
    return "School list unavailable.";
  }
  if (!hasSchools) {
    return "No schools in your region have a location and results yet.";
  }
  if (!hasSelection) {
    return "Choose a school to see its stats.";
  }
  return "";
}

export function SchoolMap({
  query,
  pins,
  access,
}: {
  query: SchoolQuery;
  pins: InspectorSchoolPin[];
  access: InspectorDirectoryAccess;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const selectRef = useRef<(id: string) => void>(() => undefined);
  const mapboxToken = useMemo(() => process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "", []);
  const linkedId = schoolId(query.school);
  const linkedPin = pins.find((pin) => pin.id === linkedId) ?? null;
  const [selectedId, setSelectedId] = useState(linkedPin?.id ?? "");
  const [figures, setFigures] = useState<InspectorSchoolFigures | null>(
    linkedPin ? figuresFromQuery(query) : null,
  );
  const [loading, setLoading] = useState(false);
  const selected = pins.find((pin) => pin.id === selectedId) ?? null;

  selectRef.current = (id: string) => {
    setSelectedId(id);
    setFigures(id === linkedPin?.id ? figuresFromQuery(query) : null);
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    const focus = linkedPin ?? pins[0] ?? FALLBACK_CENTER;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [focus.longitude, focus.latitude],
      zoom: pins.length === 1 ? 14 : 4,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    const markers = new Map<string, mapboxgl.Marker>();
    pins.forEach((pin) => {
      const marker = new mapboxgl.Marker({ color: "#1a2c4e" })
        .setLngLat([pin.longitude, pin.latitude])
        .addTo(map);
      marker.getElement().style.cursor = "pointer";
      marker.getElement().addEventListener("click", () => {
        selectRef.current(pin.id);
        map.flyTo({ center: [pin.longitude, pin.latitude], zoom: 14, essential: true });
      });
      markers.set(pin.id, marker);
    });
    markersRef.current = markers;
    map.on("load", () => {
      if (pins.length > 1) {
        frameSchools(map, pins, 0);
      }
    });
    mapRef.current = map;

    return () => {
      markersRef.current = new Map();
      map.remove();
      mapRef.current = null;
    };
  }, [linkedPin, mapboxToken, pins]);

  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const path = marker.getElement().querySelector("path");
      if (path) {
        path.setAttribute("fill", id === selectedId ? "#9a3412" : "#1a2c4e");
      }
    });
  }, [selectedId, pins]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    const controller = new AbortController();
    const keepLinkedFigures = selectedId === linkedPin?.id;
    setLoading(true);
    fetch(`/api/schools/figures?school=${encodeURIComponent(selectedId)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          if (!keepLinkedFigures) {
            setFigures(null);
          }
          return;
        }
        setFigures((await response.json()) as InspectorSchoolFigures);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        if (!keepLinkedFigures) {
          setFigures(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [linkedPin?.id, selectedId]);

  const prompt = promptFor(access, pins.length > 0, Boolean(selected));

  return (
    <section className={styles["school-map"]} aria-label="Region Inspector">
      <div ref={mapContainerRef} className={styles["school-map__canvas"]} />
      <button
        type="button"
        className={`${styles["school-map__recenter"]} btn btn-sm btn-light`}
        onClick={() => {
          const map = mapRef.current;
          if (!map?.isStyleLoaded()) {
            return;
          }
          frameSchools(map, pins, 700);
        }}
        disabled={!mapboxToken}
      >
        Recenter
      </button>
      <aside className={styles["school-map__panel"]}>
        <div className={`${styles["school-map__header"]} d-flex align-items-center gap-2`}>
          <Link href="/" className="btn btn-link p-0 text-decoration-none" aria-label="Back to homepage">
            ←
          </Link>
          <h2 className={styles["school-map__heading"]}>Region Inspector</h2>
        </div>
        {selected ? (
          <>
            <p className={styles["school-map__title"]}>{selected.name}</p>
            <p className={styles["school-map__id"]}>{selected.id}</p>
            <dl className={styles["school-map__stats"]}>
              {STATS.map((stat) => (
                <div className={styles["school-map__stat"]} key={stat.key}>
                  <dt>{stat.label}</dt>
                  <dd>{loading && !figures ? "…" : figure(figures?.[stat.key])}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <>
            <p className={styles["school-map__prompt"]}>{prompt}</p>
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
