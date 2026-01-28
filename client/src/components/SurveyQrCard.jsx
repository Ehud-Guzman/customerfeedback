import { useMemo, useState, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { buildPublicSurveyUrl } from "../lib/url";

/* ---------- helpers ---------- */
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
        gap: 6,
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
 * SurveyQrCard
 *
 * Props:
 *  - token: string (required)
 *  - meta?: { createdAt?: string|Date, expiresAt?: string|Date }
 */
export default function SurveyQrCard({ token, meta }) {
  const [copied, setCopied] = useState(false);

  /* ---------- URLs ---------- */
  const publicUrl = useMemo(
    () => (token ? buildPublicSurveyUrl(token) : ""),
    [token]
  );

  const kioskUrl = useMemo(() => {
    if (!publicUrl) return "";
    return publicUrl.includes("?")
      ? `${publicUrl}&mode=kiosk`
      : `${publicUrl}?mode=kiosk`;
  }, [publicUrl]);

  const createdAt = fmtDT(meta?.createdAt);
  const expiresAt = fmtDT(meta?.expiresAt);

  /* ---------- actions ---------- */
  const onCopy = useCallback(async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1100);
    } catch {
      window.prompt("Copy link:", publicUrl);
    }
  }, [publicUrl]);

  const onPrint = useCallback(() => {
    if (!publicUrl) return;

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Survey QR</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; }
    .wrap {
      max-width: 560px;
      margin: 0 auto;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 18px;
    }
    h1 { font-size: 18px; margin: 0 0 6px; }
    p { margin: 0 0 12px; color: #555; font-size: 12px; }
    .row { display: flex; gap: 16px; align-items: center; }
    .qr {
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 12px;
      width: 168px;
      height: 168px;
      display: grid;
      place-items: center;
    }
    .link {
      font-size: 12px;
      word-break: break-all;
      font-weight: 700;
    }
    .meta {
      margin-top: 10px;
      font-size: 11px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Scan to answer survey</h1>
    <p>Customers scan the QR code and submit feedback anonymously.</p>

    <div class="row">
      <div class="qr">
        <div style="font-size:10px;color:#666">Open link:</div>
        <div style="font-size:10px;word-break:break-all;margin-top:6px">
          ${publicUrl}
        </div>
      </div>
      <div style="flex:1">
        <div class="link">${publicUrl}</div>
        <div class="meta">
          Token: ${token}
          ${createdAt ? `<br/>Created: ${createdAt}` : ``}
          ${expiresAt ? `<br/>Expires: ${expiresAt}` : ``}
        </div>
      </div>
    </div>
  </div>
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
  }, [publicUrl, token, createdAt, expiresAt]);

  /* ---------- empty state ---------- */
  if (!token) {
    return (
      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 950, fontSize: 14 }}>Public QR</div>
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          No QR token exists yet for this survey.
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          Generate one above to enable public submissions.
        </div>
      </div>
    );
  }

  /* ---------- main ---------- */
  return (
    <div className="card" style={{ padding: 14 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontWeight: 950, fontSize: 14 }}>
            Scan to answer survey
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Customers scan → answer anonymously → submit.
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 10,
            }}
          >
            <Pill label="Token" value={token} />
            <Pill label="Created" value={createdAt} />
            <Pill label="Expires" value={expiresAt || "—"} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn-secondary" onClick={onCopy}>
            {copied ? "Copied ✅" : "Copy link"}
          </button>

          <a
            className="btn-secondary"
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open test
          </a>

          <a
            className="btn-secondary"
            href={kioskUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open kiosk
          </a>

          <button
            className="btn-secondary"
            onClick={onPrint}
            title="Print a clean QR handout"
          >
            Print
          </button>
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "180px 1fr",
          gap: 14,
          marginTop: 14,
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
          <QRCodeCanvas value={publicUrl} size={148} includeMargin />
        </div>

        <div>
          <div className="muted" style={{ fontSize: 12 }}>
            Public link
          </div>
          <div
            style={{
              wordBreak: "break-all",
              fontWeight: 900,
              marginTop: 6,
            }}
          >
            {publicUrl}
          </div>

          <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            Tip: place this QR near the exit or cashier for maximum response rate.
          </div>
        </div>
      </div>
    </div>
  );
}
