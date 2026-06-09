import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { notes, users } from "./db/schema";
import { hashPassword } from "./auth";
import { processSync } from "./sync";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("processSync ownership", () => {
  const victimUserId = "11111111-1111-4111-8111-111111111111";
  const attackerUserId = "22222222-2222-4222-8222-222222222222";
  const victimNoteId = "33333333-3333-4333-8333-333333333333";
  const attackerNoteId = "44444444-4444-4444-8444-444444444444";

  beforeAll(async () => {
    const db = getDb();
    const passwordHash = await hashPassword("twelvecharpass");
    await db
      .insert(users)
      .values([
        {
          id: victimUserId,
          email: "sync-victim@example.com",
          passwordHash,
        },
        {
          id: attackerUserId,
          email: "sync-attacker@example.com",
          passwordHash,
        },
      ])
      .onConflictDoNothing();

    const victimCreated = new Date("2026-01-01T00:00:00.000Z");
    await db
      .insert(notes)
      .values({
        id: victimNoteId,
        userId: victimUserId,
        title: "Victim secret",
        body: "Do not overwrite",
        status: "active",
        createdAt: victimCreated,
        updatedAt: victimCreated,
      })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(notes).where(eq(notes.userId, victimUserId));
    await db.delete(notes).where(eq(notes.userId, attackerUserId));
    await db.delete(users).where(eq(users.id, victimUserId));
    await db.delete(users).where(eq(users.id, attackerUserId));
  });

  it("does not overwrite another user's note", async () => {
    await processSync(attackerUserId, [], []);
    await processSync(attackerUserId, [], []);

    const attackTime = new Date("2026-06-01T00:00:00.000Z");
    await processSync(attackerUserId, [
      {
        id: victimNoteId,
        title: "Hijacked",
        body: "Attacker wins",
        status: "active",
        pinned_at: null,
        created_at: attackTime.toISOString(),
        updated_at: attackTime.toISOString(),
        deleted_at: null,
      },
    ], []);

    const db = getDb();
    const [victimNote] = await db
      .select()
      .from(notes)
      .where(eq(notes.id, victimNoteId))
      .limit(1);

    expect(victimNote?.userId).toBe(victimUserId);
    expect(victimNote?.title).toBe("Victim secret");
    expect(victimNote?.body).toBe("Do not overwrite");
  });

  it("does not attach reminders to another user's note", async () => {
    const reminderId = "55555555-5555-4555-8555-555555555555";
    const fireAt = new Date("2026-06-02T12:00:00.000Z");
    const updatedAt = new Date("2026-06-02T00:00:00.000Z");

    const result = await processSync(
      attackerUserId,
      [],
      [
        {
          id: reminderId,
          note_id: victimNoteId,
          fire_at: fireAt.toISOString(),
          timezone: "UTC",
          repeat_rule: null,
          intensity: "gentle",
          status: "active",
          completed_at: null,
          created_at: updatedAt.toISOString(),
          updated_at: updatedAt.toISOString(),
          deleted_at: null,
        },
      ],
    );

    expect(result.reminders).toHaveLength(0);
  });

  it("merges the attacker's own note", async () => {
    const created = new Date("2026-01-02T00:00:00.000Z");
    const updated = new Date("2026-06-03T00:00:00.000Z");

    const result = await processSync(
      attackerUserId,
      [
        {
          id: attackerNoteId,
          title: "Mine",
          body: "Updated body",
          status: "active",
          pinned_at: null,
          created_at: created.toISOString(),
          updated_at: updated.toISOString(),
          deleted_at: null,
        },
      ],
      [],
    );

    const merged = result.notes.find((n) => n.id === attackerNoteId);
    expect(merged?.userId).toBe(attackerUserId);
    expect(merged?.body).toBe("Updated body");
  });
});
