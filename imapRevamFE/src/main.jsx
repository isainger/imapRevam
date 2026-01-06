import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import '@mantine/notifications/styles.css';

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MantineProvider>
      <Notifications position="top-center" />
      <App />
    </MantineProvider>
  </StrictMode>
);
