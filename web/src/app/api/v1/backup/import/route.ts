import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { parseBackupJson, type BackupBundle } from "@/lib/backup-import";
import { importBackupTransaction } from "@/lib/backup-import-server";

const MAX_BACKUP_BYTES = 5_000_000;

const backupSchema = z.object({
  exported_at: z.string().optional(),
  notes: z.array(z.record(z.string(), z.unknown())),
  reminders_by_note: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
  tags: z.array(z.record(z.string(), z.unknown())).optional(),
  note_tags: z.array(z.record(z.string(), z.unknown())).optional(),
});

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const rateKey = `backup-import:${user!.userId}:${getClientIp(request)}`;
  if (!(await rateLimit(rateKey, { max: 5, windowMs: 60_000 }))) {
    return errorResponse("Too many import requests — try again in a minute", 429);
  }

  const rawText = await request.text();
  if (rawText.length > MAX_BACKUP_BYTES) {
    return errorResponse("Backup file too large", 413);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  try {
    backupSchema.parse(parsed);
  } catch {
    return errorResponse("Invalid backup format", 400);
  }

  let bundle: BackupBundle;
  try {
    bundle = parseBackupJson(rawText);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Invalid backup", 400);
  }

  try {
    const result = await importBackupTransaction(user!.userId, bundle);
    return jsonResponse(result);
  } catch (e) {
    return errorResponse(
      e instanceof Error ? e.message : "Import failed — no changes were saved",
      500,
    );
  }
}
