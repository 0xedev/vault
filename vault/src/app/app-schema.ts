import { defineToolcraft } from "@/toolcraft/runtime";

const screenOptions = [
  { label: "Home", value: "home" },
  { label: "Market", value: "market" },
  { label: "Detail", value: "detail" },
  { label: "Deals", value: "deals" },
  { label: "Messages", value: "messages" },
  { label: "Info", value: "info" },
  { label: "Mini Apps", value: "miniapps" },
  { label: "X Accounts", value: "x" },
  { label: "Farcaster", value: "farcaster" },
  { label: "Clanker", value: "clanker" },
  { label: "History", value: "history" },
  { label: "Admin Dash", value: "admin-dash" },
  { label: "Disputes", value: "admin-disputes" },
  { label: "Listings", value: "admin-listings" },
  { label: "Users", value: "admin-users" },
  { label: "Escrow Ops", value: "admin-escrow" },
  { label: "Tickets", value: "admin-tickets" },
  { label: "Audit", value: "admin-audit" },
  { label: "Verify", value: "admin-verifications" },
] as const;

const modalOptions = [
  { label: "None", value: "none" },
  { label: "Wallet", value: "connect-wallet" },
  { label: "List NFT", value: "list-nft" },
  { label: "Bundle", value: "list-bundle" },
  { label: "Mini App", value: "list-miniapp" },
  { label: "X Account", value: "list-x" },
  { label: "Farcaster", value: "list-farcaster" },
  { label: "Clanker", value: "list-clanker" },
  { label: "Agreement", value: "agreement" },
  { label: "Success", value: "listing-success" },
  { label: "Share", value: "share-listing" },
  { label: "Message", value: "listing-message" },
  { label: "Counter", value: "counteroffer" },
  { label: "Resolve", value: "admin-resolve" },
  { label: "Empty", value: "empty-state" },
  { label: "Error", value: "error-state" },
  { label: "Loading", value: "loading-state" },
] as const;

export const appSchema = defineToolcraft({
  canvas: {
    enabled: true,
    size: { height: 1200, unit: "px", width: 1600 },
    sizing: { mode: "editable-output" },
    upload: false,
  },
  export: {
    png: {
      background: "include",
    },
  },
  panels: {
    controls: {
      sections: [
        {
          title: "Prototype View",
          controls: {
            screen: {
              defaultValue: "home",
              label: "Screen",
              options: screenOptions,
              orderRole: "mode",
              performanceReason:
                "Switching screens changes the visible prototype composition.",
              performanceRole: "responsiveness",
              target: "prototype.screen",
              type: "select",
            },
            modal: {
              defaultValue: "none",
              label: "Modal",
              options: modalOptions,
              orderRole: "mode",
              performanceReason:
                "Opening a workflow overlay changes the visible prototype state.",
              performanceRole: "responsiveness",
              target: "prototype.modal",
              type: "select",
            },
            device: {
              defaultValue: "auto",
              label: "Device",
              options: [
                { label: "Auto", value: "auto" },
                { label: "Phone", value: "phone" },
                { label: "Desk", value: "desktop" },
              ],
              orderRole: "mode",
              performanceReason:
                "Device preview changes responsive layout constraints.",
              performanceRole: "responsiveness",
              target: "prototype.device",
              type: "segmented",
            },
            density: {
              defaultValue: "calm",
              label: "Density",
              options: [
                { label: "Calm", value: "calm" },
                { label: "Tight", value: "compact" },
              ],
              orderRole: "mode",
              performanceReason:
                "Density changes spacing and card compactness across the prototype.",
              performanceRole: "workload",
              target: "prototype.density",
              type: "segmented",
            },
            role: {
              defaultValue: "buyer",
              label: "Role",
              options: [
                { label: "Buyer", value: "buyer" },
                { label: "Seller", value: "seller" },
                { label: "Admin", value: "admin" },
              ],
              orderRole: "mode",
              performanceReason:
                "Role changes visible account context and trust copy.",
              performanceRole: "responsiveness",
              target: "prototype.role",
              type: "segmented",
            },
            visualMode: {
              defaultValue: "terminal",
              description:
                "Switches the editorial fintech skin between operator terminal, narrative editorial, and boardroom review modes.",
              label: "Visual mode",
              options: [
                { label: "Terminal", value: "terminal" },
                { label: "Editorial", value: "editorial" },
                { label: "Boardroom", value: "boardroom" },
              ],
              orderRole: "mode",
              performanceReason:
                "Visual mode changes tonal layering, hero treatment, and density emphasis.",
              performanceRole: "responsiveness",
              target: "appearance.visualMode",
              type: "select",
            },
            motion: {
              defaultValue: "subtle",
              description:
                "Controls decorative prototype motion without adding timeline transport.",
              label: "Motion",
              options: [
                { label: "Reduced", value: "reduced" },
                { label: "Subtle", value: "subtle" },
                { label: "Full", value: "full" },
              ],
              orderRole: "mode",
              performanceReason:
                "Motion level changes animated rail and transition work.",
              performanceRole: "responsiveness",
              target: "prototype.motion",
              type: "select",
            },
            trustLevel: {
              defaultValue: "enhanced",
              label: "Trust",
              options: [
                { label: "Standard", value: "standard" },
                { label: "Enhanced", value: "enhanced" },
                { label: "Dispute", value: "dispute" },
              ],
              orderRole: "mode",
              performanceReason:
                "Trust state changes warnings, badges, and escrow language.",
              performanceRole: "responsiveness",
              target: "prototype.trustLevel",
              type: "select",
            },
          },
        },
        {
          title: "Rail Motion",
          controls: {
            pulse: {
              defaultValue: 48,
              label: "Pulse",
              max: 100,
              min: 0,
              orderRole: "strength",
              performanceReason:
                "Pulse adjusts the decorative escrow rail animation intensity.",
              performanceRole: "responsiveness",
              step: 1,
              target: "motion.pulse",
              type: "slider",
              unit: "%",
              valueLabel: "48%",
              variant: "continuous",
            },
          },
        },
        {
          title: "Brand Accent",
          controls: {
            accent: {
              defaultValue: { hex: "#002275" },
              label: "Royal blue",
              orderRole: "color",
              performanceReason:
                "Accent color is consumed by navigation, cards, rails, and buttons.",
              performanceRole: "responsiveness",
              target: "appearance.accent",
              type: "color",
            },
          },
        },
        {
          title: "Background",
          controls: {
            includeBackground: {
              defaultValue: true,
              label: "Include",
              orderRole: "primary",
              performanceReason:
                "Background inclusion changes preview background and PNG alpha.",
              performanceRole: "responsiveness",
              target: "export.includeBackground",
              type: "switch",
            },
            background: {
              defaultValue: { hex: "#FAF8FF" },
              label: false,
              orderRole: "color",
              performanceReason:
                "Background color is consumed by preview and PNG export.",
              performanceRole: "responsiveness",
              target: "appearance.background",
              type: "color",
            },
          },
          layoutGroups: [
            {
              columns: 2,
              controls: ["includeBackground", "background"],
              layout: "inline",
            },
          ],
        },
        {
          title: "Image Export",
          controls: {
            imageFormat: {
              defaultValue: "png",
              label: "Format",
              options: [
                { label: "PNG", value: "png" },
                { label: "JPG", value: "jpg" },
              ],
              orderRole: "mode",
              performanceReason:
                "Image format changes the exported file type.",
              performanceRole: "workload",
              target: "export.image.format",
              type: "select",
            },
            imageResolution: {
              defaultValue: "4k",
              label: "Resolution",
              options: [
                { label: "2K", value: "2k" },
                { label: "4K", value: "4k" },
                { label: "8K", value: "8k" },
              ],
              orderRole: "mode",
              performanceReason:
                "Image resolution changes the exported PNG long edge.",
              performanceRole: "workload",
              target: "export.image.resolution",
              type: "select",
            },
          },
          layoutGroups: [
            {
              columns: 2,
              controls: ["imageFormat", "imageResolution"],
              layout: "inline",
            },
          ],
        },
        {
          actionGroup: "primary",
          title: "Export",
          controls: {
            exportActions: {
              actions: [
                {
                  icon: "upload-simple",
                  label: "Export PNG",
                  value: "export.png",
                  variant: "default",
                },
              ],
              label: "Export",
              orderRole: "action",
              performanceReason:
                "Export renders a PNG from the active prototype state.",
              performanceRole: "responsiveness",
              target: "export.actions",
              type: "panelActions",
            },
          },
        },
      ],
      title: "Baseshire Lab",
    },
  },
  persistence: {
    include: ["values", "canvas", "panels"],
    key: "toolcraft:baseshire-redesign-playground:state:v1",
    storage: "localStorage",
    version: 1,
  },
  settingsTransfer: {
    appId: "baseshire-redesign-playground",
    fileName: "baseshire-redesign-settings.json",
  },
  toolbar: {
    history: true,
    radar: true,
    theme: true,
    zoom: true,
  },
});
