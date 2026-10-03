import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import AdminPage from "./AdminPage";
import "./styles.css";
createRoot(document.getElementById("root")).render(window.location.pathname.replace(/\/$/, "") === "/admin" ? <AdminPage /> : <App />);
