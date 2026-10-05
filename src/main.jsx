import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import Journey from "./journey/Journey";
import AdminPage from "./AdminPage";
import "./styles.css";
const path = window.location.pathname.replace(/\/$/, "");
createRoot(document.getElementById("root")).render(path === "/admin" ? <AdminPage /> : path === "/realm" ? <App /> : <Journey />);
