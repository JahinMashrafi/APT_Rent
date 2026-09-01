import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import "./css/global.css";
import "./css/navbar.css";
import "./css/auth.css";
import "./css/home.css";
import "./css/profile.css";
import "./css/newsfeed-home.css";

import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
