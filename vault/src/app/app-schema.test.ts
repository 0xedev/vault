import { describe, expect, it } from "vitest";

import { appAcceptance, appProductReadiness, starterControlSectionInventory } from "./app-acceptance";
import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";

describe("appSchema", () => {
  it("publishes the Baseshire product readiness contract", () => {
    expect(appProductReadiness).toMatchObject({
      mode: "product",
      productName: "Baseshire Hethaway Redesign Playground",
    });
    expect(appAcceptance.length).toBeGreaterThan(0);
    expect(starterControlSectionInventory.length).toBeGreaterThan(0);
  });

  it("renders Toolcraft shell surfaces without timeline or layers", () => {
    expect(appSchema.canvas.enabled).toBe(true);
    expect(appSchema.canvas.sizing).toEqual({ mode: "editable-output" });
    expect(appSchema.canvas.upload).toBe(false);
    expect(appSchema.panels.controls?.sections[0]?.title).toBe("Setup");
    expect(appSchema.panels.layers).toBeUndefined();
    expect(appSchema.panels.timeline).toBeUndefined();
    expect(appSchema.toolbar).toEqual({
      history: true,
      radar: true,
      theme: true,
      zoom: true,
    });
  });

  it("exposes prototype controls, required background controls, and PNG export", () => {
    const sections = appSchema.panels.controls?.sections ?? [];
    const productTargets = sections.flatMap((section) =>
      Object.values(section.controls).map((control) => control.target),
    );

    expect(productTargets).toEqual(
      expect.arrayContaining([
        "prototype.screen",
        "prototype.modal",
        "prototype.device",
        "prototype.density",
        "prototype.role",
        "appearance.visualMode",
        "prototype.motion",
        "prototype.trustLevel",
        "motion.pulse",
        "appearance.accent",
        "appearance.background",
        "export.includeBackground",
        "export.image.format",
        "export.image.resolution",
        "export.actions",
      ]),
    );

    expect(sections.map((section) => section.title)).toEqual(
      expect.arrayContaining(["Brand Accent", "Background", "Rail Motion", "Image Export", "Export"]),
    );
  });

  it("classifies DOM prototype performance without raster render scale", () => {
    expect(appSchema.canvas.renderScale.enabled).toBe(false);
    expect(appPerformance.rendererStrategy).toBe("dom");
    expect(appPerformance.usesCustomRenderer).toBe(true);
    expect(appPerformance.workloadTargets).toEqual(
      expect.arrayContaining(["prototype.density", "export.image.format", "export.image.resolution"]),
    );
  });

  it("declares automated performance scenario tests", () => {
    expect(appPerformance.scenarios.map((scenario) => scenario.automatedTestName)).toEqual(
      expect.arrayContaining([
        "preview render stays under budget",
        "screen switching stays responsive",
        "modal workflow switching stays responsive",
        "device preview switching stays responsive",
        "density switching stays responsive",
        "role switching stays responsive",
        "visual mode switching stays responsive",
        "motion mode switching stays responsive",
        "rail pulse dragging stays responsive",
        "trust mode switching stays responsive",
        "accent editing stays responsive",
        "background editing stays responsive",
        "background include toggle stays responsive",
        "image format switching stays responsive",
        "image resolution switching stays responsive",
        "png export completes within budget",
        "canvas viewport stays stable",
      ]),
    );
  });

  it("declares automated app acceptance scenario tests", () => {
    expect(appAcceptance.map((entry) => entry.automatedTestName)).toEqual(
      expect.arrayContaining([
        "prototype.screen is covered by schema and renderer contract",
        "prototype.modal is covered by schema and renderer contract",
        "prototype.device is covered by schema and renderer contract",
        "prototype.density is covered by schema and renderer contract",
        "prototype.role is covered by schema and renderer contract",
        "appearance.visualMode is covered by schema and renderer contract",
        "prototype.motion is covered by schema and renderer contract",
        "prototype.trustLevel is covered by schema and renderer contract",
        "motion.pulse is covered by schema and renderer contract",
        "appearance.accent is covered by schema and renderer contract",
        "appearance.background is covered by schema and renderer contract",
        "export.includeBackground is covered by schema and renderer contract",
        "export.image.format is covered by schema and renderer contract",
        "export.image.resolution is covered by schema and renderer contract",
        "footer export action renders prototype png",
        "all prototype screens render primary entities",
        "all prototype modal workflows render",
        "prototype settings persist after reload",
        "prototype has no emoji characters",
      ]),
    );
  });
});
