"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import * as maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

import {
  boundsOf,
  coordinateFromMapClick,
  pointsToFeatureCollection,
  type MapPoint,
} from "@/lib/map";

const STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const SOURCE_ID = "admin-points";

export function AdminMap({
  points,
  selectedId,
  onSelect,
  onMapClick,
  fit = true,
  height = 420,
}: {
  points: MapPoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onMapClick?: (coordinates: { longitude: number; latitude: number }) => void;
  fit?: boolean;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onSelectRef = useRef(onSelect);
  const onMapClickRef = useRef(onMapClick);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
    onMapClickRef.current = onMapClick;
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [0, 0],
      zoom: 2,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: SOURCE_ID,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-radius": 7,
          "circle-color": [
            "case",
            ["==", ["get", "__id"], ""],
            "#2563eb",
            "#1d4ed8",
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
      setReady(true);
    });

    map.on("click", (event) => {
      const features = map.queryRenderedFeatures(event.point, { layers: [SOURCE_ID] });
      const id = features[0]?.properties?.__id;
      if (id && onSelectRef.current) {
        onSelectRef.current(String(id));
        return;
      }
      const coordinates = coordinateFromMapClick(event);
      if (coordinates && onMapClickRef.current) onMapClickRef.current(coordinates);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData(pointsToFeatureCollection(points));
  }, [points, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setPaintProperty(SOURCE_ID, "circle-color", [
      "case",
      ["==", ["get", "__id"], selectedId ?? ""],
      "#dc2626",
      "#1d4ed8",
    ]);
  }, [selectedId, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !fit) return;
    const bounds = boundsOf(points);
    if (!bounds) return;
    if (points.length === 1) {
      map.easeTo({ center: [points[0].longitude, points[0].latitude], zoom: 11 });
      return;
    }
    map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 400 });
  }, [points, ready, fit]);

  return <div ref={containerRef} style={{ height }} className="w-full rounded border" />;
}
