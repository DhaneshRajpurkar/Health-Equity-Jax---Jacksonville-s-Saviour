"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Tooltip } from "react-leaflet";
import type { Feature, FeatureCollection } from "geojson";
import type { ZipData } from "@/types";
import "leaflet/dist/leaflet.css";

interface Props {
  zipData: ZipData[];
  onZipSelect: (zip: string) => void;
  selectedZip: string | null;
}

const JAX_ZIPS = new Set([
  "32099","32201","32202","32203","32204","32205","32206","32207","32208",
  "32209","32210","32211","32212","32214","32216","32217","32218","32219",
  "32220","32221","32222","32223","32224","32225","32226","32227","32228",
  "32229","32231","32232","32233","32234","32235","32236","32237","32238",
  "32239","32240","32241","32244","32245","32246","32247","32250","32254",
  "32255","32256","32257","32258","32259","32260","32266","32277",
]);

function getColor(le: number | null): string {
  if (le === null) return "#374151";
  if (le >= 80)   return "#064e3b";
  if (le >= 78)   return "#065f46";
  if (le >= 76)   return "#047857";
  if (le >= 74)   return "#059669";
  if (le >= 72)   return "#f59e0b";
  if (le >= 70)   return "#ef4444";
  return "#991b1b";
}

export default function Map({ zipData, onZipSelect, selectedZip }: Props) {
  const [geoJson, setGeoJson] = useState<FeatureCollection | null>(null);

  const zipMap = Object.fromEntries(zipData.map((z) => [z.zip, z]));

  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/fl_florida_zip_codes_geo.min.json"
    )
      .then((r) => r.json())
      .then((data: FeatureCollection) => {
        const filtered = {
          ...data,
          features: data.features.filter((f: Feature) =>
            JAX_ZIPS.has(f.properties?.ZCTA5CE10 ?? f.properties?.zip)
          ),
        };
        setGeoJson(filtered);
      });
  }, []);

  const styleFeature = (feature?: Feature) => {
    const zip  = feature?.properties?.ZCTA5CE10 ?? feature?.properties?.zip;
    const data = zipMap[zip];
    const le   = data?.lifeExpectancy ?? null;
    return {
      fillColor:   getColor(le),
      weight:      zip === selectedZip ? 3 : 1,
      color:       zip === selectedZip ? "#fff" : "#1f2937",
      fillOpacity: 0.85,
    };
  };

  const onEachFeature = (feature: Feature, layer: L.Layer) => {
    const zip  = feature.properties?.ZCTA5CE10 ?? feature.properties?.zip;
    const data = zipMap[zip];
    // @ts-ignore
    layer.on({ click: () => onZipSelect(zip) });
    if (data) {
      // @ts-ignore
      layer.bindTooltip(
        `<b>${zip}</b><br/>Life Expectancy: ${data.lifeExpectancy?.toFixed(1) ?? "N/A"} yrs`,
        { sticky: true, className: "leaflet-tooltip-dark" }
      );
    }
  };

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden">
      <MapContainer
        center={[30.3322, -81.6557]}
        zoom={10}
        className="w-full h-full"
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        {geoJson && (
          <GeoJSON
            key={selectedZip}
            data={geoJson}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-6 left-4 z-[1000] bg-gray-900/90 border border-gray-700 rounded-lg p-3 text-xs text-white">
        <p className="font-semibold mb-2 text-gray-300">Life Expectancy</p>
        {[
          { color: "#064e3b", label: "≥ 80 yrs" },
          { color: "#059669", label: "76–79 yrs" },
          { color: "#f59e0b", label: "72–75 yrs" },
          { color: "#ef4444", label: "70–71 yrs" },
          { color: "#991b1b", label: "< 70 yrs" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
