/** Estado del carrito en memoria (luego: API + sesión de cliente). */

const PAYMENT_HINTS = {
  ach: "Transferencia bancaria local (ACH). Recibirás los datos al confirmar.",
  yappy: "Pago con Yappy (Panamá). Te indicaremos el número o enlace al confirmar.",
};

export function createCart() {
  /** @type {Map<number, { legume: object, qty: number }>} */
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

    add(legume) {
      const existing = lines.get(legume.id);
      if (existing) {
        existing.qty += 1;
      } else {
        lines.set(legume.id, { legume, qty: 1 });
      }
      notify();
    },

    setQuantity(legumeId, qty) {
      if (qty <= 0) {
        lines.delete(legumeId);
      } else {
        const line = lines.get(legumeId);
        if (line) line.qty = qty;
      }
      notify();
    },

    remove(legumeId) {
      lines.delete(legumeId);
      notify();
    },

    getLines() {
      return [...lines.values()];
    },

    get itemCount() {
      return [...lines.values()].reduce((n, l) => n + l.qty, 0);
    },

    get total() {
      return [...lines.values()].reduce(
        (sum, { legume, qty }) => sum + legume.pricePerLb * qty,
        0
      );
    },

    isEmpty() {
      return lines.size === 0;
    },
  };
}
