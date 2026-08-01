import { debounce, escapeHtml, fetchJson, showToast } from "./common.js";

const tbody = document.querySelector("#products-table tbody");
const errorEl = document.getElementById("products-error");
const searchInput = document.getElementById("products-search");

const modal = document.getElementById("product-modal");
const form = document.getElementById("product-form");
const formError = document.getElementById("product-form-error");
const saveBtn = document.getElementById("btn-save-product");

const multiplierInput = document.getElementById("price-multiplier");
const applyToSelect = document.getElementById("price-apply-to");
const onlyActiveCheck = document.getElementById("price-only-active");
const applyMultiplierBtn = document.getElementById("btn-apply-multiplier");
const multiplierPreview = document.getElementById("price-multiplier-preview");

let products = [];

function renderRow(p) {
  return `
    <tr data-id="${p.id}">
      <td>
        <input class="admin-inline-input admin-inline-input--name" style="width:180px;text-align:left"
          data-field="name" value="${escapeHtml(p.name)}" />
      </td>
      <td class="admin-table__num">
        <input class="admin-inline-input" type="number" min="0" step="0.01" data-field="price_per_lb" value="${p.price_per_lb}" />
      </td>
      <td class="admin-table__num">
        <input class="admin-inline-input" type="number" min="0" step="0.01" data-field="price_per_unit" value="${p.price_per_unit}" />
      </td>
      <td class="admin-table__center">
        <span class="badge badge--${p.is_active ? "active" : "inactive"}">${p.is_active ? "Activo" : "Inactivo"}</span>
      </td>
      <td class="admin-table__center">
        <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">
          <button type="button" class="admin-btn admin-btn--sm" data-save="${p.id}">Guardar</button>
          <button type="button" class="admin-btn admin-btn--sm ${p.is_active ? "admin-btn--danger" : "admin-btn--gold"}" data-toggle="${p.id}">
            ${p.is_active ? "Desactivar" : "Activar"}
          </button>
        </div>
      </td>
    </tr>
  `;
}

function render() {
  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="admin-table__empty">No hay productos que coincidan.</td></tr>`;
    return;
  }
  tbody.innerHTML = products.map(renderRow).join("");
}

async function loadProducts() {
  errorEl.hidden = true;
  try {
    const q = searchInput.value.trim();
    const url = q ? `/api/admin/products?q=${encodeURIComponent(q)}` : "/api/admin/products";
    products = await fetchJson(url);
    render();
  } catch (err) {
    errorEl.hidden = false;
    errorEl.textContent = err.message || "No se pudieron cargar los productos.";
  }
}

function describeMultiplier(value) {
  const m = Number(value);
  if (!Number.isFinite(m) || m <= 0) {
    return "Ingresa un multiplicador mayor que 0.";
  }
  if (m === 1) {
    return "Con 1.00 los precios no cambian.";
  }
  const pct = Math.round(Math.abs(m - 1) * 1000) / 10;
  if (m > 1) {
    return `Esto subirá los precios un ${pct}% (× ${m}).`;
  }
  return `Esto bajará los precios un ${pct}% (× ${m}).`;
}

function updateMultiplierPreview() {
  multiplierPreview.textContent = describeMultiplier(multiplierInput.value);
}

tbody.addEventListener("click", async (e) => {
  const saveBtn2 = e.target.closest("[data-save]");
  const toggleBtn = e.target.closest("[data-toggle]");

  if (saveBtn2) {
    const id = saveBtn2.dataset.save;
    const row = tbody.querySelector(`tr[data-id="${id}"]`);
    const name = row.querySelector('[data-field="name"]').value.trim();
    const pricePerLb = row.querySelector('[data-field="price_per_lb"]').value;
    const pricePerUnit = row.querySelector('[data-field="price_per_unit"]').value;

    saveBtn2.disabled = true;
    saveBtn2.textContent = "Guardando…";
    try {
      await fetchJson(`/api/admin/products/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name,
          price_per_lb: Number(pricePerLb),
          price_per_unit: Number(pricePerUnit),
        }),
      });
      showToast("Producto actualizado.");
      await loadProducts();
    } catch (err) {
      showToast(err.message || "No se pudo guardar.", "error");
    } finally {
      saveBtn2.disabled = false;
      saveBtn2.textContent = "Guardar";
    }
  }

  if (toggleBtn) {
    const id = toggleBtn.dataset.toggle;
    toggleBtn.disabled = true;
    try {
      await fetchJson(`/api/admin/products/${id}/toggle`, { method: "PATCH" });
      await loadProducts();
      showToast("Disponibilidad actualizada.");
    } catch (err) {
      showToast(err.message || "No se pudo actualizar.", "error");
      toggleBtn.disabled = false;
    }
  }
});

searchInput.addEventListener("input", debounce(loadProducts, 300));

multiplierInput.addEventListener("input", updateMultiplierPreview);
updateMultiplierPreview();

applyMultiplierBtn.addEventListener("click", async () => {
  const multiplier = Number(multiplierInput.value);
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    showToast("El multiplicador debe ser un número mayor que 0.", "error");
    return;
  }
  if (multiplier === 1) {
    showToast("Con 1.00 no hay cambios que aplicar.");
    return;
  }

  const applyTo = applyToSelect.value;
  const onlyActive = onlyActiveCheck.checked;
  const scopeLabel = {
    both: "precios por libra y por unidad",
    lb: "solo precios por libra",
    unit: "solo precios por unidad",
  }[applyTo];
  const activeLabel = onlyActive ? "solo productos activos" : "todos los productos";

  const ok = window.confirm(
    `${describeMultiplier(multiplier)}\n\nSe actualizarán ${scopeLabel} de ${activeLabel}.\n\n¿Continuar?`
  );
  if (!ok) return;

  applyMultiplierBtn.disabled = true;
  applyMultiplierBtn.textContent = "Aplicando…";
  try {
    const result = await fetchJson("/api/admin/products/multiply-prices", {
      method: "POST",
      body: JSON.stringify({
        multiplier,
        apply_to: applyTo,
        only_active: onlyActive,
      }),
    });
    showToast(`Precios actualizados en ${result.updated_count} producto(s).`);
    await loadProducts();
  } catch (err) {
    showToast(err.message || "No se pudieron actualizar los precios.", "error");
  } finally {
    applyMultiplierBtn.disabled = false;
    applyMultiplierBtn.textContent = "Aplicar multiplicador";
  }
});

document.getElementById("btn-new-product").addEventListener("click", () => {
  form.reset();
  formError.hidden = true;
  modal.hidden = false;
});

document.getElementById("btn-cancel-product").addEventListener("click", () => {
  modal.hidden = true;
});

modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.hidden = true;
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.hidden = true;

  const data = new FormData(form);
  const payload = {
    name: data.get("name")?.toString().trim(),
    price_per_lb: Number(data.get("price_per_lb")),
    price_per_unit: Number(data.get("price_per_unit")),
    image_url: data.get("image_url")?.toString().trim() || null,
  };

  saveBtn.disabled = true;
  saveBtn.textContent = "Creando…";
  try {
    await fetchJson("/api/admin/products", { method: "POST", body: JSON.stringify(payload) });
    modal.hidden = true;
    showToast("Producto creado.");
    await loadProducts();
  } catch (err) {
    formError.hidden = false;
    formError.textContent = err.message || "No se pudo crear el producto.";
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Crear";
  }
});

loadProducts();
