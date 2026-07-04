import {
  createToolcraftPngExportCanvas,
  shouldIncludeToolcraftPreviewBackground,
} from "@/toolcraft/runtime/export";
import type { ToolcraftPanelActionHandler } from "@/toolcraft/runtime/react";
import type { ToolcraftState } from "@/toolcraft/runtime/state/types";

function readColor(value: unknown, fallback: string): string {
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { hex?: unknown }).hex === "string"
  ) {
    return (value as { hex: string }).hex;
  }

  return fallback;
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function drawPrototypeExport({
  context,
  state,
}: {
  context: CanvasRenderingContext2D;
  state: ToolcraftState;
}): void {
  const accent = readColor(state.values["appearance.accent"], "#002275");
  const background = readColor(state.values["appearance.background"], "#FAF8FF");
  const includePreviewBackground = shouldIncludeToolcraftPreviewBackground({ state });
  const width = state.canvas.size.width;
  const height = state.canvas.size.height;
  const screen = String(state.values["prototype.screen"] ?? "home");
  const modal = String(state.values["prototype.modal"] ?? "none");

  if (includePreviewBackground) {
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
  }

  context.fillStyle = "#FFFFFF";
  drawRoundedRect(context, 42, 42, width - 84, height - 84, 18);
  context.fill();

  context.strokeStyle = "rgba(0,34,117,0.14)";
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = accent;
  drawRoundedRect(context, 78, 78, 54, 54, 10);
  context.fill();

  context.fillStyle = "#FFFFFF";
  context.fillRect(93, 95, 24, 5);
  context.fillRect(93, 112, 24, 5);
  context.fillRect(96, 91, 5, 30);
  context.fillRect(113, 91, 5, 30);

  context.fillStyle = "#131B2E";
  context.font = "520 48px Newsreader, Georgia, serif";
  context.fillText("Baseshire Hethaway", 156, 115);
  context.font = "600 18px Geist Sans, Geist, system-ui, sans-serif";
  context.fillStyle = "#475569";
  context.fillText("Editorial fintech escrow terminal", 156, 146);

  context.fillStyle = "rgba(220,225,255,0.42)";
  drawRoundedRect(context, 76, 198, width - 152, 190, 14);
  context.fill();
  context.strokeStyle = "rgba(0,34,117,0.16)";
  context.lineWidth = 2;
  context.stroke();

  context.strokeStyle = accent;
  context.lineWidth = 10;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(124, 290);
  context.bezierCurveTo(width * 0.32, 290, width * 0.28, 232, width * 0.44, 232);
  context.bezierCurveTo(width * 0.58, 232, width * 0.56, 348, width * 0.73, 348);
  context.lineTo(width - 124, 348);
  context.stroke();

  ["ASSET", "TERMS", "ESCROW", "RELEASE"].forEach((label, index) => {
    const positions = [
      [124, 290],
      [width * 0.44, 232],
      [width * 0.58, 256],
      [width - 124, 348],
    ];
    const [x, y] = positions[index] ?? positions[0];
    context.fillStyle = "#FFFFFF";
    drawRoundedRect(context, x - 30, y - 30, 60, 60, 30);
    context.fill();
    context.strokeStyle = accent;
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = accent;
    context.font = "800 16px JetBrains Mono, monospace";
    context.fillText(String(index + 1), x - 5, y + 6);
    context.fillStyle = "#475569";
    context.font = "700 13px JetBrains Mono, monospace";
    context.fillText(label, x - 28, y + 54);
  });

  const cards = [
    ["Active screen", screen],
    ["Modal state", modal],
    ["Protected volume", "$4.82M"],
    ["Listings queued", "84"],
  ];

  cards.forEach(([label, value], index) => {
    const cardWidth = (width - 128 - 48) / 2;
    const x = 64 + (index % 2) * (cardWidth + 48);
    const y = 430 + Math.floor(index / 2) * 178;

    context.fillStyle = "#FAF8FF";
    drawRoundedRect(context, x, y, cardWidth, 132, 12);
    context.fill();
    context.strokeStyle = "rgba(0,34,117,0.12)";
    context.lineWidth = 1.5;
    context.stroke();
    context.fillStyle = "#475569";
    context.font = "700 14px JetBrains Mono, monospace";
    context.fillText(label, x + 28, y + 46);
    context.fillStyle = "#131B2E";
    context.font = "780 32px Geist Sans, Geist, system-ui, sans-serif";
    context.fillText(value, x + 28, y + 92);
  });
}

function downloadCanvas(canvas: HTMLCanvasElement, fileName: string, format: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not render prototype export."));
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        resolve();
      },
      mimeType,
      0.94,
    );
  });
}

export const handlePrototypePanelAction: ToolcraftPanelActionHandler = async ({
  action,
  reportProgress,
  state,
}) => {
  if (action.value !== "export.png") {
    return;
  }

  reportProgress?.(0.1);
  const background = readColor(state.values["appearance.background"], "#FAF8FF");
  const includeBackground = shouldIncludeToolcraftPreviewBackground({ state });
  const imageFormat = String(state.values["export.image.format"] ?? "png");
  const imageResolution = String(state.values["export.image.resolution"] ?? "4k");
  const exportCanvas = createToolcraftPngExportCanvas({
    background,
    includeBackground: includeBackground,
    render: ({ context }) => drawPrototypeExport({ context, state }),
    resolution: imageResolution,
    state,
  });

  reportProgress?.(0.72);
  await downloadCanvas(exportCanvas, `baseshire-redesign-${imageResolution}.${imageFormat}`, imageFormat);
  reportProgress?.(1);
};
