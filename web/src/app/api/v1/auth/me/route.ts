import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-utils";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const [row] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, user!.userId))
    .limit(1);

  if (!row) return errorResponse("User not found", 404);

  return jsonResponse({ user: row });
}
