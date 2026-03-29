"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import ZipPanel from "@/components/ZipPanel";
import RoiCalculator from "@/components/RoiCalculator";
import ReportsFeed from "@/components/ReportsFeed";
import PublishPost from "@/components/PublishPost";
import type { ZipData } from "@/types";

// Leaflet needs to be loaded client-side only
const Map = dynamic(() => import("@/components/Map"), { ssr: false });

const TABS = ["ROI Calculator", "Citizen Reports", "Publish Post"] as const;
type Tab = typeof TABS[number];

export default function Dashboard() {
  const [zipData, setZipData]       = useState<ZipData[]>([]);
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [activeTab, setActiveTab]   = useState<Tab>("ROI Calculator");

  useEffect(() => {
    fetch("/api/zips")
      .then((r) => r.json())
      .then((data: ZipData[]) => setZipData(data));
  }, []);

  const selectedZipData = zipData.find((z) => z.zip === selectedZip) ?? null;

  const avgLE = zipData.length
    ? (zipData.reduce((s, z) => s + (z.lifeExpectancy ?? 0), 0) / zipData.filter(z => z.lifeExpectancy).length).toFixed(1)
    : "—";
  const minLE = zipData.length ? Math.min(...zipData.filter(z => z.lifeExpectancy).map(z => z.lifeExpectancy!)).toFixed(1) : "—";
  const maxLE = zipData.length ? Math.max(...zipData.filter(z => z.lifeExpectancy).map(z => z.lifeExpectancy!)).toFixed(1) : "—";
  const gap   = zipData.length ? (parseFloat(maxLE as string) - parseFloat(minLE as string)).toFixed(1) : "—";

  return (
    <div className="h-screen w-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-emerald-400">Health</span>Equity Jacksonville
          </h1>
          <p className="text-xs text-gray-500">Urban Planner Dashboard</p>
        </div>
        {/* Summary stats */}
        <div className="hidden md:flex items-center gap-6">
          {[
            { label: "ZIP Codes", value: zipData.length || "—" },
            { label: "Avg Life Expectancy", value: `${avgLE} yrs` },
            { label: "Highest", value: `${maxLE} yrs` },
            { label: "Lowest", value: `${minLE} yrs` },
            { label: "Gap", value: `${gap} yrs`, highlight: true },
          ].map(({ label, value, highlight }) => (
            <div key={label} className="text-center">
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`text-lg font-bold ${highlight ? "text-red-400" : "text-white"}`}>{value}</p>
            </div>
          ))}
        </div>
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Live" />
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map — center */}
        <main className="flex-1 p-3 flex items-start justify-start pl-8">
          <div className="w-[85%] h-[70vh] rounded-xl overflow-hidden border border-gray-800">
            <Map
              zipData={zipData}
              onZipSelect={setSelectedZip}
              selectedZip={selectedZip}
            />
          </div>
        </main>

        {/* Right panel */}
        <aside className="w-96 flex flex-col border-l border-gray-800 shrink-0">
          {/* ZIP details */}
          <div className="h-80 border-b border-gray-800 shrink-0">
            <ZipPanel zip={selectedZipData} />
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-800 shrink-0">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? "text-emerald-400 border-b-2 border-emerald-400"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === "ROI Calculator"  && <RoiCalculator />}
            {activeTab === "Citizen Reports" && <ReportsFeed />}
            {activeTab === "Publish Post"    && <PublishPost preselectedZip={selectedZip} />}
          </div>
        </aside>
      </div>
    </div>
  );
}
