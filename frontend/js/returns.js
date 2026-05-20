const returnSearch = document.getElementById("returnSearch");
const pointFilter = document.getElementById("pointFilter");
const riskFilter = document.getElementById("riskFilter");
const yearFilter = document.getElementById("yearFilter");
const exportBtn = document.getElementById("exportBtn");

const totalReturns = document.getElementById("totalReturns");
const returnRate = document.getElementById("returnRate");
const returnAmount = document.getElementById("returnAmount");
const topReturnedProduct = document.getElementById("topReturnedProduct");
const topReturnedCount = document.getElementById("topReturnedCount");

const riskProductList = document.getElementById("riskProductList");
const operationNotes = document.getElementById("operationNotes");

const monthlyReturnChartEl = document.getElementById("monthlyReturnChart");
const productReturnChartEl = document.getElementById("productReturnChart");
const pointReturnChartEl = document.getElementById("pointReturnChart");
const trendInfoBtn = document.getElementById("trendInfoBtn");

const returnTableBody = document.getElementById("returnTableBody");
const returnCountText = document.getElementById("returnCountText");

let returns = [];
let filteredReturns = [];
let productAnalysis = [];
let pointAnalysis = [];
let monthlyTrend = [];

let monthlyReturnApexChart = null;
let productReturnApexChart = null;
let pointReturnApexChart = null;

function formatNumber(value) {
  return Number(value || 0).toLocaleString("tr-TR");
}

function formatMoney(value) {
  return "₺" + Number(value || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function normalizeTR(value) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i");
}

function getRiskLevel(count) {
  if (count >= 5) return "Yüksek";
  if (count >= 2) return "Orta";
  return "Düşük";
}

function getRiskClass(risk) {
  if (risk === "Yüksek") return "high";
  if (risk === "Orta") return "mid";
  return "low";
}

function getPriorityClass(priority) {
  const value = String(priority || "").toLowerCase();

  if (value.includes("yüksek") || value.includes("yuksek")) {
    return "high";
  }

  if (value.includes("düşük") || value.includes("dusuk")) {
    return "low";
  }

  return "medium";
}

function getProductReturnCount(productName) {
  const found = productAnalysis.find(item => item.urun === productName);
  return found ? Number(found.iade_sayisi || 0) : 1;
}

/* =========================
   APEX THEME + TOOLTIP
========================= */
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
      toolbar: {
        show: false
      },
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
      min-width:130px;
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

/* =========================
   KPI
========================= */
function renderKpis(summary) {
  if (!summary) return;

  if (totalReturns) totalReturns.textContent = formatNumber(summary.toplam_iade_sayisi);
  if (returnRate) returnRate.textContent = `%${summary.iade_orani || 0}`;
  if (returnAmount) returnAmount.textContent = formatMoney(summary.toplam_iade_tutari);
  if (topReturnedProduct) topReturnedProduct.textContent = summary.en_cok_iade_edilen_urun || "-";

  if (topReturnedCount) {
    topReturnedCount.textContent = `${formatNumber(summary.en_cok_iade_edilen_urun_sayisi)} iade`;
  }
}

/* =========================
   CHARTS
========================= */
function renderMonthlyTrend(data) {
  if (!monthlyReturnChartEl) return;

  if (monthlyReturnApexChart) {
    monthlyReturnApexChart.destroy();
  }

  if (!data || data.length === 0) {
    monthlyReturnChartEl.innerHTML = `
      <div class="disabled-box">
        <i class="fa-solid fa-circle-info"></i>
        <h4>Trend verisi yok</h4>
        <p>Seçilen filtrelere göre aylık iade verisi bulunamadı.</p>
      </div>
    `;
    return;
  }

  const months = data.map(item => item.ay || "-");
  const values = data.map(item => Number(item.iade_sayisi || 0));

  monthlyReturnChartEl.innerHTML = "";

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      type: "area",
      height: 280
    },
    series: [
      {
        name: "İade",
        data: values
      }
    ],
    xaxis: {
      categories: months,
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
    dataLabels: {
      enabled: false
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
    tooltip: {
      enabled: true,
  intersect: false,
  shared: false,
  custom: function ({ series, seriesIndex, dataPointIndex, w }) {
    const month = w.globals.labels[dataPointIndex];
    const value = series[seriesIndex][dataPointIndex];
    return createTooltip(month, `${formatNumber(value)} iade`);
      }
    }
  };

  monthlyReturnApexChart = new ApexCharts(monthlyReturnChartEl, options);
  monthlyReturnApexChart.render();

  if (trendInfoBtn && yearFilter) {
    trendInfoBtn.textContent = yearFilter.value;
  }
}

function renderProductReturnChart(data) {
  if (!productReturnChartEl) return;

  if (productReturnApexChart) {
    productReturnApexChart.destroy();
  }

  const list = Array.isArray(data) ? data.slice(0, 5) : [];

  if (!list.length) {
    productReturnChartEl.innerHTML = `
      <div class="disabled-box">
        <i class="fa-solid fa-circle-info"></i>
        <h4>Ürün verisi yok</h4>
        <p>Ürün bazlı iade verisi bulunamadı.</p>
      </div>
    `;
    return;
  }

  const labels = list.map(item => item.urun || "-");
  const values = list.map(item => Number(item.iade_sayisi || 0));

  productReturnChartEl.innerHTML = "";

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      type: "bar",
      height: 300
    },
    series: [
      {
        name: "İade",
        data: values
      }
    ],
    xaxis: {
      categories: labels,
      labels: {
        rotate: -35,
        trim: true,
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
        const name = w.globals.labels[dataPointIndex];
        const value = series[seriesIndex][dataPointIndex];
        return createTooltip(name, `${formatNumber(value)} iade`);
      }
    }
  };

  productReturnApexChart = new ApexCharts(productReturnChartEl, options);
  productReturnApexChart.render();
}

function renderPointReturnChart(data) {
  if (!pointReturnChartEl) return;

  if (pointReturnApexChart) {
    pointReturnApexChart.destroy();
  }

  const list = Array.isArray(data) ? data : [];

  if (!list.length) {
    pointReturnChartEl.innerHTML = `
      <div class="disabled-box">
        <i class="fa-solid fa-circle-info"></i>
        <h4>Satış noktası verisi yok</h4>
        <p>Satış noktası bazlı iade verisi bulunamadı.</p>
      </div>
    `;
    return;
  }

  const labels = list.map(item => item.satis_noktasi || "-");
  const values = list.map(item => Number(item.iade_sayisi || 0));

  pointReturnChartEl.innerHTML = "";

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      type: "bar",
      height: 330
    },
    series: [
      {
        name: "İade",
        data: values
      }
    ],
    xaxis: {
      categories: labels,
      labels: {
        rotate: -35,
        trim: true,
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
    colors: ["#d9141c"],
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
        const name = w.globals.labels[dataPointIndex];
        const value = series[seriesIndex][dataPointIndex];
        return createTooltip(name, `${formatNumber(value)} iade`);
      }
    }
  };

  pointReturnApexChart = new ApexCharts(pointReturnChartEl, options);
  pointReturnApexChart.render();
}

/* =========================
   TABLE + LISTS
========================= */
function renderTable(data) {
  if (!returnTableBody || !returnCountText) return;

  returnTableBody.innerHTML = "";

  if (!data || data.length === 0) {
    returnTableBody.innerHTML = `
      <tr>
        <td colspan="7">İade kaydı bulunamadı.</td>
      </tr>
    `;
    returnCountText.textContent = "0 kayıt listeleniyor";
    return;
  }

  data.forEach(item => {
    const productCount = getProductReturnCount(item.urun);
    const risk = getRiskLevel(productCount);

    returnTableBody.innerHTML += `
      <tr>
        <td><strong>${item.iade_no || "-"}</strong></td>
        <td>${item.musteri || "-"}</td>
        <td>${item.urun || "-"}</td>
        <td>${formatMoney(item.iade_tutari)}</td>
        <td>${item.tarih ? String(item.tarih).slice(0, 10) : "-"}</td>
        <td>${item.satis_noktasi || "-"}</td>
        <td><span class="badge ${getRiskClass(risk)}">${risk}</span></td>
      </tr>
    `;
  });

  returnCountText.textContent = `${formatNumber(data.length)} kayıt listeleniyor`;
}

function renderRiskProducts() {
  if (!riskProductList) return;

  riskProductList.innerHTML = "";

  const risky = productAnalysis
    .filter(item => Number(item.iade_sayisi || 0) >= 2)
    .sort((a, b) => Number(b.iade_sayisi || 0) - Number(a.iade_sayisi || 0));

  if (risky.length === 0) {
    riskProductList.innerHTML = `
      <div class="insight-item">
        <i class="fa-solid fa-circle-check"></i>
        <div>
          <h4>Riskli ürün görünmüyor</h4>
          <p>Tekrar eden yüksek iade riski görünmüyor.</p>
        </div>
      </div>
    `;
    return;
  }

  risky.forEach(item => {
    riskProductList.innerHTML += `
      <div class="insight-item">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <div>
          <h4>${item.urun}</h4>
          <p>${item.iade_sayisi} iade kaydı var. Ürün açıklaması, beden/kalite veya gönderim süreci kontrol edilmeli.</p>
        </div>
      </div>
    `;
  });
}

function renderOperationNotes() {
  if (!operationNotes) return;

  operationNotes.innerHTML = "";

  if (!returns || returns.length === 0) {
    operationNotes.innerHTML = `
      <div class="insight-item">
        <i class="fa-solid fa-circle-info"></i>
        <div>
          <h4>Veri bulunamadı</h4>
          <p>Operasyonel analiz için yeterli veri yok.</p>
        </div>
      </div>
    `;
    return;
  }

  const highestReturn = [...returns]
    .sort((a, b) => Number(b.iade_tutari || 0) - Number(a.iade_tutari || 0))[0];

  const riskyProduct = [...productAnalysis]
    .sort((a, b) => Number(b.iade_sayisi || 0) - Number(a.iade_sayisi || 0))[0];

  const riskyPoint = [...pointAnalysis]
    .sort((a, b) => Number(b.iade_sayisi || 0) - Number(a.iade_sayisi || 0))[0];

  if (highestReturn) {
    operationNotes.innerHTML += `
      <div class="insight-item">
        <i class="fa-solid fa-money-bill-trend-up"></i>
        <div>
          <h4>Yüksek tutarlı iade</h4>
          <p>${highestReturn.musteri} müşterisinin ${formatMoney(highestReturn.iade_tutari)} tutarındaki iadesi dikkat çekiyor.</p>
        </div>
      </div>
    `;
  }

  if (riskyProduct) {
    operationNotes.innerHTML += `
      <div class="insight-item">
        <i class="fa-solid fa-box-open"></i>
        <div>
          <h4>Tekrarlayan ürün iadesi</h4>
          <p>${riskyProduct.urun} ürünü ${riskyProduct.iade_sayisi} kez iade edildi.</p>
        </div>
      </div>
    `;
  }

  if (riskyPoint) {
    operationNotes.innerHTML += `
      <div class="insight-item">
        <i class="fa-solid fa-store"></i>
        <div>
          <h4>Riskli satış noktası</h4>
          <p>${riskyPoint.satis_noktasi} satış noktasında ${riskyPoint.iade_sayisi} iade kaydı bulunuyor.</p>
        </div>
      </div>
    `;
  }
}

/* =========================
   AI ACTIONS
========================= */
async function loadReturnAiActions() {
  const container = document.getElementById("returnAiActions");
  const sourceText = document.getElementById("returnAiSourceText");

  if (!container) return;

  if (sourceText) {
    sourceText.textContent = "AI önerileri hazırlanıyor";
  }

  container.innerHTML = `
    <div class="ai-loading-card">
      <i class="fa-solid fa-brain"></i>
      <div>
        <h4>AI iade önerileri hazırlanıyor</h4>
        <p>İade oranı, riskli ürünler ve satış noktaları analiz ediliyor.</p>
      </div>
    </div>
  `;

  try {
    const data = await apiRequest("/ai-actions/returns");

    if (!data || !Array.isArray(data.actions) || data.actions.length === 0) {
      container.innerHTML = `
        <div class="ai-loading-card ai-error-card">
          <i class="fa-solid fa-circle-info"></i>
          <div>
            <h4>Öneri bulunamadı</h4>
            <p>AI iade önerileri alınamadı.</p>
          </div>
        </div>
      `;

      if (sourceText) sourceText.textContent = "Öneri bulunamadı";
      return;
    }

    container.innerHTML = data.actions.map(action => {
      const icon = action.ikon || "fa-solid fa-lightbulb";
      const priority = action.oncelik || "Orta";
      const priorityClass = getPriorityClass(priority);

      return `
        <div class="insight-item ai-return-item">
          <i class="${icon}"></i>
          <div>
            <div class="ai-action-title-row">
              <h4>${action.baslik || "AI İade Önerisi"}</h4>
              <span class="ai-priority ${priorityClass}">
                ${priority}
              </span>
            </div>
            <p>${action.aciklama || "Bu iade verisi için aksiyon önerisi oluşturuldu."}</p>
          </div>
        </div>
      `;
    }).join("");

    if (sourceText) {
      sourceText.textContent =
        data.source === "gemini"
          ? "Gemini AI Önerisi"
          : "Kural tabanlı öneri";
    }

  } catch (error) {
    console.error("İade AI önerileri yüklenemedi:", error);

    container.innerHTML = `
      <div class="ai-loading-card ai-error-card">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <div>
          <h4>AI önerileri yüklenemedi</h4>
          <p>/ai-actions/returns endpointini ve yetki kontrolünü kontrol et.</p>
        </div>
      </div>
    `;

    if (sourceText) sourceText.textContent = "AI önerileri yüklenemedi";
  }
}

/* =========================
   FILTERS
========================= */
function fillPointFilter() {
  if (!pointFilter) return;

  const currentValue = pointFilter.value;
  const points = [...new Set(returns.map(item => item.satis_noktasi).filter(Boolean))];

  pointFilter.innerHTML = `<option value="all">Tümü</option>`;

  points.forEach(point => {
    pointFilter.innerHTML += `<option value="${point}">${point}</option>`;
  });

  if (points.includes(currentValue)) {
    pointFilter.value = currentValue;
  }
}

async function loadMonthlyTrend() {
  if (!yearFilter) return;

  const selectedYear = yearFilter.value;
  const selectedPoint = pointFilter ? pointFilter.value || "all" : "all";
  const encodedPoint = encodeURIComponent(selectedPoint);

  monthlyTrend = await apiRequest(
    `/returns/monthly-trend?year=${selectedYear}&satis_noktasi=${encodedPoint}`
  );

  renderMonthlyTrend(monthlyTrend || []);
}

function applyFilters() {
  const searchValue = returnSearch ? normalizeTR(returnSearch.value.trim()) : "";
  const pointValue = pointFilter ? pointFilter.value : "all";
  const riskValue = riskFilter ? riskFilter.value : "all";

  filteredReturns = returns.filter(item => {
    const productCount = getProductReturnCount(item.urun);
    const risk = getRiskLevel(productCount);

    const searchMatch =
      normalizeTR(item.iade_no).includes(searchValue) ||
      normalizeTR(item.fatura_no).includes(searchValue) ||
      normalizeTR(item.musteri).includes(searchValue) ||
      normalizeTR(item.urun).includes(searchValue) ||
      normalizeTR(item.satis_noktasi).includes(searchValue);

    const pointMatch = pointValue === "all" || item.satis_noktasi === pointValue;
    const riskMatch = riskValue === "all" || risk === riskValue;

    return searchMatch && pointMatch && riskMatch;
  });

  renderTable(filteredReturns);
  loadMonthlyTrend();
}

function exportReturns() {
  let csv = "\uFEFFİade No,Fatura No,Müşteri,Ürün,İade Tutarı,Tarih,Satış Noktası,Risk\n";

  filteredReturns.forEach(item => {
    const productCount = getProductReturnCount(item.urun);
    const risk = getRiskLevel(productCount);

    csv += `"${item.iade_no || ""}","${item.fatura_no || ""}","${item.musteri || ""}","${item.urun || ""}","${item.iade_tutari || 0}","${item.tarih ? String(item.tarih).slice(0, 10) : ""}","${item.satis_noktasi || ""}","${risk}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "iade_analizi.csv";
  link.click();

  URL.revokeObjectURL(url);
}

/* =========================
   LOAD PAGE
========================= */
async function loadReturnsPage() {
  try {
    if (returnTableBody) {
      returnTableBody.innerHTML = `
        <tr>
          <td colspan="7">İade verileri yükleniyor...</td>
        </tr>
      `;
    }

    const selectedYear = yearFilter ? yearFilter.value : "2025";
    const selectedPoint = pointFilter ? pointFilter.value || "all" : "all";
    const encodedPoint = encodeURIComponent(selectedPoint);

    const [summary, returnsResponse, productResponse, pointResponse, monthlyResponse] =
      await Promise.all([
        apiRequest("/returns/summary"),
        apiRequest("/returns?limit=500&offset=0"),
        apiRequest("/returns/product-analysis"),
        apiRequest("/returns/point-analysis"),
        apiRequest(`/returns/monthly-trend?year=${selectedYear}&satis_noktasi=${encodedPoint}`)
      ]);

    returns = returnsResponse?.veriler || [];
    filteredReturns = [...returns];
    productAnalysis = productResponse || [];
    pointAnalysis = pointResponse || [];
    monthlyTrend = monthlyResponse || [];

    renderKpis(summary);
    fillPointFilter();
    renderProductReturnChart(productAnalysis);
    renderPointReturnChart(pointAnalysis);
    renderMonthlyTrend(monthlyTrend);
    renderTable(filteredReturns);
    renderRiskProducts();
    renderOperationNotes();
    await loadReturnAiActions();

  } catch (error) {
    console.error("İade sayfası yüklenemedi:", error);

    if (returnTableBody) {
      returnTableBody.innerHTML = `
        <tr>
          <td colspan="7">İade verileri yüklenemedi. Backend, token veya /returns endpointlerini kontrol et.</td>
        </tr>
      `;
    }
  }
}

function setupReturnsEvents() {
  if (returnSearch) returnSearch.addEventListener("input", applyFilters);

  if (pointFilter) {
    pointFilter.addEventListener("change", () => {
      applyFilters();
      loadMonthlyTrend();
    });
  }

  if (riskFilter) riskFilter.addEventListener("change", applyFilters);

  if (yearFilter) {
    yearFilter.addEventListener("change", () => {
      loadMonthlyTrend();
    });
  }

  if (exportBtn) exportBtn.addEventListener("click", exportReturns);
}

window.addEventListener("DOMContentLoaded", () => {
  setupReturnsEvents();
  loadReturnsPage();
});