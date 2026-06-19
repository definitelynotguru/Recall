import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return jsonResponse({ status: "ok", db: "connected" });
  } catch {
    return errorResponse("Database unavailable", 503);
  }
}
