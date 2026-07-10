import { useEffect } from "react";
import { Outlet } from "react-router";
import { Toaster } from "sonner";

// Neo-Brutalist Kollektiv mark — black-bordered yellow square with stacked layers
const FAVICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect x="2" y="2" width="60" height="60" fill="#ffe800" stroke="#000" stroke-width="6"/>
  <rect x="14" y="18" width="36" height="10" fill="#000"/>
  <rect x="14" y="32" width="36" height="6"  fill="#000"/>
  <rect x="14" y="42" width="22" height="6"  fill="#000"/>
</svg>`.trim();

function setFavicon() {
  // Remove any existing favicons to avoid the browser keeping a stale one
  document.querySelectorAll("link[rel*='icon']").forEach((el) => el.remove());

  const href = "data:image/svg+xml;base64," + btoa(FAVICON_SVG);
  const link = document.createElement("link");
  link.rel  = "icon";
  link.type = "image/svg+xml";
  link.href = href;
  document.head.appendChild(link);

  // Set the document title too
  document.title = "Kollektiv — Open Multiplayer UI Canvas";
}

export default function AppRoot() {
  useEffect(() => { setFavicon(); }, []);

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#f4f4f0]" style={{ fontFamily: "Inter, sans-serif" }}>
      <Outlet />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#fff",
            border: "3px solid #000",
            borderRadius: 0,
            boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)",
            fontFamily: "Inter, sans-serif",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            fontSize: "12px",
          },
        }}
      />
    </div>
  );
}
