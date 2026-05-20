const logSearch = document.getElementById("logSearch");
const typeFilter = document.getElementById("typeFilter");
const statusFilter = document.getElementById("statusFilter");
const exportBtn = document.getElementById("exportBtn");

const todayLoginCount = document.getElementById("todayLoginCount");
const failedLoginCount = document.getElementById("failedLoginCount");
const errorCount = document.getElementById("errorCount");
const actionCount = document.getElementById("actionCount");

const anomalyAlerts = document.getElementById("anomalyAlerts");
const errorChart = document.getElementById("errorChart");
const logTypeChart = document.getElementById("logTypeChart");
const userActionChart = document.getElementById("userActionChart");

const anomalyList = document.getElementById("anomalyList");
const errorList = document.getElementById("errorList");

const logTableBody = document.getElementById("logTableBody");
const logCountText = document.getElementById("logCountText");

let logs = [];
let filteredLogs = [];

let errorApexChart = null;
let logTypeApexChart = null;
let userActionApexChart = null;

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("tr-TR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function safeText(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("tr-TR");
}

function getBadgeClass(status) {
  if (status === "Başarılı") return "success";
  if (status === "Başarısız") return "danger";
  return "warn";
}

function countBy(key, data) {
  return data.reduce((acc, item) => {
    const value = item[key] || "Bilinmeyen";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function getChartTheme() {
  const isLight = document.body.classList.contains("light-mode");

  return {
    mode: isLight ? "light" : "dark",
    textColor: isLight ? "#161616" : "#f8f8f8",
    mutedColor: isLight ? "#777b86" : "#9ca0aa",
    gridColor: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)",
    tooltipBg: isLight ? "#ffffff" : "#161a22",
    tooltipBorder: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"
  };
}

function getBaseChartOptions() {
  const theme = getChartTheme();

  return {
    chart: {
      toolbar: { show: false },
      foreColor: theme.textColor,
      fontFamily: "Inter, sans-serif",
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 800
      }
    },
    grid: {
      borderColor: theme.gridColor
    },
    tooltip: {
      enabled: true,
      theme: theme.mode
    }
  };
}

function createTooltip(title, value) {
  const theme = getChartTheme();

  return `
    <div style="
      background:${theme.tooltipBg};
      color:${theme.textColor};
      border:1px solid ${theme.tooltipBorder};
      border-radius:12px;
      padding:10px 12px;
      box-shadow:0 12px 30px rgba(0,0,0,0.25);
      font-family:Inter, sans-serif;
      min-width:140px;
    ">
      <div style="
        font-size:12px;
        color:${theme.mutedColor};
        font-weight:800;
        margin-bottom:5px;
      ">
        ${title}
      </div>
      <div style="
        font-size:15px;
        color:${theme.textColor};
        font-weight:900;
      ">
        ${value}
      </div>
    </div>
  `;
}

function renderKpis(data) {
  if (todayLoginCount) {
    todayLoginCount.textContent = formatNumber(
      data.filter(item => item.type === "Giriş").length
    );
  }

  if (failedLoginCount) {
    failedLoginCount.textContent = formatNumber(
      data.filter(item => item.status === "Başarısız").length
    );
  }

  if (errorCount) {
    errorCount.textContent = formatNumber(
      data.filter(item => item.status === "Kritik" || item.type === "Hata").length
    );
  }

  if (actionCount) {
    actionCount.textContent = formatNumber(
      data.filter(item => item.type === "İşlem").length
    );
  }
}

function renderAlerts(data) {
  if (!anomalyAlerts) return;

  const failed = data.filter(item => item.status === "Başarısız");
  const failedByIp = countBy("ip", failed);

  const riskyIp = Object.entries(failedByIp).find(([ip, count]) => {
    return ip !== "-" && count >= 3;
  });

  anomalyAlerts.innerHTML = "";

  if (riskyIp) {
    anomalyAlerts.innerHTML = `
      <div class="alert-card">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <div>
          <h4>Anormal hareket tespiti</h4>
          <p>${riskyIp[0]} IP adresinden ${riskyIp[1]} başarısız giriş denemesi görüldü.</p>
        </div>
      </div>
    `;
    return;
  }

  if (failed.length > 0) {
    anomalyAlerts.innerHTML = `
      <div class="alert-card">
        <i class="fa-solid fa-user-lock"></i>
        <div>
          <h4>Başarısız giriş uyarısı</h4>
          <p>Seçilen kayıtlar içinde ${failed.length} başarısız giriş denemesi var.</p>
        </div>
      </div>
    `;
    return;
  }

  anomalyAlerts.innerHTML = `
    <div class="alert-card">
      <i class="fa-solid fa-circle-check"></i>
      <div>
        <h4>Anormal hareket bulunmuyor</h4>
        <p>Şu an sistem loglarında kritik bir güvenlik davranışı görünmüyor.</p>
      </div>
    </div>
  `;
}

function getDayName(dateValue) {
  if (!dateValue) return "Bilinmeyen";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "Bilinmeyen";

  return date.toLocaleDateString("tr-TR", {
    weekday: "short"
  });
}

function isErrorLikeLog(item) {
  const msg = `${item.message || ""} ${item.detail || ""}`.toLowerCase();

  return (
    item.type === "Hata" ||
    item.status === "Kritik" ||
    msg.includes("hata") ||
    msg.includes("error")
  );
}

function renderErrorChart(data) {
  if (!errorChart) return;

  if (errorApexChart) {
    errorApexChart.destroy();
  }

  const errorLikeLogs = data.filter(isErrorLikeLog);

  const errorDays = errorLikeLogs.reduce((acc, item) => {
    const day = getDayName(item.date);
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  const labels = Object.keys(errorDays);
  const values = Object.values(errorDays);

  if (labels.length === 0) {
    errorChart.innerHTML = `<p class="empty-text">Hata verisi bulunamadı.</p>`;
    return;
  }

  errorChart.innerHTML = "";

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      type: "bar",
      height: 280
    },
    series: [
      {
        name: "Hata",
        data: values
      }
    ],
    xaxis: {
      categories: labels,
      labels: {
        style: {
          fontWeight: 700
        }
      }
    },
    yaxis: {
      labels: {
        formatter: value => Math.round(value)
      }
    },
    colors: ["#ff2525"],
    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: "45%"
      }
    },
    dataLabels: {
      enabled: false
    },
    tooltip: {
      enabled: true,
      custom: function ({ series, seriesIndex, dataPointIndex, w }) {
        const label = w.globals.labels[dataPointIndex];
        const value = series[seriesIndex][dataPointIndex];
        return createTooltip(label, `${formatNumber(value)} hata`);
      }
    }
  };

  errorApexChart = new ApexCharts(errorChart, options);
  errorApexChart.render();
}

function renderLogTypeChart(data) {
  if (!logTypeChart) return;

  if (logTypeApexChart) {
    logTypeApexChart.destroy();
  }

  const typeCounts = countBy("type", data);

  const labels = ["Giriş", "İşlem", "Hata"];
  const values = labels.map(label => Number(typeCounts[label] || 0));
  const total = values.reduce((sum, value) => sum + value, 0);

  if (total === 0) {
    logTypeChart.innerHTML = `<p class="empty-text">Log türü verisi yok.</p>`;
    return;
  }

  logTypeChart.innerHTML = "";

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      type: "donut",
      height: 280
    },
    series: values,
    labels,
    colors: ["#3478ff", "#ff2525", "#555965"],
    stroke: {
      colors: ["transparent"]
    },
    legend: {
      position: "bottom",
      fontWeight: 800,
      labels: {
        colors: getChartTheme().textColor
      }
    },
    plotOptions: {
      pie: {
        donut: {
          size: "68%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Log",
              formatter: () => formatNumber(total)
            }
          }
        }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: value => `%${value.toFixed(1)}`
    },
    tooltip: {
      enabled: true,
      custom: function ({ series, seriesIndex, w }) {
        const label = w.globals.labels[seriesIndex];
        const value = series[seriesIndex];
        return createTooltip(label, `${formatNumber(value)} kayıt`);
      }
    }
  };

  logTypeApexChart = new ApexCharts(logTypeChart, options);
  logTypeApexChart.render();
}

function renderUserActionChart(data) {
  if (!userActionChart) return;

  if (userActionApexChart) {
    userActionApexChart.destroy();
  }

  const userActions = data
    .filter(item => item.type === "İşlem")
    .reduce((acc, item) => {
      const user = item.user || "System";
      acc[user] = (acc[user] || 0) + 1;
      return acc;
    }, {});

  const sorted = Object.entries(userActions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const labels = sorted.map(item => item[0]);
  const values = sorted.map(item => item[1]);

  if (labels.length === 0) {
    userActionChart.innerHTML = `<p class="empty-text">Kullanıcı işlem verisi yok.</p>`;
    return;
  }

  userActionChart.innerHTML = "";

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      type: "bar",
      height: Math.max(300, labels.length * 45)
    },
    series: [
      {
        name: "İşlem",
        data: values
      }
    ],
    xaxis: {
      categories: labels,
      labels: {
        formatter: value => Math.round(value)
      }
    },
    yaxis: {
      labels: {
        style: {
          fontWeight: 700
        }
      }
    },
    colors: ["#ff2525"],
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 8,
        barHeight: "55%"
      }
    },
    dataLabels: {
      enabled: false
    },
    tooltip: {
      enabled: true,
      custom: function ({ series, seriesIndex, dataPointIndex, w }) {
        const label = w.globals.labels[dataPointIndex];
        const value = series[seriesIndex][dataPointIndex];
        return createTooltip(label, `${formatNumber(value)} işlem`);
      }
    }
  };

  userActionApexChart = new ApexCharts(userActionChart, options);
  userActionApexChart.render();
}

function renderCharts(data) {
  renderErrorChart(data);
  renderLogTypeChart(data);
  renderUserActionChart(data);
}

function renderAnomalies(data) {
  if (!anomalyList) return;

  const failedByIp = data
    .filter(item => item.status === "Başarısız")
    .reduce((acc, item) => {
      const ip = item.ip || "-";
      acc[ip] = (acc[ip] || 0) + 1;
      return acc;
    }, {});

  anomalyList.innerHTML = "";

  Object.entries(failedByIp).forEach(([ip, count]) => {
    if (ip !== "-" && count >= 2) {
      anomalyList.innerHTML += `
        <div class="insight-item">
          <i class="fa-solid fa-user-lock"></i>
          <div>
            <h4>Tekrarlı başarısız giriş</h4>
            <p>${ip} adresinden ${count} başarısız giriş denemesi var.</p>
          </div>
          <span class="badge danger">Risk</span>
        </div>
      `;
    }
  });

  if (anomalyList.innerHTML.trim() === "") {
    anomalyList.innerHTML = `
      <div class="insight-item">
        <i class="fa-solid fa-circle-check"></i>
        <div>
          <h4>Normal aktivite</h4>
          <p>Basit kurala göre anormal hareket görünmüyor.</p>
        </div>
        <span class="badge success">Temiz</span>
      </div>
    `;
  }
}

function renderErrors(data) {
  if (!errorList) return;

  const errors = data.filter(isErrorLikeLog);

  errorList.innerHTML = "";

  if (errors.length === 0) {
    errorList.innerHTML = `
      <div class="insight-item">
        <i class="fa-solid fa-circle-check"></i>
        <div>
          <h4>Hata kaydı yok</h4>
          <p>Seçilen filtreye göre hata logu bulunmuyor.</p>
        </div>
      </div>
    `;
    return;
  }

  errors.slice(0, 6).forEach(error => {
    errorList.innerHTML += `
      <div class="insight-item">
        <i class="fa-solid fa-bug"></i>
        <div>
          <h4>${safeText(error.message)}</h4>
          <p>${formatDate(error.date)} - ${safeText(error.ip)}</p>
        </div>
        <span class="badge warn">${safeText(error.status)}</span>
      </div>
    `;
  });
}

function renderTable(data) {
  if (!logTableBody || !logCountText) return;

  logTableBody.innerHTML = "";

  if (data.length === 0) {
    logTableBody.innerHTML = `
      <tr>
        <td colspan="6">Kayıt bulunamadı.</td>
      </tr>
    `;

    logCountText.textContent = "0 kayıt listeleniyor";
    return;
  }

  data.forEach(log => {
    logTableBody.innerHTML += `
      <tr>
        <td>${formatDate(log.date)}</td>
        <td><strong>${safeText(log.user)}</strong></td>
        <td>${safeText(log.type)}</td>
        <td title="${safeText(log.detail)}">${safeText(log.message)}</td>
        <td>${safeText(log.ip)}</td>
        <td><span class="badge ${getBadgeClass(log.status)}">${safeText(log.status)}</span></td>
      </tr>
    `;
  });

  logCountText.textContent = `${formatNumber(data.length)} kayıt listeleniyor`;
}

function renderAll(data) {
  renderKpis(data);
  renderAlerts(data);
  renderCharts(data);
  renderAnomalies(data);
  renderErrors(data);
  renderTable(data);
}

function applyFilters() {
  const searchValue = logSearch ? logSearch.value.toLowerCase().trim() : "";
  const typeValue = typeFilter ? typeFilter.value : "all";
  const statusValue = statusFilter ? statusFilter.value : "all";

  filteredLogs = logs.filter(log => {
    const searchableText = `
      ${log.user || ""}
      ${log.type || ""}
      ${log.message || ""}
      ${log.detail || ""}
      ${log.ip || ""}
      ${log.table || ""}
      ${log.status || ""}
    `.toLowerCase();

    const searchMatch = searchableText.includes(searchValue);
    const typeMatch = typeValue === "all" || log.type === typeValue;
    const statusMatch = statusValue === "all" || log.status === statusValue;

    return searchMatch && typeMatch && statusMatch;
  });

  renderAll(filteredLogs);
}

function exportLogs() {
  let csv = "\uFEFFTarih,Kullanıcı,Log Türü,Mesaj,Detay,IP Adresi,Durum,Tablo,Kayıt ID\n";

  filteredLogs.forEach(log => {
    const row = [
      formatDate(log.date),
      safeText(log.user),
      safeText(log.type),
      safeText(log.message),
      safeText(log.detail),
      safeText(log.ip),
      safeText(log.status),
      safeText(log.table),
      safeText(log.record_id)
    ];

    csv += row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",") + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "log_denetim.csv";
  link.click();

  URL.revokeObjectURL(url);
}

function showLoading() {
  if (!logTableBody) return;

  logTableBody.innerHTML = `
    <tr>
      <td colspan="6">Log kayıtları yükleniyor...</td>
    </tr>
  `;
}

function showError(message) {
  if (anomalyAlerts) {
    anomalyAlerts.innerHTML = `
      <div class="alert-card">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <div>
          <h4>Veri alınamadı</h4>
          <p>${message}</p>
        </div>
      </div>
    `;
  }

  if (logTableBody) {
    logTableBody.innerHTML = `
      <tr>
        <td colspan="6">${message}</td>
      </tr>
    `;
  }
}

async function loadLogs() {
  try {
    showLoading();

    const data = await apiRequest("/logs/");

    logs = Array.isArray(data) ? data : [];
    filteredLogs = [...logs];

    renderAll(filteredLogs);
  } catch (error) {
    console.error("Log verileri alınamadı:", error);
    showError(error.message);
  }
}

function setupLogEvents() {
  if (logSearch) logSearch.addEventListener("input", applyFilters);
  if (typeFilter) typeFilter.addEventListener("change", applyFilters);
  if (statusFilter) statusFilter.addEventListener("change", applyFilters);
  if (exportBtn) exportBtn.addEventListener("click", exportLogs);
}

window.addEventListener("DOMContentLoaded", () => {
  setupLogEvents();
  loadLogs();
});