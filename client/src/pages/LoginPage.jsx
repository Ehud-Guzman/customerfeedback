import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth.api";
import { storage } from "../lib/storage";
import { toast } from "sonner";

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
      setErr("OrgId is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await login(email, password, org);
      if (!res?.ok) throw new Error(res?.message || "Login failed");

      storage.setToken(res.data.token);
      storage.setOrgId(res.data.org?.id || org);
      storage.setOrgName(res.data.org?.name || null);

      toast.success(`Welcome${res.data.org?.name ? ` • ${res.data.org.name}` : ""}`);
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
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <div className="card" style={{ width: "100%", maxWidth: 440, padding: 18 }}>
        <div style={{ marginBottom: 14 }}>
          <div className="muted" style={{ fontSize: 12 }}>Customer Feedback</div>
          <h1 style={{ marginTop: 4, marginBottom: 6 }}>Login</h1>
          <div className="muted" style={{ fontSize: 12 }}>
            Sign in to view analytics and manage survey QR.
          </div>
        </div>

        <div className="grid" style={{ gap: 10 }}>
          <div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Email</div>
            <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={onKeyDown} placeholder="Email" />
          </div>

          <div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Password</div>
            <input value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={onKeyDown} placeholder="Password" type="password" />
          </div>

          <div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>OrgId (tenant)</div>
            <input value={orgId} onChange={(e) => setOrgId(e.target.value)} onKeyDown={onKeyDown} placeholder="OrgId" />
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              You must enter the organization ID you belong to.
            </div>
          </div>

          <button className="btn" onClick={onLogin} disabled={loading}>
            {loading ? "Logging in…" : "Login"}
          </button>

          {err ? <div style={{ color: "crimson", fontWeight: 700 }}>{err}</div> : null}
        </div>
      </div>
    </div>
  );
}
