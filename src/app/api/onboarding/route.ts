import { z } from "zod";
import { ensureOwnerBusiness } from "@/lib/db/onboarding";

const requestSchema = z.object({
  businessName: z.string().trim().min(1).max(120),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Please provide a valid business name." }, { status: 400 });
  }

  try {
    const business = await ensureOwnerBusiness(parsed.data);
    return Response.json({ business });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to set up your workspace.";
    const status = message.startsWith("You must be signed in") ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
