import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.tsx";
import "./index.css";
import { PublicLandingPage } from "./pages/landing/ui/PublicLandingPage.tsx";
import { isTelegramWebAppContext } from "./shared/lib/telegram";

const shouldRenderMiniApp = (): boolean => {
  if (typeof window === "undefined") {
    return true;
  }

  if (isTelegramWebAppContext()) {
    return true;
  }

  if (window.location.pathname.startsWith("/admin")) {
    return true;
  }

  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return true;
  }

  return new URLSearchParams(window.location.search).get("webapp") === "1";
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {shouldRenderMiniApp() ? (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    ) : (
      <PublicLandingPage />
    )}
  </StrictMode>,
);
