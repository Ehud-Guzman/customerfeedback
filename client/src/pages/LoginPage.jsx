import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth.api";
import { storage } from "../lib/storage";

export default function LoginPage() {
  const nav = useNavigate();

  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("ChangeMe123!");
  const [orgId, setOrgId] = useState(storage.getOrgId() || "");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onLogin = async () => {
    setErr("");

    const org = String(orgId || "").trim();
    if (!org) {
      setErr("OrgId is required (X-Org-Id).");
      return;
    }

    setLoading(true);
    try {
      const res = await login(email, password);
      if (!res?.ok) throw new Error(res?.message || "Login failed");

      // Persist org AFTER successful auth
      storage.setOrgId(org);

      nav("/app/overview", { replace: true });
    } catch (e) {
      setErr(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") onLogin();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 420 }}>
        <h1 style={{ marginBottom: 12 }}>Login</h1>

        <div className="grid" style={{ gap: 10 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            onKeyDown={onKeyDown}
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            onKeyDown={onKeyDown}
          />

          <input
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            placeholder="OrgId (X-Org-Id)"
            onKeyDown={onKeyDown}
          />

          <button onClick={onLogin} disabled={loading}>
            {loading ? "Logging in…" : "Login"}
          </button>

          {err && <div style={{ color: "crimson" }}>{err}</div>}

          <div className="muted" style={{ fontSize: 12 }}>
            Tip: OrgId is required because the system is multi-tenant (X-Org-Id header).
          </div>
        </div>
      </div>
    </div>
  );
}
