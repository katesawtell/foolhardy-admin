import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./pages/AppLayout";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import Inventory from "./pages/Inventory";
import NewEvent from "./pages/NewEvent";
import EditEvent from "./pages/EditEvent";
import Goals from "./pages/Goals";



import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="events" element={<Events />} />
          <Route path="events/new" element={<NewEvent />} />
          <Route path="events/:id/edit" element={<EditEvent />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="goals" element={<Goals />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
