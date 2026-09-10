const form = document.getElementById("reset-form");
const errorEl = document.getElementById("reset-error");
const successEl = document.getElementById("reset-success");
const submitBtn = document.getElementById("reset-submit");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.hidden = true;
  successEl.hidden = true;

  const fd = new FormData(form);
  const token = fd.get("token")?.toString() || "";
  const password = fd.get("password")?.toString() || "";
  const password_confirm = fd.get("password_confirm")?.toString() || "";

  if (password.length < 6) {
    errorEl.textContent = "La contraseña debe tener al menos 6 caracteres.";
    errorEl.hidden = false;
    return;
  }
  if (password !== password_confirm) {
    errorEl.textContent = "Las contraseñas no coinciden.";
    errorEl.hidden = false;
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "GUARDANDO…";

  try {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ token, password, password_confirm }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      errorEl.textContent = data.error || "No se pudo actualizar la contraseña.";
      errorEl.hidden = false;
      return;
    }

    successEl.textContent = data.message || "Contraseña actualizada.";
    successEl.hidden = false;
    form.querySelectorAll("input").forEach((el) => {
      el.disabled = true;
    });
    submitBtn.textContent = "LISTO";

    setTimeout(() => {
      window.location.href = "/login";
    }, 1500);
  } catch {
    errorEl.textContent = "Error de conexión. Intenta de nuevo.";
    errorEl.hidden = false;
    submitBtn.disabled = false;
    submitBtn.textContent = "GUARDAR CONTRASEÑA";
  }
});
