import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { jsonResponse } from "@/lib/api-utils";
import { validateAuthSecrets } from "@/lib/auth";

export async function GET() {
  let dbConnected = false;
  try {
    await db.execute(sql`SELECT 1`);
    dbConnected = true;
  } catch {
    dbConnected = false;
  }

  const auth = validateAuthSecrets();
  const authStatus = auth.ok ? "configured" : "not_configured";

  if (!dbConnected) {
    return Response.json(
      { status: "degraded", db: "unavailable", auth: authStatus },
      { status: 503 },
    );
  }

  if (!auth.ok) {
    return Response.json(
      { status: "degraded", db: "connected", auth: "not_configured" },
      { status: 503 },
    );
  }

  return jsonResponse({ status: "ok", db: "connected", auth: "configured" });
}
