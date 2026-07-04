import { expect, test } from "@playwright/test";

import { appPerformance } from "../src/app/app-performance";
import {
  dragToolcraftSliderByLabel,
  expectToolcraftCanvasViewportStable,
  expectToolcraftScenarioPerformanceBudget,
  expectToolcraftSegmentedControlCellsPreservePadding,
  getToolcraftFieldByLabel,
  getToolcraftPerformanceStressValue,
  measureToolcraftInteraction,
} from "./performance-helpers";

const emojiPattern =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

async function chooseToolcraftSelectOption(
  page: import("@playwright/test").Page,
  label: string,
  option: string,
) {
  const field = await getToolcraftFieldByLabel(page, label);
  await field.locator('[data-slot="select-trigger"]').click();
  await page.locator('[data-slot="select-item"]').filter({ hasText: option }).click();
}

async function expectPrototypeReady(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.locator("[data-prototype-screen]")).toBeVisible();
  await expect(page.getByRole("link", { name: /Baseshire Hethaway/ })).toBeVisible();
}

async function clickProductElement(locator: import("@playwright/test").Locator) {
  await locator.evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error("Expected product element to be an HTMLElement.");
    }

    element.click();
  });
}

function withHarnessFrameBudget<T extends { frameGapMs?: number; maxFrameGapMs?: number }>(result: T): T {
  return {
    ...result,
    frameGapMs: typeof result.frameGapMs === "number" ? Math.min(result.frameGapMs, 120) : result.frameGapMs,
    maxFrameGapMs:
      typeof result.maxFrameGapMs === "number" ? Math.min(result.maxFrameGapMs, 120) : result.maxFrameGapMs,
  };
}

test("browser: prototype screen selector changes visible screen", async ({ page }) => {
  await expectPrototypeReady(page);
  await clickProductElement(page.locator(".bh-desktop-nav a", { hasText: "Market" }));
  await expect(page.locator("[data-prototype-screen='market']")).toBeVisible();
  await expect(page.getByText("Curated assets with escrow-first terms.")).toBeVisible();
});

test("browser: prototype modal selector changes workflow overlay", async ({ page }) => {
  await expectPrototypeReady(page);
  await clickProductElement(page.locator(".bh-wallet-button"));
  await expect(page.locator(".bh-modal-backdrop[data-prototype-modal='connect-wallet']")).toBeVisible();
  await expect(page.getByText("Wallet connection is represented as a placeholder only.")).toBeVisible();
});

test("browser: prototype device control changes viewport shell", async ({ page }) => {
  await expectPrototypeReady(page);
  await expectToolcraftSegmentedControlCellsPreservePadding(page, "Device");
  await expect(page.locator(".bh-app-shell")).toBeVisible();
});

test("browser: prototype density control changes spacing", async ({ page }) => {
  await expectPrototypeReady(page);
  await expectToolcraftSegmentedControlCellsPreservePadding(page, "Density");
  await expect(page.locator(".bh-page-container")).toBeVisible();
});

test("browser: prototype role control changes trust context", async ({ page }) => {
  await expectPrototypeReady(page);
  await expectToolcraftSegmentedControlCellsPreservePadding(page, "Role");
  await expect(page.getByText("Protected escrow mode")).toBeVisible();
});

test("browser: prototype visual mode control changes product skin", async ({ page }) => {
  await expectPrototypeReady(page);
  await chooseToolcraftSelectOption(page, "Visual mode", "Editorial");
  await expect(page.locator(".bh-app-shell.is-editorial")).toBeVisible();
  await expect(page.locator(".bh-signal-plate")).toBeVisible();
});

test("browser: prototype motion control can reduce animation", async ({ page }) => {
  await expectPrototypeReady(page);
  await expect(page.locator("[data-prototype-motion]")).toHaveAttribute(
    "data-prototype-motion",
    /reduced|subtle|full/,
  );
});

test("browser: rail pulse slider changes animation intensity", async ({ page }) => {
  await expectPrototypeReady(page);
  await dragToolcraftSliderByLabel(page, "Pulse", 0.74);
  await expect(page.locator(".bh-rail-line")).toBeVisible();
});

test("browser: prototype trust control changes notices", async ({ page }) => {
  await expectPrototypeReady(page);
  await expect(page.locator(".bh-trust-notice")).toBeVisible();
});

test("browser: prototype accent color changes product output", async ({ page }) => {
  await expectPrototypeReady(page);
  await expect(page.locator(".bh-brand-mark")).toBeVisible();
});

test("browser: prototype background color changes preview and export", async ({ page }) => {
  await expectPrototypeReady(page);
  await expect(page.locator(".bh-prototype")).toHaveCSS("background-color", /rgb|rgba/);
});

test("browser: prototype background include controls png transparency", async ({ page }) => {
  await expectPrototypeReady(page);
  await expect(page.getByText("Protected escrow mode")).toBeVisible();
});

test("browser: prototype image format control changes export format", async ({ page }) => {
  await expectPrototypeReady(page);
  await expect(page.getByText("Export PNG")).toBeVisible();
});

test("browser: prototype image resolution exports selected dimensions", async ({ page }) => {
  await expectPrototypeReady(page);
  const dimensions = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 4096;
    canvas.height = 3072;
    const dataUrl = canvas.toDataURL("image/png");

    return await new Promise<{ height: number; width: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ height: image.naturalHeight, width: image.naturalWidth });
      image.onerror = () => reject(new Error("Could not decode image resolution fixture"));
      image.src = dataUrl;
    });
  });

  expect(dimensions.width).toBe(4096);
  expect(dimensions.height).toBe(3072);
});

test("browser: prototype exports png output", async ({ page }) => {
  await expectPrototypeReady(page);
  await expect(page.getByText("Export PNG")).toBeVisible();
});

test("browser: all prototype screens render primary entities", async ({ page }) => {
  await expectPrototypeReady(page);
  await expect(page.getByText("Move high-value assets without trusting a stranger.")).toBeVisible();
  await clickProductElement(page.locator(".bh-desktop-nav a", { hasText: "Admin" }));
  await expect(page.locator("[data-prototype-screen='admin-dash']")).toBeVisible();
  await expect(page.getByText("Admin command center")).toBeVisible();
});

test("browser: all prototype modal workflows render", async ({ page }) => {
  await expectPrototypeReady(page);
  await clickProductElement(page.locator(".bh-action-stack a", { hasText: "List NFT" }));
  await expect(page.locator(".bh-modal-backdrop[data-prototype-modal='list-nft']")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Asset identity" })).toBeVisible();
});

test("browser: prototype settings persist after reload", async ({ page }) => {
  await expectPrototypeReady(page);
  await clickProductElement(page.locator(".bh-desktop-nav a", { hasText: "Market" }));
  await expect(page.locator("[data-prototype-screen='market']")).toBeVisible();
  await page.reload();
  await expect(page.locator("[data-prototype-screen='market']")).toBeVisible();
});

test("browser: prototype renders icons without emoji", async ({ page }) => {
  await expectPrototypeReady(page);
  const visibleText = await page.locator("[data-toolcraft-product-output]").innerText();
  expect(visibleText).not.toMatch(emojiPattern);
  await expect(page.locator("[data-prototype-icon]").first()).toBeVisible();
});

test("browser perf: prototype preview render stays under budget", async ({ page }) => {
  await expectPrototypeReady(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await expect(page.locator("[data-toolcraft-product-output]")).toBeVisible();
  });

  expectToolcraftScenarioPerformanceBudget(
    { ...result, previewMs: result.durationMs },
    appPerformance,
    "prototype-preview-render",
  );
});

test("browser perf: prototype screen switching stays responsive", async ({ page }) => {
  await expectPrototypeReady(page);
  const screenField = await getToolcraftFieldByLabel(page, "Screen");
  const result = await measureToolcraftInteraction(page, async () => {
    await screenField.getByRole("combobox").click();
    await page.locator('[data-slot="select-item"]').filter({ hasText: "Market" }).click();
    await expect(page.locator("[data-prototype-screen='market']")).toBeVisible();
  });

  expectToolcraftScenarioPerformanceBudget(
    withHarnessFrameBudget(result),
    appPerformance,
    "prototype-screen-change",
  );
});

test("browser perf: prototype modal workflow stays responsive", async ({ page }) => {
  await expectPrototypeReady(page);
  const modalField = await getToolcraftFieldByLabel(page, "Modal");
  const result = await measureToolcraftInteraction(page, async () => {
    await modalField.getByRole("combobox").click();
    await page.locator('[data-slot="select-item"]').filter({ hasText: "Wallet" }).click();
    await expect(page.locator(".bh-modal-backdrop[data-prototype-modal='connect-wallet']")).toBeVisible();
  });

  expectToolcraftScenarioPerformanceBudget(
    withHarnessFrameBudget(result),
    appPerformance,
    "prototype-modal-change",
  );
});

test("browser perf: prototype device preview stays responsive", async ({ page }) => {
  await expectPrototypeReady(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("button", { name: "Phone" }).click();
    await expect(page.locator(".bh-prototype.is-phone")).toBeVisible();
  });

  expectToolcraftScenarioPerformanceBudget(
    withHarnessFrameBudget(result),
    appPerformance,
    "prototype-device-change",
  );
});

test("browser perf: prototype density switching stays responsive", async ({ page }) => {
  await expectPrototypeReady(page);
  const stressValue = getToolcraftPerformanceStressValue<string>(
    appPerformance,
    "prototype-density-change",
  );
  expect(stressValue).toBe("compact");

  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("button", { name: "Tight" }).click();
    await expect(page.locator(".bh-app-shell.is-compact")).toBeVisible();
  });

  expectToolcraftScenarioPerformanceBudget(
    withHarnessFrameBudget(result),
    appPerformance,
    "prototype-density-change",
  );
});

test("browser perf: prototype role switching stays responsive", async ({ page }) => {
  await expectPrototypeReady(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("button", { name: "Seller" }).click();
    await expect(page.getByText("Protected escrow mode")).toBeVisible();
  });

  expectToolcraftScenarioPerformanceBudget(
    withHarnessFrameBudget(result),
    appPerformance,
    "prototype-role-change",
  );
});

test("browser perf: prototype visual mode switching stays responsive", async ({ page }) => {
  await expectPrototypeReady(page);
  const visualModeField = await getToolcraftFieldByLabel(page, "Visual mode");
  const result = await measureToolcraftInteraction(page, async () => {
    await visualModeField.getByRole("combobox").click();
    await page.locator('[data-slot="select-item"]').filter({ hasText: "Editorial" }).click();
    await expect(page.locator(".bh-app-shell.is-editorial")).toBeVisible();
  });

  expectToolcraftScenarioPerformanceBudget(
    withHarnessFrameBudget(result),
    appPerformance,
    "appearance-visual-mode-change",
  );
});

test("browser perf: prototype motion mode stays responsive", async ({ page }) => {
  await expectPrototypeReady(page);
  const motionTrigger = page.getByRole("combobox", { name: "Motion" });
  const result = await measureToolcraftInteraction(page, async () => {
    if (await motionTrigger.count()) {
      await motionTrigger.click();
      await page.getByRole("option", { name: "Reduced" }).click();
    } else {
      await chooseToolcraftSelectOption(page, "Motion", "Reduced");
    }
    await expect(page.locator("[data-prototype-motion='reduced']")).toBeVisible();
  });

  expectToolcraftScenarioPerformanceBudget(
    withHarnessFrameBudget(result),
    appPerformance,
    "prototype-motion-change",
  );
});

test("browser perf: rail pulse dragging stays responsive", async ({ page }) => {
  await expectPrototypeReady(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Pulse", 0.82);
    await expect(page.locator(".bh-rail-line")).toBeVisible();
  });

  expectToolcraftScenarioPerformanceBudget(
    withHarnessFrameBudget(result),
    appPerformance,
    "motion-pulse-drag",
  );
});

test("browser perf: prototype trust mode stays responsive", async ({ page }) => {
  await expectPrototypeReady(page);
  const trustTrigger = page.getByRole("combobox", { name: "Trust" });
  const result = await measureToolcraftInteraction(page, async () => {
    if (await trustTrigger.count()) {
      await trustTrigger.click();
      await page.getByRole("option", { name: "Dispute" }).click();
    } else {
      await chooseToolcraftSelectOption(page, "Trust", "Dispute");
    }
    await expect(page.getByText("Dispute posture active")).toBeVisible();
  });

  expectToolcraftScenarioPerformanceBudget(
    withHarnessFrameBudget(result),
    appPerformance,
    "prototype-trust-change",
  );
});

test("browser perf: prototype accent editing stays responsive", async ({ page }) => {
  await expectPrototypeReady(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByLabel("Royal blue hex").fill("1F4FFF");
    await page.getByLabel("Royal blue hex").press("Enter");
    await expect(page.locator(".bh-brand-mark")).toBeVisible();
  });

  expectToolcraftScenarioPerformanceBudget(
    withHarnessFrameBudget(result),
    appPerformance,
    "appearance-accent-change",
  );
});

test("browser perf: prototype background editing stays responsive", async ({ page }) => {
  await expectPrototypeReady(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByLabel("background hex").fill("F4F7FC");
    await page.getByLabel("background hex").press("Enter");
    await expect(page.locator(".bh-prototype")).toHaveCSS("background-color", /rgb|rgba/);
  });

  expectToolcraftScenarioPerformanceBudget(
    withHarnessFrameBudget(result),
    appPerformance,
    "appearance-background-change",
  );
});

test("browser perf: prototype background include stays responsive", async ({ page }) => {
  await expectPrototypeReady(page);
  const includeField = await getToolcraftFieldByLabel(page, "Include");
  const result = await measureToolcraftInteraction(page, async () => {
    const switchControl = includeField.getByRole("switch").or(includeField.getByRole("checkbox")).first();
    await switchControl.click();
    await expect(page.locator("[data-toolcraft-product-output]")).toBeVisible();
  });

  expectToolcraftScenarioPerformanceBudget(
    withHarnessFrameBudget(result),
    appPerformance,
    "export-include-background-change",
  );
});

test("browser perf: prototype image format switching stays responsive", async ({ page }) => {
  await expectPrototypeReady(page);
  const stressValue = getToolcraftPerformanceStressValue<string>(
    appPerformance,
    "export-image-format-change",
  );
  expect(stressValue).toBe("jpg");

  const formatTrigger = page.getByRole("combobox", { name: "Format" });
  const result = await measureToolcraftInteraction(page, async () => {
    if (await formatTrigger.count()) {
      await formatTrigger.click();
      await page.getByRole("option", { name: "JPG" }).click();
    } else {
      await chooseToolcraftSelectOption(page, "Format", "JPG");
    }
    await expect(page.getByText("Export PNG")).toBeVisible();
  });

  expectToolcraftScenarioPerformanceBudget(
    withHarnessFrameBudget(result),
    appPerformance,
    "export-image-format-change",
  );
});

test("browser perf: prototype image resolution switching stays responsive", async ({ page }) => {
  await expectPrototypeReady(page);
  const stressValue = getToolcraftPerformanceStressValue<{ height: number; width: number }>(
    appPerformance,
    "export-image-resolution-change",
  );
  expect(stressValue.width).toBe(8192);

  const resolutionTrigger = page.getByRole("combobox", { name: "Resolution" });
  const result = await measureToolcraftInteraction(page, async () => {
    if (await resolutionTrigger.count()) {
      await resolutionTrigger.click();
      await page.getByRole("option", { name: "8K" }).click();
    } else {
      await chooseToolcraftSelectOption(page, "Resolution", "8K");
    }
    await expect(page.getByText("Export PNG")).toBeVisible();
  });

  expectToolcraftScenarioPerformanceBudget(
    withHarnessFrameBudget(result),
    appPerformance,
    "export-image-resolution-change",
  );
});

test("browser perf: prototype png export completes within budget", async ({ page }) => {
  await expectPrototypeReady(page);
  const stressValue = getToolcraftPerformanceStressValue<{ height: number; width: number }>(
    appPerformance,
    "prototype-png-export",
  );
  expect(stressValue.width).toBe(4096);

  const result = await measureToolcraftInteraction(page, async () => {
    const download = page.waitForEvent("download");
    await page.getByText("Export PNG").click();
    await download;
  });

  expectToolcraftScenarioPerformanceBudget(
    { ...result, exportMs: result.durationMs },
    appPerformance,
    "prototype-png-export",
  );
});

test("browser perf: prototype canvas viewport stays stable", async ({ page }) => {
  await expectPrototypeReady(page);
  const result = await expectToolcraftCanvasViewportStable(page, async () => {
    await expect(page.locator("[data-toolcraft-product-output]")).toBeVisible();
  });

  expectToolcraftScenarioPerformanceBudget(
    withHarnessFrameBudget(result),
    appPerformance,
    "prototype-viewport-stability",
  );
});
