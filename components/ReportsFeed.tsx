"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import type { CitizenReport } from "@/types";

const CATEGORY_COLORS: Record<string, string> = {
  food:        "bg-yellow-500/20 text-yellow-400",
  safety:      "bg-red-500/20 text-red-400",
  healthcare:  "bg-blue-500/20 text-blue-400",
  environment: "bg-green-500/20 text-green-400",
  housing:     "bg-purple-500/20 text-purple-400",
  other:       "bg-gray-500/20 text-gray-400",
};

export default function ReportsFeed() {
  const [reports, setReports] = useState<CitizenReport[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "reports"),
      orderBy("submittedAt", "desc"),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CitizenReport)));
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-3 overflow-y-auto h-full pr-1">
      {reports.length === 0 && (
        <p className="text-gray-500 text-sm text-center mt-8">No citizen reports yet.</p>
      )}
      {reports.map((r) => (
        <div key={r.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[r.category]}`}>
                {r.category}
              </span>
              <span className="text-xs text-gray-400 font-mono">{r.zip}</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              r.status === "actioned" ? "bg-emerald-500/20 text-emerald-400" :
              r.status === "reviewed" ? "bg-blue-500/20 text-blue-400" :
              "bg-gray-600/50 text-gray-400"
            }`}>
              {r.status}
            </span>
          </div>
          <p className="text-sm text-gray-200 leading-snug">{r.description}</p>
          <p className="text-xs text-gray-500 mt-1.5">
            {new Date(r.submittedAt).toLocaleDateString("en-US", {
              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
      ))}
    </div>
  );
}
