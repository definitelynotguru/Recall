import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureRevisionIfChanged } from "./revisions";

type RevisionTx = Parameters<typeof captureRevisionIfChanged>[0];

function mockTransaction(revisionIds: string[]) {
  const values = vi.fn(() => Promise.resolve());
  const deleteWhere = vi.fn(() => Promise.resolve());
  const orderBy = vi.fn(() =>
    Promise.resolve(revisionIds.map((id) => ({ id }))),
  );
  const tx = {
    insert: vi.fn(() => ({ values })),
    delete: vi.fn(() => ({ where: deleteWhere })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ orderBy })),
      })),
    })),
  } as unknown as RevisionTx;
  return { deleteWhere, tx, values };
}

describe("captureRevisionIfChanged", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(
      new Date("2025-02-01T00:00:00.000Z").getTime(),
    );
  });

  it("does not capture unchanged content", async () => {
    const mocked = mockTransaction([]);

    await captureRevisionIfChanged(
      mocked.tx,
      "user-id",
      "note-id",
      { title: "Title", body: "Body" },
      "Title",
      "Body",
    );

    expect(mocked.values).not.toHaveBeenCalled();
    expect(mocked.deleteWhere).not.toHaveBeenCalled();
  });

  it("captures changed content and prunes expired and excess revisions", async () => {
    const mocked = mockTransaction(
      Array.from({ length: 12 }, (_, index) => `revision-${index}`),
    );

    await captureRevisionIfChanged(
      mocked.tx,
      "user-id",
      "note-id",
      { title: "Old title", body: "Old body" },
      "Old title",
      "New body",
      "sync",
    );

    expect(mocked.values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-id",
        noteId: "note-id",
        title: "Old title",
        body: "Old body",
        source: "sync",
      }),
    );
    expect(mocked.deleteWhere).toHaveBeenCalledTimes(2);
  });
});
