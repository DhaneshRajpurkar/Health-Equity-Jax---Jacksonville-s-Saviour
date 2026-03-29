import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// Intervention cost table — mirrors model/roi.py
const INTERVENTIONS: Record<string, { label: string; costPerUnit: number; direction: number; ideal: number }> = {
  pct_uninsured:   { label: "Expand healthcare coverage",     costPerUnit: 85_000,  direction: -1, ideal: 5.0  },
  pct_inactive:    { label: "Physical activity programs",     costPerUnit: 40_000,  direction: -1, ideal: 15.0 },
  pct_obesity:     { label: "Obesity reduction programs",     costPerUnit: 60_000,  direction: -1, ideal: 20.0 },
  pct_smoking:     { label: "Smoking cessation programs",     costPerUnit: 50_000,  direction: -1, ideal: 8.0  },
  food_desert_pop: { label: "Reduce food desert population",  costPerUnit: 500,     direction: -1, ideal: 0    },
  pct_park_area:   { label: "Increase park coverage",         costPerUnit: 200_000, direction:  1, ideal: 15.0 },
};

// Model coefficients (raw, unstandardized) — kept in sync with model.pkl
// These are updated when train.py is re-run via seed-roi.py
const RAW_COEF: Record<string, number> = {
  pct_uninsured:   -0.052,
  median_income:    0.000012,
  pct_smoking:     -0.061,
  pct_obesity:     -0.044,
  pct_inactive:    -0.042,
  svi_score:       -0.48,
  food_desert_pop: -0.000015,
  pct_park_area:    0.031,
};

interface SimulateBody {
  zip: string;
  budget: number;
  allocation: Record<string, number>; // { pct_uninsured: 200000, pct_inactive: 300000, ... }
}

export async function POST(req: NextRequest) {
  try {
    const body: SimulateBody = await req.json();

    if (!body.zip || !body.budget || !body.allocation) {
      return NextResponse.json(
        { error: "zip, budget, and allocation are required" },
        { status: 400 }
      );
    }

    // Fetch current ZIP baseline from Firestore
    const zipDoc = await adminDb.collection("zip_insights").doc(body.zip).get();
    if (!zipDoc.exists) {
      return NextResponse.json({ error: `ZIP ${body.zip} not found` }, { status: 404 });
    }

    const baseline = zipDoc.data() as Record<string, number>;
    const currentLE = baseline.lifeExpectancy ?? 0;

    let totalGain   = 0;
    const breakdown: Record<string, { dollarsAllocated: number; unitsChanged: number; yearsGained: number }> = {};

    for (const [feat, dollars] of Object.entries(body.allocation)) {
      const interv = INTERVENTIONS[feat];
      if (!interv) continue;

      const currentVal = baseline[feat] ?? 0;
      const headroom   = interv.direction === -1
        ? Math.max(0, currentVal - interv.ideal)
        : Math.max(0, interv.ideal - currentVal);

      const unitsPurchasable = dollars / interv.costPerUnit;
      const unitsApplied     = Math.min(unitsPurchasable, headroom);
      const coef             = RAW_COEF[feat] ?? 0;
      const gain             = coef * unitsApplied * interv.direction;

      totalGain += gain;
      breakdown[interv.label] = {
        dollarsAllocated: dollars,
        unitsChanged:     Math.round(unitsApplied * 100) / 100,
        yearsGained:      Math.round(gain * 10000) / 10000,
      };
    }

    return NextResponse.json({
      zip:                      body.zip,
      budget:                   body.budget,
      currentLifeExpectancy:    Math.round(currentLE * 100) / 100,
      predictedGain:            Math.round(totalGain * 10000) / 10000,
      projectedLifeExpectancy:  Math.round((currentLE + totalGain) * 100) / 100,
      breakdown,
    });
  } catch (err) {
    console.error("/api/simulate error:", err);
    return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
  }
}
