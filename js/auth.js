const SESSION_KEY = "servisalo_session";

export function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

export function setLoggedIn() {
  sessionStorage.setItem(SESSION_KEY, "1");
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
  }
}

export function redirectIfLoggedIn(target = "catalog.html") {
  if (isLoggedIn()) {
    window.location.href = target;
  }
}
