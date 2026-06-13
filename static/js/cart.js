/** Estado del carrito en memoria (luego: API + sesión de cliente). */

const PAYMENT_HINTS = {
  ach: "Transferencia bancaria local (ACH). Recibirás los datos al confirmar.",
  yappy: "Pago con Yappy (Panamá). Te indicaremos el número o enlace al confirmar.",
};

function linePrice(product, unitType) {
  return unitType === "unit" ? product.pricePerUnit : product.pricePerLb;
}

export function createCart() {
  /** @type {Map<number, { product: object, qty: number, unitType: string }>} */
  const lines = new Map();
  let paymentMethod = "ach";
  const listeners = new Set();

  function notify() {
    listeners.forEach((fn) => fn());
  }

  return {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    get paymentMethod() {
      return paymentMethod;
    },

    get paymentHint() {
      return PAYMENT_HINTS[paymentMethod];
    },

    setPaymentMethod(method) {
      if (method === "ach" || method === "yappy") {
        paymentMethod = method;
        notify();
      }
    },

    add(product, unitType = "lb") {
      const key = `${product.id}-${unitType}`;
      const existing = lines.get(key);
      if (existing) {
        existing.qty += 1;
      } else {
        lines.set(key, { product, qty: 1, unitType });
      }
      notify();
    },

    setQuantity(lineKey, qty) {
      if (qty <= 0) {
        lines.delete(lineKey);
      } else {
        const line = lines.get(lineKey);
        if (line) line.qty = qty;
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
      return [...lines.values()].reduce((n, l) => n + l.qty, 0);
    },

    get total() {
      return [...lines.values()].reduce(
        (sum, { product, qty, unitType }) => sum + linePrice(product, unitType) * qty,
        0
      );
    },

    isEmpty() {
      return lines.size === 0;
    },

    linePrice,
  };
}
