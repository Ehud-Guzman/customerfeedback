import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { storage } from "../lib/storage";

function crumbsFor(pathname) {
  if (pathname.startsWith("/app/surveys/")) return ["Overview", "Survey"];
  if (pathname.startsWith("/staff/submit")) return ["Staff submit"];
  if (pathname.startsWith("/app/overview")) return ["Overview"];
  return ["Dashboard"];
}

export default function AdminShell() {
  const nav = useNavigate();
  const loc = useLocation();

  const logout = () => {
    storage.setToken(null);
    nav("/login", { replace: true });
  };

  // You can replace this later with orgName when you implement it.
  const orgId = storage.getOrgId();
  const orgLabel = orgId ? "Connected" : "—";

  const crumbs = crumbsFor(loc.pathname);

  return (
    <>
      <div className="topbar">
        <div className="container">
          <div className="topbar-inner">
            <div className="brand" style={{ cursor: "pointer" }} onClick={() => nav("/app/overview")}>
              <div className="brand-mark" />
              <div>
                <div className="brand-name">Customer Feedback</div>
                <div className="brand-subline">Analytics • QR + Staff</div>
              </div>
            </div>

            <div className="nav-pills" style={{ gap: 8 }}>
              <NavLink
                to="/app/overview"
                className={({ isActive }) => `pill ${isActive ? "pill-active" : ""}`}
              >
                Overview
              </NavLink>

              <NavLink
                to="/staff/submit"
                className={({ isActive }) => `pill ${isActive ? "pill-active" : ""}`}
              >
                Staff submit
              </NavLink>
            </div>

            <div className="right-tools" style={{ gap: 10 }}>
              <span className="chip">Org: {orgLabel}</span>
              <button className="btn-secondary" onClick={logout}>
                Logout
              </button>
            </div>
          </div>

          <div className="breadcrumbs" style={{ marginTop: 10 }}>
            {crumbs.join(" / ")}
          </div>
        </div>
      </div>

      <div className="container">
        <div className="content-card">
          <Outlet />
        </div>
      </div>
    </>
  );
}
