export async function fetchSession() {
  const res = await fetch("/api/auth/me", { credentials: "same-origin" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.authenticated ? data.user : null;
}

export async function isLoggedIn() {
  const user = await fetchSession();
  return Boolean(user);
}

export async function requireAuth() {
  const user = await fetchSession();
  if (!user) {
    window.location.href = "/login";
    return null;
  }
  return user;
}

export async function redirectIfLoggedIn(target = "/catalog") {
  const user = await fetchSession();
  if (user) {
    window.location.href = target;
  }
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
}
