"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type {
  InspectorDirectoryAccess,
  InspectorGradeProfile,
  InspectorSchoolFigures,
  InspectorSchoolPin,
} from "../../lib/schools/inspector-directory";
import type { PublicSchoolPin } from "../../lib/schools/public-directory";
import { ClassProfileIsland } from "./ClassProfileIsland";
import { CountUp, useHudReady } from "./hud-motion";
import { LearnerBattleDeck } from "./LearnerBattleDeck";
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
const THEME_KEY = "dbm-inspector-theme";
const LIGHT_MAP = "mapbox://styles/mapbox/streets-v12";
const DARK_MAP = "mapbox://styles/mapbox/dark-v11";

type InspectorTheme = "light" | "dark";

function storedTheme(): InspectorTheme {
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light") {
    return stored;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function ThemeIcon({ theme }: { theme: InspectorTheme }) {
  if (theme === "dark") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2.2M12 19.3v2.2M4.8 4.8l1.6 1.6M17.6 17.6l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.8 19.2l1.6-1.6M17.6 6.4l1.6-1.6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.5 14.8A8.2 8.2 0 1 1 9.2 3.5a6.6 6.6 0 0 0 11.3 11.3z" />
    </svg>
  );
}

type FigureKey = "learners" | "courses" | "completion" | "grade" | "competencies" | "badges";

const STAT_ROWS: Array<Array<{ key: FigureKey; label: string }>> = [
  [
    { key: "learners", label: "Learners" },
    { key: "courses", label: "Courses" },
    { key: "completion", label: "Completion" },
  ],
  [
    { key: "grade", label: "Average grade" },
    { key: "competencies", label: "Competencies" },
    { key: "badges", label: "Badges" },
  ],
];

function schoolId(value: string | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

function figure(value: string | undefined): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return text || UNKNOWN;
}

function dialProgress(key: FigureKey, value: string): number {
  if (key === "completion" || key === "grade") {
    const match = value.match(/^(\d+(?:\.\d+)?)%$/);
    return match ? Math.min(100, Math.max(0, Number(match[1]))) : 0;
  }
  const count = Number(value.replace(/,/g, ""));
  return Number.isFinite(count) && count > 0 ? 100 : 0;
}

function StatDials({
  values,
  loading = false,
  motionKey = "stats",
  tilesOnly = false,
}: {
  values: Partial<Record<FigureKey, string>> | null;
  loading?: boolean;
  motionKey?: string;
  tilesOnly?: boolean;
}) {
  const ready = useHudReady(Boolean(values) && !loading);
  const [counts, rings] = STAT_ROWS;
  return (
    <div className={styles["school-map__dials"]} key={motionKey}>
      <div className={styles["school-map__tiles"]}>
        {counts.map((stat, index) => {
          const value = loading && !values ? "…" : figure(values?.[stat.key]);
          return (
            <article className={styles["school-map__tile"]} key={stat.key}>
              <p className={styles["school-map__tile-label"]}>{stat.label}</p>
              <p className={styles["school-map__tile-value"]}>
                <CountUp value={value} ready={ready} delay={index * 70} />
              </p>
            </article>
          );
        })}
      </div>
      {tilesOnly ? null : (
      <div className={styles["school-map__dial-row"]}>
        {rings.map((stat, index) => {
          const value = loading && !values ? "…" : figure(values?.[stat.key]);
          const progress = ready ? dialProgress(stat.key, value) : 0;
          return (
            <div
              className={`${styles["school-map__dial"]} ${styles[`school-map__dial--${stat.key}`]}`}
              key={stat.key}
            >
                <span
                  className={styles["school-map__ring"]}
                  style={{ "--dbm-progress": progress, transitionDelay: `${120 + index * 80}ms` } as CSSProperties}
                  role="img"
                  aria-label={`${stat.label}: ${value}`}
                >
                  <CountUp className={styles["school-map__ring-value"]} value={value} ready={ready} delay={120 + index * 80} />
                </span>
                <p className={styles["school-map__dial-label"]}>{stat.label}</p>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

function gradeNumber(label: string): number | null {
  const match = label.match(/^Grade\s+(\d{1,2})$/);
  if (!match) {
    return null;
  }
  const grade = Number(match[1]);
  return grade >= 0 && grade <= 19 ? grade : null;
}

function figuresFromQuery(query: SchoolQuery): InspectorSchoolFigures {
  return {
    learners: figure(query.learners),
    courses: figure(query.courses),
    completion: figure(query.completion),
    grade: figure(query.grade),
    competencies: figure(query.competencies),
    badges: figure(query.badges),
    grades: [],
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

function promptFor(
  mode: "public" | "inspector",
  access: InspectorDirectoryAccess,
  hasSchools: boolean,
  hasSelection: boolean,
): string {
  if (mode === "public") {
    if (access !== "ready") {
      return "School list unavailable.";
    }
    if (!hasSchools) {
      return "No schools have a location and results yet.";
    }
    if (!hasSelection) {
      return "Choose a school to see its stats.";
    }
    return "";
  }
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

function summaryFigures(pin: InspectorSchoolPin | PublicSchoolPin | null): InspectorSchoolFigures | null {
  if (!pin || !("figures" in pin)) {
    return null;
  }
  return {
    learners: pin.figures.learners,
    courses: pin.figures.courses,
    completion: pin.figures.completion,
    grade: UNKNOWN,
    competencies: UNKNOWN,
    badges: UNKNOWN,
    grades: [],
  };
}

export function SchoolMap({
  query,
  pins,
  access,
  mode = "inspector",
}: {
  query: SchoolQuery;
  pins: Array<InspectorSchoolPin | PublicSchoolPin>;
  access: InspectorDirectoryAccess;
  mode?: "public" | "inspector";
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
    mode === "public" ? summaryFigures(linkedPin) : linkedPin ? figuresFromQuery(query) : null,
  );
  const [loading, setLoading] = useState(false);
  const [gradesOpen, setGradesOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [gradeProfile, setGradeProfile] = useState<InspectorGradeProfile | null>(null);
  const [gradeLoading, setGradeLoading] = useState(false);
  const [gradeFailed, setGradeFailed] = useState(false);
  const [selectedLearnerKey, setSelectedLearnerKey] = useState<string | null>(null);
  const [theme, setTheme] = useState<InspectorTheme>("light");
  const themeRef = useRef(theme);
  const mapStyleRef = useRef(LIGHT_MAP);
  themeRef.current = theme;
  const selected = pins.find((pin) => pin.id === selectedId) ?? null;

  selectRef.current = (id: string) => {
    setSelectedId(id);
    if (mode === "public") {
      setFigures(summaryFigures(pins.find((pin) => pin.id === id) ?? null));
      return;
    }
    setFigures(id === linkedPin?.id ? figuresFromQuery(query) : null);
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    const focus = linkedPin ?? pins[0] ?? FALLBACK_CENTER;
    const initialStyle = themeRef.current === "dark" ? DARK_MAP : LIGHT_MAP;
    mapStyleRef.current = initialStyle;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: initialStyle,
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
    setTheme(storedTheme());
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const next = theme === "dark" ? DARK_MAP : LIGHT_MAP;
    if (mapStyleRef.current === next) {
      return;
    }
    mapStyleRef.current = next;
    map.setStyle(next);
  }, [theme]);

  useEffect(() => {
    const idle = theme === "dark" ? "#22d3ee" : "#1a2c4e";
    const active = theme === "dark" ? "#fb7185" : "#9a3412";
    markersRef.current.forEach((marker, id) => {
      const path = marker.getElement().querySelector("path");
      if (path) {
        path.setAttribute("fill", id === selectedId ? active : idle);
      }
    });
  }, [selectedId, pins, theme]);

  useEffect(() => {
    if (mode === "public" || !selectedId) {
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
  }, [linkedPin?.id, mode, selectedId]);

  useEffect(() => {
    setGradesOpen(false);
    setSelectedGrade(null);
    setGradeProfile(null);
    setGradeFailed(false);
    setSelectedLearnerKey(null);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || selectedGrade === null) {
      setGradeProfile(null);
      setGradeLoading(false);
      setGradeFailed(false);
      return;
    }
    const controller = new AbortController();
    setGradeLoading(true);
    setGradeFailed(false);
    setSelectedLearnerKey(null);
    fetch(`/api/schools/grade?school=${encodeURIComponent(selectedId)}&grade=${selectedGrade}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          setGradeProfile(null);
          setGradeFailed(true);
          return;
        }
        setGradeProfile((await response.json()) as InspectorGradeProfile);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setGradeProfile(null);
        setGradeFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setGradeLoading(false);
        }
      });
    return () => controller.abort();
  }, [selectedGrade, selectedId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      if (selectedLearnerKey) {
        setSelectedLearnerKey(null);
        return;
      }
      if (selectedGrade !== null) {
        setSelectedGrade(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedGrade, selectedLearnerKey]);

  const isPublic = mode === "public";
  const prompt = promptFor(mode, access, pins.length > 0, Boolean(selected));
  const signInHref = selected
    ? `/api/auth/moodle/start?next=${encodeURIComponent(`/schools?school=${selected.id}`)}`
    : "/api/auth/moodle/start?next=%2Fschools";
  const openLearner = gradeProfile?.progress.find((row) => row.learnerKey === selectedLearnerKey) ?? null;

  return (
    <section
      className={`${styles["school-map"]} ${theme === "dark" ? styles["school-map--dark"] : ""}`}
      aria-label={isPublic ? "Find a school" : "Region Inspector"}
    >
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
      <div className={styles["school-map__stack"]}>
        <aside className={styles["school-map__panel"]}>
          <div className={styles["school-map__header"]}>
            <Link href="/" className="btn btn-link p-0 text-decoration-none" aria-label="Back to homepage">
              ←
            </Link>
            <h2 className={styles["school-map__heading"]}>{isPublic ? "Find a school" : "Region Inspector"}</h2>
            <button
              type="button"
              className={styles["school-map__theme"]}
              aria-pressed={theme === "dark"}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => {
                setTheme((current) => {
                  const next = current === "dark" ? "light" : "dark";
                  window.localStorage.setItem(THEME_KEY, next);
                  return next;
                });
              }}
            >
              <ThemeIcon theme={theme} />
            </button>
          </div>
          {selected ? null : <p className={styles["school-map__prompt"]}>{prompt}</p>}
          {!mapboxToken ? (
            <p className={styles["school-map__prompt"]}>
              Map unavailable: set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN.
            </p>
          ) : null}
        </aside>
        {selected ? (
          <aside className={styles["school-map__school"]} aria-label={selected.name}>
            <p className={styles["school-map__title"]}>{selected.name}</p>
            {isPublic ? null : <p className={styles["school-map__id"]}>{selected.id}</p>}
            <StatDials values={figures} loading={loading && !figures} tilesOnly={isPublic} />
            {isPublic ? (
              <Link className={styles["school-map__grades-cta"]} href={signInHref}>
                Sign in
              </Link>
            ) : figures && figures.grades.length > 0 ? (
              <button
                type="button"
                className={styles["school-map__grades-cta"]}
                aria-expanded={gradesOpen}
                onClick={() => {
                  setGradesOpen((open) => {
                    if (open) {
                      setSelectedGrade(null);
                      setGradeProfile(null);
                      setSelectedLearnerKey(null);
                    }
                    return !open;
                  });
                }}
              >
                Grades
              </button>
            ) : null}
          </aside>
        ) : null}
        {!isPublic && selected && gradesOpen && figures && figures.grades.length > 0 ? (
          <aside className={styles["school-map__grades-island"]} aria-label="Grades">
            <section className={styles["school-map__grades"]}>
              {figures.grades.map((grade) => {
                const number = gradeNumber(grade.label);
                const active = number !== null && number === selectedGrade;
                return (
                  <button
                    type="button"
                    className={styles["school-map__grade"]}
                    key={grade.label}
                    disabled={number === null}
                    aria-pressed={active}
                    onClick={() => {
                      if (number === null) {
                        return;
                      }
                      setSelectedGrade((current) => (current === number ? null : number));
                    }}
                  >
                    <span className={styles["school-map__grade-title"]}>{grade.label}</span>
                    <StatDials values={grade} />
                  </button>
                );
              })}
            </section>
          </aside>
        ) : null}
      </div>
      {!isPublic && selected && selectedGrade !== null ? (
        <ClassProfileIsland
          profile={gradeProfile}
          loading={gradeLoading}
          failed={gradeFailed}
          onClose={() => {
            setSelectedGrade(null);
            setSelectedLearnerKey(null);
          }}
          onSelectLearner={setSelectedLearnerKey}
        />
      ) : null}
      {openLearner ? (
        <LearnerBattleDeck
          initials={openLearner.initials}
          detail={openLearner.detail}
          onClose={() => setSelectedLearnerKey(null)}
        />
      ) : null}
    </section>
  );
}
