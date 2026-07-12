import { NextResponse } from "next/server";
import { modelName, providerId } from "@/lib/ai/provider";

export async function GET() {
  return NextResponse.json({ provider: providerId, model: modelName, embeddingModel: "text-embedding-004" });
}
