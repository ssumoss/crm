const totalRecords = document.getElementById("totalRecords");
const selectedCustomers = document.getElementById("selectedCustomers");
const lastReportDate = document.getElementById("lastReportDate");
const selectedFormat = document.getElementById("selectedFormat");

const startDate = document.getElementById("startDate");
const endDate = document.getElementById("endDate");
const segmentFilter = document.getElementById("segmentFilter");
const cityFilter = document.getElementById("cityFilter");
const pointFilter = document.getElementById("pointFilter");
const formatFilter = document.getElementById("formatFilter");

const previewPanel = document.getElementById("previewPanel");
const previewBox = document.getElementById("previewBox");
const closePreview = document.getElementById("closePreview");

const fullExportBtn = document.getElementById("fullExportBtn");
const recentReportsBody = document.getElementById("recentReportsBody");
const downloadLogList = document.getElementById("downloadLogList");

const applyFiltersBtn = document.getElementById("applyFiltersBtn");

let exportData = [];
let backendCustomerCount = 0;
let isDataLoaded = false;
let isLoading = false;

let recentReports = JSON.parse(localStorage.getItem("recentReports")) || [];
let downloadLogs = JSON.parse(localStorage.getItem("downloadLogs")) || [];

function todayTR() {
  return new Date().toLocaleDateString("tr-TR");
}

function buildExportEndpoint() {
  const params = new URLSearchParams();

  if (startDate && startDate.value) params.append("start_date", startDate.value);
  if (endDate && endDate.value) params.append("end_date", endDate.value);
  if (segmentFilter && segmentFilter.value !== "all") params.append("segment", segmentFilter.value);
  if (cityFilter && cityFilter.value !== "all") params.append("city", cityFilter.value);
  if (pointFilter && pointFilter.value !== "all") params.append("point", pointFilter.value);

  const query = params.toString();
  return query ? `/export/full?${query}` : `/export/full`;
}

function setLoadingState(status) {
  isLoading = status;

  if (fullExportBtn) {
    fullExportBtn.disabled = status;
    fullExportBtn.textContent = status ? "Hazırlanıyor..." : "Tam Veri Export";
  }

  if (applyFiltersBtn) {
    applyFiltersBtn.disabled = status;
    applyFiltersBtn.textContent = status ? "Yükleniyor..." : "Filtrele";
  }
}

async function fetchExportData(force = false) {
  if (isLoading) return;

  if (isDataLoaded && !force) {
    return;
  }

  try {
    setLoadingState(true);

    const result = await apiRequest(buildExportEndpoint());

    exportData = result?.veriler || [];
    backendCustomerCount =
      result?.benzersiz_musteri_sayisi || getUniqueCustomerCount(exportData);

    isDataLoaded = true;

    renderDynamicFilters();
    renderKpis();

    return exportData;
  } catch (error) {
    console.error(error);
    alert("Rapor verileri alınamadı. Token, yetki veya backend endpointini kontrol et.");
  } finally {
    setLoadingState(false);
  }
}

function resetLoadedData() {
  isDataLoaded = false;
  exportData = [];
  backendCustomerCount = 0;
  renderKpis();
}

function uniqueValues(key) {
  return [...new Set(exportData.map(item => item[key]).filter(Boolean))];
}

function fillSelect(select, values, defaultText = "Tümü") {
  if (!select) return;

  const oldValue = select.value;
  select.innerHTML = `<option value="all">${defaultText}</option>`;

  values.forEach(value => {
    select.innerHTML += `<option value="${value}">${value}</option>`;
  });

  const hasOldValue = [...select.options].some(option => option.value === oldValue);

  if (hasOldValue) {
    select.value = oldValue;
  }
}

function renderDynamicFilters() {
  fillSelect(segmentFilter, uniqueValues("segment_adi"));
  fillSelect(cityFilter, uniqueValues("sehir_adi"));
  fillSelect(pointFilter, uniqueValues("satis_noktasi_adi"));
}

function getUniqueCustomerCount(data) {
  return new Set(data.map(item => item.musteri_id).filter(Boolean)).size;
}

function renderKpis() {
  if (totalRecords) totalRecords.textContent = exportData.length.toLocaleString("tr-TR");
  if (selectedCustomers) selectedCustomers.textContent = backendCustomerCount.toLocaleString("tr-TR");
  if (selectedFormat && formatFilter) selectedFormat.textContent = formatFilter.value;
  if (lastReportDate) lastReportDate.textContent = recentReports[0]?.date || "-";
}

function renderRecentReports() {
  if (!recentReportsBody) return;

  recentReportsBody.innerHTML = "";

  if (recentReports.length === 0) {
    recentReportsBody.innerHTML = `
      <tr>
        <td colspan="5">Henüz rapor indirilmedi.</td>
      </tr>
    `;
    return;
  }

  recentReports.slice(0, 6).forEach(report => {
    recentReportsBody.innerHTML += `
      <tr>
        <td><strong>${report.name}</strong></td>
        <td>${report.type}</td>
        <td>${report.date}</td>
        <td><span class="badge">${report.format}</span></td>
        <td>
          <button class="download-btn" onclick="downloadReport('${report.name}')">
            İndir
          </button>
        </td>
      </tr>
    `;
  });
}

function renderLogs() {
  if (!downloadLogList) return;

  downloadLogList.innerHTML = "";

  if (downloadLogs.length === 0) {
    downloadLogList.innerHTML = `
      <div class="log-item">
        <i class="fa-solid fa-circle-info"></i>
        <div>
          <h4>Log yok</h4>
          <p>Henüz rapor indirilmedi.</p>
        </div>
        <strong>-</strong>
      </div>
    `;
    return;
  }

  downloadLogs.slice(0, 5).forEach(log => {
    downloadLogList.innerHTML += `
      <div class="log-item">
        <i class="fa-solid fa-download"></i>
        <div>
          <h4>${log.report}</h4>
          <p>${log.user} tarafından indirildi.</p>
        </div>
        <strong>${log.time}</strong>
      </div>
    `;
  });
}

function getReportType(reportName) {
  if (reportName.includes("Müşteri")) return "Müşteri";
  if (reportName.includes("Satış")) return "Satış";
  if (reportName.includes("Tam")) return "Export";
  return "CRM";
}

function getReportRows(reportName) {
  if (reportName.includes("Müşteri")) {
    return exportData.map(item => ({
      "Müşteri ID": item.musteri_id,
      "Müşteri Kodu": item.musteri_kodu,
      "Ad Soyad": `${item.musteri_adi || ""} ${item.musteri_soyadi || ""}`.trim(),
      "Mail": item.mail,
      "Telefon": item.gsm_no,
      "Şehir": item.sehir_adi,
      "Satış Noktası": item.satis_noktasi_adi,
      "Segment": item.segment_adi,
      "Recency": item.recency_degeri,
      "Frequency": item.frequency_degeri,
      "Monetary": item.monetary_degeri,
      "RFM Skoru": item.toplam_rfm_skoru,
      "LTV": item.ltv_tahmini,
      "Churn Olasılığı": item.churn_olasiligi,
      "Aksiyon Önerisi": item.aksiyon_onerisi
    }));
  }

  if (reportName.includes("Satış")) {
    return exportData.map(item => ({
      "Fatura No": item.fatura_no,
      "Fatura Tarihi": item.fatura_tarihi,
      "Fatura Tutarı": item.fatura_tutari,
      "Belge Tipi ID": item.belge_tipi_id,
      "Müşteri ID": item.musteri_id,
      "Müşteri": `${item.musteri_adi || ""} ${item.musteri_soyadi || ""}`.trim(),
      "Şehir": item.sehir_adi,
      "Satış Noktası": item.satis_noktasi_adi,
      "Segment": item.segment_adi
    }));
  }

  return exportData.map(item => ({
    "Müşteri ID": item.musteri_id,
    "Müşteri Kodu": item.musteri_kodu,
    "Ad": item.musteri_adi,
    "Soyad": item.musteri_soyadi,
    "Mail": item.mail,
    "Telefon": item.gsm_no,
    "Kayıt Tarihi": item.kayit_tarihi,

    "Fatura No": item.fatura_no,
    "Fatura Tarihi": item.fatura_tarihi,
    "Fatura Tutarı": item.fatura_tutari,
    "Belge Tipi ID": item.belge_tipi_id,

    "Satış Noktası": item.satis_noktasi_adi,
    "Şehir": item.sehir_adi,

    "Recency": item.recency_degeri,
    "Frequency": item.frequency_degeri,
    "Monetary": item.monetary_degeri,
    "R Skoru": item.r_skoru,
    "F Skoru": item.f_skoru,
    "M Skoru": item.m_skoru,
    "Toplam RFM Skoru": item.toplam_rfm_skoru,

    "Segment": item.segment_adi,
    "LTV Tahmini": item.ltv_tahmini,
    "Churn Olasılığı": item.churn_olasiligi,
    "Hesaplama Tarihi": item.hesaplama_tarihi,
    "Aksiyon Önerisi": item.aksiyon_onerisi
  }));
}

async function previewReport(reportName) {
  await fetchExportData();

  if (!previewPanel || !previewBox) return;

  const rows = getReportRows(reportName);

  previewPanel.classList.add("show");

  previewBox.innerHTML = `
    <div class="preview-row">
      <div>
        <span>Rapor Adı</span>
        <strong>${reportName}</strong>
      </div>
      <div>
        <span>Format</span>
        <strong>${formatFilter ? formatFilter.value : "-"}</strong>
      </div>
      <div>
        <span>Kayıt Sayısı</span>
        <strong>${rows.length.toLocaleString("tr-TR")}</strong>
      </div>
    </div>

    <div class="preview-row">
      <div>
        <span>Segment</span>
        <strong>${segmentFilter && segmentFilter.value === "all" ? "Tümü" : segmentFilter?.value || "-"}</strong>
      </div>
      <div>
        <span>Şehir</span>
        <strong>${cityFilter && cityFilter.value === "all" ? "Tümü" : cityFilter?.value || "-"}</strong>
      </div>
      <div>
        <span>Satış Noktası</span>
        <strong>${pointFilter && pointFilter.value === "all" ? "Tümü" : pointFilter?.value || "-"}</strong>
      </div>
    </div>

    <div class="preview-row">
      <div>
        <span>Tarih Aralığı</span>
        <strong>${startDate?.value || "-"} / ${endDate?.value || "-"}</strong>
      </div>
      <div>
        <span>Seçilen Müşteri</span>
        <strong>${backendCustomerCount.toLocaleString("tr-TR")}</strong>
      </div>
      <div>
        <span>Yetki</span>
        <strong>rapor_export</strong>
      </div>
    </div>
  `;
}

function convertToCSV(rows) {
  if (!rows.length) return "";

  const headers = Object.keys(rows[0]);

  const csvRows = [
    headers.join(";"),
    ...rows.map(row =>
      headers.map(header => {
        const value = row[header] ?? "";
        return `"${String(value).replaceAll('"', '""')}"`;
      }).join(";")
    )
  ];

  return "\uFEFF" + csvRows.join("\n");
}

function downloadCSV(rows, filename) {
  const csvContent = convertToCSV(rows);

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function downloadExcel(rows, filename, sheetName = "Rapor") {
  if (typeof XLSX === "undefined") {
    alert("Excel kütüphanesi yüklenemedi. HTML dosyasına SheetJS scriptini eklediğinden emin ol.");
    return;
  }

  if (!rows.length) {
    alert("Excel için indirilecek veri bulunamadı.");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);

  const headers = Object.keys(rows[0] || {});
  worksheet["!cols"] = headers.map(header => ({
    wch: Math.max(header.length + 4, 18)
  }));

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

function makeSafeFileName(reportName) {
  return reportName
    .toLowerCase()
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replaceAll(" ", "_")
    .replaceAll("/", "_");
}

async function downloadReport(reportName) {
  await fetchExportData();

  const rows = getReportRows(reportName);
  const format = formatFilter ? formatFilter.value : "CSV";
  const today = todayTR();

  if (!rows.length) {
    alert("İndirilecek veri bulunamadı.");
    return;
  }

  const safeName = makeSafeFileName(reportName);

  if (format === "Excel") {
    downloadExcel(rows, safeName, getReportType(reportName));
  } else {
    downloadCSV(rows, safeName);
  }

  const userName = document.getElementById("topUserName")?.textContent || "Kullanıcı";

  recentReports.unshift({
    name: reportName,
    type: getReportType(reportName),
    date: today,
    format
  });

  downloadLogs.unshift({
    user: userName,
    report: reportName,
    time: "Az önce"
  });

  recentReports = recentReports.slice(0, 10);
  downloadLogs = downloadLogs.slice(0, 10);

  localStorage.setItem("recentReports", JSON.stringify(recentReports));
  localStorage.setItem("downloadLogs", JSON.stringify(downloadLogs));

  renderKpis();
  renderRecentReports();
  renderLogs();
}

async function fullExport() {
  await downloadReport("Tam Veri Export");
}

async function applyFilters() {
  await fetchExportData(true);
}

function setupReportEvents() {
  [startDate, endDate, segmentFilter, cityFilter, pointFilter].forEach(input => {
    if (input) {
      input.addEventListener("change", () => {
        
      });
    }
  });

  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener("click", applyFilters);
  }

  if (formatFilter) {
    formatFilter.addEventListener("change", () => {
      renderKpis();
    });
  }

  if (closePreview && previewPanel) {
    closePreview.addEventListener("click", () => {
      previewPanel.classList.remove("show");
    });
  }

  if (fullExportBtn) {
    fullExportBtn.addEventListener("click", fullExport);
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  setupReportEvents();

  renderRecentReports();
  renderLogs();
  renderKpis();

  await fetchExportData();
});