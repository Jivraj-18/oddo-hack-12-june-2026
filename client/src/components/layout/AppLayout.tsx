import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../lib/auth-context";
import { NotificationBell } from "./NotificationBell";
import { TourProvider, useTour } from "../../tour/TourProvider";
import "./app-layout.css";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/environmental", label: "Environmental" },
  { to: "/social", label: "Social" },
  { to: "/governance", label: "Governance" },
  { to: "/gamification", label: "Gamification" },
  { to: "/reports", label: "Reports" },
  { to: "/settings", label: "Settings" },
];

export function AppLayout() {
  return (
    <TourProvider>
      <AppLayoutContent />
    </TourProvider>
  );
}

function AppLayoutContent() {
  const { user, logout } = useAuth();
  const { start } = useTour();

  return (
    <div className="app-layout" id="app-layout">
      <aside className="app-layout__sidebar" id="app-sidebar" data-tour="sidebar">
        <div className="app-layout__brand">EcoSphere</div>
        <nav className="app-layout__nav" aria-label="Primary">
          {NAV_ITEMS.filter((item) => item.to !== "/settings" || user?.role === "admin").map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-tour={item.to === "/gamification" ? "nav-gamification" : item.to === "/reports" ? "nav-reports" : undefined}
              className={({ isActive }) => "app-layout__nav-link" + (isActive ? " is-active" : "")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button type="button" className="app-layout__tour-btn" onClick={start}>
          Take a tour
        </button>
      </aside>
      <div className="app-layout__main">
        <header className="app-layout__header" id="app-header">
          <div className="app-layout__header-spacer" />
          <div className="app-layout__header-user">
            <NotificationBell />
            <span className="app-layout__user-name">{user?.name}</span>
            <span className="app-layout__user-role">{user?.role}</span>
            <button type="button" className="app-layout__logout" onClick={logout}>
              Log out
            </button>
          </div>
        </header>
        <main className="app-layout__content" id="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
