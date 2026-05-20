if (!localStorage.getItem("token")) {
  window.location.href = "login.html";
}

let CURRENT_USER = null;
let SELECTED_MESSAGE = null;

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function getRoleNameById(roleId) {
  const roleMap = {
    1: "Super Admin",
    2: "Admin",
    3: "Analiz Kullanıcısı",
    4: "Kullanıcı"
  };

  return roleMap[roleId] || "Kullanıcı";
}

function getPermissions() {
  return JSON.parse(localStorage.getItem("permissions")) || [];
}

function hasPermission(permission) {
  return getPermissions().includes(permission);
}

function applyPermissions() {
  document.querySelectorAll("[data-permission]").forEach(link => {
    const permission = link.getAttribute("data-permission");

    if (!hasPermission(permission)) {
      link.style.display = "none";
    }
  });

  document.querySelectorAll(".menu-group").forEach(group => {
    const visibleLinks = Array.from(group.querySelectorAll(".submenu a"))
      .filter(link => link.style.display !== "none");

    if (visibleLinks.length === 0) {
      group.style.display = "none";
    }
  });
}

function initSubMenus() {
  const currentPage = window.location.pathname.split("/").pop();

  document.querySelectorAll(".menu a").forEach(link => {
    if (link.getAttribute("href") === currentPage) {
      link.classList.add("active");
    }
  });

  document.querySelectorAll(".menu-group").forEach(group => {
    const button = group.querySelector(".menu-group-title");
    const links = group.querySelectorAll(".submenu a");

    links.forEach(link => {
      if (link.getAttribute("href") === currentPage) {
        link.classList.add("active");
        group.classList.add("open");
      }
    });

    if (button) {
      button.addEventListener("click", () => {
        document.querySelectorAll(".menu-group").forEach(otherGroup => {
          if (otherGroup !== group) {
            otherGroup.classList.remove("open");
          }
        });

        group.classList.toggle("open");
      });
    }
  });
}

async function loadCurrentUser() {
  try {
    const user = await apiRequest("/auth/me");
    if (!user) return;

    CURRENT_USER = user;

    localStorage.setItem("currentUser", JSON.stringify(user));
    localStorage.setItem("permissions", JSON.stringify(user.izinler || []));
    localStorage.setItem("role", user.rol_adi || "");

    const fullName = `${user.ad || "Kullanıcı"} ${user.soyad || ""}`.trim();
    const roleName = user.rol_adi || getRoleNameById(user.rol_id);

    setText("topUserName", fullName);
    setText("topUserRole", roleName);

    const helloTitle = document.getElementById("helloTitle");
    if (helloTitle && helloTitle.dataset.dynamic === "true") {
      helloTitle.textContent = `Merhaba, ${user.ad || "Kullanıcı"}`;
    }

    const avatar = document.getElementById("userAvatar");
    if (avatar) avatar.textContent = (user.ad || "K").charAt(0).toUpperCase();

    applyPermissions();
    initSubMenus();

  } catch (error) {
    console.error("Kullanıcı bilgisi alınamadı:", error);
  }
}

function setupDateTime() {
  function updateDateTime() {
    const now = new Date();

    const formatted = now.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });

    setText("currentDateTime", formatted);
  }

  updateDateTime();
  setInterval(updateDateTime, 1000);
}

function setupThemeAndSidebar() {
  const body = document.body;
  const themeToggle = document.getElementById("themeToggle");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");

  const savedTheme = localStorage.getItem("dashboardTheme");
  const savedSidebar = localStorage.getItem("sidebarCollapsed");

  if (savedTheme === "light") {
    body.classList.remove("dark-mode");
    body.classList.add("light-mode");
  } else {
    body.classList.remove("light-mode");
    body.classList.add("dark-mode");
  }

  if (themeToggle) {
    const icon = themeToggle.querySelector("i");

    if (icon) {
      icon.className = body.classList.contains("light-mode")
        ? "fa-solid fa-sun"
        : "fa-solid fa-moon";
    }

    themeToggle.addEventListener("click", () => {
      body.classList.toggle("dark-mode");
      body.classList.toggle("light-mode");

      const icon = themeToggle.querySelector("i");

      if (icon) {
        icon.className = body.classList.contains("light-mode")
          ? "fa-solid fa-sun"
          : "fa-solid fa-moon";
      }

      localStorage.setItem(
        "dashboardTheme",
        body.classList.contains("light-mode") ? "light" : "dark"
      );
    });
  }

  if (savedSidebar === "yes" && sidebar) {
    sidebar.classList.add("collapsed");
  }

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");

      localStorage.setItem(
        "sidebarCollapsed",
        sidebar.classList.contains("collapsed") ? "yes" : "no"
      );
    });
  }
}

function setupDropdowns() {
  const notificationBtn = document.getElementById("notificationBtn");
  const notificationDropdown = document.getElementById("notificationDropdown");

  const messageBtn = document.getElementById("messageBtn");
  const messageDropdown = document.getElementById("messageDropdown");

  const userDropdownBtn = document.getElementById("userDropdownBtn");
  const userMenu = document.getElementById("userMenu");

  if (notificationBtn && notificationDropdown) {
    notificationBtn.addEventListener("click", e => {
      e.stopPropagation();
      notificationDropdown.classList.toggle("show");
      messageDropdown?.classList.remove("show");
      userMenu?.classList.remove("show");
    });
  }

  if (messageBtn && messageDropdown) {
    messageBtn.addEventListener("click", e => {
      e.stopPropagation();
      messageDropdown.classList.toggle("show");
      notificationDropdown?.classList.remove("show");
      userMenu?.classList.remove("show");
    });
  }

  if (userDropdownBtn && userMenu) {
    userDropdownBtn.addEventListener("click", e => {
      e.stopPropagation();
      userMenu.classList.toggle("show");
      notificationDropdown?.classList.remove("show");
      messageDropdown?.classList.remove("show");
    });
  }

  document.addEventListener("click", e => {
    if (!e.target.closest(".notification-wrapper") && !e.target.closest(".user")) {
      notificationDropdown?.classList.remove("show");
      messageDropdown?.classList.remove("show");
      userMenu?.classList.remove("show");
    }
  });
}

function setupLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  const logoutLink = document.getElementById("logoutLink");

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("token_type");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("permissions");
    localStorage.removeItem("role");

    window.location.href = "login.html";
  }

  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  if (logoutLink) {
    logoutLink.addEventListener("click", e => {
      e.preventDefault();
      logout();
    });
  }
}

function formatDateSmall(value) {
  if (!value) return "Tarih yok";

  const date = new Date(value);

  if (isNaN(date.getTime())) return "Tarih yok";

  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getNotificationIcon(type) {
  if (type === "message") return "fa-solid fa-envelope";
  if (type === "warning") return "fa-solid fa-triangle-exclamation";
  if (type === "success") return "fa-solid fa-circle-check";
  return "fa-solid fa-bell";
}

async function loadNotifications() {
  const list = document.getElementById("notificationList");
  const badge = document.getElementById("notificationBadge");

  if (!list || !badge) return;

  try {
    const notifications = await apiRequest("/notifications/my");
    const countData = await apiRequest("/notifications/unread-count");

    const unreadCount = Number(countData?.unread_count || 0);
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? "grid" : "none";

    list.innerHTML = "";

    if (!notifications || !notifications.length) {
      list.innerHTML = `<p class="empty-text">Bildirim yok.</p>`;
      return;
    }

    notifications.slice(0, 8).forEach(item => {
      const unreadClass = item.okundu_mu ? "" : "unread";

      list.innerHTML += `
        <div class="dropdown-item ${unreadClass}" onclick="handleNotificationClick(${item.bildirim_id}, '${item.tip || ""}')">
          <div class="dropdown-icon">
            <i class="${getNotificationIcon(item.tip)}"></i>
          </div>
          <div>
            <strong>${item.baslik || "Bildirim"}</strong>
            <p>${item.mesaj || ""}</p>
            <span>${formatDateSmall(item.olusturma_tarihi)}</span>
          </div>
        </div>
      `;
    });

  } catch (error) {
    console.error("Bildirim yüklenemedi:", error);
    list.innerHTML = `<p class="empty-text">Bildirim API bulunamadı.</p>`;
    badge.style.display = "none";
  }
}

async function handleNotificationClick(id, type) {
  if (id) {
    await apiRequest(`/notifications/read/${id}`, {
      method: "PUT"
    });
  }

  await loadNotifications();

  if (type === "message") {
    document.getElementById("notificationDropdown")?.classList.remove("show");
    document.getElementById("messageDropdown")?.classList.add("show");
    showMessageListView();
    await loadMessages();
  }
}

window.handleNotificationClick = handleNotificationClick;

function setupNotificationActions() {
  const markAllReadBtn = document.getElementById("markAllReadBtn");

  if (markAllReadBtn) {
    markAllReadBtn.addEventListener("click", async () => {
      await apiRequest("/notifications/read-all", {
        method: "PUT"
      });

      await loadNotifications();
    });
  }
}

async function loadMessages() {
  const list = document.getElementById("messageList");
  const badge = document.getElementById("messageBadge");

  if (!list || !badge) return;

  try {
    const messages = await apiRequest("/messages/my");
    const countData = await apiRequest("/messages/unread-count");

    const unreadCount = Number(countData?.unread_count || 0);
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? "grid" : "none";

    list.innerHTML = "";

    if (!messages || !messages.length) {
      list.innerHTML = `<p class="empty-text">Mesaj yok.</p>`;
      return;
    }

    messages.slice(0, 8).forEach(item => {
      const unreadClass = item.okundu_mu ? "" : "unread";
      const senderName = item.gonderen_ad_soyad || "Bilinmeyen Kullanıcı";
      const safeMessage = encodeURIComponent(JSON.stringify(item));

      list.innerHTML += `
        <div class="dropdown-item ${unreadClass}" onclick="openMessageDetailFromEncoded('${safeMessage}')">
          <div class="dropdown-icon">
            <i class="fa-solid fa-comment-dots"></i>
          </div>
          <div>
            <strong>${senderName}</strong>
            <p>${(item.mesaj || "").slice(0, 55)}...</p>
            <span>${formatDateSmall(item.gonderim_tarihi)}</span>
          </div>
        </div>
      `;
    });

  } catch (error) {
    console.error("Mesaj yüklenemedi:", error);
    list.innerHTML = `<p class="empty-text">Mesaj API bulunamadı.</p>`;
    badge.style.display = "none";
  }
}

function openMessageDetailFromEncoded(encodedMessage) {
  const message = JSON.parse(decodeURIComponent(encodedMessage));
  openMessageDetail(message);
}

window.openMessageDetailFromEncoded = openMessageDetailFromEncoded;

async function openMessageDetail(message) {
  SELECTED_MESSAGE = message;

  document.getElementById("messageList")?.classList.add("hidden");
  document.getElementById("newMessageBox")?.classList.add("hidden");
  document.getElementById("messageDetailBox")?.classList.remove("hidden");

  setText("detailSenderName", message.gonderen_ad_soyad || "Bilinmeyen Kullanıcı");
  setText("detailMessageDate", formatDateSmall(message.gonderim_tarihi));
  setText("detailMessageText", message.mesaj || "");

  if (!message.okundu_mu) {
    await apiRequest(`/messages/read/${message.mesaj_id}`, {
      method: "PUT"
    });

    await loadMessages();
  }
}

function showMessageListView() {
  document.getElementById("messageDetailBox")?.classList.add("hidden");
  document.getElementById("newMessageBox")?.classList.add("hidden");
  document.getElementById("messageList")?.classList.remove("hidden");
}

async function loadMessageRecipients() {
  const select = document.getElementById("messageUserSelect");
  if (!select) return;

  try {
    const users = await apiRequest("/users/message-recipients");

    select.innerHTML = `<option value="">Alıcı kullanıcı seç</option>`;

    if (!users || !users.length) {
      select.innerHTML += `<option value="">Aktif kullanıcı yok</option>`;
      return;
    }

    users.forEach(user => {
      const fullName = `${user.ad || ""} ${user.soyad || ""}`.trim();

      select.innerHTML += `
        <option value="${user.kullanici_id}">
          ${fullName} - ${user.email}
        </option>
      `;
    });

  } catch (error) {
    console.error("Alıcılar yüklenemedi:", error);
  }
}

function setupMessageActions() {
  const newMessageToggleBtn = document.getElementById("newMessageToggleBtn");
  const sendBtn = document.getElementById("sendMessageBtn");
  const userSelect = document.getElementById("messageUserSelect");
  const messageText = document.getElementById("messageText");
  const backBtn = document.getElementById("backToMessagesBtn");
  const sendReplyBtn = document.getElementById("sendReplyBtn");
  const replyText = document.getElementById("replyMessageText");

  newMessageToggleBtn?.addEventListener("click", () => {
    document.getElementById("messageDetailBox")?.classList.add("hidden");
    document.getElementById("messageList")?.classList.remove("hidden");
    document.getElementById("newMessageBox")?.classList.toggle("hidden");
  });

  backBtn?.addEventListener("click", showMessageListView);

  sendBtn?.addEventListener("click", async () => {
    const aliciId = Number(userSelect.value);
    const mesaj = messageText.value.trim();

    if (!aliciId || !mesaj) {
      alert("Lütfen alıcı kullanıcı seç ve mesaj yaz.");
      return;
    }

    await apiRequest("/messages/send", {
      method: "POST",
      body: JSON.stringify({
        alici_kullanici_id: aliciId,
        mesaj: mesaj
      })
    });

    alert("Mesaj gönderildi.");
    userSelect.value = "";
    messageText.value = "";
    showMessageListView();
    await loadMessages();
    await loadNotifications();
  });

  sendReplyBtn?.addEventListener("click", async () => {
    if (!SELECTED_MESSAGE) return;

    const mesaj = replyText.value.trim();

    if (!mesaj) {
      alert("Cevap mesajı boş olamaz.");
      return;
    }

    await apiRequest("/messages/send", {
      method: "POST",
      body: JSON.stringify({
        alici_kullanici_id: SELECTED_MESSAGE.gonderen_kullanici_id,
        mesaj: mesaj
      })
    });

    alert("Cevap gönderildi.");
    replyText.value = "";
    showMessageListView();
    await loadMessages();
    await loadNotifications();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  setupThemeAndSidebar();
  setupDropdowns();
  setupLogout();
  setupDateTime();

  await loadCurrentUser();

  await loadNotifications();
  await loadMessages();
  await loadMessageRecipients();

  setupNotificationActions();
  setupMessageActions();
});