import { LEGUMES } from "./data/legumes.js";
import { createCart } from "./cart.js";
import { requireAuth, logout } from "./auth.js";

requireAuth();

const cart = createCart();

const $ = (sel) => document.querySelector(sel);

const catalogList = $("#catalog-list");
const panelCatalog = $("#panel-catalog");
const panelCart = $("#panel-cart");
const cartEmpty = $("#cart-empty");
const cartLines = $("#cart-lines");
const cartCheckout = $("#cart-checkout");
const cartTotal = $("#cart-total");
const cartBadge = $("#cart-badge");
const paymentHint = $("#payment-hint");
const btnCheckout = $("#btn-checkout");
const btnLogout = $("#btn-logout");
const toast = $("#toast");

const IMAGE_PLACEHOLDER_SVG = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M14 6l-3.75 5 2.85 3.8-1.6 1.2C7.4 12.36 4 14.79 4 18v2h16v-2c0-3.31-3.1-5.72-7.5-8.2L14 6zm-2-4L2 18h2.5l2.04-2.73L9 18h1.5l2.46-3.27L15 18h2.5L12 2z"/>
  </svg>
  <span>Imagen</span>
`;

function formatPrice(value) {
  return `B/. ${value.toFixed(2)} / lb`;
}

function formatTotal(value) {
  return `B/. ${value.toFixed(2)}`;
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  toast.classList.add("toast--visible");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.classList.remove("toast--visible");
    setTimeout(() => {
      toast.hidden = true;
    }, 200);
  }, 2200);
}

function renderCatalog() {
  catalogList.innerHTML = LEGUMES.map(
    (legume) => `
    <li class="legume-card" data-id="${legume.id}">
      <div class="legume-card__image">
        ${
          legume.imageUrl
            ? `<img src="${legume.imageUrl}" alt="" loading="lazy" />`
            : IMAGE_PLACEHOLDER_SVG
        }
      </div>
      <div class="legume-card__body">
        <h2 class="legume-card__name">${escapeHtml(legume.name)}</h2>
        <p class="legume-card__price">${formatPrice(legume.pricePerLb)}</p>
      </div>
      <button type="button" class="legume-card__add" data-add="${legume.id}" aria-label="Agregar ${escapeHtml(legume.name)} al carrito">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M11 9h2V6h3V4h-3V1h-2v3H8v2h3v3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zM7.16 14l.84-2h8.45l1.2 3H7.16zM6.21 6l-1.1-2H1v2h2l3.6 7.59-1.35 2.44C5.09 16.37 5.5 17 6.21 17h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 20 4H5.21L4.27 2H1V0h3.74c.67 0 1.27.42 1.5 1.05L6.21 6z"/>
        </svg>
      </button>
    </li>
  `
  ).join("");
}

function renderCart() {
  const lines = cart.getLines();
  const empty = cart.isEmpty();

  cartEmpty.hidden = !empty;
  cartLines.hidden = empty;
  cartCheckout.hidden = empty;
  btnCheckout.disabled = empty;

  if (empty) {
    cartLines.innerHTML = "";
    cartTotal.textContent = formatTotal(0);
    updateBadge();
    return;
  }

  cartLines.innerHTML = lines
    .map(
      ({ legume, qty }) => `
    <li class="cart-line" data-id="${legume.id}">
      <div class="cart-line__thumb">${IMAGE_PLACEHOLDER_SVG.replace("<span>Imagen</span>", "")}</div>
      <div class="cart-line__info">
        <p class="cart-line__name">${escapeHtml(legume.name)}</p>
        <p class="cart-line__price">${formatPrice(legume.pricePerLb)}</p>
      </div>
      <div class="cart-line__qty">
        <button type="button" data-dec="${legume.id}" aria-label="Quitar una unidad">−</button>
        <span>${qty}</span>
        <button type="button" data-inc="${legume.id}" aria-label="Agregar una unidad">+</button>
      </div>
      <button type="button" class="cart-line__qty cart-line__remove" data-remove="${legume.id}" aria-label="Eliminar del carrito">
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      </button>
    </li>
  `
    )
    .join("");

  cartTotal.textContent = formatTotal(cart.total);
  paymentHint.textContent = cart.paymentHint;
  updateBadge();
}

function updateBadge() {
  const count = cart.itemCount;
  if (count > 0) {
    cartBadge.hidden = false;
    cartBadge.textContent = count > 99 ? "99+" : String(count);
  } else {
    cartBadge.hidden = true;
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function switchTab(tab) {
  const isCatalog = tab === "catalog";
  panelCatalog.classList.toggle("panel--active", isCatalog);
  panelCatalog.hidden = !isCatalog;
  panelCart.classList.toggle("panel--active", !isCatalog);
  panelCart.hidden = isCatalog;

  document.querySelectorAll(".bottom-nav__item").forEach((btn) => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle("bottom-nav__item--active", active);
    btn.setAttribute("aria-current", active ? "page" : "false");
  });
}

function findLegume(id) {
  return LEGUMES.find((l) => l.id === id);
}

// Catálogo: agregar al carrito
catalogList.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-add]");
  if (!btn) return;
  const legume = findLegume(Number(btn.dataset.add));
  if (!legume) return;
  cart.add(legume);
  showToast(`${legume.name} agregado al carrito`);
});

// Carrito: cantidades
cartLines.addEventListener("click", (e) => {
  const inc = e.target.closest("[data-inc]");
  const dec = e.target.closest("[data-dec]");
  const rem = e.target.closest("[data-remove]");

  if (inc) {
    const legume = findLegume(Number(inc.dataset.inc));
    if (legume) cart.add(legume);
  } else if (dec) {
    const id = Number(dec.dataset.dec);
    const line = cart.getLines().find((l) => l.legume.id === id);
    if (line) cart.setQuantity(id, line.qty - 1);
  } else if (rem) {
    cart.remove(Number(rem.dataset.remove));
  }
});

// Navegación inferior
document.querySelectorAll(".bottom-nav__item").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

// Método de pago
document.querySelectorAll(".payment-toggle__btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".payment-toggle__btn").forEach((b) => {
      b.classList.toggle("payment-toggle__btn--active", b === btn);
    });
    cart.setPaymentMethod(btn.dataset.payment);
    paymentHint.textContent = cart.paymentHint;
  });
});

btnCheckout.addEventListener("click", () => {
  const method = cart.paymentMethod === "ach" ? "ACH" : "Yappy";
  showToast(`Pedido de prueba registrado (${method}). Backend pendiente.`);
});

btnLogout?.addEventListener("click", () => {
  logout();
  window.location.href = "index.html";
});

cart.subscribe(renderCart);

renderCatalog();
renderCart();
