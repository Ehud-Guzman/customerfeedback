import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { storage } from "../lib/storage";

function shortId(id) {
  const s = String(id || "");
  if (!s) return "—";
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function crumbsFor(pathname) {
  // tighten these so they match what users actually feel
  if (pathname.startsWith("/app/surveys/")) return ["Overview", "Survey analytics"];
  if (pathname.startsWith("/staff/submit")) return ["Staff submit"];
  if (pathname.startsWith("/app/overview")) return ["Overview"];
  return ["Dashboard"];
}

export default function AdminShell() {
  const nav = useNavigate();
  const loc = useLocation();

  const logout = () => {
    // clear everything tenant-related
    if (storage.clear) storage.clear();
    else {
      storage.setToken(null);
      storage.setOrgId(null);
      if (storage.setOrgName) storage.setOrgName(null);
    }
    nav("/login", { replace: true });
  };

  const orgId = storage.getOrgId();
  const orgName = storage.getOrgName ? storage.getOrgName() : null;

  // If org name exists, show it. Else show a short ID. Never show "Connected".
  const orgLabel = orgName || (orgId ? shortId(orgId) : "—");

  const crumbs = crumbsFor(loc.pathname);

  return (
    <>
      <div className="topbar">
        <div className="container">
          <div className="topbar-inner">
            <div
              className="brand"
              style={{ cursor: "pointer" }}
              onClick={() => nav("/app/overview")}
              title="Go to Overview"
            >
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
              <span className="chip" title={orgName ? orgName : orgId || ""}>
                Org: {orgLabel}
              </span>

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
