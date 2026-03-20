"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { TutorProfileFormState } from "../../app/tutors/new/actions";
import styles from "./TutorProfileForm.module.scss";

type TutorProfileFormProps = {
  action: (
    state: TutorProfileFormState,
    payload: FormData,
  ) => Promise<TutorProfileFormState>;
};

const initialState: TutorProfileFormState = {};
const defaultCenter = { lng: -98.5795, lat: 39.8283 };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save profile"}
    </button>
  );
}

export function TutorProfileForm({ action }: TutorProfileFormProps) {
  const [formState, formAction] = useFormState(action, initialState);
  const [lng, setLng] = useState<number>(defaultCenter.lng);
  const [lat, setLat] = useState<number>(defaultCenter.lat);
  const [hasPickedLocation, setHasPickedLocation] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const mapboxToken = useMemo(
    () => process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "",
    [],
  );

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [defaultCenter.lng, defaultCenter.lat],
      zoom: 3,
    });

    const marker = new mapboxgl.Marker({ draggable: true })
      .setLngLat([defaultCenter.lng, defaultCenter.lat])
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
  }, [mapboxToken]);

  return (
    <form action={formAction} className={styles["tutor-profile-form"]}>
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="name">
            Name
          </label>
          <input id="name" name="name" type="text" className="form-control" required />
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
              required
            />
          </div>
        </div>

        <div className="col-12">
          <label className="form-label" htmlFor="bio">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            className="form-control"
            rows={4}
            required
          />
        </div>

        <div className="col-12">
          <label className="form-label" htmlFor="subjects">
            Subjects
          </label>
          <input
            id="subjects"
            name="subjects"
            type="text"
            className="form-control"
            placeholder="Math, Physics, Chemistry"
            required
          />
          <div className="form-text">Comma-separated values.</div>
        </div>

        <div className="col-12">
          <label className="form-label" htmlFor="levels">
            Levels
          </label>
          <input
            id="levels"
            name="levels"
            type="text"
            className="form-control"
            placeholder="Middle School, High School, College"
            required
          />
          <div className="form-text">Comma-separated values.</div>
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
            required
          />
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
