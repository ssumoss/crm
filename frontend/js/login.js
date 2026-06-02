const API_URL = "https://crm-backend-s1h3.onrender.com";

const body = document.body;
const themeToggle = document.getElementById("themeToggle");
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");

/* =========================
   TEMA YÖNETİMİ
========================= */

const savedTheme = localStorage.getItem("dashboardTheme") || "dark";

body.classList.remove("light-mode", "dark-mode");
body.classList.add(
  savedTheme === "light"
    ? "light-mode"
    : "dark-mode"
);

body.setAttribute("data-theme", savedTheme);

updateThemeIcon(savedTheme);

if (themeToggle) {
  themeToggle.addEventListener("click", () => {

    const currentTheme =
      localStorage.getItem("dashboardTheme") || "dark";

    const newTheme =
      currentTheme === "dark"
        ? "light"
        : "dark";

    body.classList.remove("light-mode", "dark-mode");

    body.classList.add(
      newTheme === "light"
        ? "light-mode"
        : "dark-mode"
    );

    body.setAttribute("data-theme", newTheme);

    localStorage.setItem(
      "dashboardTheme",
      newTheme
    );

    updateThemeIcon(newTheme);
  });
}

function updateThemeIcon(theme) {
  if (!themeToggle) return;

  const icon = themeToggle.querySelector("i");

  if (!icon) return;

  icon.className =
    theme === "dark"
      ? "fa-solid fa-moon"
      : "fa-solid fa-sun";
}

/* =========================
   ŞİFRE GÖSTER/GİZLE
========================= */

if (togglePassword && passwordInput) {
  togglePassword.addEventListener("click", () => {
    const isPassword =
      passwordInput.type === "password";

    passwordInput.type =
      isPassword ? "text" : "password";

    const icon =
      togglePassword.querySelector("i");

    if (icon) {
      icon.className = isPassword
        ? "fa-solid fa-eye-slash"
        : "fa-solid fa-eye";
    }
  });
}