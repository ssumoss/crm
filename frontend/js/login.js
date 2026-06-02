const API_URL = "https://crm-backend-s1h3.onrender.com";

const body = document.body;
const themeToggle = document.getElementById("themeToggle");
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");

const savedTheme = localStorage.getItem("theme");

if (savedTheme) {
  body.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const currentTheme = body.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    body.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeIcon(newTheme);
  });
}

function updateThemeIcon(theme) {
  if (!themeToggle) return;

  const icon = themeToggle.querySelector("i");
  if (!icon) return;

  icon.className = theme === "dark" ? "fa-solid fa-moon" : "fa-solid fa-sun";
}

if (togglePassword && passwordInput) {
  togglePassword.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";

    passwordInput.type = isPassword ? "text" : "password";

    const icon = togglePassword.querySelector("i");
    if (icon) {
      icon.className = isPassword ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
    }
  });
}

async function fetchCurrentUser(token) {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.detail || "Kullanıcı bilgileri alınamadı.");
  }

  return data;
}

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("username").value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      alert("Lütfen e-posta ve şifre alanlarını doldurun.");
      return;
    }

    try {
      loginBtn.disabled = true;
      loginBtn.textContent = "Giriş yapılıyor...";

      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        alert(data.detail || "Giriş başarısız.");
        return;
      }

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("token_type", data.token_type || "bearer");

      const currentUser = await fetchCurrentUser(data.access_token);

      localStorage.setItem("currentUser", JSON.stringify(currentUser));
      localStorage.setItem("role", currentUser.rol_adi || "");
      localStorage.setItem("permissions", JSON.stringify(currentUser.izinler || []));

      window.location.href = "dashboard.html";

    } catch (error) {
      console.error("Login hatası:", error);
      alert(error.message || "Sunucuya bağlanırken hata oluştu. Backend açık mı kontrol et.");
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "Giriş Yap";
    }
  });
}