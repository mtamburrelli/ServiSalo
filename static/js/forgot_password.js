const form = document.getElementById("forgot-form");
const errorEl = document.getElementById("forgot-error");
const successEl = document.getElementById("forgot-success");
const submitBtn = document.getElementById("forgot-submit");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.hidden = true;
  successEl.hidden = true;

  const email = new FormData(form).get("email")?.toString().trim() || "";
  if (!email) {
    errorEl.textContent = "Ingresa tu correo.";
    errorEl.hidden = false;
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "ENVIANDO…";

  try {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    successEl.textContent =
      data.message ||
      "Si existe una cuenta con ese correo, te enviamos un enlace.";
    successEl.hidden = false;
  } catch {
    errorEl.textContent = "Error de conexión. Intenta de nuevo.";
    errorEl.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "ENVIAR ENLACE";
  }
});
