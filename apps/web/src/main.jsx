import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles/theme.css";
import "./styles/fantasy.css";
import "./styles/components.css";
import "./styles/codex-design.css";
import "./styles/codex-buttons.css";
import "./styles/stabilization.css";
import "./styles/shell-context.css";
import "./styles/ui-blocks.css";
import "./styles/campaign-context.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
