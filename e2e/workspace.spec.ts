import { test, expect, type Page } from "@playwright/test";

const SAMPLE_URL =
  "https://www.zillow.com/homedetails/1420-Maplewood-Dr-Austin-TX-78704/70982345_zpid/";

/** Sign in with dev auth, create a project, and wait for it to reach the workspace. */
async function createReadyProject(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /continue/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("link", { name: "New listing" }).click();
  await page.getByLabel(/zillow listing url/i).fill(SAMPLE_URL);
  await page.getByRole("button", { name: /import listing/i }).click();

  // Processing runs, then auto-redirects into the workspace overview.
  await expect(page).toHaveURL(/\/projects\/[^/]+$/, { timeout: 45_000 });
  await expect(page.getByText(/Austin/).first()).toBeVisible();
}

test("dashboard → open project → edit details → save → refresh persists", async ({ page }) => {
  await createReadyProject(page, `e2e_edit_${Date.now()}@example.com`);

  await page.getByRole("link", { name: /property details/i }).click();
  await expect(page).toHaveURL(/\/details$/);

  const price = page.getByLabel("Price (USD)");
  await expect(price).toHaveValue("875000");
  await price.fill("912345");
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(page.getByText(/all changes saved/i)).toBeVisible({ timeout: 10_000 });

  await page.reload();
  await expect(page.getByLabel("Price (USD)")).toHaveValue("912345");
});

test("sections: photos, room correction, settings, mobile nav", async ({ page }) => {
  await createReadyProject(page, `e2e_sections_${Date.now()}@example.com`);

  // Photos: open a photo and re-classify its room (persisted correction).
  await page.getByRole("link", { name: "Photos", exact: true }).click();
  await expect(page).toHaveURL(/\/photos$/);
  await page.getByRole("button", { name: /kitchen photo/i }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("combobox").click();
  await page.getByRole("option", { name: "Office" }).click();
  await expect(page.getByText(/reclassified as office/i)).toBeVisible({ timeout: 10_000 });
  await page.keyboard.press("Escape"); // close the modal photo dialog
  await expect(dialog).toBeHidden();

  // Rooms: grouped summary renders.
  await page.getByRole("link", { name: "Rooms", exact: true }).click();
  await expect(page).toHaveURL(/\/rooms$/);
  await expect(page.getByRole("heading", { name: /room groups/i })).toBeVisible();

  // Settings: metadata + explicit delete confirmation (then cancel).
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByText(/persistence:/i)).toBeVisible();
  await page.getByRole("button", { name: /delete project/i }).click();
  await expect(page.getByRole("dialog")).toContainText(/delete this project/i);
  await page.getByRole("button", { name: /cancel/i }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  // Mobile: no horizontal overflow and the sheet nav works.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: /open navigation/i }).click();
  await page.getByRole("link", { name: /property details/i }).click();
  await expect(page).toHaveURL(/\/details$/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  expect(overflow).toBe(true);
});
