import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "@fontsource-variable/inter";
import "@fontsource-variable/cabin";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./index.css";
import App from "./App.jsx";
import RecipientList from "./components/RecipientList.jsx";
import {
  MantineProvider,
  createTheme,
  localStorageColorSchemeManager,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/notifications/styles.css";

const colorSchemeManager = localStorageColorSchemeManager({
  key: "mantine-color-scheme-value",
});

const theme = createTheme({
  primaryColor: "blue",
  defaultRadius: "md",
  fontFamily:
    '"Inter Variable", Inter, system-ui, -apple-system, sans-serif',
  fontFamilyMonospace: '"JetBrains Mono", ui-monospace, monospace',
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MantineProvider
      theme={theme}
      defaultColorScheme="dark"
      colorSchemeManager={colorSchemeManager}
    >
      <Notifications position="top-center" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/recipients/:incidentId" element={<RecipientList />} />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  </StrictMode>
);
