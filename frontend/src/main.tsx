import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@telegram-apps/telegram-ui/dist/styles.css";
import { BrowserRouter } from "react-router-dom";

import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
