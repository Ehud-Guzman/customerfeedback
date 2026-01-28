export function smartBack(nav, fallback = "/app/overview") {
  // If there is history (typical), go back. If user entered via URL, fallback.
  if (window.history.length > 1) nav(-1);
  else nav(fallback, { replace: true });
}
