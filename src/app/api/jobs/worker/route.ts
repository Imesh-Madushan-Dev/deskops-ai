import { NextResponse } from "next/server";
import { enqueueDailyInsightJobs, runJobWorker } from "@/lib/jobs/worker";

/** Triggered by Vercel Cron (see vercel.json) — verifies the shared secret Vercel sends before doing anything. */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await enqueueDailyInsightJobs();
  const results = await runJobWorker();
  return NextResponse.json(results);
}
