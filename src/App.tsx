import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./pages/AppLayout";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import NewEvent from "./pages/NewEvent";
import EditEvent from "./pages/EditEvent";
import Inventory from "./pages/Inventory";
import Goals from "./pages/Goals";
import CashDrawer from "./pages/CashDrawer";
import Login from "./pages/Login";
import { RequireAuth } from "./auth/RequireAuth";

export default function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<Login />} />

      {/* Protected app */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="events" element={<Events />} />
        <Route path="events/new" element={<NewEvent />} />
        <Route path="events/:id/edit" element={<EditEvent />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="goals" element={<Goals />} />
        <Route path="cash" element={<CashDrawer />} />
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Route>
    </Routes>
  );
}
