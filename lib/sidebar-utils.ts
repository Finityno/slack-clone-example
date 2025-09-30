/**
 * Reads the sidebar state from cookies
 * Returns true if sidebar should be open, false otherwise
 * Defaults to true (open) if no cookie exists or during SSR
 */
export function getSidebarStateFromCookie(): boolean {
  // Return default during SSR
  if (typeof window === "undefined") return true;

  try {
    const cookies = document.cookie.split("; ");
    const sidebarCookie = cookies.find((cookie) =>
      cookie.startsWith("sidebar_state=")
    );

    if (!sidebarCookie) return true; // Default to open if no cookie exists

    const value = sidebarCookie.split("=")[1];
    return value === "true";
  } catch {
    // Fallback to default if any error occurs
    return true;
  }
}
