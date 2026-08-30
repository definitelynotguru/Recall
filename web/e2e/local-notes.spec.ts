import { expect, test, type Page } from "@playwright/test";

async function createLocalNote(page: Page, title: string) {
  const firstNote = page.getByRole("button", { name: "Write first note" });
  if (await firstNote.count()) {
    await firstNote.click();
  } else {
    await page.getByRole("button", { name: "New note" }).click();
  }
  await page.waitForURL(/\/notes\/[0-9a-f-]+$/);
  await page.getByLabel("Title").fill(title);
  await expect(page.getByRole("status")).toContainText("Saved");
  await page.goto("/notes");
}

test.describe("local notes", () => {
  test("persists archive and pin state", async ({ page }) => {
    await page.goto("/notes");
    await createLocalNote(page, "Alpha");
    await createLocalNote(page, "Beta");

    let alpha = page.locator(".note-row", {
      has: page.getByRole("heading", { name: "Alpha" }),
    });
    await alpha.getByRole("button", { name: "Pin note" }).click();
    await expect(alpha.getByText("Pinned")).toBeVisible();
    await expect(page.locator(".note-row h3").first()).toContainText("Alpha");

    await alpha.getByRole("button", { name: "Archive note" }).click();
    await page.getByRole("button", { name: "Archived" }).click();
    await expect(page.getByRole("heading", { name: "Alpha" })).toBeVisible();
    await page.reload();

    alpha = page.locator(".note-row", {
      has: page.getByRole("heading", { name: "Alpha" }),
    });
    await expect(
      alpha.getByRole("button", { name: "Unarchive note" }),
    ).toBeVisible();
    await alpha.getByRole("button", { name: "Unarchive note" }).click();
    await expect(page.getByText("No archived notes.")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Write first note" }),
    ).toHaveCount(0);
  });

  test("supports anonymous aliases without refreshing a session", async ({
    page,
  }) => {
    const refreshes: number[] = [];
    page.on("response", (response) => {
      if (response.url().endsWith("/api/v1/auth/refresh")) {
        refreshes.push(response.status());
      }
    });

    await page.goto("/notes/daily");
    await page.waitForURL(/\/notes\/[0-9a-f-]+$/);
    await expect(page.getByLabel("Title")).toHaveValue(
      `Daily — ${new Date().toLocaleDateString("en-CA")}`,
    );

    await page.goto("/notes/new");
    await page.waitForURL(/\/notes\/[0-9a-f-]+$/);
    await page.goto("/login?mode=register");
    await expect(
      page.getByRole("heading", { name: "Create your vault" }),
    ).toBeVisible();
    expect(refreshes.length).toBeGreaterThan(0);
    expect(refreshes.every((status) => status === 204)).toBe(true);
  });
});
