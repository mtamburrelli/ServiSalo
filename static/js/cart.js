/** Estado del carrito en memoria. */

function linePrice(product, unitType) {
  return unitType === "unit" ? product.pricePerUnit : product.pricePerLb;
}

function normalizeQty(qty, unitType) {
  const n = Number(qty);
  if (!Number.isFinite(n) || n <= 0) return 0;
  // Unidades: enteros. Libras: hasta 2 decimales (ej. 1.25 lb).
  if (unitType === "unit") return Math.max(1, Math.round(n));
  return Math.round(n * 100) / 100;
}

export function createCart() {
  /** @type {Map<string, { product: object, qty: number, unitType: string }>} */
  const lines = new Map();
  const listeners = new Set();

  function notify() {
    listeners.forEach((fn) => fn());
  }

  return {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    add(product, unitType = "lb") {
      const key = `${product.id}-${unitType}`;
      const existing = lines.get(key);
      if (existing) {
        existing.qty = normalizeQty(existing.qty + 1, unitType);
      } else {
        lines.set(key, { product, qty: 1, unitType });
      }
      notify();
    },

    setQuantity(lineKey, qty) {
      const line = lines.get(lineKey);
      if (!line) return;

      const normalized = normalizeQty(qty, line.unitType);
      if (normalized <= 0) {
        lines.delete(lineKey);
      } else {
        line.qty = normalized;
      }
      notify();
    },

    remove(lineKey) {
      lines.delete(lineKey);
      notify();
    },

    getLines() {
      return [...lines.entries()].map(([key, line]) => ({ key, ...line }));
    },

    get itemCount() {
      // Badge: suma de unidades enteras + 1 por cada línea de libras
      return [...lines.values()].reduce(
        (n, l) => n + (l.unitType === "unit" ? l.qty : 1),
        0
      );
    },

    get total() {
      const raw = [...lines.values()].reduce(
        (sum, { product, qty, unitType }) => sum + linePrice(product, unitType) * qty,
        0
      );
      return Math.round(raw * 100) / 100;
    },

    isEmpty() {
      return lines.size === 0;
    },

    linePrice,
  };
}
