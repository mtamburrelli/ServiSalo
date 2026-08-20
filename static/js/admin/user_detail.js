import { escapeHtml, fetchJson, formatDate, formatMoney, statusBadge } from "./common.js";

const container = document.getElementById("user-content");
if (container) {
  const userId = container.dataset.userId;

  const loadingEl = document.getElementById("user-loading");
  const errorEl = document.getElementById("user-error");
  const bodyEl = document.getElementById("user-body");
  const infoEl = document.getElementById("user-info");
  const addressTextEl = document.getElementById("user-address-text");
  const mapLinksEl = document.getElementById("user-map-links");
  const ordersEl = document.getElementById("user-orders");

  const PANAMA_CENTER = [8.9936, -79.5197];

  function renderMap(address) {
    const map = L.map("user-map", { zoomControl: true, dragging: true, scrollWheelZoom: false });
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

  function renderInfo(user) {
    const verified = user.email_verified
      ? `<span class="badge badge--active">Verificado</span>`
      : `<span class="badge badge--inactive">Sin verificar</span>`;
    infoEl.innerHTML = `
      <div class="admin-info-row"><span class="admin-info-row__label">Nombre</span>
        <span class="admin-info-row__value">${escapeHtml(user.name)}</span></div>
      <div class="admin-info-row"><span class="admin-info-row__label">Correo</span>
        <span class="admin-info-row__value">${escapeHtml(user.email)}</span></div>
      <div class="admin-info-row"><span class="admin-info-row__label">Email</span>
        <span class="admin-info-row__value">${verified}
          ${user.email_verified ? "" : `
          <button type="button" class="admin-btn admin-btn--sm admin-btn--gold" id="btn-verify-email" style="margin-left:8px">
            Marcar verificado
          </button>`}
        </span></div>
      <div class="admin-info-row"><span class="admin-info-row__label">Teléfono</span>
        <span class="admin-info-row__value">${escapeHtml(user.phone ?? "—")}</span></div>
      <div class="admin-info-row"><span class="admin-info-row__label">Tipo de cuenta</span>
        <span class="admin-info-row__value">${user.account_type === "empresa" ? "Empresa" : "Persona"}</span></div>
      ${user.account_type === "empresa" ? `
      <div class="admin-info-row"><span class="admin-info-row__label">RUC</span>
        <span class="admin-info-row__value">${escapeHtml(user.ruc ?? "—")}-${escapeHtml(user.ruc_dv ?? "")}</span></div>
      ` : ""}
      <div class="admin-info-row"><span class="admin-info-row__label">Cliente desde</span>
        <span class="admin-info-row__value">${formatDate(user.created_at)}</span></div>
      <div class="admin-info-row"><span class="admin-info-row__label">Total de pedidos</span>
        <span class="admin-info-row__value">${user.orders_count}</span></div>
    `;

    document.getElementById("btn-verify-email")?.addEventListener("click", async () => {
      try {
        await fetchJson(`/api/admin/users/${userId}/verify-email`, { method: "POST" });
        await loadUser();
      } catch (err) {
        errorEl.hidden = false;
        errorEl.textContent = err.message || "No se pudo verificar.";
      }
    });
  }

  function renderOrders(orders) {
    if (!orders.length) {
      ordersEl.innerHTML = `<tr><td colspan="5" class="admin-table__empty">Este cliente aún no tiene pedidos.</td></tr>`;
      return;
    }
    ordersEl.innerHTML = orders.map((o) => `
      <tr class="admin-table__row" data-href="/admin/orders/${o.id}">
        <td>#${o.id}</td>
        <td>${formatDate(o.created_at)}</td>
        <td class="admin-table__center">${statusBadge(o.status)}</td>
        <td class="admin-table__num">${formatMoney(o.total_amount)}</td>
        <td class="admin-table__center">
          <a class="admin-btn admin-btn--sm" href="/admin/orders/${o.id}">Ver detalle</a>
        </td>
      </tr>
    `).join("");
  }

  async function loadUser() {
    try {
      const data = await fetchJson(`/api/admin/users/${userId}`);
      loadingEl.hidden = true;
      bodyEl.hidden = false;

      renderInfo(data.user);

      const address = data.address;
      addressTextEl.textContent = address
        ? `${address.address_line}${address.corregimiento ? " · " + address.corregimiento : ""}`
        : "Sin dirección registrada.";
      renderMap(address);

      renderOrders(data.orders);
    } catch (err) {
      loadingEl.hidden = true;
      errorEl.hidden = false;
      errorEl.textContent = err.message || "No se pudo cargar el perfil.";
    }
  }

  ordersEl.addEventListener("click", (e) => {
    if (e.target.closest("a")) return;
    const row = e.target.closest("[data-href]");
    if (row) window.location.href = row.dataset.href;
  });

  loadUser();
}
