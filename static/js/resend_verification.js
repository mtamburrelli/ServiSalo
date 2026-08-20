const form = document.getElementById("resend-form");
const errorEl = document.getElementById("resend-error");
const successEl = document.getElementById("resend-success");
const submitBtn = document.getElementById("resend-submit");

if (form) {
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
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      successEl.textContent =
        data.message || "Si la cuenta existe, enviamos un nuevo correo.";
      successEl.hidden = false;
    } catch {
      errorEl.textContent = "Error de conexión. Intenta de nuevo.";
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "REENVIAR CORREO";
    }
  });
}
