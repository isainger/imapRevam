import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import RecipientList from "./components/RecipientList.jsx";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import '@mantine/notifications/styles.css';

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MantineProvider>
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
