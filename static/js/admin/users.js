import { debounce, escapeHtml, fetchJson } from "./common.js";

const tbody = document.querySelector("#users-table tbody");
const errorEl = document.getElementById("users-error");
const searchInput = document.getElementById("users-search");
const accountTypeSelect = document.getElementById("users-account-type");
const sortSelect = document.getElementById("users-sort");
const dirSelect = document.getElementById("users-dir");

function renderRow(u) {
  return `
    <tr class="admin-table__row" data-href="/admin/users/${u.id}">
      <td>
        <div>${escapeHtml(u.name)}</div>
        <div class="admin-table__muted">${escapeHtml(u.email)}</div>
      </td>
      <td>${escapeHtml(u.phone ?? "—")}</td>
      <td>${u.account_type === "empresa" ? "Empresa" : "Persona"}</td>
      <td class="admin-table__center">${u.orders_count}</td>
      <td class="admin-table__center">
        <a class="admin-btn admin-btn--sm" href="/admin/users/${u.id}">Ver perfil</a>
      </td>
    </tr>
  `;
}

async function loadUsers() {
  errorEl.hidden = true;
  const params = new URLSearchParams();
  if (searchInput.value.trim()) params.set("q", searchInput.value.trim());
  if (accountTypeSelect.value) params.set("account_type", accountTypeSelect.value);
  params.set("sort", sortSelect.value);
  params.set("dir", dirSelect.value);

  tbody.innerHTML = `<tr><td colspan="5" class="admin-table__empty">Cargando…</td></tr>`;

  try {
    const users = await fetchJson(`/api/admin/users?${params.toString()}`);
    if (!users.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="admin-table__empty">No hay usuarios que coincidan con los filtros.</td></tr>`;
      return;
    }
    tbody.innerHTML = users.map(renderRow).join("");
  } catch (err) {
    errorEl.hidden = false;
    errorEl.textContent = err.message || "No se pudieron cargar los usuarios.";
    tbody.innerHTML = "";
  }
}

tbody.addEventListener("click", (e) => {
  if (e.target.closest("a")) return;
  const row = e.target.closest("[data-href]");
  if (row) window.location.href = row.dataset.href;
});

searchInput.addEventListener("input", debounce(loadUsers, 300));
accountTypeSelect.addEventListener("change", loadUsers);
sortSelect.addEventListener("change", loadUsers);
dirSelect.addEventListener("change", loadUsers);

loadUsers();
