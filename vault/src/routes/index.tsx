import { ToolcraftApp } from "@/toolcraft/runtime/react";

import { appSchema } from "../app/app-schema";
import { handlePrototypePanelAction } from "../app/prototype-export";
import { PrototypeApp } from "../app/prototype-app";

export function AppHome(): React.JSX.Element {
  return (
    <ToolcraftApp
      className="h-dvh min-h-dvh"
      canvasContent={<PrototypeApp />}
      onPanelAction={handlePrototypePanelAction}
      renderDefaultCanvasMedia={false}
      schema={appSchema}
    />
  );
}
