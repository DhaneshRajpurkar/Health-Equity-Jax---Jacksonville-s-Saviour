"use client";

import { useState } from "react";

const CATEGORIES = [
  { value: "health",        label: "Health Initiative" },
  { value: "infrastructure",label: "Infrastructure"    },
  { value: "environment",   label: "Environment"       },
  { value: "food",          label: "Food Access"       },
  { value: "safety",        label: "Public Safety"     },
  { value: "general",       label: "General Update"    },
];

const NOTIFICATION_TYPES: { value: "alert" | "info" | "update"; label: string; color: string }[] = [
  { value: "alert",  label: "Alert",  color: "bg-red-500"  },
  { value: "info",   label: "Info",   color: "bg-blue-500" },
  { value: "update", label: "Update", color: "bg-green-500"},
];

const JAX_ZIPS = [
  "32202","32204","32205","32206","32207","32208","32209","32210","32211",
  "32212","32214","32216","32217","32218","32219","32220","32221","32222",
  "32223","32224","32225","32226","32227","32228","32233","32234","32244",
  "32246","32250","32254","32256","32257","32258","32259","32266","32277",
];

type Status = "idle" | "sending" | "success" | "error";

export default function PublishPost({ preselectedZip }: { preselectedZip?: string | null }) {
  const [zip,      setZip]      = useState(preselectedZip ?? "");
  const [category, setCategory] = useState("general");
  const [notifType, setNotifType] = useState<"alert"|"info"|"update">("info");
  const [title,    setTitle]    = useState("");
  const [body,     setBody]     = useState("");
  const [status,   setStatus]   = useState<Status>("idle");

  const send = async () => {
    if (!zip || !title.trim() || !body.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/publish", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zip,
          title:         title.trim(),
          body:          body.trim(),
          category,
          type:          notifType,
          interventions: [category],
          budget:        0,
          createdAt:     new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error("Failed");
      setStatus("success");
      setTitle("");
      setBody("");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const charLimit = 500;
  const remaining = charLimit - body.length;

  return (
    <div className="space-y-4">
      {/* ZIP selector */}
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-widest">Target ZIP Code</label>
        <select
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          className="mt-1.5 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="">Select a ZIP code…</option>
          {JAX_ZIPS.map((z) => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>
      </div>

      {/* Category */}
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-widest">Category</label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {CATEGORIES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setCategory(value)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                category === value
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Notification type */}
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-widest">Notification Type</label>
        <div className="mt-1.5 flex gap-2">
          {NOTIFICATION_TYPES.map(({ value, label, color }) => (
            <button
              key={value}
              onClick={() => setNotifType(value)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                notifType === value
                  ? `${color} text-white`
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-widest">Post Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. New Health Clinic Opening in Your Area"
          maxLength={100}
          className="mt-1.5 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Body */}
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-widest">Message</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, charLimit))}
          placeholder="Write your message to residents…"
          rows={5}
          className="mt-1.5 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 resize-none"
        />
        <p className={`text-xs mt-1 text-right ${remaining < 50 ? "text-yellow-400" : "text-gray-600"}`}>
          {remaining} chars remaining
        </p>
      </div>

      {/* Send button */}
      <button
        onClick={send}
        disabled={!zip || !title.trim() || !body.trim() || status === "sending"}
        className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${
          status === "success" ? "bg-emerald-700 text-white" :
          status === "error"   ? "bg-red-700 text-white" :
          "bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white"
        }`}
      >
        {status === "sending" ? "Sending…" :
         status === "success" ? "Post sent to residents!" :
         status === "error"   ? "Failed — try again" :
         "Publish to Residents"}
      </button>

      {zip && (
        <p className="text-xs text-gray-500 text-center">
          This post will be delivered to all residents in ZIP {zip} via the mobile app.
        </p>
      )}
    </div>
  );
}
