import { setLoggedIn, redirectIfLoggedIn } from "./auth.js";

redirectIfLoggedIn();

const form = document.getElementById("login-form");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  setLoggedIn();
  window.location.href = "catalog.html";
});
