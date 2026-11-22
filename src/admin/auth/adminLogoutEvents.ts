export const adminLogoutEventKey = "anm:admin-signed-out";

export function announceAdminLogout(): void {
  try {
    window.localStorage.setItem(adminLogoutEventKey, `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  } catch { /* Local sign-out must still work when browser storage is unavailable. */ }
}
