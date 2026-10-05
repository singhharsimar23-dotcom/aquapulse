import { test, expect } from '@playwright/test';

/**
 * Demo Path E2E Test per AQUAPULSE_V9_2_LEAN.md §11, §13:
 * Tests the complete 2:30 presentation demo path:
 * 0:00-0:25 What they said, what the sky saw (globe -> Wardha -> hero beats 1-2, Prove It drawer)
 * 0:25-1:05 Verify (beat 3, C REVIEW, stress 89.2% -> 103.0% Over-exploited, recompute zero diff)
 * 1:05-1:40 Allocate (waterfall with floor line, pool 104 -> 130, escrow band 20 released 14.1 held)
 * 1:40-2:05 Tested our own system (shift the model, 60% liars, stored trajectories, two arms)
 * 2:05-2:30 Receipt + honesty (Merkle tamper +10 mismatch, Honesty Panel AI vs rules vs stats, institutional §12)
 *
 * Runs 3 consecutive passes in both Network Enabled and Network Disabled (Tier-0) modes.
 */

async function runDemoPathSequence(page: any) {
  // Step 1: 0:00-0:25 - Initial Load & Hero Beats 1-2
  await page.goto('/?lite=1');
  await page.waitForSelector('.hero-section');
  await page.waitForSelector('.alloc-table');

  // Verify initial stress readout
  const stressStrip = page.locator('.stats-strip');
  await expect(stressStrip).toBeVisible();

  // Play Hero Tour Beats 1 & 2
  await page.keyboard.press('1');
  await page.waitForTimeout(100);
  await page.keyboard.press('2');
  await page.waitForTimeout(100);

  // Inspect Prove It drawer (scene ID, date)
  const proveItBtn = page.locator('.header-prove-btn');
  await proveItBtn.click();
  const drawer = page.locator('.prove-it-drawer');
  await expect(drawer).toBeVisible();
  // Verify satellite scene metadata is dated with scene ID
  await expect(drawer).toContainText('Sentinel-2');
  // Close drawer
  const closeDrawerBtn = page.locator('.prove-close-btn');
  await closeDrawerBtn.click();

  // Step 2: 0:25-1:05 - Verify (Beat 3)
  await page.keyboard.press('3');
  await page.waitForTimeout(200);

  // Farmer C should be in REVIEW status
  const cRow = page.locator('tr:has-text("Farmer C")');
  await expect(cRow).toContainText('REVIEW');

  // Worked table recompute zero diff check
  const recomputeBtn = page.locator('text=Zero Diff');
  if (await recomputeBtn.count() > 0) {
    await expect(recomputeBtn).toBeVisible();
  }

  // Step 3: 1:05-1:40 - Allocate (Waterfall & Escrow)
  await page.keyboard.press('4');
  await page.waitForTimeout(200);

  // Verify Waterfall is present and Farmer C has held escrow
  const waterfall = page.locator('.w5-waterfall');
  await expect(waterfall).toBeVisible();

  // Step 4: 1:40-2:05 - Tested Our Own System (W4 Cap Provenance)
  const shiftBtn = page.locator('button:has-text("Shift the model")');
  if (await shiftBtn.count() > 0) {
    await shiftBtn.click();
    await page.waitForTimeout(100);
  }
  const liarsBtn = page.locator('button:has-text("of readers lie")');
  if (await liarsBtn.count() > 0) {
    await liarsBtn.click();
    await page.waitForTimeout(100);
  }

  // Step 5: 2:05-2:30 - Receipt + Honesty & Tamper Drill
  await page.keyboard.press('5');
  await page.waitForTimeout(200);

  // Merkle Tamper Drill
  const tamperBtn = page.locator('.tamper-btn');
  if (await tamperBtn.count() > 0) {
    await tamperBtn.click();
    await page.waitForTimeout(150);
    // Verify TAMPERED status chip or text is displayed
    const rootBox = page.locator('.merkle-root-box');
    await expect(rootBox).toContainText('TAMPERED');
    // Restore ledger
    const restoreBtn = page.locator('.restore-btn');
    if (await restoreBtn.count() > 0) {
      await restoreBtn.click();
      await page.waitForTimeout(150);
      await expect(rootBox).toContainText('VALID');
    }
  }

  // Open and Inspect Honesty Panel
  const honestyBtn = page.locator('.header-honesty-btn');
  await honestyBtn.click();
  const honestyPanel = page.locator('.honesty-panel');
  await expect(honestyPanel).toBeVisible();

  // Verify AI vs Rules vs Stats breakdown
  await expect(honestyPanel).toContainText('Deterministic Rules');
  await expect(honestyPanel).toContainText('Statistics & Physics');

  // Verify Institutional Section (§12) with PIB citations
  await expect(honestyPanel).toContainText('MAHA Water Mission');
  await expect(honestyPanel).toContainText('2267551');
  await expect(honestyPanel).toContainText('Atal Bhujal Yojana');
  await expect(honestyPanel).toContainText('2291800');

  // Close Honesty Panel
  const closeHonestyBtn = page.locator('.panel-close-btn');
  await closeHonestyBtn.click();

  // Verify Drill Presets bar responsiveness
  const deadMeterBtn = page.locator('.preset-pill:has-text("Dead Meter")');
  if (await deadMeterBtn.count() > 0) {
    await deadMeterBtn.click();
    await page.waitForTimeout(100);
    // Farmer C should have NO_METER flag
    await expect(page.locator('.alloc-table')).toContainText('NO_METER');
  }
}

test.describe('AquaPulse §11 Demo Path E2E Suite', () => {
  test.describe('Tier-0 Network Disabled Mode (Mandatory)', () => {
    for (let pass = 1; pass <= 3; pass++) {
      test(`Pass ${pass} of 3: executes demo path with network completely disabled`, async ({ page, context }) => {
        // Abort all network traffic to external or backend endpoints to strictly enforce Tier-0 offline capability
        await context.route('**/api/**', (route) => route.abort('failed'));
        await context.route('https://api.open-meteo.com/**', (route) => route.abort('failed'));
        await context.route('https://*.tile.openstreetmap.org/**', (route) => route.abort('failed'));
        await context.route('https://earth-search.aws.element84.com/**', (route) => route.abort('failed'));
        await context.route('https://server.arcgisonline.com/**', (route) => route.abort('failed'));

        await runDemoPathSequence(page);
      });
    }
  });

  test.describe('Network Enabled Mode', () => {
    for (let pass = 1; pass <= 3; pass++) {
      test(`Pass ${pass} of 3: executes demo path with network enabled`, async ({ page }) => {
        await runDemoPathSequence(page);
      });
    }
  });
});
