# Baseshire Renderer Decisions

## Renderer Technique Decision Matrix

- rendererStrategy: `dom`.
- rendererWorkload: `simple-composition`.
- sourceRepresentation: `procedural-data`.
- productRepresentation: `mixed`.
- previewRenderer: `dom`.
- exportRenderer: `canvas-2d`.
- Decision: The product-quality review preview is semantic DOM because the prototype is made of navigable pages, ledger rows, proof panels, modal transaction sheets, lucide icons, custom SVG asset glyphs, trust notices, and Toolcraft controls.
- Export/copy behavior: Canvas 2D is used for PNG/JPG export because it creates portable review images from the same runtime state.
- whyNotAlternativeStrategies: `text-output` would lose interface hierarchy; `vector-output` would make responsive product iteration slower; `pixel-output` would rasterize accessible text; WebGL/WebGPU do not improve this rendererWorkload.
- fidelityRisks: Export is a summarized review image rather than a pixel-perfect DOM screenshot.
- performanceRisks: Compact density, visual-mode skin switching, full-screen view switching, rail pulse changes, and high-resolution image export are the measured heavy paths.

## Renderer Layer Inventory

- backgroundLayer: DOM background layer, low primitive count, included when export.includeBackground is true.
- productForegroundLayer: DOM product-foreground layer with geometry, custom SVG diagrams, lucide icons, and text, selector `[data-toolcraft-product-output]`, included in export.
- exportComposite: Canvas 2D export-composite layer with composed brand geometry, escrow rail, and text for portable review images.
- editingHandlesLayer: intentionally absent because the app has no app-owned handles; Toolcraft owns viewport and shell editing chrome.

## Render Pipeline Inventory

- Pass `state-normalize`: preprocess pass with cache key entries for screen, modal, device, density, role, visualMode, motion, trust, accent, background, include background, and pulse.
- Pass `dom-layout`: text-layout pass with cache key entries for normalized state and mock data.
- Pass `dom-composite`: composite pass for accent, motion, background, and pulse changes.
- Pass `export-composite`: export pass for PNG/JPG generation with cache key entries for format, resolution, export action, background, and include background.
- Invalidation: `control-change` updates state/layout/composite/export; `control-drag` for Pulse invalidates only the cheap composite pass; `appearance.visualMode` invalidates layout because the shell skin and signal plate change; `viewport-zoom` must not invalidate state-normalize, dom-layout, or export-composite; `export` invalidates only export-composite.
- Interactions covered: control-drag, viewport-zoom, export, and control-change. Media-import, animation-frame, timeline-playback, and viewport-drag are intentionally absent because this prototype has no upload, no Toolcraft timeline, and no app-owned viewport-drag behavior.
