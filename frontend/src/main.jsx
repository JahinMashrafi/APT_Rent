import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider } from "./context/AppContext.jsx";
import { LanguageProvider } from "./i18n/LanguageContext.jsx";
import { ToastProvider } from "./components/ui/Toast.jsx";
import "./index.css";
import App from "./App.jsx";
import PwaPrompt from "./components/PwaPrompt.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LanguageProvider>
    <AppProvider>
      <ToastProvider>
        <App />
        <PwaPrompt />
      </ToastProvider>
    </AppProvider>
     </LanguageProvider>
  </StrictMode>
);
