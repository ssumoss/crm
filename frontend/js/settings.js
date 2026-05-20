const CSV_IMPORT_ENDPOINT = "/import/";
const JSON_IMPORT_ENDPOINT = "/import/";

const csvInput = document.getElementById("csvInput");
const csvSelectBtn = document.getElementById("csvSelectBtn");
const csvUploadBtn = document.getElementById("csvUploadBtn");
const csvFileInfo = document.getElementById("csvFileInfo");
const csvProgressBox = document.getElementById("csvProgressBox");
const csvProgressText = document.getElementById("csvProgressText");
const csvProgressFill = document.getElementById("csvProgressFill");

const jsonInput = document.getElementById("jsonInput");
const jsonSelectBtn = document.getElementById("jsonSelectBtn");
const jsonUploadBtn = document.getElementById("jsonUploadBtn");
const jsonFileInfo = document.getElementById("jsonFileInfo");
const jsonProgressBox = document.getElementById("jsonProgressBox");
const jsonProgressText = document.getElementById("jsonProgressText");
const jsonProgressFill = document.getElementById("jsonProgressFill");

const userCount = document.getElementById("userCount");
const roleCount = document.getElementById("roleCount");
const permissionCount = document.getElementById("permissionCount");
const logCount = document.getElementById("logCount");

const userTableBody = document.getElementById("userTableBody");
const importLogList = document.getElementById("importLogList");
const apiStatusList = document.getElementById("apiStatusList");

const runRfmBtn = document.getElementById("runRfmBtn");
const runChurnBtn = document.getElementById("runChurnBtn");
const runLtvBtn = document.getElementById("runLtvBtn");
const runSegmentHistoryBtn = document.getElementById("runSegmentHistoryBtn");
const analysisStatusText = document.getElementById("analysisStatusText");

let users = [];
let importLogs = [];
let selectedCsvFile = null;
let selectedJsonFile = null;

function getTokenForUpload() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("access_token")
  );
}

async function apiGet(endpoint) {
  return await apiRequest(endpoint);
}

async function apiPost(endpoint) {
  return await apiRequest(endpoint, {
    method: "POST"
  });
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("tr-TR");
}

function renderKpis(summary) {
  if (!summary) return;

  if (userCount) userCount.textContent = summary.user_count || 0;
  if (roleCount) roleCount.textContent = summary.role_count || 0;
  if (permissionCount) permissionCount.textContent = summary.permission_count || 0;
  if (logCount) logCount.textContent = summary.import_log_count || 0;
}

function renderUsers() {
  if (!userTableBody) return;

  userTableBody.innerHTML = "";

  if (!users.length) {
    userTableBody.innerHTML = `
      <tr>
        <td colspan="4">Kullanıcı bulunamadı.</td>
      </tr>
    `;
    return;
  }

  users.forEach(user => {
    userTableBody.innerHTML += `
      <tr>
        <td><strong>${user.ad || ""} ${user.soyad || ""}</strong></td>
        <td>${user.email || "-"}</td>
        <td>${user.rol_adi || "-"}</td>
        <td>
          <span class="badge ${user.aktif_mi ? "active" : "passive"}">
            ${user.aktif_mi ? "Aktif" : "Pasif"}
          </span>
        </td>
      </tr>
    `;
  });
}

function renderImportLogs() {
  if (!importLogList) return;

  importLogList.innerHTML = "";

  if (!importLogs.length) {
    importLogList.innerHTML = `
      <div class="log-item">
        <i class="fa-solid fa-circle-info"></i>
        <div>
          <h4>İşlem logu bulunamadı</h4>
          <p>Henüz import veya analiz işlemi yapılmamış.</p>
        </div>
      </div>
    `;
    return;
  }

  importLogs.forEach(log => {
    importLogList.innerHTML += `
      <div class="log-item">
        <i class="fa-solid fa-file-import"></i>
        <div>
          <h4>${log.type || "SİSTEM_İŞLEMİ"}</h4>
          <p>${log.detail || "-"}</p>
        </div>
        <strong>${formatDate(log.time)}</strong>
      </div>
    `;
  });
}

function renderApiStatus(apiData) {
  if (!apiStatusList || !apiData) return;

  apiStatusList.innerHTML = "";

  Object.values(apiData).forEach(api => {
    const isActive = api.status === "Aktif";

    apiStatusList.innerHTML += `
      <div class="api-item">
        <i class="fa-solid ${isActive ? "fa-circle-check" : "fa-triangle-exclamation"}"></i>
        <div>
          <h4>${api.name}</h4>
          <p>${api.description}</p>
        </div>
        <span class="status ${isActive ? "active" : "passive"}">${api.status}</span>
      </div>
    `;
  });
}

function setProgress(box, text, fill, percent) {
  if (!box || !text || !fill) return;

  box.classList.remove("hidden");
  text.textContent = `${percent}%`;
  fill.style.width = `${percent}%`;
}

function resetCsvUploadUI() {
  selectedCsvFile = null;

  if (csvInput) csvInput.value = "";
  if (csvFileInfo) csvFileInfo.textContent = "Henüz dosya seçilmedi.";

  if (csvUploadBtn) {
    csvUploadBtn.classList.add("hidden");
    csvUploadBtn.disabled = false;
    csvUploadBtn.textContent = "Aktar";
  }

  if (csvProgressText) csvProgressText.textContent = "0%";
  if (csvProgressFill) csvProgressFill.style.width = "0%";
  if (csvProgressBox) csvProgressBox.classList.add("hidden");
}

function resetJsonUploadUI() {
  selectedJsonFile = null;

  if (jsonInput) jsonInput.value = "";
  if (jsonFileInfo) jsonFileInfo.textContent = "Henüz dosya seçilmedi.";

  if (jsonUploadBtn) {
    jsonUploadBtn.classList.add("hidden");
    jsonUploadBtn.disabled = false;
    jsonUploadBtn.textContent = "Aktar";
  }

  if (jsonProgressText) jsonProgressText.textContent = "0%";
  if (jsonProgressFill) jsonProgressFill.style.width = "0%";
  if (jsonProgressBox) jsonProgressBox.classList.add("hidden");
}

function uploadFile({ endpoint, file, progressBox, progressText, progressFill, onSuccess }) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("Önce dosya seçmelisin."));
      return;
    }

    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.append("file", file);

    xhr.open("POST", `http://127.0.0.1:8000${endpoint}`);

    const token = getTokenForUpload();

    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    setProgress(progressBox, progressText, progressFill, 0);

    xhr.upload.addEventListener("progress", event => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);

        if (percent < 100) {
          setProgress(progressBox, progressText, progressFill, percent);
        } else {
          progressBox.classList.remove("hidden");
          progressFill.style.width = "100%";
          progressText.textContent = "İşleniyor...";
        }
      }
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        progressBox.classList.remove("hidden");
        progressFill.style.width = "100%";
        progressText.textContent = "Tamamlandı";

        let result = {};

        try {
          result = JSON.parse(xhr.responseText);
        } catch {
          result = { message: "İşlem tamamlandı." };
        }

        if (onSuccess) onSuccess(result);
        resolve(result);
      } else {
        let errorMessage = `API Hatası: ${xhr.status}`;

        try {
          const errorData = JSON.parse(xhr.responseText);
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {}

        if (progressText) progressText.textContent = "Hata";
        reject(new Error(errorMessage));
      }
    };

    xhr.onerror = () => {
      if (progressText) progressText.textContent = "Bağlantı hatası";
      reject(new Error("Bağlantı hatası oluştu."));
    };

    xhr.send(formData);
  });
}

async function runAnalysis(endpoint, label, button) {
  try {
    if (button) button.disabled = true;
    if (analysisStatusText) analysisStatusText.textContent = `${label} çalıştırılıyor...`;

    await apiPost(endpoint);

    if (analysisStatusText) analysisStatusText.textContent = `${label} başarıyla tamamlandı.`;

    await loadSettingsData();

    setTimeout(() => {
      if (analysisStatusText) analysisStatusText.textContent = "Analiz işlemi bekleniyor.";
    }, 1800);
  } catch (error) {
    if (analysisStatusText) analysisStatusText.textContent = `${label} hatası: ${error.message}`;
  } finally {
    if (button) button.disabled = false;
  }
}

async function loadSettingsData() {
  try {
    const [summary, usersData, logsData, apiStatusData] = await Promise.all([
      apiGet("/settings/summary"),
      apiGet("/settings/users"),
      apiGet("/settings/import-logs"),
      apiGet("/settings/api-status")
    ]);

    users = usersData || [];
    importLogs = logsData || [];

    renderKpis(summary);
    renderUsers();
    renderImportLogs();
    renderApiStatus(apiStatusData);
  } catch (error) {
    console.error("Settings verileri alınamadı:", error);

    if (importLogList) {
      importLogList.innerHTML = `
        <div class="log-item">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <div>
            <h4>Veriler yüklenemedi</h4>
            <p>${error.message}</p>
          </div>
        </div>
      `;
    }
  }
}

function setupSettingsEvents() {
  if (csvSelectBtn && csvInput) {
    csvSelectBtn.addEventListener("click", () => {
      csvInput.click();
    });
  }

  if (jsonSelectBtn && jsonInput) {
    jsonSelectBtn.addEventListener("click", () => {
      jsonInput.click();
    });
  }

  if (csvInput) {
    csvInput.addEventListener("change", event => {
      selectedCsvFile = event.target.files[0];

      if (!selectedCsvFile) return;

      if (!selectedCsvFile.name.toLowerCase().endsWith(".csv")) {
        alert("Lütfen sadece CSV dosyası seç.");
        resetCsvUploadUI();
        return;
      }

      if (csvFileInfo) csvFileInfo.textContent = `Seçilen CSV: ${selectedCsvFile.name}`;
      if (csvUploadBtn) csvUploadBtn.classList.remove("hidden");
      if (csvProgressBox) csvProgressBox.classList.add("hidden");
      if (csvProgressText) csvProgressText.textContent = "0%";
      if (csvProgressFill) csvProgressFill.style.width = "0%";
    });
  }

  if (jsonInput) {
    jsonInput.addEventListener("change", event => {
      selectedJsonFile = event.target.files[0];

      if (!selectedJsonFile) return;

      if (!selectedJsonFile.name.toLowerCase().endsWith(".json")) {
        alert("Lütfen sadece JSON dosyası seç.");
        resetJsonUploadUI();
        return;
      }

      if (jsonFileInfo) jsonFileInfo.textContent = `Seçilen JSON: ${selectedJsonFile.name}`;
      if (jsonUploadBtn) jsonUploadBtn.classList.remove("hidden");
      if (jsonProgressBox) jsonProgressBox.classList.add("hidden");
      if (jsonProgressText) jsonProgressText.textContent = "0%";
      if (jsonProgressFill) jsonProgressFill.style.width = "0%";
    });
  }

  if (csvUploadBtn) {
    csvUploadBtn.addEventListener("click", async () => {
      try {
        csvUploadBtn.disabled = true;
        csvUploadBtn.textContent = "Aktarılıyor...";

        const result = await uploadFile({
          endpoint: CSV_IMPORT_ENDPOINT,
          file: selectedCsvFile,
          progressBox: csvProgressBox,
          progressText: csvProgressText,
          progressFill: csvProgressFill,
          onSuccess: () => {
            if (csvFileInfo) csvFileInfo.textContent = "CSV aktarım işlemi bitti.";
          }
        });

        if (csvFileInfo) {
          csvFileInfo.textContent = `CSV aktarımı bitti. Eklenen fatura: ${result.inserted_orders || 0}, eklenen müşteri: ${result.inserted_customers || 0}`;
        }

        await loadSettingsData();

        setTimeout(() => {
          resetCsvUploadUI();
        }, 1800);
      } catch (error) {
        if (csvFileInfo) csvFileInfo.textContent = `CSV aktarım hatası: ${error.message}`;
        csvUploadBtn.disabled = false;
        csvUploadBtn.textContent = "Aktar";
      }
    });
  }

  if (jsonUploadBtn) {
    jsonUploadBtn.addEventListener("click", async () => {
      try {
        jsonUploadBtn.disabled = true;
        jsonUploadBtn.textContent = "Aktarılıyor...";

        const result = await uploadFile({
          endpoint: JSON_IMPORT_ENDPOINT,
          file: selectedJsonFile,
          progressBox: jsonProgressBox,
          progressText: jsonProgressText,
          progressFill: jsonProgressFill,
          onSuccess: () => {
            if (jsonFileInfo) jsonFileInfo.textContent = "JSON aktarım işlemi bitti.";
          }
        });

        if (jsonFileInfo) {
          jsonFileInfo.textContent = `JSON aktarımı bitti. Eklenen fatura: ${result.inserted_orders || 0}, eklenen müşteri: ${result.inserted_customers || 0}`;
        }

        await loadSettingsData();

        setTimeout(() => {
          resetJsonUploadUI();
        }, 1800);
      } catch (error) {
        if (jsonFileInfo) jsonFileInfo.textContent = `JSON aktarım hatası: ${error.message}`;
        jsonUploadBtn.disabled = false;
        jsonUploadBtn.textContent = "Aktar";
      }
    });
  }

  if (runRfmBtn) {
    runRfmBtn.addEventListener("click", () => {
      runAnalysis("/analytics/rfm/run", "RFM analizi", runRfmBtn);
    });
  }

  if (runChurnBtn) {
    runChurnBtn.addEventListener("click", () => {
      runAnalysis("/analytics/churn/run", "Churn analizi", runChurnBtn);
    });
  }

  if (runLtvBtn) {
    runLtvBtn.addEventListener("click", () => {
      runAnalysis("/analytics/ltv/run", "LTV analizi", runLtvBtn);
    });
  }

  if (runSegmentHistoryBtn) {
    runSegmentHistoryBtn.addEventListener("click", () => {
      runAnalysis("/analytics/segment-history/run", "Segment geçmişi", runSegmentHistoryBtn);
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  setupSettingsEvents();
  loadSettingsData();
});