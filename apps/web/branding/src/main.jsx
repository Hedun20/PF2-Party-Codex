import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import BrandingApp from "./BrandingApp.jsx";
import "./theme/silverleaf-dark.css";
import "./branding.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <BrandingApp />
    </HashRouter>
  </React.StrictMode>
);
