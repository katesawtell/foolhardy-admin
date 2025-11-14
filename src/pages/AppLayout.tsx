import { Link, Outlet, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthContext";

const navItems = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/events", label: "Events" },
  { path: "/inventory", label: "Inventory" },
  { path: "/goals", label: "Goals" },
  { path: "/cash", label: "Cash Drawer" }, 
];

export default function AppLayout() {
  const location = useLocation();
  const { session } = useAuth();

  function handleLogout() {
    supabase.auth.signOut();
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h1 className="logo">Foolhardy Admin</h1>
        <nav>
          <ul>
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link className={active ? "nav-link active" : "nav-link"} to={item.path}>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {session && (
          <button onClick={handleLogout} className="logout-button">
            Log out
          </button>
        )}
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
