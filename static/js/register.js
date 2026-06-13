import { redirectIfLoggedIn } from "./auth.js";

redirectIfLoggedIn();

const form      = document.getElementById("register-form");
const errorEl   = document.getElementById("register-error");
const submitBtn = document.getElementById("register-submit");
const coordsEl  = document.getElementById("map-coords");
const inputLat  = document.getElementById("input-latitude");
const inputLng  = document.getElementById("input-longitude");

// ── Mapa ──────────────────────────────────────────────────────────────────────

// Centro de Ciudad de Panamá
const PANAMA_CENTER = [8.9936, -79.5197];

const map = L.map("map", { zoomControl: true }).setView(PANAMA_CENTER, 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
  maxZoom: 19,
}).addTo(map);

// Marcador draggable con ícono turquesa personalizado
const markerIcon = L.divIcon({
  className: "",
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
    <path d="M16 0C7.163 0 0 7.163 0 16c0 10.5 16 24 16 24s16-13.5 16-24C32 7.163 24.837 0 16 0z"
      fill="#0d9488" stroke="#fff" stroke-width="1.5"/>
    <circle cx="16" cy="16" r="6" fill="#fff"/>
  </svg>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40],
});

const marker = L.marker(PANAMA_CENTER, {
  draggable: true,
  icon: markerIcon,
}).addTo(map);

marker.bindTooltip("Arrastra el pin a tu ubicación", {
  permanent: false,
  direction: "top",
  offset: [0, -36],
}).openTooltip();

function updateCoords(latlng) {
  const lat = latlng.lat.toFixed(6);
  const lng = latlng.lng.toFixed(6);
  inputLat.value = lat;
  inputLng.value = lng;
  coordsEl.textContent = `📍 ${lat}, ${lng}`;
}

// Actualizar al arrastrar el pin
marker.on("dragend", (e) => updateCoords(e.target.getLatLng()));

// También al hacer clic en el mapa: mueve el pin al clic
map.on("click", (e) => {
  marker.setLatLng(e.latlng);
  updateCoords(e.latlng);
});

// ── Formulario ────────────────────────────────────────────────────────────────

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
  errorEl.scrollIntoView({ behavior: "smooth", block: "center" });
}

function clearError() {
  errorEl.hidden = true;
  errorEl.textContent = "";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  const formData = new FormData(form);
  const payload = {
    account_type:     formData.get("account_type"),
    name:             formData.get("name")?.toString().trim(),
    email:            formData.get("email")?.toString().trim(),
    phone:            formData.get("phone")?.toString().trim(),
    password:         formData.get("password")?.toString(),
    password_confirm: formData.get("password_confirm")?.toString(),
    address_line:     formData.get("address_line")?.toString().trim(),
    corregimiento:    formData.get("corregimiento")?.toString().trim(),
    latitude:         formData.get("latitude")  ? Number(formData.get("latitude"))  : null,
    longitude:        formData.get("longitude") ? Number(formData.get("longitude")) : null,
  };

  submitBtn.disabled = true;
  submitBtn.textContent = "CREANDO…";

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showError(data.error || "No se pudo crear la cuenta.");
      return;
    }

    window.location.href = "/catalog";
  } catch {
    showError("Error de conexión. Intenta de nuevo.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "CREAR CUENTA";
  }
});
