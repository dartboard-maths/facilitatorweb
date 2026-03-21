"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useMemo, useRef } from "react";
import { formatSchoolAddressLines } from "../../lib/schools/moodle-school-profiles";
import type { SchoolDisplaySource } from "../../lib/schools/school-location";
import type { SchoolLocationData } from "../../lib/schools/school-location";

export type { SchoolLocationData } from "../../lib/schools/school-location";

type SchoolLocationCardProps = {
  school: SchoolLocationData | null;
  fallbackSchoolId: string;
  /** Where the address data came from (for tutor/admin context). */
  displaySource?: SchoolDisplaySource;
};

function sourceCaption(source: SchoolDisplaySource | undefined): string | null {
  if (source === "snapshot") {
    return "Address and location below reflect the school details stored when this booking was requested — use this for travel and planning decisions.";
  }
  if (source === "catalog") {
    return "Showing the latest school details from the marketplace directory. Ask a school admin to sign in via Moodle if this looks out of date.";
  }
  return null;
}

export function SchoolLocationCard({ school, fallbackSchoolId, displaySource }: SchoolLocationCardProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

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

  useEffect(() => {
    if (!canMap || !mapContainerRef.current || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
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

    return () => {
      marker.remove();
      map.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [canMap, mapboxToken, lat, lng]);

  return (
    <div className="card border border-primary border-2 shadow-sm mb-3">
      <div className="card-body p-3">
        <h2 className="h5 mb-1">School location</h2>
        <p className="small text-secondary mb-3">
          Category / school address for this booking — review before accepting or proposing changes.
        </p>
        {caption && (
          <div className="alert alert-info py-2 small mb-3" role="status">
            {caption}
          </div>
        )}
        <div className="fw-semibold mb-2">{displayName}</div>
        <div className="small text-muted mb-2">
          School id: <code>{fallbackSchoolId}</code>
        </div>
        {!school && (
          <p className="small text-secondary mb-0">
            No address on file yet. A cohort admin should enter the school address in Moodle (School Builder → School
            Details) and sign in to the marketplace once to sync. Decisions may need this context.
          </p>
        )}
        {school && !hasAddress && (
          <p className="small text-secondary mb-0">
            No street or city recorded for this school in Moodle yet. Add address details in School Builder so they
            appear here.
          </p>
        )}
        {hasAddress && (
          <address className="small mb-3 mb-md-0 fw-normal" style={{ fontStyle: "normal" }}>
            {addressLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </address>
        )}
        {school && !canMap && mapboxToken && lat === null && (
          <p className="small text-secondary mb-0">Add coordinates in Moodle School Details to show a map.</p>
        )}
        {!mapboxToken && school && (lat !== null || lng !== null) && (
          <div className="alert alert-warning py-2 small mb-0" role="alert">
            Map unavailable: set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN.
          </div>
        )}
        {canMap && (
          <div
            ref={mapContainerRef}
            className="w-100 rounded border bg-light mt-2"
            style={{ height: "220px", minHeight: "220px" }}
            aria-label="School location map"
          />
        )}
      </div>
    </div>
  );
}
