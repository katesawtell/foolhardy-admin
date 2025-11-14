import { Link, Outlet, useLocation } from "react-router-dom";

const navItems = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/events", label: "Events" },
  { path: "/inventory", label: "Inventory" },
  { path: "/goals", label: "Goals" },

];


export default function AppLayout() {
  const location = useLocation();

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
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
