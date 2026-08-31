const STORAGE_KEY = "servisalo_tour_v2";

const STEPS = [
  {
    tab: "catalog",
    target: ".legume-card",
    fallback: "[data-tour='catalog-products']",
    title: "1. Elige tus productos",
    text: "Toca lb o ud en cada legumbre para agregarla. Puedes mezclar libras y unidades.",
  },
  {
    tab: "cart",
    target: "[data-tour='nav-cart']",
    title: "2. Revisa el carrito",
    text: "Aquí ves lo que armaste y cambias las cantidades. Aún no eliges cómo pagar: eso viene después.",
  },
  {
    tab: "cart",
    target: "[data-tour='cart-pay']",
    fallback: "[data-tour='cart-panel']",
    title: "3. Envía tu pedido",
    text: "Pulsa Enviar pedido. Queda pendiente y el dueño recibe un aviso para aceptarlo o rechazarlo.",
  },
  {
    tab: "orders",
    target: "[data-tour='nav-orders']",
    title: "4. Sigue tu pedido",
    text: "Si lo aceptan, te llega un correo con ACH y Yappy y el dueño te contacta para el pago y la entrega. Si lo rechazan, te escriben el motivo.",
  },
  {
    tab: "catalog",
    target: "[data-tour='whatsapp']",
    title: "5. ¿Necesitas ayuda?",
    text: "Este botón abre un chat de WhatsApp con ServiSalo si tienes dudas.",
  },
];

let switchTabFn = null;
let current = 0;
let overlay = null;

export function hasSeenTour() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markTourSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function startCatalogTour({ switchTab, force = false } = {}) {
  switchTabFn = typeof switchTab === "function" ? switchTab : null;
  if (!force && hasSeenTour()) return;
  current = 0;
  document.body.classList.add("tour-active");
  buildOverlay();
  showStep(0);
}

function buildOverlay() {
  overlay?.remove();
  overlay = document.createElement("div");
  overlay.className = "tour-root";
  overlay.innerHTML = `
    <div class="tour-dim" aria-hidden="true"></div>
    <div class="tour-hole" aria-hidden="true"></div>
    <div class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <p class="tour-card__step" id="tour-step-label"></p>
      <h2 class="tour-card__title" id="tour-title"></h2>
      <p class="tour-card__text" id="tour-text"></p>
      <div class="tour-card__actions">
        <button type="button" class="tour-btn tour-btn--ghost" data-tour-skip>Saltar</button>
        <button type="button" class="tour-btn tour-btn--primary" data-tour-next>Siguiente</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector("[data-tour-skip]").addEventListener("click", endTour);
  overlay.querySelector("[data-tour-next]").addEventListener("click", () => {
    if (current >= STEPS.length - 1) {
      endTour();
      return;
    }
    showStep(current + 1);
  });
  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("orientationchange", onResize);
}

function onResize() {
  if (!overlay) return;
  placeSpotlight(STEPS[current]);
}

function showStep(index) {
  current = index;
  const step = STEPS[index];
  switchTabFn?.(step.tab);

  overlay.querySelector("#tour-step-label").textContent = `${index + 1} de ${STEPS.length}`;
  overlay.querySelector("#tour-title").textContent = step.title;
  overlay.querySelector("#tour-text").textContent = step.text;
  overlay.querySelector("[data-tour-next]").textContent =
    index === STEPS.length - 1 ? "Entendido" : "Siguiente";

  requestAnimationFrame(() => {
    requestAnimationFrame(() => placeSpotlight(step));
  });
}

function placeSpotlight(step) {
  const hole = overlay.querySelector(".tour-hole");
  const card = overlay.querySelector(".tour-card");
  const el =
    document.querySelector(step.target) ||
    (step.fallback ? document.querySelector(step.fallback) : null);

  overlay.querySelectorAll(".tour-target").forEach((n) => n.classList.remove("tour-target"));

  if (!el) {
    hole.style.opacity = "0";
    card.classList.remove("tour-card--above-nav");
    return;
  }

  el.classList.add("tour-target");
  const rect = el.getBoundingClientRect();
  const pad = 8;
  hole.style.opacity = "1";
  hole.style.top = `${Math.max(8, rect.top - pad)}px`;
  hole.style.left = `${Math.max(8, rect.left - pad)}px`;
  hole.style.width = `${Math.min(window.innerWidth - 16, rect.width + pad * 2)}px`;
  hole.style.height = `${Math.min(window.innerHeight - 16, rect.height + pad * 2)}px`;

  const navish = rect.bottom > window.innerHeight - 90;
  card.classList.toggle("tour-card--above-nav", navish);
}

function endTour() {
  markTourSeen();
  window.removeEventListener("resize", onResize);
  window.removeEventListener("orientationchange", onResize);
  document.body.classList.remove("tour-active");
  overlay?.querySelectorAll(".tour-target").forEach((n) => n.classList.remove("tour-target"));
  overlay?.remove();
  overlay = null;
  switchTabFn?.("catalog");
}
