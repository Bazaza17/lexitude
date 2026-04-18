import { test, expect } from "@playwright/test";

// Smoke tests cover the marketing home page, the /new wizard navigation
// (including the back button that was previously broken), scenario deep
// links, and the /history page. No tests trigger an actual audit — the
// audit routes talk to Anthropic and Supabase and are out of scope for
// smoke tests.

test.describe("home", () => {
  test("shows hero and demo cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /start an audit/i }).first()).toBeVisible();
    // Scenario cards are inside a motion.div with opacity:0 initial — use
    // toBeAttached since we just care about DOM presence, not the animation.
    await expect(page.getByRole("link", { name: /FinovaBank demo/i })).toBeAttached();
    await expect(page.getByRole("link", { name: /NovoGen Health demo/i })).toBeAttached();
  });
});

test.describe("/new wizard", () => {
  test("step 1 renders company + framework with 5 framework options", async ({ page }) => {
    await page.goto("/new");
    await expect(page.getByText(/Company & framework/i)).toBeVisible();

    // All five frameworks must be present as clickable buttons.
    for (const name of ["SOC 2", "HIPAA", "GDPR", "ISO 27001", "PCI DSS"]) {
      await expect(page.getByRole("button", { name: new RegExp(name, "i") })).toBeVisible();
    }
  });

  test("next / back navigation preserves state", async ({ page }) => {
    await page.goto("/new");

    // Step 1 → 2
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(/Code source/i)).toBeVisible();

    // Step 2 → 3
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(/Polic/i).first()).toBeVisible();

    // Back to step 2
    await page.getByRole("button", { name: /back/i }).click();
    await expect(page.getByText(/Code source/i)).toBeVisible();

    // Back to step 1 — the bug fix under test
    await page.getByRole("button", { name: /back/i }).click();
    await expect(page.getByText(/Company & framework/i)).toBeVisible();
  });

  test("deep-linking ?scenario=finovabank prefills the form", async ({ page }) => {
    await page.goto("/new?scenario=finovabank");
    await expect(page.getByText(/Company & framework/i)).toBeVisible();

    // The company name input should be seeded with FinovaBank.
    const companyInput = page.locator("input[name=company]");
    await expect(companyInput).toHaveValue(/FinovaBank/i);

    // And the SOC 2 framework card should be aria-pressed.
    const soc2 = page.getByRole("button", { name: /SOC 2/i, pressed: true });
    await expect(soc2).toBeVisible();
  });

  test("deep-linking ?scenario=novogen seeds HIPAA", async ({ page }) => {
    await page.goto("/new?scenario=novogen");
    await expect(page.getByText(/Company & framework/i)).toBeVisible();

    const companyInput = page.locator("input[name=company]");
    await expect(companyInput).toHaveValue(/NovoGen/i);

    const hipaa = page.getByRole("button", { name: /HIPAA/i, pressed: true });
    await expect(hipaa).toBeVisible();
  });
});

test.describe("/history", () => {
  test("page loads without error", async ({ page }) => {
    await page.goto("/history");
    // Header shows the page title regardless of whether any runs exist.
    await expect(page.getByRole("heading", { name: /Every run, every artifact/i })).toBeVisible();
  });
});
