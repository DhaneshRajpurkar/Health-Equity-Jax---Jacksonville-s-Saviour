import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { CitizenReport } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const zip = req.nextUrl.searchParams.get("zip");
    let query: FirebaseFirestore.Query = adminDb.collection("reports")
      .orderBy("submittedAt", "desc")
      .limit(50);

    if (zip) query = query.where("zip", "==", zip);

    const snapshot = await query.get();
    const reports  = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(reports);
  } catch (err) {
    console.error("/api/reports GET error:", err);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: CitizenReport = await req.json();

    if (!body.zip || !body.category || !body.description) {
      return NextResponse.json({ error: "zip, category, and description are required" }, { status: 400 });
    }

    const report: CitizenReport = {
      zip:         body.zip,
      category:    body.category,
      description: body.description,
      submittedAt: new Date().toISOString(),
      status:      "pending",
      submittedBy: body.submittedBy ?? "anonymous",
    };

    const ref = await adminDb.collection("reports").add(report);
    return NextResponse.json({ id: ref.id, ...report }, { status: 201 });
  } catch (err) {
    console.error("/api/reports POST error:", err);
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }
}
