import { escapeHtml, fetchJson, formatDate, formatMoney, showToast, statusBadge } from "./common.js";

const cardsEl = document.getElementById("stats-cards");
const tbody = document.querySelector("#recent-orders-table tbody");

function renderCards(stats) {
  const cards = [
    { label: "Órdenes pendientes", value: stats.pending_orders, tone: "gold" },
    { label: "Total de órdenes", value: stats.total_orders, tone: "turquoise" },
    { label: "Ingresos confirmados", value: formatMoney(stats.revenue), tone: "turquoise" },
    { label: "Productos activos", value: `${stats.active_products} / ${stats.total_products}`, tone: "gold" },
    { label: "Clientes registrados", value: stats.total_users, tone: "turquoise" },
  ];

  cardsEl.innerHTML = cards.map((c) => `
    <div class="admin-card admin-card--${c.tone}">
      <p class="admin-card__label">${escapeHtml(c.label)}</p>
      <p class="admin-card__value">${escapeHtml(String(c.value))}</p>
    </div>
  `).join("");
}

function renderRecentOrders(orders) {
  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="admin-table__empty">Aún no hay órdenes.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map((o) => `
    <tr class="admin-table__row" data-href="/admin/orders/${o.id}">
      <td>#${o.id}</td>
      <td>${escapeHtml(o.user?.name ?? "—")}</td>
      <td>${formatDate(o.created_at)}</td>
      <td>${statusBadge(o.status)}</td>
      <td class="admin-table__num">${formatMoney(o.total_amount)}</td>
    </tr>
  `).join("");
}

async function init() {
  try {
    const stats = await fetchJson("/api/admin/stats");
    renderCards(stats);
    renderRecentOrders(stats.recent_orders || []);
  } catch (err) {
    showToast(err.message || "No se pudieron cargar las estadísticas.", "error");
  }
}

document.addEventListener("click", (e) => {
  const row = e.target.closest("[data-href]");
  if (row) window.location.href = row.dataset.href;
});

init();
