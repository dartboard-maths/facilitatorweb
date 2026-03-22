"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useMemo, useRef } from "react";
import { useFormState } from "react-dom";
import type { BookingActionState } from "../../app/bookings/actions";
import { formatSchoolAddressLines } from "../../lib/schools/moodle-school-profiles";
import type { SchoolDisplaySource } from "../../lib/schools/school-location";
import type { SchoolLocationData } from "../../lib/schools/school-location";
import { BookingSummaryGrid, type BookingSummaryGridProps } from "./BookingSummaryGrid";
import styles from "./SchoolLocationCard.module.scss";

export type { SchoolLocationData } from "../../lib/schools/school-location";

async function noopSchoolLocationRefresh(): Promise<BookingActionState> {
  return {};
}

type SchoolLocationCardProps = {
  school: SchoolLocationData | null;
  fallbackSchoolId: string;
  /** Where the address data came from (for tutor/admin context). */
  displaySource?: SchoolDisplaySource;
  /** When set with refreshAction, shows a compact refresh control (cohort admin / tutor). */
  bookingId?: string;
  refreshAction?: (state: BookingActionState, formData: FormData) => Promise<BookingActionState>;
  showRefresh?: boolean;
  /** Optional tutor / status row — booking detail page embeds this below the address block. */
  bookingSummary?: BookingSummaryGridProps;
};

function sourceCaption(source: SchoolDisplaySource | undefined): string | null {
  if (source === "snapshot") {
    return "Latest Address and location";
  }
  if (source === "catalog") {
    return "Showing the latest school details from the marketplace directory. Ask a school admin to sign in via Moodle if this looks out of date.";
  }
  return null;
}

function RefreshIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 0-.908-.417A4 4 0 1 1 8 3v1z"
      />
      <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
    </svg>
  );
}

export function SchoolLocationCard({
  school,
  fallbackSchoolId,
  displaySource,
  bookingId,
  refreshAction,
  showRefresh,
  bookingSummary,
}: SchoolLocationCardProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  const [refreshState, refreshFormAction] = useFormState(
    refreshAction ?? noopSchoolLocationRefresh,
    {},
  );

  const mapboxToken = useMemo(() => process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "", []);

  const displayName = school?.name?.trim() || fallbackSchoolId;
  const addressLines = school
    ? formatSchoolAddressLines({
        address_line1: school.address_line1,
        address_line2: school.address_line2,
        suburb: school.suburb,
        city: school.city,
        state: school.state,
        postcode: school.postcode,
        country: school.country,
      })
    : [];
  const hasAddress = addressLines.length > 0;
  const lat = school?.latitude ?? null;
  const lng = school?.longitude ?? null;
  const canMap = Boolean(mapboxToken && lat !== null && lng !== null);
  const caption = sourceCaption(displaySource);

  const canShowRefresh =
    Boolean(showRefresh && bookingId && refreshAction) && typeof refreshAction === "function";

  useEffect(() => {
    if (!canMap || !mapContainerRef.current || mapRef.current) {
      return;
    }

    const container = mapContainerRef.current;

    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [lng as number, lat as number],
      zoom: 14,
      attributionControl: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.scrollZoom.disable();

    const marker = new mapboxgl.Marker({ color: "#dc3545" }).setLngLat([lng as number, lat as number]).addTo(map);
    markerRef.current = marker;
    mapRef.current = map;

    const resizeMap = () => {
      map.resize();
    };
    resizeMap();
    requestAnimationFrame(resizeMap);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            resizeMap();
          })
        : null;
    resizeObserver?.observe(container);

    return () => {
      resizeObserver?.disconnect();
      marker.remove();
      map.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [canMap, mapboxToken, lat, lng]);

  const refreshControl =
    canShowRefresh && bookingId ? (
      <form action={refreshFormAction} className="flex-shrink-0 pt-1">
        <input type="hidden" name="booking_id" value={bookingId} />
        <button
          type="submit"
          className="btn btn-outline-secondary btn-sm p-1 lh-1 border-0"
          title="Reload school details from directory (after Moodle + SSO sync)"
          aria-label="Reload school details from directory"
        >
          <RefreshIcon />
        </button>
      </form>
    ) : null;

  return (
    <div className="card shadow-sm mb-3">
      <div className="card-body p-3">
        <div
          className={`${styles.layout} ${canMap ? styles.layoutWithMap : ""}`.trim()}
        >
          <div className="min-w-0">
            <h2 className="h5 mb-3">School location</h2>
            <div className="fw-semibold mb-2">{displayName}</div>
            {!school && (
              <p className="small text-secondary mb-0">
                No address on file yet. A cohort admin should enter the school address in Moodle (School Builder →
                School Details) and sign in to the marketplace once to sync. Decisions may need this context.
              </p>
            )}
            {school && !hasAddress && (
              <p className="small text-secondary mb-0">
                No street or city recorded for this school in Moodle yet. Add address details in School Builder so they
                appear here.
              </p>
            )}
            {hasAddress && (
              <address className="small mb-0 fw-normal" style={{ fontStyle: "normal" }}>
                {addressLines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </address>
            )}
            {school && !canMap && mapboxToken && lat === null && (
              <p className="small text-secondary mt-2 mb-0">Add coordinates in Moodle School Details to show a map.</p>
            )}
            {!mapboxToken && school && (lat !== null || lng !== null) && (
              <div className="alert alert-warning py-2 small mt-2 mb-0" role="alert">
                Map unavailable: set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN.
              </div>
            )}
            {bookingSummary ? <BookingSummaryGrid {...bookingSummary} /> : null}
            {caption && (
              <div className="d-flex align-items-start gap-2 mb-3 mt-3 pt-3 border-top">
                <div
                  className="alert alert-light border py-2 small mb-0 flex-grow-1 text-body-secondary"
                  role="status"
                >
                  {caption}
                </div>
                {refreshControl}
              </div>
            )}
            {!caption && refreshControl ? (
              <div className="d-flex justify-content-end mb-3 mt-3 pt-3 border-top">{refreshControl}</div>
            ) : null}
            {(refreshState.error || refreshState.success) && (
              <div className="small mb-0" role="status">
                {refreshState.error ? (
                  <span className="text-warning">{refreshState.error}</span>
                ) : (
                  <span className="text-success">{refreshState.success}</span>
                )}
              </div>
            )}
          </div>
          {canMap ? (
            <div className={styles.mapColumn}>
              <div
                ref={mapContainerRef}
                className={`${styles.mapContainer} rounded border bg-light`}
                aria-label="School location map"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
