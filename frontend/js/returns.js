const returnSearch = document.getElementById("returnSearch");
const pointFilter = document.getElementById("pointFilter");
const riskFilter = document.getElementById("riskFilter");
const yearFilter = document.getElementById("yearFilter");

const startDateFilter = document.getElementById("startDateFilter");
const endDateFilter = document.getElementById("endDateFilter");
const minReturnAmountFilter = document.getElementById("minReturnAmountFilter");
const maxReturnAmountFilter = document.getElementById("maxReturnAmountFilter");

const clearReturnFiltersBtn = document.getElementById("clearReturnFiltersBtn");
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
const returnPagination = document.getElementById("returnPagination");

let returns = [];
let filteredReturns = [];
let productAnalysis = [];
let pointAnalysis = [];
let monthlyTrend = [];

let currentPage = 1;
const pageLimit = 20;
let totalPages = 1;
let totalReturnCount = 0;

let monthlyReturnApexChart = null;
let productReturnApexChart = null;
let pointReturnApexChart = null;
let searchTimer = null;

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

function getRiskClass(risk) {
  if (risk === "Yüksek") return "high";
  if (risk === "Orta") return "mid";
  return "low";
}

function getPriorityClass(priority) {
  const value = String(priority || "").toLowerCase();

  if (value.includes("yüksek") || value.includes("yuksek")) return "high";
  if (value.includes("düşük") || value.includes("dusuk")) return "low";

  return "medium";
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
      min-width:130px;
    ">
      <div style="font-size:12px;color:${theme.mutedColor};font-weight:800;margin-bottom:5px;">
        ${title}
      </div>
      <div style="font-size:15px;color:${theme.textColor};font-weight:900;">
        ${value}
      </div>
    </div>
  `;
}

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

async function loadReturnSummary() {
  const summary = await apiRequest("/returns/summary");
  renderKpis(summary);
}

function renderMonthlyTrend(data) {
  if (!monthlyReturnChartEl) return;

  if (monthlyReturnApexChart) monthlyReturnApexChart.destroy();

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
    series: [{ name: "İade", data: values }],
    xaxis: {
      categories: months,
      labels: { style: { fontWeight: 700 } }
    },
    yaxis: {
      labels: {
        formatter: value => Math.round(value)
      }
    },
    colors: ["#ff2525"],
    dataLabels: { enabled: false },
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
      hover: { size: 7 }
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
    trendInfoBtn.textContent = yearFilter.value || "Tümü";
  }
}

function renderProductReturnChart(data) {
  if (!productReturnChartEl) return;

  if (productReturnApexChart) productReturnApexChart.destroy();

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
    series: [{ name: "İade", data: values }],
    xaxis: {
      categories: labels,
      labels: {
        rotate: -35,
        trim: true,
        style: { fontWeight: 700 }
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
    dataLabels: { enabled: false },
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

  if (pointReturnApexChart) pointReturnApexChart.destroy();

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
    series: [{ name: "İade", data: values }],
    xaxis: {
      categories: labels,
      labels: {
        rotate: -35,
        trim: true,
        style: { fontWeight: 700 }
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
    dataLabels: { enabled: false },
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
    const risk = item.risk || "Düşük";

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

  returnCountText.textContent =
    `${formatNumber(totalReturnCount)} kayıt içinden bu sayfada ${formatNumber(data.length)} kayıt gösteriliyor`;
}

function renderPagination() {
  if (!returnPagination) return;

  returnPagination.innerHTML = "";

  if (totalPages <= 1) return;

  function createPageButton(text, page, isActive = false, isDisabled = false) {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.className = isActive ? "page-btn active" : "page-btn";
    btn.disabled = isDisabled;

    if (!isDisabled && page) {
      btn.addEventListener("click", () => {
        loadReturns(page);
      });
    }

    return btn;
  }

  returnPagination.appendChild(
    createPageButton("‹", currentPage - 1, false, currentPage === 1)
  );

  returnPagination.appendChild(
    createPageButton("1", 1, currentPage === 1)
  );

  if (currentPage > 4) {
    const dots = document.createElement("span");
    dots.className = "page-dots";
    dots.textContent = "...";
    returnPagination.appendChild(dots);
  }

  const startPage = Math.max(2, currentPage - 1);
  const endPage = Math.min(totalPages - 1, currentPage + 1);

  for (let i = startPage; i <= endPage; i++) {
    returnPagination.appendChild(
      createPageButton(String(i), i, i === currentPage)
    );
  }

  if (currentPage < totalPages - 3) {
    const dots = document.createElement("span");
    dots.className = "page-dots";
    dots.textContent = "...";
    returnPagination.appendChild(dots);
  }

  if (totalPages > 1) {
    returnPagination.appendChild(
      createPageButton(String(totalPages), totalPages, currentPage === totalPages)
    );
  }

  returnPagination.appendChild(
    createPageButton("›", currentPage + 1, false, currentPage === totalPages)
  );
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

async function fillPointFilter() {
  if (!pointFilter) return;

  const currentValue = pointFilter.value;

  const data = await apiRequest("/returns/?page=1&limit=500");
  const list = Array.isArray(data?.veriler) ? data.veriler : [];

  const points = [...new Set(
    list
      .map(item => item.satis_noktasi)
      .filter(value => value && value !== "-")
  )];

  pointFilter.innerHTML = `<option value="all">Tümü</option>`;

  points.forEach(point => {
    pointFilter.innerHTML += `<option value="${point}">${point}</option>`;
  });

  if (points.includes(currentValue)) {
    pointFilter.value = currentValue;
  }
}

function buildReturnQueryParams(page = 1) {
  const params = new URLSearchParams();

  params.append("page", page);
  params.append("limit", pageLimit);

  if (returnSearch && returnSearch.value.trim()) {
    params.append("search", returnSearch.value.trim());
  }

  if (pointFilter && pointFilter.value !== "all") {
    params.append("satis_noktasi", pointFilter.value);
  }

  if (riskFilter && riskFilter.value !== "all") {
    params.append("risk", riskFilter.value);
  }

  if (yearFilter && yearFilter.value) {
    params.append("year", yearFilter.value);
  }

  if (startDateFilter && startDateFilter.value) {
    params.append("start_date", startDateFilter.value);
  }

  if (endDateFilter && endDateFilter.value) {
    params.append("end_date", endDateFilter.value);
  }

  if (minReturnAmountFilter && minReturnAmountFilter.value) {
    params.append("min_tutar", minReturnAmountFilter.value);
  }

  if (maxReturnAmountFilter && maxReturnAmountFilter.value) {
    params.append("max_tutar", maxReturnAmountFilter.value);
  }

  return params;
}

async function loadMonthlyTrend() {
  const selectedYear = yearFilter && yearFilter.value ? yearFilter.value : "2025";
  const selectedPoint = pointFilter ? pointFilter.value || "all" : "all";
  const encodedPoint = encodeURIComponent(selectedPoint);

  monthlyTrend = await apiRequest(
    `/returns/monthly-trend?year=${selectedYear}&satis_noktasi=${encodedPoint}`
  );

  renderMonthlyTrend(monthlyTrend || []);
}

async function loadReturns(page = 1) {
  try {
    currentPage = page;

    if (returnTableBody) {
      returnTableBody.innerHTML = `
        <tr>
          <td colspan="7">İade verileri yükleniyor...</td>
        </tr>
      `;
    }

    const params = buildReturnQueryParams(currentPage);
    const data = await apiRequest(`/returns/?${params.toString()}`);

    if (!data || !Array.isArray(data.veriler)) {
      if (returnTableBody) {
        returnTableBody.innerHTML = `
          <tr>
            <td colspan="7">İade verisi alınamadı.</td>
          </tr>
        `;
      }
      return;
    }

    returns = data.veriler;
    filteredReturns = [...returns];

    totalPages = Number(data.toplam_sayfa || 1);
    totalReturnCount = Number(data.toplam_kayit || 0);

    renderTable(filteredReturns);
    renderPagination();
    renderOperationNotes();

  } catch (error) {
    console.error("İade verileri yüklenemedi:", error);

    if (returnTableBody) {
      returnTableBody.innerHTML = `
        <tr>
          <td colspan="7">İade verileri yüklenemedi. API, token veya yetki kontrol edilmeli.</td>
        </tr>
      `;
    }
  }
}

async function loadAnalyses() {
  productAnalysis = await apiRequest("/returns/product-analysis") || [];
  pointAnalysis = await apiRequest("/returns/point-analysis") || [];

  renderProductReturnChart(productAnalysis);
  renderPointReturnChart(pointAnalysis);
  renderRiskProducts();
  renderOperationNotes();
}

function applyFilters() {
  loadReturns(1);
  loadMonthlyTrend();
}

function clearReturnFilters() {
  if (returnSearch) returnSearch.value = "";
  if (pointFilter) pointFilter.value = "all";
  if (riskFilter) riskFilter.value = "all";
  if (yearFilter) yearFilter.value = "2025";
  if (startDateFilter) startDateFilter.value = "";
  if (endDateFilter) endDateFilter.value = "";
  if (minReturnAmountFilter) minReturnAmountFilter.value = "";
  if (maxReturnAmountFilter) maxReturnAmountFilter.value = "";

  loadReturns(1);
  loadMonthlyTrend();
}

function exportReturns() {
  let csv = "\uFEFFİade No,Fatura No,Müşteri,Ürün,İade Tutarı,Tarih,Satış Noktası,Risk\n";

  filteredReturns.forEach(item => {
    csv += `"${item.iade_no || ""}","${item.fatura_no || ""}","${item.musteri || ""}","${item.urun || ""}","${item.iade_tutari || 0}","${item.tarih ? String(item.tarih).slice(0, 10) : ""}","${item.satis_noktasi || ""}","${item.risk || ""}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "iade_analizi.csv";
  link.click();

  URL.revokeObjectURL(url);
}

function bindEvents() {
  if (returnSearch) {
    returnSearch.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(applyFilters, 400);
    });
  }

  if (pointFilter) pointFilter.addEventListener("change", applyFilters);
  if (riskFilter) riskFilter.addEventListener("change", applyFilters);
  if (yearFilter) yearFilter.addEventListener("change", applyFilters);

  [
    startDateFilter,
    endDateFilter,
    minReturnAmountFilter,
    maxReturnAmountFilter
  ].forEach(input => {
    if (input) {
      input.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(applyFilters, 500);
      });

      input.addEventListener("change", applyFilters);
    }
  });

  if (clearReturnFiltersBtn) {
    clearReturnFiltersBtn.addEventListener("click", clearReturnFilters);
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", exportReturns);
  }
}

async function initReturnsPage() {
  try {
    bindEvents();

    await loadReturnSummary();
    await fillPointFilter();
    await loadAnalyses();
    await loadMonthlyTrend();
    await loadReturns(1);
    await loadReturnAiActions();

  } catch (error) {
    console.error("İadeler sayfası yüklenemedi:", error);

    if (returnTableBody) {
      returnTableBody.innerHTML = `
        <tr>
          <td colspan="7">İade verileri yüklenemedi. Token, API veya yetki kontrol edilmeli.</td>
        </tr>
      `;
    }
  }
}

window.addEventListener("DOMContentLoaded", initReturnsPage);