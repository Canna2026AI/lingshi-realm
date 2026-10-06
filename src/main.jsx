import React from "react";
import { createRoot } from "react-dom/client";
import Journey from "./journey/Journey";
import AdminPage from "./AdminPage";
import "./styles.css";
const path = window.location.pathname.replace(/\/$/, "");
if (path === "/realm") window.history.replaceState(null, "", "/");
createRoot(document.getElementById("root")).render(path === "/admin" ? <AdminPage /> : <Journey />);
