import {
  STATUS_LABELS,
  debounce,
  escapeHtml,
  fetchJson,
  formatDate,
  formatMoney,
  showToast,
  statusBadge,
} from "./common.js";

const tbody = document.querySelector("#orders-table tbody");
const errorEl = document.getElementById("orders-error");
const searchInput = document.getElementById("orders-search");
const statusSelect = document.getElementById("orders-status");
const sortSelect = document.getElementById("orders-sort");
const dirSelect = document.getElementById("orders-dir");

Object.entries(STATUS_LABELS).forEach(([value, label]) => {
  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = label;
  statusSelect.appendChild(opt);
});

function renderRow(o) {
  return `
    <tr class="admin-table__row" data-href="/admin/orders/${o.id}">
      <td>#${o.id}</td>
      <td>
        <div>${escapeHtml(o.user?.name ?? "—")}</div>
        <div class="admin-table__muted">${escapeHtml(o.user?.email ?? "")}</div>
      </td>
      <td>${formatDate(o.created_at)}</td>
      <td class="admin-table__center">${statusBadge(o.status)}</td>
      <td class="admin-table__num">${formatMoney(o.total_amount)}</td>
      <td class="admin-table__center">
        <a class="admin-btn admin-btn--sm" href="/admin/orders/${o.id}">Ver detalle</a>
      </td>
    </tr>
  `;
}

async function loadOrders() {
  errorEl.hidden = true;
  const params = new URLSearchParams();
  if (searchInput.value.trim()) params.set("q", searchInput.value.trim());
  if (statusSelect.value) params.set("status", statusSelect.value);
  params.set("sort", sortSelect.value);
  params.set("dir", dirSelect.value);

  tbody.innerHTML = `<tr><td colspan="6" class="admin-table__empty">Cargando…</td></tr>`;

  try {
    const orders = await fetchJson(`/api/admin/orders?${params.toString()}`);
    if (!orders.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="admin-table__empty">No hay órdenes que coincidan con los filtros.</td></tr>`;
      return;
    }
    tbody.innerHTML = orders.map(renderRow).join("");
  } catch (err) {
    errorEl.hidden = false;
    errorEl.textContent = err.message || "No se pudieron cargar las órdenes.";
    tbody.innerHTML = "";
  }
}

tbody.addEventListener("click", (e) => {
  if (e.target.closest("a")) return;
  const row = e.target.closest("[data-href]");
  if (row) window.location.href = row.dataset.href;
});

searchInput.addEventListener("input", debounce(loadOrders, 300));
statusSelect.addEventListener("change", loadOrders);
sortSelect.addEventListener("change", loadOrders);
dirSelect.addEventListener("change", loadOrders);

loadOrders();
