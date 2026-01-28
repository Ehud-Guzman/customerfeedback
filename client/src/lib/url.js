// src/lib/url.js
export function getAppOrigin() {
  // If you have a separate frontend domain env, use it.
  // Otherwise fallback to browser origin.
  return import.meta.env.VITE_APP_ORIGIN || window.location.origin;
}

export function buildPublicSurveyUrl(token) {
  const origin = getAppOrigin();
  return `${origin}/public/q/${token}`;
}
