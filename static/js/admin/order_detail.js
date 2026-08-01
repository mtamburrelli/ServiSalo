import {
  STATUS_LABELS,
  escapeHtml,
  fetchJson,
  formatDate,
  formatMoney,
  showToast,
  statusBadge,
} from "./common.js";

const container = document.getElementById("order-content");
if (container) {
  const orderId = container.dataset.orderId;

  const loadingEl = document.getElementById("order-loading");
  const errorEl = document.getElementById("order-error");
  const bodyEl = document.getElementById("order-body");

  const statusBadgeEl = document.getElementById("order-status-badge");
  const itemsEl = document.getElementById("order-items");
  const totalEl = document.getElementById("order-total");
  const customerInfoEl = document.getElementById("order-customer-info");
  const addressTextEl = document.getElementById("order-address-text");
  const mapLinksEl = document.getElementById("order-map-links");

  const statusForm = document.getElementById("status-form");
  const statusSelect = document.getElementById("status-select");
  const rejectionField = document.getElementById("rejection-field");
  const rejectionInput = document.getElementById("rejection-reason");
  const statusSaveBtn = document.getElementById("status-save-btn");

  Object.entries(STATUS_LABELS).forEach(([value, label]) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    statusSelect.appendChild(opt);
  });

  statusSelect.addEventListener("change", () => {
    rejectionField.hidden = statusSelect.value !== "rejected";
  });

  const PANAMA_CENTER = [8.9936, -79.5197];
  let map = null;

  function renderMap(address) {
    map = L.map("order-map", { zoomControl: true, dragging: true, scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    if (address?.latitude && address?.longitude) {
      const latlng = [address.latitude, address.longitude];
      map.setView(latlng, 15);
      L.marker(latlng).addTo(map);
      mapLinksEl.innerHTML = `
        <a class="admin-btn admin-btn--sm" target="_blank"
          href="https://www.google.com/maps?q=${address.latitude},${address.longitude}">📍 Google Maps</a>
        <a class="admin-btn admin-btn--sm" target="_blank"
          href="https://waze.com/ul?ll=${address.latitude},${address.longitude}&navigate=yes">🚗 Waze</a>
      `;
    } else {
      map.setView(PANAMA_CENTER, 12);
      mapLinksEl.innerHTML = "";
    }
    setTimeout(() => map.invalidateSize(), 80);
  }

  function renderOrder(order) {
    statusBadgeEl.innerHTML = statusBadge(order.status);

    itemsEl.innerHTML = order.items.map((item) => `
      <tr>
        <td>${escapeHtml(item.product_name)}</td>
        <td class="admin-table__center">${item.quantity} ${item.unit_type === "unit" ? "ud" : "lb"}</td>
        <td class="admin-table__num">${formatMoney(item.unit_price)}</td>
        <td class="admin-table__num">${formatMoney(item.subtotal)}</td>
      </tr>
    `).join("");
    totalEl.textContent = formatMoney(order.total_amount);

    const user = order.user;
    customerInfoEl.innerHTML = `
      <div class="admin-info-row"><span class="admin-info-row__label">Nombre</span>
        <span class="admin-info-row__value">${escapeHtml(user?.name ?? "—")}</span></div>
      <div class="admin-info-row"><span class="admin-info-row__label">Correo</span>
        <span class="admin-info-row__value">${escapeHtml(user?.email ?? "—")}</span></div>
      <div class="admin-info-row"><span class="admin-info-row__label">Teléfono</span>
        <span class="admin-info-row__value">${escapeHtml(user?.phone ?? "—")}</span></div>
      <div class="admin-info-row"><span class="admin-info-row__label">Pago</span>
        <span class="admin-info-row__value">${order.payment_method === "ach" ? "ACH" : "Yappy"}</span></div>
      <div class="admin-info-row"><span class="admin-info-row__label">Fecha</span>
        <span class="admin-info-row__value">${formatDate(order.created_at)}</span></div>
      ${order.notes ? `<div class="admin-info-row"><span class="admin-info-row__label">Notas</span>
        <span class="admin-info-row__value">${escapeHtml(order.notes)}</span></div>` : ""}
      ${user ? `<div class="admin-info-row"><span class="admin-info-row__label"></span>
        <a class="admin-table__link" href="/admin/users/${user.id}">Ver perfil completo →</a></div>` : ""}
    `;

    const address = order.address;
    addressTextEl.textContent = address
      ? `${address.address_line}${address.corregimiento ? " · " + address.corregimiento : ""}`
      : "Sin dirección registrada.";

    statusSelect.value = order.status;
    rejectionField.hidden = order.status !== "rejected";
    rejectionInput.value = order.rejection_reason ?? "";

    renderMap(address);
  }

  async function loadOrder() {
    try {
      const order = await fetchJson(`/api/admin/orders/${orderId}`);
      loadingEl.hidden = true;
      bodyEl.hidden = false;
      renderOrder(order);
    } catch (err) {
      loadingEl.hidden = true;
      errorEl.hidden = false;
      errorEl.textContent = err.message || "No se pudo cargar la orden.";
    }
  }

  statusForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusSaveBtn.disabled = true;
    statusSaveBtn.textContent = "Guardando…";
    try {
      const order = await fetchJson(`/api/admin/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({
          status: statusSelect.value,
          rejection_reason: rejectionInput.value.trim(),
        }),
      });
      renderOrder(order.order);
      showToast("Estado actualizado.");
    } catch (err) {
      showToast(err.message || "No se pudo actualizar el estado.", "error");
    } finally {
      statusSaveBtn.disabled = false;
      statusSaveBtn.textContent = "Guardar estado";
    }
  });

  loadOrder();
}
