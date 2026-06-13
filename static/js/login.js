import { redirectIfLoggedIn } from "./auth.js";

redirectIfLoggedIn();

const form = document.getElementById("login-form");
const errorEl = document.getElementById("login-error");
const submitBtn = document.getElementById("login-submit");

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearError() {
  errorEl.hidden = true;
  errorEl.textContent = "";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  const formData = new FormData(form);
  const email = formData.get("email")?.toString().trim() || "";
  const password = formData.get("password")?.toString() || "";

  if (!email || !password) {
    showError("Correo y contraseña son obligatorios.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "INGRESANDO…";

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showError(data.error || "No se pudo iniciar sesión.");
      return;
    }

    window.location.href = "/catalog";
  } catch {
    showError("Error de conexión. Intenta de nuevo.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "INGRESAR";
  }
});
