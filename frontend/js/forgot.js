const body = document.body;
const themeToggle = document.getElementById("themeToggle");
const forgotForm = document.getElementById("forgotForm");

const savedTheme = localStorage.getItem("theme");

if (savedTheme) {
  body.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);
}

themeToggle.addEventListener("click", () => {
  const currentTheme = body.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";

  body.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
  const icon = themeToggle.querySelector("i");

  if (theme === "dark") {
    icon.className = "fa-solid fa-moon";
  } else {
    icon.className = "fa-solid fa-sun";
  }
}

forgotForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();

  if (!email) {
    alert("Lütfen e-posta adresinizi girin.");
    return;
  }

  alert("Şifre sıfırlama bağlantısı gönderildi gibi düşünebilirsin.");

  /*
  try {
    const response = await fetch("http://127.0.0.1:8000/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: email
      })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.detail || "İşlem başarısız.");
      return;
    }

    alert("Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.");
  } catch (error) {
    console.error(error);
    alert("Sunucuya bağlanırken hata oluştu.");
  }
  */
});