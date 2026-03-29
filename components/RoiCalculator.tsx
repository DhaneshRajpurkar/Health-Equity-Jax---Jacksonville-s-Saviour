"use client";

import { useState } from "react";
import type { RoiResult } from "@/types";

const BUDGET_PRESETS = [250_000, 500_000, 1_000_000, 5_000_000];

export default function RoiCalculator() {
  const [budget, setBudget]   = useState(1_000_000);
  const [results, setResults] = useState<RoiResult[]>([]);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/predict?budget=${budget}`);
      const data = await res.json();
      if (!Array.isArray(data)) {
        console.error("API error:", data);
        return;
      }
      setResults(data.slice(0, 10));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Budget selector */}
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-widest">Investment Budget</label>
        <div className="mt-2 flex gap-2 flex-wrap">
          {BUDGET_PRESETS.map((b) => (
            <button
              key={b}
              onClick={() => setBudget(b)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                budget === b
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              ${b.toLocaleString()}
            </button>
          ))}
        </div>
        <input
          type="range"
          min={100_000}
          max={10_000_000}
          step={100_000}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          className="w-full mt-3 accent-emerald-500"
        />
        <p className="text-emerald-400 font-bold text-lg mt-1">${budget.toLocaleString()}</p>
      </div>

      <button
        onClick={run}
        disabled={loading}
        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold transition-colors"
      >
        {loading ? "Calculating…" : "Calculate ROI"}
      </button>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2 mt-2">
          <p className="text-xs text-gray-400 uppercase tracking-widest">Top ZIP Codes by Impact</p>
          {results.map((r, i) => (
            <div key={r.zip} className="bg-gray-800 rounded-lg p-3 flex items-center gap-3">
              <span className="text-gray-500 text-sm w-5 text-right">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{r.zip}</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    +{r.predictedGain.toFixed(3)} yrs
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-gray-400 truncate">{r.topIntervention}</span>
                  <span className="text-xs text-gray-500">
                    {r.currentLifeExpectancy.toFixed(1)} → {r.projectedLifeExpectancy.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
