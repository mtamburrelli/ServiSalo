// ── Utilidades compartidas por todas las páginas del panel admin ────────────

export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

export function formatMoney(value) {
  const n = Number(value);
  return `B/. ${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}

export function formatDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-PA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const STATUS_LABELS = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  rejected: "Rechazado",
  dispatched: "En camino",
  delivered: "Entregado",
};

export function statusBadge(status) {
  const label = STATUS_LABELS[status] ?? status;
  return `<span class="badge badge--${escapeHtml(status)}">${escapeHtml(label)}</span>`;
}

export async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const message = body?.error || `Error ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    error.body = body;
    throw error;
  }

  return body;
}

let toastTimer = null;

export function showToast(message, variant = "default") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast toast--visible${variant === "error" ? " toast--error" : ""}`;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("toast--visible");
    setTimeout(() => { toast.hidden = true; }, 200);
  }, 3000);
}

export function debounce(fn, wait = 300) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

// ── Sidebar responsive + logout (se ejecuta en todas las páginas admin) ─────

const sidebar = document.getElementById("admin-sidebar");
const overlay = document.getElementById("admin-overlay");
const menuToggle = document.getElementById("admin-menu-toggle");

function closeSidebar() {
  sidebar?.classList.remove("admin-sidebar--open");
  if (overlay) overlay.hidden = true;
}

menuToggle?.addEventListener("click", () => {
  sidebar?.classList.add("admin-sidebar--open");
  if (overlay) overlay.hidden = false;
});

overlay?.addEventListener("click", closeSidebar);

document.getElementById("admin-logout")?.addEventListener("click", async () => {
  try {
    await fetchJson("/api/auth/logout", { method: "POST" });
  } finally {
    window.location.href = "/login";
  }
});
