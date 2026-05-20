const userSearch = document.getElementById("userSearch");
const roleFilter = document.getElementById("roleFilter");
const statusFilter = document.getElementById("statusFilter");
const exportBtn = document.getElementById("exportBtn");

const totalUsers = document.getElementById("totalUsers");
const activeUsers = document.getElementById("activeUsers");
const roleCount = document.getElementById("roleCount");
const unauthorizedCount = document.getElementById("unauthorizedCount");

const alertContainer = document.getElementById("alertContainer");
const userTableBody = document.getElementById("userTableBody");
const userCountText = document.getElementById("userCountText");
const roleDashboard = document.getElementById("roleDashboard");
const permissionLogList = document.getElementById("permissionLogList");
const permissionMatrix = document.getElementById("permissionMatrix");

const permissionModal = document.getElementById("permissionModal");
const closeModal = document.getElementById("closeModal");
const modalTitle = document.getElementById("modalTitle");
const modalContent = document.getElementById("modalContent");

const newUserName = document.getElementById("newUserName");
const newUserSurname = document.getElementById("newUserSurname");
const newUserPhone = document.getElementById("newUserPhone");
const newUserEmail = document.getElementById("newUserEmail");
const newUserPassword = document.getElementById("newUserPassword");
const newUserRole = document.getElementById("newUserRole");
const newUserStatus = document.getElementById("newUserStatus");
const addUserBtn = document.getElementById("addUserBtn");

let users = [];
let roles = [];
let permissions = [];
let filteredUsers = [];

function cleanRoleName(roleName) {
  const roleMap = {
    super_admin: "Sistem Yöneticisi",
    admin: "Yönetici",
    analyst: "Analiz Kullanıcısı",
    analysis: "Analiz Kullanıcısı",
    user: "Standart Kullanıcı"
  };

  return roleMap[roleName] || roleName;
}

function cleanPermissionName(permissionCode) {
  const hiddenPermissions = [
    "hassas_veri_goruntule",
    "hassas_veri_goruntuleme",
    "super_admin"
  ];

  if (hiddenPermissions.includes(permissionCode)) {
    return null;
  }

  const map = {
    dashboard_goruntule: "Dashboard Görüntüleme",
    musteri_goruntule: "Müşteri Görüntüleme",
    musteri_detay_goruntule: "Müşteri Detay Görüntüleme",
    veri_import: "Veri Aktarma",
    rfm_analizi_calistir: "RFM Analizi Çalıştırma",
    churn_analizi_calistir: "Churn Analizi Çalıştırma",
    ltv_analizi_calistir: "LTV Analizi Çalıştırma",
    rapor_export: "Rapor Dışa Aktarma",
    kullanici_yonet: "Kullanıcı Yönetimi",
    rol_yonet: "Rol Yönetimi",
    izin_yonet: "Yetki Yönetimi",
    audit_log_goruntule: "Denetim Logları",
    hata_log_goruntule: "Hata Logları",
    segment_gecmisi_calistir: "Segment Geçmişi Çalıştırma"
  };

  return map[permissionCode] || String(permissionCode || "").replaceAll("_", " ");
}

function visiblePermissions(permissionList = []) {
  return permissionList
    .map(cleanPermissionName)
    .filter(Boolean);
}

function getDashboardText(roleName) {
  const map = {
    super_admin: "Tüm modüllere erişebilir.",
    admin: "Müşteri, rapor ve kullanıcı yönetimi modüllerine erişebilir.",
    analysis: "Analiz, RFM, churn ve LTV modüllerine erişebilir.",
    analyst: "Analiz, RFM, churn ve LTV modüllerine erişebilir.",
    user: "Temel görüntüleme ve mevcut analizleri inceleme yetkisine sahiptir."
  };

  return map[roleName] || "Rol bazlı erişim tanımlıdır.";
}

async function fetchUsers() {
  try {
    users = await apiRequest("/users/");
    filteredUsers = [...users];

    renderUsers(filteredUsers);
    renderKpis(filteredUsers);
    renderRoleDashboard();
  } catch (error) {
    console.error(error);
    alert("Kullanıcı verileri alınamadı: " + error.message);
  }
}

async function fetchRoles() {
  try {
    roles = await apiRequest("/roles/");

    renderRoleFilter();
    renderNewUserRoleSelect();
    renderRoleDashboard();
    renderKpis(filteredUsers);
  } catch (error) {
    console.error(error);
    alert("Rol verileri alınamadı: " + error.message);
  }
}

async function fetchPermissions() {
  try {
    permissions = await apiRequest("/permissions/");
    renderPermissionMatrix();
  } catch (error) {
    console.error(error);
    alert("Yetki verileri alınamadı: " + error.message);
  }
}

function renderRoleFilter() {
  if (!roleFilter) return;

  roleFilter.innerHTML = `<option value="all">Tümü</option>`;

  roles.forEach(role => {
    roleFilter.innerHTML += `
      <option value="${role.rol_adi}">
        ${cleanRoleName(role.rol_adi)}
      </option>
    `;
  });
}

function renderNewUserRoleSelect() {
  if (!newUserRole) return;

  newUserRole.innerHTML = `<option value="">Rol seç</option>`;

  roles.forEach(role => {
    newUserRole.innerHTML += `
      <option value="${role.rol_id}">
        ${cleanRoleName(role.rol_adi)}
      </option>
    `;
  });
}

function getStatusText(user) {
  return user.aktif_mi ? "Aktif" : "Pasif";
}

function renderKpis() {
  if (totalUsers) totalUsers.textContent = users.length;
  if (activeUsers) activeUsers.textContent = users.filter(user => user.aktif_mi).length;
  if (roleCount) roleCount.textContent = roles.length;
  if (unauthorizedCount) unauthorizedCount.textContent = 0;
}

function renderAlerts() {
  if (!alertContainer) return;

  alertContainer.innerHTML = `
    <div class="alert-card">
      <i class="fa-solid fa-circle-check"></i>
      <div>
        <h4>Kullanıcı ve yetki yönetimi aktif</h4>
        <p>Kullanıcı ekleme, rol görüntüleme ve aktif/pasif yönetimi backend ile bağlı çalışıyor.</p>
      </div>
    </div>
  `;
}

function renderUsers(data) {
  if (!userTableBody || !userCountText) return;

  userTableBody.innerHTML = "";

  if (data.length === 0) {
    userTableBody.innerHTML = `
      <tr>
        <td colspan="7">Kullanıcı bulunamadı.</td>
      </tr>
    `;
    userCountText.textContent = "0 kullanıcı listeleniyor";
    return;
  }

  data.forEach(user => {
    const userPermissions = visiblePermissions(user.izinler || []);
    const firstThreePermissions = userPermissions.slice(0, 3);

    userTableBody.innerHTML += `
      <tr>
        <td>
          <strong>${user.ad} ${user.soyad}</strong>
        </td>

        <td>${user.email}</td>

        <td>${cleanRoleName(user.rol_adi)}</td>

        <td>
          <div class="permission-tags">
            ${
              firstThreePermissions.length > 0
                ? firstThreePermissions.map(permission => `<span class="tag">${permission}</span>`).join("")
                : `<span class="tag">Yetki yok</span>`
            }

            ${
              userPermissions.length > 3
                ? `<span class="tag">+${userPermissions.length - 3}</span>`
                : ""
            }
          </div>
        </td>

        <td>
          <span class="badge ${user.aktif_mi ? "active" : "passive"}">
            ${getStatusText(user)}
          </span>
        </td>

        <td>${getDashboardText(user.rol_adi)}</td>

        <td>
          <button
            class="detail-btn"
            onclick="openPermissionModal(${user.kullanici_id})"
          >
            Yetkileri Gör
          </button>

          <button
            class="detail-btn"
            onclick="toggleUserStatus(${user.kullanici_id}, ${!user.aktif_mi})"
          >
            ${user.aktif_mi ? "Pasif Yap" : "Aktif Yap"}
          </button>
        </td>
      </tr>
    `;
  });

  userCountText.textContent = `${data.length} kullanıcı listeleniyor`;
}

function renderRoleDashboard() {
  if (!roleDashboard) return;

  roleDashboard.innerHTML = "";

  roles.forEach(role => {
    const roleUsers = users.filter(user => user.rol_adi === role.rol_adi);

    roleDashboard.innerHTML += `
      <div class="role-card">
        <i class="fa-solid fa-user-shield"></i>

        <div>
          <h4>${cleanRoleName(role.rol_adi)}</h4>
          <p>${roleUsers.length} kullanıcı bağlı</p>
        </div>

        <span class="status active">${roleUsers.length}</span>
      </div>
    `;
  });
}

function renderPermissionLogs() {
  if (!permissionLogList) return;

  permissionLogList.innerHTML = `
    <div class="log-item">
      <i class="fa-solid fa-circle-check"></i>

      <div>
        <h4>Sistem aktif</h4>
        <p>Kullanıcı ve yetki yönetimi backend ile bağlantılı çalışıyor.</p>
      </div>

      <span class="status active">Canlı</span>
    </div>
  `;
}

function renderPermissionMatrix() {
  if (!permissionMatrix) return;

  permissionMatrix.innerHTML = "";

  const visiblePermissionRows = permissions
    .map(permission => ({
      ...permission,
      temiz_ad: cleanPermissionName(permission.izin_kodu)
    }))
    .filter(permission => permission.temiz_ad);

  if (visiblePermissionRows.length === 0) {
    permissionMatrix.innerHTML = `
      <div class="matrix-row">
        <i class="fa-solid fa-key"></i>
        <div>
          <h4>Yetki bulunamadı</h4>
          <p>Gösterilecek yetki kaydı yok.</p>
        </div>
        <span class="status passive">Boş</span>
      </div>
    `;
    return;
  }

  visiblePermissionRows.forEach(permission => {
    permissionMatrix.innerHTML += `
      <div class="matrix-row">
        <i class="fa-solid fa-key"></i>

        <div>
          <h4>${permission.temiz_ad}</h4>
          <p>${permission.modul_adi || "Genel Modül"}</p>
        </div>

        <span class="status active">Aktif</span>
      </div>
    `;
  });
}

function openPermissionModal(userId) {
  const user = users.find(item => item.kullanici_id === userId);

  if (!user || !permissionModal || !modalTitle || !modalContent) return;

  const userPermissions = visiblePermissions(user.izinler || []);

  modalTitle.textContent = `${user.ad} ${user.soyad} - Yetkiler`;

  modalContent.innerHTML = `
    <div class="modal-row">
      <h4>Rol</h4>
      <p>${cleanRoleName(user.rol_adi)}</p>
    </div>

    <div class="modal-row">
      <h4>Durum</h4>
      <p>${getStatusText(user)}</p>
    </div>

    <div class="modal-row">
      <h4>E-posta</h4>
      <p>${user.email}</p>
    </div>

    <div class="modal-row">
      <h4>Rol Bazlı Dashboard</h4>
      <p>${getDashboardText(user.rol_adi)}</p>
    </div>

    <div class="modal-row">
      <h4>Yetkiler</h4>
      <div class="permission-tags">
        ${
          userPermissions.length > 0
            ? userPermissions.map(permission => `<span class="tag">${permission}</span>`).join("")
            : `<span class="tag">Yetki yok</span>`
        }
      </div>
    </div>
  `;

  permissionModal.classList.add("show");
}

window.openPermissionModal = openPermissionModal;

function applyFilters() {
  const searchValue = userSearch ? userSearch.value.toLowerCase().trim() : "";
  const roleValue = roleFilter ? roleFilter.value : "all";
  const statusValue = statusFilter ? statusFilter.value : "all";

  filteredUsers = users.filter(user => {
    const permissionText = visiblePermissions(user.izinler || [])
      .join(" ")
      .toLowerCase();

    const searchMatch =
      String(user.ad || "").toLowerCase().includes(searchValue) ||
      String(user.soyad || "").toLowerCase().includes(searchValue) ||
      String(user.email || "").toLowerCase().includes(searchValue) ||
      cleanRoleName(user.rol_adi).toLowerCase().includes(searchValue) ||
      permissionText.includes(searchValue);

    const roleMatch =
      roleValue === "all" ||
      user.rol_adi === roleValue;

    const statusMatch =
      statusValue === "all" ||
      getStatusText(user) === statusValue;

    return searchMatch && roleMatch && statusMatch;
  });

  renderUsers(filteredUsers);
}

async function addUser() {
  if (
    !newUserName?.value.trim() ||
    !newUserSurname?.value.trim() ||
    !newUserEmail?.value.trim() ||
    !newUserPassword?.value.trim() ||
    !newUserRole?.value
  ) {
    alert("Ad, soyad, e-posta, şifre ve rol zorunludur.");
    return;
  }

  const payload = {
    ad: newUserName.value.trim(),
    soyad: newUserSurname.value.trim(),
    tel_no: newUserPhone ? newUserPhone.value.trim() : "",
    email: newUserEmail.value.trim(),
    password: newUserPassword.value,
    rol_id: Number(newUserRole.value),
    aktif_mi: newUserStatus ? newUserStatus.value === "true" : true
  };

  try {
    await apiRequest("/users/", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    alert("Kullanıcı başarıyla eklendi.");

    newUserName.value = "";
    newUserSurname.value = "";
    if (newUserPhone) newUserPhone.value = "";
    newUserEmail.value = "";
    newUserPassword.value = "";
    newUserRole.value = "";
    if (newUserStatus) newUserStatus.value = "true";

    await fetchUsers();
    applyFilters();
  } catch (error) {
    alert(error.message);
  }
}

async function toggleUserStatus(kullaniciId, newStatus) {
  const confirmText = newStatus
    ? "Bu kullanıcı aktif hale getirilsin mi?"
    : "Bu kullanıcı pasif hale getirilsin mi?";

  if (!confirm(confirmText)) return;

  try {
    await apiRequest(`/users/${kullaniciId}/status?aktif_mi=${newStatus}`, {
      method: "PUT"
    });

    alert("Kullanıcı durumu güncellendi.");

    await fetchUsers();
    applyFilters();
  } catch (error) {
    alert(error.message);
  }
}

window.toggleUserStatus = toggleUserStatus;

function exportPermissions() {
  let csv = "Ad Soyad,E-posta,Rol,Durum,Yetkiler\n";

  filteredUsers.forEach(user => {
    const userPermissions = visiblePermissions(user.izinler || []);

    csv += `"${user.ad} ${user.soyad}","${user.email}","${cleanRoleName(user.rol_adi)}","${getStatusText(user)}","${userPermissions.join(" | ")}"\n`;
  });

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "kullanici_yetki_listesi.csv";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function setupUsersPermissionEvents() {
  if (closeModal && permissionModal) {
    closeModal.addEventListener("click", () => {
      permissionModal.classList.remove("show");
    });
  }

  if (permissionModal) {
    permissionModal.addEventListener("click", event => {
      if (event.target === permissionModal) {
        permissionModal.classList.remove("show");
      }
    });
  }

  if (userSearch) userSearch.addEventListener("input", applyFilters);
  if (roleFilter) roleFilter.addEventListener("change", applyFilters);
  if (statusFilter) statusFilter.addEventListener("change", applyFilters);
  if (exportBtn) exportBtn.addEventListener("click", exportPermissions);
  if (addUserBtn) addUserBtn.addEventListener("click", addUser);
}

window.addEventListener("DOMContentLoaded", async () => {
  setupUsersPermissionEvents();

  renderAlerts();
  renderPermissionLogs();

  await fetchRoles();
  await fetchPermissions();
  await fetchUsers();
});