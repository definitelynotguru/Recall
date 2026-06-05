import { NextRequest } from "next/server";
import { verifyAccessToken } from "./auth";

export function jsonResponse(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function getAuthUser(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  try {
    return await verifyAccessToken(header.slice(7));
  } catch {
    return null;
  }
}

export async function requireAuth(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return { user: null, response: errorResponse("Unauthorized", 401) };
  }
  return { user, response: null };
}

export function parseIsoDate(value: string): Date | null {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toApiNote(row: {
  id: string;
  userId: string;
  title: string;
  body: string;
  status: string;
  pinnedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}) {
  return {
    id: row.id,
    user_id: row.userId,
    title: row.title,
    body: row.body,
    status: row.status,
    pinned_at: row.pinnedAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    deleted_at: row.deletedAt?.toISOString() ?? null,
  };
}

export function toApiReminder(row: {
  id: string;
  userId: string;
  noteId: string;
  fireAt: Date;
  timezone: string;
  repeatRule: string | null;
  intensity: string;
  status: string;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  noteTitle?: string | null;
}) {
  return {
    id: row.id,
    user_id: row.userId,
    note_id: row.noteId,
    fire_at: row.fireAt.toISOString(),
    timezone: row.timezone,
    repeat_rule: row.repeatRule,
    intensity: row.intensity,
    status: row.status,
    completed_at: row.completedAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    deleted_at: row.deletedAt?.toISOString() ?? null,
    note_title: row.noteTitle ?? undefined,
  };
}

export function toApiTag(row: {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}) {
  return {
    id: row.id,
    user_id: row.userId,
    name: row.name,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    deleted_at: row.deletedAt?.toISOString() ?? null,
  };
}

export function toApiNoteTag(row: {
  id: string;
  userId: string;
  noteId: string;
  tagId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}) {
  return {
    id: row.id,
    user_id: row.userId,
    note_id: row.noteId,
    tag_id: row.tagId,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    deleted_at: row.deletedAt?.toISOString() ?? null,
  };
}

export const REFRESH_COOKIE = "refresh_token";

export function setRefreshCookie(token: string) {
  const maxAge = 90 * 24 * 60 * 60;
  const secure = process.env.NODE_ENV === "production";
  return `${REFRESH_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

export function clearRefreshCookie() {
  return `${REFRESH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function getRefreshFromRequest(request: NextRequest): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`${REFRESH_COOKIE}=([^;]+)`));
  return match?.[1] ?? null;
}
