const ltvBars = document.getElementById("ltvBars");
const aovTrend = document.getElementById("aovTrend");
const comparisonChart = document.getElementById("comparisonChart");
const cohortBody = document.getElementById("cohortBody");

const avgLtv = document.getElementById("avgLtv");
const avgChurn = document.getElementById("avgChurn");
const avgAov = document.getElementById("avgAov");
const valuableCustomers = document.getElementById("valuableCustomers");
const riskyCustomers = document.getElementById("riskyCustomers");

const aovYearFilter = document.getElementById("aovYearFilter");
const salesYearFilter = document.getElementById("salesYearFilter");
const cohortYearFilter = document.getElementById("cohortYearFilter");

const monthlySalesChart = document.getElementById("monthlySalesChart");

const aiActionList = document.getElementById("aiActionList");
const forecastInsights = document.getElementById("forecastInsights");
const analyticsAiSourceText = document.getElementById("analyticsAiSourceText");

let ltvData = [];
let aovData = [];
let comparisonData = [];
let salesData = [];
let cohortData = [];
let pageSummary = {};

let ltvChart = null;
let churnChart = null;
let aovChart = null;
let comparisonApexChart = null;
let salesApexChart = null;

function formatMoney(value) {
  return "₺" + Number(value || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("tr-TR");
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
      min-width:150px;
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

async function tryApiRequests(paths) {
  for (const path of paths) {
    try {
      const result = await apiRequest(path);

      if (Array.isArray(result) && result.length > 0) return result;
      if (Array.isArray(result?.veriler) && result.veriler.length > 0) return result.veriler;
      if (Array.isArray(result?.data) && result.data.length > 0) return result.data;
      if (Array.isArray(result?.items) && result.items.length > 0) return result.items;
    } catch (error) {
      console.warn("API denenemedi:", path, error);
    }
  }

  return [];
}

function getPriorityClass(priority) {
  const value = String(priority || "").toLowerCase();

  if (value.includes("yüksek") || value.includes("yuksek")) return "high";
  if (value.includes("düşük") || value.includes("dusuk")) return "low";

  return "medium";
}

function getActionIconClass(priority) {
  const value = String(priority || "").toLowerCase();

  if (value.includes("yüksek") || value.includes("yuksek")) return "purple";
  if (value.includes("düşük") || value.includes("dusuk")) return "blue";

  return "yellow";
}

function renderSummary(summary) {
  pageSummary = summary || {};

  if (avgLtv) avgLtv.textContent = formatMoney(pageSummary.ortalama_ltv);
  if (avgChurn) avgChurn.textContent = `%${Number(pageSummary.ortalama_churn || 0).toFixed(1)}`;
  if (avgAov) avgAov.textContent = formatMoney(pageSummary.ortalama_aov);
  if (valuableCustomers) valuableCustomers.textContent = formatNumber(pageSummary.degerli_musteri_sayisi);
  if (riskyCustomers) riskyCustomers.textContent = formatNumber(pageSummary.riskli_musteri_sayisi);
}

/* LTV DAĞILIMI: İlk mantık gibi count / müşteri sayısı */
function getLtvRangeLabel(item, index) {
  if (item.range) return item.range;
  if (item.aralik) return item.aralik;
  if (item.label) return item.label;

  const start = index * 20000;
  const end = start + 20000;

  if (index === ltvData.length - 1 && ltvData.length >= 5) {
    return `₺${start / 1000}K+`;
  }

  return `₺${start / 1000}K - ₺${end / 1000}K`;
}

function renderLtvBars() {
  if (!ltvBars) return;

  if (ltvChart) {
    ltvChart.destroy();
  }

  if (!ltvData || ltvData.length === 0) {
    ltvBars.innerHTML = `<p class="empty-text">LTV dağılım verisi bulunamadı.</p>`;
    return;
  }

  const labels = ltvData.map((item, index) => getLtvRangeLabel(item, index));

  const values = ltvData.map(item =>
    Number(
      item.count ??
      item.musteri_sayisi ??
      item.customer_count ??
      item.sayi ??
      item.total ??
      0
    )
  );

  ltvBars.innerHTML = "";

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      type: "bar",
      height: 320
    },
    series: [
      {
        name: "Müşteri",
        data: values
      }
    ],
    xaxis: {
      categories: labels,
      labels: {
        rotate: -25,
        trim: false,
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
        columnWidth: "48%"
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
        return createTooltip(label, `${formatNumber(value)} müşteri`);
      }
    }
  };

  ltvChart = new ApexCharts(ltvBars, options);
  ltvChart.render();
}

function renderChurnDistribution(data) {
  const chartEl = document.getElementById("churnRiskChart");
  if (!chartEl) return;

  const low = Number(data?.dusuk_risk || 0);
  const mid = Number(data?.orta_risk || 0);
  const high = Number(data?.yuksek_risk || 0);
  const total = low + mid + high;

  if (churnChart) {
    churnChart.destroy();
  }

  if (total === 0) {
    chartEl.innerHTML = `<p class="empty-text">Churn risk verisi bulunamadı.</p>`;
    return;
  }

  chartEl.innerHTML = "";

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      type: "donut",
      height: 300
    },
    series: [low, mid, high],
    labels: ["Düşük Risk", "Orta Risk", "Yüksek Risk"],
    colors: ["#3478ff", "#ffb020", "#ff2525"],
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
              label: "Müşteri",
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

  churnChart = new ApexCharts(chartEl, options);
  churnChart.render();
}

function renderAovTrend() {
  if (!aovTrend) return;

  if (aovChart) {
    aovChart.destroy();
  }

  if (!aovData || aovData.length === 0) {
    aovTrend.innerHTML = `<p class="empty-text">AOV trend verisi bulunamadı.</p>`;
    return;
  }

  const months = aovData.map(item => item.month || item.ay || "-");
  const values = aovData.map(item => Number(item.value || item.aov || 0));

  aovTrend.innerHTML = "";

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
    xaxis: {
      categories: months
    },
    yaxis: {
      labels: {
        formatter: value => formatMoney(value)
      }
    },
    colors: ["#ff2525"],
    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: "50%"
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
        return createTooltip(month, formatMoney(value));
      }
    }
  };

  aovChart = new ApexCharts(aovTrend, options);
  aovChart.render();
}

/* LTV-CHURN: Bir önceki çift eksenli column + line hali */
function renderComparisonChart() {
  if (!comparisonChart) return;

  if (comparisonApexChart) {
    comparisonApexChart.destroy();
  }

  if (!comparisonData || comparisonData.length === 0) {
    comparisonChart.innerHTML = `<p class="empty-text">Karşılaştırma verisi bulunamadı.</p>`;
    return;
  }

  const labels = comparisonData.map(item => item.segment || "-");
  const ltvValues = comparisonData.map(item => Number(item.ltv || 0));
  const churnValues = comparisonData.map(item => Number(item.churn || 0));

  comparisonChart.innerHTML = "";

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      height: 340,
      type: "line"
    },
    series: [
      {
        name: "LTV",
        type: "column",
        data: ltvValues
      },
      {
        name: "Churn %",
        type: "line",
        data: churnValues
      }
    ],
    xaxis: {
      categories: labels,
      labels: {
        rotate: -25,
        trim: true,
        style: {
          fontWeight: 700
        }
      }
    },
    yaxis: [
      {
        title: {
          text: "LTV"
        },
        labels: {
          formatter: value => formatMoney(value)
        }
      },
      {
        opposite: true,
        min: 0,
        max: 100,
        title: {
          text: "Churn %"
        },
        labels: {
          formatter: value => `%${Math.round(value)}`
        }
      }
    ],
    colors: ["#ff2525", "#3478ff"],
    stroke: {
      width: [0, 4],
      curve: "smooth"
    },
    markers: {
      size: [0, 4],
      hover: {
        size: 7
      }
    },
    plotOptions: {
      bar: {
        borderRadius: 7,
        columnWidth: "50%"
      }
    },
    dataLabels: {
      enabled: false
    },
    legend: {
      position: "bottom",
      labels: {
        colors: getChartTheme().textColor
      }
    },
    tooltip: {
      enabled: true,
      shared: false,
      custom: function ({ series, seriesIndex, dataPointIndex, w }) {
        const label = w.globals.labels[dataPointIndex];
        const name = w.globals.seriesNames[seriesIndex];
        const value = series[seriesIndex][dataPointIndex];

        const formatted =
          name === "LTV"
            ? formatMoney(value)
            : `%${Number(value || 0).toFixed(1)}`;

        return createTooltip(`${label} - ${name}`, formatted);
      }
    }
  };

  comparisonApexChart = new ApexCharts(comparisonChart, options);
  comparisonApexChart.render();
}

function normalizeMonthlySales(data) {
  return (data || []).map(item => {
    const month =
      item.ay ||
      item.month ||
      item.month_name ||
      item.donem ||
      item.tarih ||
      "-";

    const value =
      Number(item.toplam_satis) ||
      Number(item.toplam_satis_tutari) ||
      Number(item.toplam_ciro) ||
      Number(item.total_sales) ||
      Number(item.satis_tutari) ||
      Number(item.ciro) ||
      Number(item.tutar) ||
      Number(item.revenue) ||
      Number(item.satis) ||
      Number(item.sales) ||
      0;

    return { month, value };
  });
}

function renderMonthlySalesChart() {
  if (!monthlySalesChart) return;

  if (salesApexChart) {
    salesApexChart.destroy();
  }

  const normalizedSales = normalizeMonthlySales(salesData);

  if (!normalizedSales || normalizedSales.length === 0) {
    monthlySalesChart.innerHTML = `
      <div class="disabled-box">
        <i class="fa-solid fa-circle-info"></i>
        <h4>Satış verisi yok</h4>
        <p>Seçilen yıl için aylık satış verisi bulunamadı.</p>
      </div>
    `;
    return;
  }

  const months = normalizedSales.map(item => item.month);
  const values = normalizedSales.map(item => item.value);

  monthlySalesChart.innerHTML = "";

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      type: "area",
      height: 320
    },
    series: [
      {
        name: "Aylık Satış",
        data: values
      }
    ],
    xaxis: {
      categories: months
    },
    yaxis: {
      labels: {
        formatter: value => formatMoney(value)
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
        return createTooltip(month, formatMoney(value));
      }
    }
  };

  salesApexChart = new ApexCharts(monthlySalesChart, options);
  salesApexChart.render();
}

function getCohortLevel(value) {
  if (value === 0) return "";
  if (value >= 85) return "cohort-5";
  if (value >= 65) return "cohort-4";
  if (value >= 45) return "cohort-3";
  if (value >= 25) return "cohort-2";
  return "cohort-1";
}

function renderCohortTable() {
  if (!cohortBody) return;

  cohortBody.innerHTML = "";

  if (!cohortData || cohortData.length === 0) {
    cohortBody.innerHTML = `
      <tr>
        <td colspan="6">Seçilen yıl için cohort verisi bulunamadı.</td>
      </tr>
    `;
    return;
  }

  cohortData.forEach(row => {
    const values = row.values || [0, 0, 0, 0, 0];

    const tds = values.map(value => {
      if (value === 0) return `<td>-</td>`;

      return `
        <td>
          <div class="cohort-cell ${getCohortLevel(value)}">
            %${value}
          </div>
        </td>
      `;
    }).join("");

    cohortBody.innerHTML += `
      <tr>
        <td><strong>${row.name}</strong></td>
        ${tds}
      </tr>
    `;
  });
}

function renderForecastInsights() {
  if (!forecastInsights) return;

  const avgChurnValue = Number(pageSummary.ortalama_churn || 0);
  const avgLtvValue = Number(pageSummary.ortalama_ltv || 0);
  const riskCount = Number(pageSummary.riskli_musteri_sayisi || 0);

  forecastInsights.innerHTML = `
    <div class="insight-item">
      <i class="fa-solid fa-chart-line"></i>
      <div>
        <h4>Aylık satış hareketi takip edilmeli</h4>
        <p>Bu grafik gerçek aylık satış verisini gösterir. Veri gelmiyorsa dashboard monthly-sales endpointini kontrol et.</p>
      </div>
    </div>

    <div class="insight-item">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <div>
        <h4>Churn ve LTV birlikte değerlendirilmeli</h4>
        <p>Ortalama churn %${avgChurnValue.toFixed(1)}, ortalama LTV ${formatMoney(avgLtvValue)}. Riskli müşteri sayısı: ${formatNumber(riskCount)}.</p>
      </div>
    </div>
  `;
}

async function renderAiActions() {
  if (!aiActionList) return;

  if (analyticsAiSourceText) {
    analyticsAiSourceText.textContent = "AI önerileri hazırlanıyor";
  }

  aiActionList.innerHTML = `
    <div class="action-card">
      <div class="action-left">
        <div class="action-icon purple">
          <i class="fa-solid fa-brain"></i>
        </div>
        <div>
          <h4>AI önerileri hazırlanıyor</h4>
          <p>Churn, LTV ve segment verileri analiz ediliyor.</p>
        </div>
      </div>
      <button>Analiz</button>
    </div>
  `;

  try {
    const data = await apiRequest("/ai-actions/analytics");

    if (!data || !Array.isArray(data.actions) || data.actions.length === 0) {
      throw new Error("AI önerisi alınamadı");
    }

    aiActionList.innerHTML = data.actions.map(action => {
      const icon = action.ikon || "fa-solid fa-brain";
      const priority = action.oncelik || "Orta";
      const priorityClass = getPriorityClass(priority);
      const iconClass = getActionIconClass(priority);

      return `
        <div class="action-card ai-action-card">
          <div class="action-left">
            <div class="action-icon ${iconClass}">
              <i class="${icon}"></i>
            </div>

            <div>
              <div class="ai-action-title-row">
                <h4>${action.baslik || "AI Analitik Önerisi"}</h4>
                <span class="ai-priority ${priorityClass}">
                  ${priority}
                </span>
              </div>
              <p>${action.aciklama || "Bu analiz için aksiyon önerisi oluşturuldu."}</p>
            </div>
          </div>

          <button type="button">${priority}</button>
        </div>
      `;
    }).join("");

    if (analyticsAiSourceText) {
      analyticsAiSourceText.textContent =
        data.source === "gemini"
          ? "Gemini AI Önerisi"
          : "Kural tabanlı öneri";
    }

  } catch (error) {
    console.error("Analytics AI error:", error);

    aiActionList.innerHTML = `
      <div class="action-card">
        <div class="action-left">
          <div class="action-icon purple">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>

          <div>
            <h4>AI önerileri yüklenemedi</h4>
            <p>/ai-actions/analytics endpointini ve yetki kontrolünü kontrol et.</p>
          </div>
        </div>
        <button>Hata</button>
      </div>
    `;

    if (analyticsAiSourceText) {
      analyticsAiSourceText.textContent = "AI önerileri yüklenemedi";
    }
  }
}

async function loadAovTrendByYear() {
  const selectedYear = aovYearFilter ? aovYearFilter.value : "2025";
  aovData = await apiRequest(`/analytics/aov-trend?year=${selectedYear}`);
  renderAovTrend();
}

async function loadSalesByYear() {
  const selectedYear = salesYearFilter ? salesYearFilter.value : "2025";

  salesData = await tryApiRequests([
    `/dashboard/monthly-sales?year=${selectedYear}`,
    `/dashboard/monthly-sales/${selectedYear}`,
    `/dashboard/monthly-sales`,
    `/invoices/monthly-trend?year=${selectedYear}`,
    `/analytics/monthly-sales?year=${selectedYear}`,
    `/analytics/sales-monthly?year=${selectedYear}`
  ]);

  renderMonthlySalesChart();
  renderForecastInsights();
}

async function loadCohortByYear() {
  const selectedYear = cohortYearFilter ? cohortYearFilter.value : "2025";
  cohortData = await apiRequest(`/analytics/cohort-analysis?year=${selectedYear}`);
  renderCohortTable();
}

async function loadAnalyticsPage() {
  try {
    const selectedAovYear = aovYearFilter ? aovYearFilter.value : "2025";
    const selectedSalesYear = salesYearFilter ? salesYearFilter.value : "2025";
    const selectedCohortYear = cohortYearFilter ? cohortYearFilter.value : "2025";

    const [
      summary,
      ltvDistribution,
      churnDistribution,
      aovTrendData,
      comparison,
      monthlySales,
      cohortResponse
    ] = await Promise.all([
      apiRequest("/analytics/page-summary"),
      apiRequest("/analytics/ltv-distribution"),
      apiRequest("/analytics/churn-distribution"),
      apiRequest(`/analytics/aov-trend?year=${selectedAovYear}`),
      apiRequest("/analytics/ltv-churn-comparison"),

      tryApiRequests([
        `/dashboard/monthly-sales?year=${selectedSalesYear}`,
        `/dashboard/monthly-sales/${selectedSalesYear}`,
        `/dashboard/monthly-sales`,
        `/invoices/monthly-trend?year=${selectedSalesYear}`,
        `/analytics/monthly-sales?year=${selectedSalesYear}`,
        `/analytics/sales-monthly?year=${selectedSalesYear}`
      ]),

      apiRequest(`/analytics/cohort-analysis?year=${selectedCohortYear}`)
    ]);

    ltvData = ltvDistribution || [];
    aovData = aovTrendData || [];
    comparisonData = comparison || [];
    salesData = monthlySales || [];
    cohortData = cohortResponse || [];

    renderSummary(summary || {});
    renderLtvBars();
    renderChurnDistribution(churnDistribution || {});
    renderAovTrend();
    renderComparisonChart();
    renderMonthlySalesChart();
    renderCohortTable();
    renderForecastInsights();
    await renderAiActions();

  } catch (error) {
    console.error("Analitik sayfası yüklenemedi:", error);

    if (forecastInsights) {
      forecastInsights.innerHTML = `
        <div class="insight-item">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <div>
            <h4>Analitik veriler yüklenemedi</h4>
            <p>Backend, token veya analytics endpointlerini kontrol et.</p>
          </div>
        </div>
      `;
    }
  }
}

function setupEvents() {
  if (aovYearFilter) {
    aovYearFilter.addEventListener("change", loadAovTrendByYear);
  }

  if (salesYearFilter) {
    salesYearFilter.addEventListener("change", loadSalesByYear);
  }

  if (cohortYearFilter) {
    cohortYearFilter.addEventListener("change", loadCohortByYear);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  setupEvents();
  loadAnalyticsPage();
});