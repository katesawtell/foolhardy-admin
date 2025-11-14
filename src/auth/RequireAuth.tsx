import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function RequireAuth({ children }: { children: any }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p style={{ padding: "1rem" }}>Checking login…</p>;
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
