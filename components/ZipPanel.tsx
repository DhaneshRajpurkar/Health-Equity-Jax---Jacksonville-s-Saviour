"use client";

import type { ZipData } from "@/types";

interface Props {
  zip: ZipData | null;
}

const METRICS = [
  { key: "pctUninsured",   label: "Uninsured",   color: "#ef4444", max: 50 },
  { key: "pctSmoking",     label: "Smoking",     color: "#f97316", max: 40 },
  { key: "pctObesity",     label: "Obesity",     color: "#eab308", max: 60 },
  { key: "pctInactive",    label: "Inactive",    color: "#a855f7", max: 60 },
  { key: "pctParkArea",    label: "Park Area",   color: "#22c55e", max: 20 },
  { key: "sviScore",       label: "SVI Score",   color: "#06b6d4", max: 1  },
];

export default function ZipPanel({ zip }: Props) {
  if (!zip) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
        <p className="text-sm">Click a ZIP code on the map</p>
      </div>
    );
  }

  const chartData = METRICS
    .filter(({ key }) => zip[key as keyof ZipData] != null)
    .map(({ key, label, color, max }) => ({
      label,
      value: zip[key as keyof ZipData] as number,
      color,
      max,
    }));

  return (
    <div className="p-4 space-y-5 overflow-y-auto h-full">
      {/* Header */}
      <div className="border-b border-gray-700 pb-4">
        <p className="text-xs text-gray-400 uppercase tracking-widest">ZIP Code</p>
        <h2 className="text-3xl font-bold text-white">{zip.zip}</h2>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-4xl font-extrabold text-emerald-400">
            {zip.lifeExpectancy?.toFixed(1) ?? "—"}
          </span>
          <span className="text-gray-400 mb-1">yrs life expectancy</span>
        </div>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Median Income",  value: zip.medianIncome ? `$${zip.medianIncome.toLocaleString()}` : "—" },
          { label: "Food Desert Pop", value: zip.foodDesertPop?.toLocaleString() ?? "—" },
          { label: "SVI Score",      value: zip.sviScore?.toFixed(3) ?? "—" },
          { label: "Park Coverage",  value: zip.pctParkArea ? `${zip.pctParkArea.toFixed(1)}%` : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400">{label}</p>
            <p className="text-lg font-semibold text-white mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Bar chart — pure CSS, no recharts */}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Health Risk Factors</p>
        <div className="space-y-2">
          {chartData.map(({ label, value, color, max }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-300">{label}</span>
                <span className="text-gray-400">{value.toFixed(1)}</span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((value / max) * 100, 100)}%`, backgroundColor: color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
