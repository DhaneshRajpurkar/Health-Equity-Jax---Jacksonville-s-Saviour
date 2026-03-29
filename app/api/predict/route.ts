import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const budget = req.nextUrl.searchParams.get("budget");

    // Fetch pre-computed ROI results from Firestore
    // Results are seeded by scripts/seed-roi.py and keyed by budget tier
    const snapshot = await adminDb
      .collection("roi_results")
      .orderBy("predictedGain", "desc")
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        { error: "No ROI data found. Run scripts/seed-roi.py first." },
        { status: 404 }
      );
    }

    let results = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Filter by budget tier client-side to avoid needing a composite Firestore index
    if (budget) {
      const b = parseFloat(budget);
      const filtered = results.filter((r: any) => r.budget === b);
      if (filtered.length > 0) {
        results = filtered.sort((a: any, b: any) => b.predictedGain - a.predictedGain);
      }
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error("/api/predict error:", err);
    return NextResponse.json({ error: "Failed to fetch predictions" }, { status: 500 });
  }
}
