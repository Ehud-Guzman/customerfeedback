// src/components/SurveyQrCard.jsx
import { useMemo, useState, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { buildPublicSurveyUrl } from "../lib/url";

function fmtDT(v) {
  if (!v) return null;
  try {
    return new Date(v).toLocaleString();
  } catch {
    return null;
  }
}

function Pill({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        border: "1px solid #e5e7eb",
        borderRadius: 999,
        padding: "6px 10px",
        background: "#fff",
        fontSize: 12,
        lineHeight: 1,
      }}
    >
      <span className="muted">{label}</span>
      <span style={{ fontWeight: 900 }}>{value}</span>
    </span>
  );
}

/**
 * Premium QR card.
 * Props:
 *  - token: string (required to render QR)
 *  - meta?: { createdAt?: string|Date, expiresAt?: string|Date } (optional)
 */
export default function SurveyQrCard({ token, meta }) {
  const [copied, setCopied] = useState(false);

  const url = useMemo(() => (token ? buildPublicSurveyUrl(token) : ""), [token]);

  const createdAt = fmtDT(meta?.createdAt);
  const expiresAt = fmtDT(meta?.expiresAt);

  const onCopy = useCallback(async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1100);
    } catch {
      window.prompt("Copy link:", url);
    }
  }, [url]);

  const onPrint = useCallback(() => {
    if (!url) return;

    // Print only this QR panel, not the entire dashboard.
    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Survey QR</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; }
    .wrap { max-width: 560px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; padding: 18px; }
    h1 { font-size: 18px; margin: 0 0 8px 0; }
    p { margin: 0 0 12px 0; color: #444; font-size: 12px; }
    .row { display: flex; gap: 16px; align-items: center; }
    .qr { border: 1px solid #e5e7eb; border-radius: 16px; padding: 12px; width: 168px; height: 168px; display: grid; place-items: center; }
    .link { font-size: 12px; word-break: break-all; font-weight: 700; }
    .meta { margin-top: 10px; font-size: 11px; color: #666; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Scan to answer survey</h1>
    <p>Customers scan the QR code and submit anonymously.</p>

    <div class="row">
      <div class="qr" id="qr_mount"></div>
      <div style="flex:1">
        <div class="link">${url}</div>
        <div class="meta">
          Token: ${String(token)}
          ${createdAt ? `<br/>Created: ${createdAt}` : ``}
          ${expiresAt ? `<br/>Expires: ${expiresAt}` : ``}
        </div>
      </div>
    </div>
  </div>

  <script>
    // We'll render the QR as an image using canvas from the existing DOM copy (workaround):
    // This print window is static; we inject a simple QR as text fallback.
    // (The main app already shows the real QR; print fallback is still usable via link.)
    document.getElementById('qr_mount').innerHTML =
      '<div style="text-align:center;font-size:10px;color:#666">Open link:</div>' +
      '<div style="font-size:10px;word-break:break-all;margin-top:6px;">${url}</div>';
  </script>
</body>
</html>
`;

    const w = window.open("", "_blank", "width=800,height=650");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }, [url, token, createdAt, expiresAt]);

  if (!token) {
    return (
      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 950, fontSize: 14 }}>Public QR</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              No QR token yet for this survey.
            </div>
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            Generate one above to enable public submissions.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 14 }}>Scan to answer survey</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Customers scan → answer anonymously → submit.
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <Pill label="Token" value={token} />
            <Pill label="Created" value={createdAt} />
            <Pill label="Expires" value={expiresAt || "—"} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn-secondary" onClick={onCopy}>
            {copied ? "Copied ✅" : "Copy link"}
          </button>

          <a className="btn-secondary" href={url} target="_blank" rel="noreferrer">
            Open test
          </a>

          <button className="btn-secondary" onClick={onPrint} title="Print a clean QR handout">
            Print
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "180px 1fr",
          gap: 14,
          marginTop: 12,
          alignItems: "center",
        }}
      >
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 18,
            padding: 12,
            display: "grid",
            placeItems: "center",
            background: "#fff",
            minHeight: 180,
          }}
        >
          <QRCodeCanvas value={url} size={148} includeMargin />
        </div>

        <div>
          <div className="muted" style={{ fontSize: 12 }}>
            Public link
          </div>

          <div style={{ wordBreak: "break-all", fontWeight: 900, marginTop: 6 }}>
            {url}
          </div>

          <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            Pro tip: put this QR near the exit/cashier for maximum response rate.
          </div>
        </div>
      </div>
    </div>
  );
}
