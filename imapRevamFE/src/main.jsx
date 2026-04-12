import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
  fontFamily: "Poppins, Inter, system-ui, sans-serif",
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
