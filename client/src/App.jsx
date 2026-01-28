import { Navigate, Route, Routes } from "react-router-dom";

import { storage } from "./lib/storage.js";

import PublicSurveyPage from "./pages/PublicSurveyPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import StaffSubmitPage from "./pages/StaffSubmitPage.jsx";
import OverviewPage from "./pages/OverviewPage.jsx";
import AdminShell from "./pages/AdminShell.jsx";
import SurveyAnalyticsPage from "./pages/SurveyAnalyticsPage.jsx";

function RequireAuth({ children }) {
  const token = storage.getToken();
  if (!token) return <Navigate to="/login" replace />;

  const orgId = storage.getOrgId();
  if (!orgId) return <Navigate to="/login" replace />;

  return children;
}

export default function App() {
  const token = storage.getToken();

  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/q/:token" element={<PublicSurveyPage />} />

      {/* AUTH */}
      <Route path="/login" element={<LoginPage />} />

      {/* DEFAULT */}
      <Route
        path="/"
        element={<Navigate to={token ? "/app/overview" : "/login"} replace />}
      />

      {/* PROTECTED APP */}
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AdminShell />
          </RequireAuth>
        }
      >
        <Route path="overview" element={<OverviewPage />} />
        <Route path="surveys/:surveyId" element={<SurveyAnalyticsPage />} />
      </Route>

      {/* STAFF */}
      <Route
        path="/staff/submit"
        element={
          <RequireAuth>
            <StaffSubmitPage />
          </RequireAuth>
        }
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
