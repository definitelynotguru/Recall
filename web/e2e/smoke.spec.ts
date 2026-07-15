import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_EMAIL ?? "";
const password = process.env.E2E_PASSWORD ?? "";
const registerSecret = process.env.E2E_REGISTER_SECRET;

async function authenticate(page: Page) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Open Recall" }).click();

  const outcome = await Promise.race([
    page.waitForURL("**/today").then(() => "authenticated" as const),
    page.getByRole("alert").waitFor().then(() => "failed" as const),
  ]);

  if (outcome === "failed" && registerSecret) {
    await page
      .getByRole("button", { name: "Need an account? Register" })
      .click();
    await page.getByLabel("Registration secret").fill(registerSecret);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/today");
  } else if (outcome === "failed") {
    throw new Error(
      "Login failed. Provide an existing account or set E2E_REGISTER_SECRET.",
    );
  }

  const onboarding = page.getByRole("dialog", { name: "Welcome to Recall" });
  if (await onboarding.isVisible()) {
    await onboarding.getByRole("button", { name: "Skip" }).click();
  }
}

test.describe("authenticated smoke tests", () => {
  test.skip(
    !email || !password,
    "Set E2E_EMAIL and E2E_PASSWORD; optionally set E2E_REGISTER_SECRET to create the account.",
  );

  test("logs in or registers a smoke-test user", async ({ page }) => {
    await authenticate(page);
    await expect(page).toHaveURL(/\/today$/);
    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  });

  test("saves a note and persists it after reload", async ({ page }) => {
    await authenticate(page);
    await page.goto("/notes");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "New note" }).click();
    await page.waitForURL(/\/notes\/[0-9a-f-]+$/);

    const title = `E2E smoke ${Date.now()}`;
    const body = "Saved by the Recall Playwright smoke suite.";
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Body — Markdown").fill(body);
    await expect(page.getByRole("status")).toContainText("Saved");

    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByLabel("Title")).toHaveValue(title);
    await expect(page.getByLabel("Body — Markdown")).toHaveValue(body);
  });

  test("loads a healthy sync status shape", async ({ page }) => {
    await authenticate(page);
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/v1/sync/status") &&
        response.request().method() === "GET",
    );
    await page.goto("/settings");
    const response = await responsePromise;
    expect(response.ok()).toBe(true);

    const body: unknown = await response.json();
    expect(body).toEqual({
      server_time: expect.any(String),
      devices: expect.any(Array),
    });
    if (
      !body ||
      typeof body !== "object" ||
      !("server_time" in body) ||
      typeof body.server_time !== "string"
    ) {
      throw new Error("Sync status response has no server_time");
    }
    expect(Number.isNaN(Date.parse(body.server_time))).toBe(false);
    await expect(page.getByRole("heading", { name: "Sync status" })).toBeVisible();
  });

  test("preserves note filters and calendar month in the URL", async ({
    page,
  }) => {
    await authenticate(page);
    await page.goto("/notes?status=archived&q=smoke");
    await expect(page.getByRole("button", { name: "Archived" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByLabel("Search")).toHaveValue("smoke");
    await page.getByRole("button", { name: "Active" }).click();
    await expect(page).not.toHaveURL(/status=/);

    await page.goto("/calendar?month=2026-02");
    await expect(
      page.getByRole("heading", { name: "February 2026" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Next month" }).click();
    await expect(page).toHaveURL(/month=2026-03/);
  });
});
