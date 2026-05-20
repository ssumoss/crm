const API_BASE_URL = "http://127.0.0.1:8000";

function getToken() {
  return localStorage.getItem("token");
}

async function apiRequest(endpoint, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (response.status === 401 || response.status === 403) {
    alert("Yetkin yok veya oturum süren dolmuş.");
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("token_type");
    window.location.href = "login.html";
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "API isteği başarısız oldu.");
  }

  return response.json();
}