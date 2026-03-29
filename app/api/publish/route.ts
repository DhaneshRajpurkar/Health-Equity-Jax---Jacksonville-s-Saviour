import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { PlannerProject } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body: PlannerProject = await req.json();

    if (!body.title || !body.zip) {
      return NextResponse.json(
        { error: "title and zip are required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const requestBody = body as any;

    const project: PlannerProject = {
      title:         body.title,
      zip:           body.zip,
      budget:        body.budget ?? 0,
      interventions: body.interventions ?? [],
      status:        "published",
      createdAt:     body.createdAt ?? now,
      publishedAt:   now,
    };

    const ref = await adminDb.collection("projects").add(project);

    // Notification — shape matches mobile app expectation
    await adminDb.collection("notifications").add({
      zip:       body.zip,
      title:     body.title,
      message:   requestBody.body ?? "",
      type:      "info",
      active:    true,
      createdAt: now,
    });

    // zip_insights card — shape matches mobile app's Community Insights section
    await adminDb.collection("zip_insights").add({
      zip:       body.zip,
      title:     body.title,
      body:      requestBody.body ?? "",
      source:    "City of Jacksonville",
      createdAt: now,
    });

    return NextResponse.json({ id: ref.id, ...project }, { status: 201 });
  } catch (err) {
    console.error("/api/publish error:", err);
    return NextResponse.json({ error: "Failed to publish project" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("projects")
      .where("status", "==", "published")
      .orderBy("publishedAt", "desc")
      .get();

    const projects = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(projects);
  } catch (err) {
    console.error("/api/publish GET error:", err);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}
