const heatmap = document.getElementById("heatmap");

let segments = [];
let segmentCounts = [];
let yearlySegmentData = [];

let segmentDonutChart = null;
let segmentBarChart = null;
let yearlyTransitionApexChart = null;

/* =========================
   FORMAT
========================= */
function formatMoney(value) {
  return Number(value || 0).toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0
  });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("tr-TR");
}

function normalizeSegments(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.veriler)) return data.veriler;
  return [];
}

function extractCount(data) {
  if (!data) return 0;

  if (typeof data.kayit_sayisi === "number") return data.kayit_sayisi;
  if (typeof data.count === "number") return data.count;
  if (typeof data.total === "number") return data.total;

  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data.veriler)) return data.veriler.length;
  if (Array.isArray(data.customers)) return data.customers.length;

  return 0;
}

/* =========================
   APEX THEME
========================= */
function getChartTheme() {
  const isLight = document.body.classList.contains("light-mode");

  return {
    mode: isLight ? "light" : "dark",
    textColor: isLight ? "#161616" : "#f8f8f8",
    mutedColor: isLight ? "#777b86" : "#9ca0aa",
    gridColor: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"
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
      theme: theme.mode
    }
  };
}

/* =========================
   SEGMENTS
========================= */
async function loadSegments() {
  const data = await apiRequest("/segments");

  segments = normalizeSegments(data).map(segment => ({
    segment_id: segment.segment_id,
    segment_adi: segment.segment_adi || segment.name || "-"
  }));
}

async function loadSegmentCounts() {
  segmentCounts = [];

  for (const segment of segments) {
    const data = await apiRequest(`/segments/${segment.segment_id}/customers`);

    segmentCounts.push({
      id: segment.segment_id,
      name: segment.segment_adi,
      count: extractCount(data)
    });
  }

  renderSegmentBarChart();
  renderSegmentDonutChart();
}

function renderSegmentDonutChart() {
  const chartEl = document.querySelector("#segmentDonutChart");
  if (!chartEl) return;

  const sorted = [...segmentCounts]
    .sort((a, b) => Number(b.count || 0) - Number(a.count || 0))
    .slice(0, 8);

  const labels = sorted.map(item => item.name);
  const values = sorted.map(item => Number(item.count || 0));
  const total = values.reduce((sum, value) => sum + value, 0);

  if (segmentDonutChart) {
    segmentDonutChart.destroy();
  }

  if (!values.length || total === 0) {
    chartEl.innerHTML = `<p class="empty-year">Segment verisi bulunamadı.</p>`;
    return;
  }

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      type: "donut",
      height: 300
    },
    series: values,
    labels,
    colors: [
      "#ff2525",
      "#d9141c",
      "#ff6b6b",
      "#8a8d95",
      "#333842",
      "#ffb020",
      "#3478ff",
      "#22d66b"
    ],
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
      formatter: value => `${value.toFixed(1)}%`
    },
    tooltip: {
      theme: getChartTheme().mode,
      y: {
        formatter: value => `${formatNumber(value)} müşteri`
      }
    }
  };

  segmentDonutChart = new ApexCharts(chartEl, options);
  segmentDonutChart.render();
}

function renderSegmentBarChart() {
  const chartEl = document.querySelector("#segmentBarChart");
  if (!chartEl) return;

  const sorted = [...segmentCounts].sort(
    (a, b) => Number(b.count || 0) - Number(a.count || 0)
  );

  const labels = sorted.map(item => item.name);
  const values = sorted.map(item => Number(item.count || 0));

  if (segmentBarChart) {
    segmentBarChart.destroy();
  }

  if (!values.length) {
    chartEl.innerHTML = `<p class="empty-year">Segment verisi bulunamadı.</p>`;
    return;
  }

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      type: "bar",
      height: 360
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
      theme: getChartTheme().mode,
      y: {
        formatter: value => `${formatNumber(value)} müşteri`
      }
    }
  };

  segmentBarChart = new ApexCharts(chartEl, options);
  segmentBarChart.render();
}

/* =========================
   HEATMAP
========================= */
async function loadHeatmap() {
  const data = await apiRequest("/analytics/rfm/heatmap");

  const matrix = Array(25).fill(0);

  if (Array.isArray(data)) {
    data.forEach(item => {
      const r = Number(item.r_skoru || 0);
      const f = Number(item.f_skoru || 0);

      if (r >= 1 && r <= 5 && f >= 1 && f <= 5) {
        const row = 5 - f;
        const col = r - 1;
        const index = row * 5 + col;

        matrix[index] = Number(item.musteri_sayisi || 0);
      }
    });
  }

  renderHeatmap(matrix);
}

function renderHeatmap(data) {
  if (!heatmap) return;

  heatmap.innerHTML = "";

  const max = Math.max(...data, 1);

  data.forEach(value => {
    const count = Number(value || 0);
    const ratio = count / max;

    let level = 1;

    if (ratio > 0.20) level = 2;
    if (ratio > 0.40) level = 3;
    if (ratio > 0.60) level = 4;
    if (ratio > 0.80) level = 5;

    heatmap.innerHTML += `
      <div class="heat-cell heat-${level}">
        ${formatNumber(count)}
      </div>
    `;
  });
}

/* =========================
   KPI
========================= */
async function updateKPIs() {
  const customersData = await apiRequest("/customers/");
  const summary = await apiRequest("/dashboard/summary");

  if (!customersData || !Array.isArray(customersData.veriler)) return;

  const customers = customersData.veriler;
  const kpis = document.querySelectorAll(".kpi-card h3");

  const recencies = customers
    .filter(customer => customer.son_siparis && customer.son_siparis !== "-")
    .map(customer => {
      const date = new Date(customer.son_siparis);
      const today = new Date();
      return Math.max(Math.floor((today - date) / (1000 * 60 * 60 * 24)), 0);
    });

  const avgRecency =
    recencies.length > 0
      ? recencies.reduce((sum, value) => sum + value, 0) / recencies.length
      : 0;

  const genel = summary?.genel_ozet || {};
  const totalOrders = Number(genel.toplam_siparis || 0);
  const totalCustomers = Number(genel.toplam_musteri || customers.length || 0);
  const avgFrequency = totalCustomers > 0 ? totalOrders / totalCustomers : 0;

  const totalMonetary = customers.reduce((sum, customer) => {
    return sum + Number(customer.toplam_harcama || 0);
  }, 0);

  const avgMonetary = customers.length > 0 ? totalMonetary / customers.length : 0;

  if (kpis[0]) kpis[0].textContent = `${avgRecency.toFixed(0)} Gün`;
  if (kpis[1]) kpis[1].textContent = avgFrequency.toFixed(1);
  if (kpis[2]) kpis[2].textContent = formatMoney(avgMonetary);
  if (kpis[3]) kpis[3].textContent = formatNumber(segmentCounts.length);
}

/* =========================
   RISK ALERTS
========================= */
async function updateRiskCards() {
  const data = await apiRequest("/analytics/rfm/segment-risk-summary");
  if (!data) return;

  const alerts = document.querySelectorAll(".alert-card");

  if (alerts[0]) {
    alerts[0].querySelector("h4").textContent = "Risk Altında segmenti";
    alerts[0].querySelector("p").textContent =
      `${formatNumber(data.risk_altinda || 0)} müşteri risk altında segmentinde yer alıyor.`;
  }

  if (alerts[1]) {
    alerts[1].querySelector("h4").textContent = "Kayıp müşteri uyarısı";
    alerts[1].querySelector("p").textContent =
      `${formatNumber(data.kayip || 0)} müşteri kayıp veya pasif segmente yakın durumda.`;
  }

  if (alerts[2]) {
    alerts[2].querySelector("h4").textContent = "Sadık müşteri korunmalı";
    alerts[2].querySelector("p").textContent =
      `${formatNumber(data.sadik || 0)} sadık müşteri, riskli segmente düşmeden takip edilmelidir.`;
  }
}

/* =========================
   YEARLY TRANSITION GRAPH
========================= */
async function loadYearlyTransitionGraph() {
  const data = await apiRequest("/analytics/rfm/yearly-segments");

  if (!Array.isArray(data)) {
    console.error("Yıllık segment verisi gelmedi:", data);

    const chart = document.getElementById("yearlyTransitionChart");
    if (chart) {
      chart.innerHTML = `<p class="empty-year">Segment verisi alınamadı.</p>`;
    }

    return;
  }

  yearlySegmentData = data;

  const select = document.getElementById("transitionYearSelect");
  if (!select) return;

  renderTransitionGraph(Number(select.value));

  select.addEventListener("change", event => {
    renderTransitionGraph(Number(event.target.value));
  });
}

function renderTransitionGraph(year) {
  const chartEl = document.getElementById("yearlyTransitionChart");
  if (!chartEl) return;

  const yearData = yearlySegmentData.filter(item => Number(item.yil) === Number(year));

  if (yearlyTransitionApexChart) {
    yearlyTransitionApexChart.destroy();
  }

  if (!yearData.length) {
    chartEl.innerHTML = `<p class="empty-year">${year} yılı için segment verisi yok.</p>`;
    renderSegmentTransitionAnalysis(year);
    return;
  }

  const sorted = [...yearData].sort(
    (a, b) => Number(b.musteri_sayisi || 0) - Number(a.musteri_sayisi || 0)
  );

  const labels = sorted.map(item => item.segment || "-");
  const values = sorted.map(item => Number(item.musteri_sayisi || 0));

  chartEl.innerHTML = "";

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      type: "bar",
      height: 360
    },
    series: [
      {
        name: `${year} Müşteri Sayısı`,
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
      theme: getChartTheme().mode,
      y: {
        formatter: value => `${formatNumber(value)} müşteri`
      }
    }
  };

  yearlyTransitionApexChart = new ApexCharts(chartEl, options);
  yearlyTransitionApexChart.render();

  renderSegmentTransitionAnalysis(year);
}

function renderSegmentTransitionAnalysis(year) {
  const list = document.querySelector(".transition-list");
  if (!list) return;

  const currentYearData = yearlySegmentData.filter(item => Number(item.yil) === Number(year));
  const previousYearData = yearlySegmentData.filter(item => Number(item.yil) === Number(year - 1));

  function segmentCount(yearData, keywords) {
    const item = yearData.find(row => {
      const name = String(row.segment || "").toLowerCase();
      return keywords.some(keyword => name.includes(keyword));
    });

    return item ? Number(item.musteri_sayisi || 0) : 0;
  }

  const riskCurrent = segmentCount(currentYearData, ["risk"]);
  const riskPrevious = segmentCount(previousYearData, ["risk"]);

  const lostCurrent = segmentCount(currentYearData, ["kayıp", "kayip", "uykusunda"]);
  const lostPrevious = segmentCount(previousYearData, ["kayıp", "kayip", "uykusunda"]);

  const championCurrent = segmentCount(currentYearData, ["şampiyon", "sampiyon"]);
  const championPrevious = segmentCount(previousYearData, ["şampiyon", "sampiyon"]);

  list.innerHTML = `
    <div class="transition-item">
      <i class="fa-solid fa-arrow-right-arrow-left"></i>
      <div>
        <h4>Risk Altında Değişimi</h4>
        <p>${year - 1}: ${formatNumber(riskPrevious)} müşteri → ${year}: ${formatNumber(riskCurrent)} müşteri.</p>
      </div>
    </div>

    <div class="transition-item">
      <i class="fa-solid fa-arrow-trend-down"></i>
      <div>
        <h4>Kayıp Segment Değişimi</h4>
        <p>${year - 1}: ${formatNumber(lostPrevious)} müşteri → ${year}: ${formatNumber(lostCurrent)} müşteri.</p>
      </div>
    </div>

    <div class="transition-item positive">
      <i class="fa-solid fa-arrow-trend-up"></i>
      <div>
        <h4>Şampiyon Segment Değişimi</h4>
        <p>${year - 1}: ${formatNumber(championPrevious)} müşteri → ${year}: ${formatNumber(championCurrent)} müşteri.</p>
      </div>
    </div>
  `;
}

/* =========================
   AI ACTIONS
========================= */
async function loadRfmAiActions() {
  const list = document.getElementById("rfmAiActions");

  if (!list) return;

  list.innerHTML = `
    <div class="ai-loading-card">
      <i class="fa-solid fa-brain"></i>
      <div>
        <h4>AI önerileri hazırlanıyor</h4>
        <p>RFM segmentleri analiz edilerek aksiyon önerileri oluşturuluyor.</p>
      </div>
    </div>
  `;

  try {
    const data = await apiRequest("/ai-actions/rfm");

    if (!data || !Array.isArray(data.actions) || data.actions.length === 0) {
      list.innerHTML = `
        <div class="ai-loading-card">
          <i class="fa-solid fa-circle-info"></i>
          <div>
            <h4>Öneri bulunamadı</h4>
            <p>RFM analizi çalıştırıldıktan sonra AI önerileri burada görünecek.</p>
          </div>
        </div>
      `;
      return;
    }

    list.innerHTML = data.actions.map(action => {
      const priorityClass = getPriorityClass(action.oncelik);
      const icon = action.ikon || "fa-solid fa-lightbulb";
      const title = action.baslik || "AI Aksiyon Önerisi";
      const description = action.aciklama || "Bu segment için aksiyon önerisi oluşturuldu.";
      const priority = action.oncelik || "Orta";

      return `
        <div class="action-item ai-action-item">
          <div class="action-icon ai-bg">
            <i class="${icon}"></i>
          </div>

          <div>
            <div class="ai-action-title-row">
              <h4>${title}</h4>
              <span class="ai-priority ${priorityClass}">${priority}</span>
            </div>
            <p>${description}</p>
          </div>

          <button type="button">Uygula</button>
        </div>
      `;
    }).join("");

    const sourceText = document.getElementById("rfmAiSourceText");
    if (sourceText) {
      sourceText.textContent =
        data.source === "gemini"
          ? "Gemini AI ile üretildi"
          : "Kural tabanlı öneri";
    }

  } catch (error) {
    console.error("RFM AI önerileri yüklenemedi:", error);

    list.innerHTML = `
      <div class="ai-loading-card ai-error-card">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <div>
          <h4>AI önerileri yüklenemedi</h4>
          <p>Backend endpoint veya yetki kontrolünü kontrol et: /ai-actions/rfm</p>
        </div>
      </div>
    `;
  }
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

/* =========================
   SEARCH
========================= */
function setupRfmSearch() {
  const input = document.getElementById("rfmSearchInput");
  const resultsBox = document.getElementById("rfmSearchResults");

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
      const searchData = await apiRequest(`/dashboard/search?q=${encodeURIComponent(query)}`);

      resultsBox.innerHTML = "";
      resultsBox.style.display = "block";

      const matchedSegments = segmentCounts.filter(segment =>
        segment.name.toLowerCase().includes(query.toLowerCase())
      );

      matchedSegments.forEach(segment => {
        resultsBox.innerHTML += `
          <div class="search-item">
            <strong>${segment.name}</strong>
            <span>${formatNumber(segment.count)} müşteri bulunan segment</span>
          </div>
        `;
      });

      const customers = searchData?.musteriler || [];

      customers.forEach(customer => {
        resultsBox.innerHTML += `
          <div class="search-item" data-id="${customer.musteri_id}">
            <strong>${customer.ad_soyad}</strong>
            <span>Müşteri 360 detayına git</span>
          </div>
        `;
      });

      if (!matchedSegments.length && !customers.length) {
        resultsBox.innerHTML = `<div class="search-item">Sonuç bulunamadı</div>`;
      }

      resultsBox.querySelectorAll(".search-item[data-id]").forEach(item => {
        item.addEventListener("click", () => {
          window.open(`customer360.html?musteri_id=${item.dataset.id}`, "_blank");
        });
      });

    }, 350);
  });

  document.addEventListener("click", event => {
    if (!event.target.closest(".search")) {
      resultsBox.style.display = "none";
    }
  });
}

/* =========================
   INIT
========================= */
window.addEventListener("DOMContentLoaded", async () => {
  await loadSegments();
  await loadSegmentCounts();
  await loadHeatmap();
  await updateKPIs();
  await updateRiskCards();
  await loadYearlyTransitionGraph();
  await loadRfmAiActions();

  setupRfmSearch();
});