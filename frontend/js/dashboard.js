let salesChart = null;
let segmentChart = null;
let cityChart = null;
let channelChart = null;
let aovChart = null;
let returnChart = null;

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0
  });
}

function formatShortCurrency(value) {
  const number = Number(value || 0);

  if (number >= 1000000) {
    return "₺" + (number / 1000000).toFixed(1).replace(".", ",") + "M";
  }

  if (number >= 1000) {
    return "₺" + (number / 1000).toFixed(1).replace(".", ",") + "B";
  }

  return formatCurrency(number);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("tr-TR");
}

function formatPercent(value) {
  return "%" + Number(value || 0).toFixed(1);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
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

function renderEmptyChart(el, message) {
  if (!el) return;

  el.innerHTML = `
    <p class="empty-text">
      ${message}
    </p>
  `;
}

async function loadDashboardSummary() {
  const data = await apiRequest("/dashboard/summary");
  if (!data) return;

  const genel = data.genel_ozet || {};

  const toplamCiro = Number(genel.toplam_ciro || 0);
  const toplamMusteri = Number(genel.toplam_musteri || 0);
  const toplamSiparis = Number(genel.toplam_siparis || 0);
  const ortalamaSepet = toplamSiparis > 0 ? toplamCiro / toplamSiparis : 0;
  const riskliMusteri = Number(genel.riskli_musteri_sayisi || 0);
  const iadeOrani = Number(data.iade_ozet?.iade_orani || 0);

  setText("totalRevenue", formatCurrency(toplamCiro));
  setText("totalCustomers", formatNumber(toplamMusteri));
  setText("totalOrders", formatNumber(toplamSiparis));
  setText("avgBasket", formatCurrency(ortalamaSepet));
  setText("returnRate", formatPercent(iadeOrani));
  setText("churnRisk", formatNumber(riskliMusteri));

  setText("channelTotal", formatShortCurrency(toplamCiro));
  setText("riskAlertCount", formatNumber(riskliMusteri));
  setText("refundAlertRate", formatPercent(iadeOrani));
  setText("riskActionCount", formatNumber(riskliMusteri));

  renderSegmentDistribution(data.segment_dagilimi || []);
  renderChannelSales(data.kanal_bazli_satis || []);
}

async function loadYears() {
  const years = await apiRequest("/dashboard/years");
  if (!years || !years.length) return;

  const defaultYear = years.includes(2025) ? 2025 : years[years.length - 1];

  fillYearSelect("salesYearSelect", years, defaultYear);
  fillYearSelect("cityYearSelect", years, defaultYear);
  fillYearSelect("aovYearSelect", years, defaultYear);
  fillYearSelect("returnYearSelect", years, defaultYear);

  await loadMonthlySales(defaultYear);
  await loadCitySalesByYear(defaultYear);
  await loadMonthlyAov(defaultYear);
  await loadMonthlyReturnRate(defaultYear);

  addYearChange("salesYearSelect", loadMonthlySales);
  addYearChange("cityYearSelect", loadCitySalesByYear);
  addYearChange("aovYearSelect", loadMonthlyAov);
  addYearChange("returnYearSelect", loadMonthlyReturnRate);
}

function fillYearSelect(id, years, defaultYear) {
  const select = document.getElementById(id);
  if (!select) return;

  select.innerHTML = "";

  years.forEach(year => {
    select.innerHTML += `<option value="${year}">${year}</option>`;
  });

  select.value = defaultYear;
}

function addYearChange(id, callback) {
  const select = document.getElementById(id);
  if (!select) return;

  select.addEventListener("change", e => {
    callback(Number(e.target.value));
  });
}

async function loadMonthlySales(year) {
  const el = document.getElementById("salesChart");
  if (!el) return;

  const data = await apiRequest(`/dashboard/monthly-sales?year=${year}`);
  if (!data || !Array.isArray(data)) {
    renderEmptyChart(el, "Satış verisi bulunamadı.");
    return;
  }

  const months = data.map(item => item.ay || item.month || "-");
  const values = data.map(item => Number(item.toplam_ciro || item.toplam_satis || 0));

  const total = values.reduce((sum, value) => sum + value, 0);
  setText("chartRevenueLabel", formatCurrency(total));

  if (salesChart) salesChart.destroy();

  if (!values.length) {
    renderEmptyChart(el, "Bu yıl için satış verisi yok.");
    return;
  }

  el.innerHTML = "";

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      type: "area",
      height: 320
    },
    series: [
      {
        name: "Satış",
        data: values
      }
    ],
    xaxis: {
      categories: months
    },
    yaxis: {
      labels: {
        formatter: value => formatShortCurrency(value)
      }
    },
    colors: ["#ff2525"],
    stroke: {
      curve: "smooth",
      width: 4
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 0.08
      }
    },
    markers: {
      size: 0,
      hover: {
        size: 7
      }
    },
    dataLabels: {
      enabled: false
    },
    tooltip: {
      enabled: true,
      intersect: false,
      shared: false,
      custom: function ({ series, seriesIndex, dataPointIndex, w }) {
        const month = w.globals.labels[dataPointIndex];
        const value = series[seriesIndex][dataPointIndex];
        return createTooltip(month, formatCurrency(value));
      }
    }
  };

  salesChart = new ApexCharts(el, options);
  salesChart.render();
}

function renderSegmentDistribution(segments) {
  const el = document.getElementById("segmentChart");
  if (!el) return;

  const labels = segments.map(item => item.segment_adi || "Bilinmiyor");
  const values = segments.map(item => Number(item.musteri_sayisi || 0));
  const total = values.reduce((sum, value) => sum + value, 0);

  if (segmentChart) segmentChart.destroy();

  if (!values.length || total === 0) {
    renderEmptyChart(el, "Segment verisi bulunamadı.");
    return;
  }

  el.innerHTML = "";

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      type: "donut",
      height: 320
    },
    labels,
    series: values,
    colors: ["#ff2525", "#d9141c", "#6366f1", "#f59e0b", "#6b7280"],
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
              label: "Toplam",
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
        return createTooltip(label, `${formatNumber(value)} müşteri`);
      }
    }
  };

  segmentChart = new ApexCharts(el, options);
  segmentChart.render();
}

async function loadCitySalesByYear(year) {
  const el = document.getElementById("cityChart");
  if (!el) return;

  const data = await apiRequest(`/dashboard/city-sales?year=${year}`);
  if (!data || !Array.isArray(data)) {
    renderEmptyChart(el, "Şehir bazlı satış verisi bulunamadı.");
    return;
  }

  const sorted = [...data]
    .sort((a, b) => Number(b.toplam_ciro || 0) - Number(a.toplam_ciro || 0))
    .slice(0, 5);

  const labels = sorted.map(item => item.sehir_adi || item.sehir || "Bilinmiyor");
  const values = sorted.map(item => Number(item.toplam_ciro || 0));

  if (cityChart) cityChart.destroy();

  if (!values.length) {
    renderEmptyChart(el, "Bu yıl için şehir satış verisi yok.");
    return;
  }

  el.innerHTML = "";

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      type: "bar",
      height: 350
    },
    series: [
      {
        name: "Satış",
        data: values
      }
    ],
    colors: ["#ff2525"],
    xaxis: {
      categories: labels,
      labels: {
        formatter: value => formatShortCurrency(value)
      }
    },
    yaxis: {
      labels: {
        style: {
          fontWeight: 700
        }
      }
    },
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
        const city = w.globals.labels[dataPointIndex];
        const value = series[seriesIndex][dataPointIndex];
        return createTooltip(city, formatCurrency(value));
      }
    }
  };

  cityChart = new ApexCharts(el, options);
  cityChart.render();
}

function renderChannelSales(channelSales) {
  const el = document.getElementById("channelChart");
  if (!el) return;

  const labels = channelSales.map(item => item.kanal_adi || "Bilinmiyor");
  const values = channelSales.map(item => Number(item.toplam_ciro || 0));
  const total = values.reduce((sum, value) => sum + value, 0);

  if (channelChart) channelChart.destroy();

  if (!values.length || total === 0) {
    renderEmptyChart(el, "Kanal satış verisi bulunamadı.");
    return;
  }

  el.innerHTML = "";

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      type: "donut",
      height: 300
    },
    labels,
    series: values,
    colors: ["#ff2525", "#6b7280", "#6366f1", "#f59e0b"],
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
              label: "Toplam",
              formatter: () => formatShortCurrency(total)
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
        return createTooltip(label, formatCurrency(value));
      }
    }
  };

  channelChart = new ApexCharts(el, options);
  channelChart.render();
}

async function loadMonthlyAov(year) {
  const el = document.getElementById("aovChart");
  if (!el) return;

  const data = await apiRequest(`/dashboard/monthly-aov?year=${year}`);
  if (!data || !Array.isArray(data)) {
    renderEmptyChart(el, "AOV verisi bulunamadı.");
    return;
  }

  const months = data.map(item => item.ay || item.month || "-");
  const values = data.map(item => Number(item.ortalama_sepet || item.aov || 0));

  if (aovChart) aovChart.destroy();

  if (!values.length) {
    renderEmptyChart(el, "Bu yıl için AOV verisi yok.");
    return;
  }

  el.innerHTML = "";

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      type: "bar",
      height: 300
    },
    series: [
      {
        name: "AOV",
        data: values
      }
    ],
    colors: ["#ff2525"],
    xaxis: {
      categories: months
    },
    yaxis: {
      labels: {
        formatter: value => formatCurrency(value)
      }
    },
    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: "48%"
      }
    },
    dataLabels: {
      enabled: false
    },
    tooltip: {
      enabled: true,
      custom: function ({ series, seriesIndex, dataPointIndex, w }) {
        const month = w.globals.labels[dataPointIndex];
        const value = series[seriesIndex][dataPointIndex];
        return createTooltip(month, formatCurrency(value));
      }
    }
  };

  aovChart = new ApexCharts(el, options);
  aovChart.render();
}

async function loadMonthlyReturnRate(year) {
  const el = document.getElementById("returnChart");
  if (!el) return;

  const data = await apiRequest(`/dashboard/monthly-return-rate?year=${year}`);
  if (!data || !Array.isArray(data)) {
    renderEmptyChart(el, "İade oranı verisi bulunamadı.");
    return;
  }

  const months = data.map(item => item.ay || item.month || "-");
  const values = data.map(item => Number(item.iade_orani || 0));

  if (returnChart) returnChart.destroy();

  if (!values.length) {
    renderEmptyChart(el, "Bu yıl için iade oranı verisi yok.");
    return;
  }

  el.innerHTML = "";

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      type: "area",
      height: 260
    },
    series: [
      {
        name: "İade Oranı",
        data: values
      }
    ],
    colors: ["#ff2525"],
    xaxis: {
      categories: months
    },
    yaxis: {
      labels: {
        formatter: value => `%${Number(value || 0).toFixed(1)}`
      }
    },
    stroke: {
      curve: "smooth",
      width: 4
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 0.08
      }
    },
    markers: {
      size: 0,
      hover: {
        size: 7
      }
    },
    dataLabels: {
      enabled: false
    },
    tooltip: {
      enabled: true,
      intersect: false,
      shared: false,
      custom: function ({ series, seriesIndex, dataPointIndex, w }) {
        const month = w.globals.labels[dataPointIndex];
        const value = series[seriesIndex][dataPointIndex];
        return createTooltip(month, `%${Number(value || 0).toFixed(1)}`);
      }
    }
  };

  returnChart = new ApexCharts(el, options);
  returnChart.render();
}

function reloadDashboardCharts() {
  const salesYear = Number(document.getElementById("salesYearSelect")?.value);
  const cityYear = Number(document.getElementById("cityYearSelect")?.value);
  const aovYear = Number(document.getElementById("aovYearSelect")?.value);
  const returnYear = Number(document.getElementById("returnYearSelect")?.value);

  if (salesYear) loadMonthlySales(salesYear);
  if (cityYear) loadCitySalesByYear(cityYear);
  if (aovYear) loadMonthlyAov(aovYear);
  if (returnYear) loadMonthlyReturnRate(returnYear);

  loadDashboardSummary();
}

window.reloadCharts = reloadDashboardCharts;

async function initDashboardPage() {
  try {
    setupDashboardSearch();

    await loadDashboardSummary();
    await loadYears();
    await loadDashboardAiActions();
  } catch (error) {
    console.error("Dashboard yüklenemedi:", error);
  }
}

async function loadDashboardAiActions() {
  const container = document.getElementById("dashboardAiActions");
  if (!container) return;

  container.innerHTML = `
    <div class="action-item">
      <div class="action-icon purple">
        <i class="fa-solid fa-brain"></i>
      </div>
      <div>
        <h4>AI önerileri hazırlanıyor</h4>
        <p>Dashboard verileri analiz ediliyor.</p>
      </div>
      <button>Analiz</button>
    </div>
  `;

  try {
    const data = await apiRequest("/ai-actions/dashboard");

    if (!data || !Array.isArray(data.actions) || data.actions.length === 0) {
      container.innerHTML = `
        <div class="action-item">
          <div class="action-icon yellow">
            <i class="fa-solid fa-lightbulb"></i>
          </div>
          <div>
            <h4>Genel takip önerisi</h4>
            <p>Riskli müşteriler, iade oranı ve aylık satış performansı düzenli takip edilmeli.</p>
          </div>
          <button>Orta</button>
        </div>
      `;
      return;
    }

    container.innerHTML = data.actions.map(action => {
      const icon = action.ikon || "fa-solid fa-lightbulb";
      const priority = action.oncelik || "Orta";

      let iconClass = "yellow";

      if (priority.includes("Yüksek")) {
        iconClass = "purple";
      } else if (priority.includes("Düşük")) {
        iconClass = "blue";
      }

      return `
        <div class="action-item">
          <div class="action-icon ${iconClass}">
            <i class="${icon}"></i>
          </div>
          <div>
            <h4>${action.baslik || "AI Önerisi"}</h4>
            <p>${action.aciklama || "Dashboard verilerine göre aksiyon önerisi oluşturuldu."}</p>
          </div>
          <button>${priority}</button>
        </div>
      `;
    }).join("");

  } catch (error) {
    console.error("Dashboard AI önerileri alınamadı:", error);

    container.innerHTML = `
      <div class="action-item">
        <div class="action-icon yellow">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <div>
          <h4>AI önerileri yüklenemedi</h4>
          <p>/ai-actions/dashboard endpointini ve token yetkisini kontrol et.</p>
        </div>
        <button>Hata</button>
      </div>
    `;
  }
}

function setupDashboardSearch() {
  const input = document.getElementById("globalSearchInput");
  const resultsBox = document.getElementById("searchResults");

  if (!input || !resultsBox) return;

  let timer = null;

  input.addEventListener("input", () => {
    clearTimeout(timer);

    const query = input.value.trim();

    if (query.length < 2) {
      resultsBox.innerHTML = "";
      resultsBox.style.display = "none";
      return;
    }

    timer = setTimeout(async () => {
      try {
        const data = await apiRequest(`/dashboard/search?q=${encodeURIComponent(query)}`);

        const customers = data?.musteriler || [];
        const invoices = data?.faturalar || [];

        resultsBox.innerHTML = "";
        resultsBox.style.display = "block";

        if (!customers.length && !invoices.length) {
          resultsBox.innerHTML = `
            <div class="search-item">
              <strong>Sonuç bulunamadı</strong>
              <span>${query}</span>
            </div>
          `;
          return;
        }

        customers.forEach(item => {
          resultsBox.innerHTML += `
            <div class="search-item" onclick="window.location.href='customer360.html?musteri_id=${item.musteri_id}'">
              <strong>${item.musteri_adi || item.ad_soyad || "Müşteri"}</strong>
              <span>Müşteri</span>
            </div>
          `;
        });

        invoices.forEach(item => {
          resultsBox.innerHTML += `
            <div class="search-item" onclick="window.location.href='invoices.html'">
              <strong>${item.fatura_no || "Fatura"}</strong>
              <span>Fatura</span>
            </div>
          `;
        });

      } catch (error) {
        console.error("Dashboard arama hatası:", error);

        resultsBox.innerHTML = `
          <div class="search-item">
            <strong>Arama yapılamadı</strong>
            <span>/dashboard/search endpointini kontrol et</span>
          </div>
        `;
        resultsBox.style.display = "block";
      }
    }, 350);
  });

  document.addEventListener("click", event => {
    if (!event.target.closest(".search")) {
      resultsBox.style.display = "none";
    }
  });
}

function setLoggedUserName() {
  const user = JSON.parse(localStorage.getItem("currentUser"));

  if (!user) return;

  const fullName = `${user.ad || ""} ${user.soyad || ""}`.trim() || "Kullanıcı";

  const helloTitle = document.getElementById("helloTitle");
  const topUserName = document.getElementById("topUserName");
  const topUserRole = document.getElementById("topUserRole");
  const userAvatar = document.getElementById("userAvatar");

  if (helloTitle) {
    helloTitle.textContent = `Merhaba, ${fullName}`;
  }

  if (topUserName) {
    topUserName.textContent = fullName;
  }

  if (topUserRole) {
    topUserRole.textContent = user.rol_adi || "Rol";
  }

  if (userAvatar) {
    userAvatar.textContent = fullName.charAt(0).toUpperCase();
  }
}

document.addEventListener("DOMContentLoaded", setLoggedUserName);

window.addEventListener("DOMContentLoaded", initDashboardPage);