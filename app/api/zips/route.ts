import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const snapshot = await adminDb.collection("zip_insights").get();

    if (snapshot.empty) {
      return NextResponse.json(
        { error: "No ZIP data found. Run the seed script first." },
        { status: 404 }
      );
    }

    const zips = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(zips);
  } catch (err) {
    console.error("/api/zips error:", err);
    return NextResponse.json({ error: "Failed to fetch ZIP data" }, { status: 500 });
  }
}
