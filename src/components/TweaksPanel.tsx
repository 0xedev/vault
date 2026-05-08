"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useTheme } from "./ThemeProvider";

const TWEAKS_STYLE = `
.twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
  max-height:calc(100vh - 32px);display:flex;flex-direction:column;
  background:rgba(250,249,247,.78);color:#29261b;
  -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
  border:.5px solid rgba(255,255,255,.6);border-radius:14px;
  box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
  font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
.twk-hd{display:flex;align-items:center;justify-content:space-between;
  padding:10px 8px 10px 14px;cursor:move;user-select:none}
.twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
.twk-x-btn{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
  width:22px;height:22px;border-radius:6px;cursor:pointer;font-size:13px;line-height:1}
.twk-x-btn:hover{background:rgba(0,0,0,.06);color:#29261b}
.twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
  overflow-y:auto;overflow-x:hidden;min-height:0}
.twk-body::-webkit-scrollbar{width:8px}
.twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
.twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px}
.twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
  color:rgba(41,38,27,.45);padding:10px 0 0}
.twk-sect:first-child{padding-top:0}
.twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
  background:rgba(0,0,0,.06);user-select:none}
.twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
  background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
  border-radius:6px;cursor:pointer;padding:4px 6px;line-height:1.2}
.twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
  background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
  transition:left .15s,width .15s}
.twk-row{display:flex;flex-direction:column;gap:5px}
.twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
.twk-lbl{display:flex;justify-content:space-between;align-items:baseline;color:rgba(41,38,27,.72)}
.twk-lbl span:first-child{font-weight:500}
.twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
  border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:pointer;
  background:transparent;flex-shrink:0}
.twk-swatch::-webkit-color-swatch-wrapper{padding:0}
.twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
`;

export default function TweaksPanel() {
  const { settings, setSetting } = useTheme();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: 16, y: 16 });

  const clampToViewport = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const w = panel.offsetWidth, h = panel.offsetHeight;
    offsetRef.current = {
      x: Math.min(window.innerWidth - w - 16, Math.max(16, offsetRef.current.x)),
      y: Math.min(window.innerHeight - h - 16, Math.max(16, offsetRef.current.y)),
    };
    panel.style.right = offsetRef.current.x + "px";
    panel.style.bottom = offsetRef.current.y + "px";
  }, []);

  useEffect(() => {
    if (!open) return;
    clampToViewport();
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);

  const onDragStart = (e: React.MouseEvent) => {
    const panel = panelRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = (ev: MouseEvent) => {
      offsetRef.current = { x: startRight - (ev.clientX - sx), y: startBottom - (ev.clientY - sy) };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const options = {
    theme: ["dark", "light"] as const,
    card: ["solid", "glass"] as const,
    density: ["compact", "regular", "comfortable"] as const,
  };

  return (
    <>
      <style>{TWEAKS_STYLE}</style>
      <button
        className="btn ghost sm"
        title="Tweaks"
        onClick={() => setOpen(!open)}
        style={{ position: "fixed", bottom: 16, right: 16, zIndex: 9999, borderRadius: 8 }}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.6 2.6l1.4 1.4M12 12l1.4 1.4M2.6 13.4l1.4-1.4M12 4l1.4-1.4"/>
        </svg>
      </button>
      {open && (
        <div ref={panelRef} className="twk-panel" style={{ right: offsetRef.current.x, bottom: offsetRef.current.y }}>
          <div className="twk-hd" onMouseDown={onDragStart}>
            <b>Tweaks</b>
            <button className="twk-x-btn" onMouseDown={e => e.stopPropagation()} onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="twk-body">
            <div className="twk-sect">Appearance</div>
            {(["theme", "card", "density"] as const).map(key => {
              const vals = options[key] as readonly string[];
              const idx = vals.indexOf(settings[key] as string);
              return (
                <div key={key} className="twk-row">
                  <div className="twk-lbl">
                    <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                  </div>
                  <div className="twk-seg">
                    <div className="twk-seg-thumb" style={{
                      left: `calc(2px + ${idx} * (100% - 4px) / ${vals.length})`,
                      width: `calc((100% - 4px) / ${vals.length})`,
                    }} />
                    {vals.map(v => (
                      <button key={v} onClick={() => setSetting(key, v as never)}>{v}</button>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="twk-sect">Accent</div>
            <div className="twk-row twk-row-h">
              <div className="twk-lbl"><span>Color</span></div>
              <input type="color" className="twk-swatch" value={settings.accent} onChange={e => setSetting("accent", e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["#7CFFB2", "#A78BFA", "#8BB7FF", "#FFC56B", "#FF7A45", "#E6C97C"].map(c => (
                <button key={c} onClick={() => setSetting("accent", c)}
                  style={{ width: 22, height: 22, borderRadius: 6, background: c, border: settings.accent === c ? "2px solid #29261b" : "1px solid rgba(0,0,0,.1)", cursor: "pointer" }}/>
              ))}
            </div>
            <div className="twk-sect">Navigate</div>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(41,38,27,.7)" }}>
              Use the top nav and sidebar to browse pages. Visit <a href="/admin/dash" style={{ color: "#29261b" }}>/admin/dash</a> for the admin panel.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
