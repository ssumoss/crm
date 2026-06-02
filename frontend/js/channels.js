const channelSearch = document.getElementById("channelSearch");
const typeFilter = document.getElementById("typeFilter");
const cityFilter = document.getElementById("cityFilter");
const statusFilter = document.getElementById("statusFilter");

const minRevenueFilter = document.getElementById("minRevenueFilter");
const maxRevenueFilter = document.getElementById("maxRevenueFilter");
const minOrderFilter = document.getElementById("minOrderFilter");
const maxOrderFilter = document.getElementById("maxOrderFilter");
const minAovFilter = document.getElementById("minAovFilter");
const maxAovFilter = document.getElementById("maxAovFilter");
const minScoreFilter = document.getElementById("minScoreFilter");
const maxScoreFilter = document.getElementById("maxScoreFilter");

const clearChannelFiltersBtn = document.getElementById("clearChannelFiltersBtn");
const exportBtn = document.getElementById("exportBtn");

const totalPoint = document.getElementById("totalPoint");
const onlineRevenue = document.getElementById("onlineRevenue");
const storeRevenue = document.getElementById("storeRevenue");
const bestPoint = document.getElementById("bestPoint");
const bestPointRevenue = document.getElementById("bestPointRevenue");

const channelChartEl = document.getElementById("channelChart");

const pointTableBody = document.getElementById("pointTableBody");
const pointCount = document.getElementById("pointCount");
const channelInsights = document.getElementById("channelInsights");

const scoreDetailBox = document.getElementById("scoreDetailBox");
const channelMapBox = document.getElementById("channelMap");

let salesPoints = [];
let filteredPoints = [];
let typeAnalysis = [];
let cityAnalysis = [];
let channelMap = null;
let channelApexChart = null;
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

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .trim();
}

function getAov(point) {
  return Math.round(Number(point.aov || 0));
}

function getScoreStatus(score) {
  if (score >= 75) return "Yüksek";
  if (score >= 45) return "Orta";
  return "Düşük";
}

function getStatusClass(status) {
  if (status === "Yüksek") return "high";
  if (status === "Orta") return "mid";
  return "low";
}

function getChartTheme() {
  const isLight = document.body.classList.contains("light-mode");

  return {
    mode: isLight ? "light" : "dark",
    textColor: isLight ? "#161616" : "#f8f8f8",
    mutedColor: isLight ? "#777b86" : "#9ca0aa",
    tooltipBg: isLight ? "#ffffff" : "#161a22",
    tooltipBorder: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"
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

  if (totalPoint) totalPoint.textContent = formatNumber(summary.toplam_satis_noktasi);
  if (onlineRevenue) onlineRevenue.textContent = formatMoney(summary.online_ciro);
  if (storeRevenue) storeRevenue.textContent = formatMoney(summary.magaza_ciro);
  if (bestPoint) bestPoint.textContent = summary.en_basarili_satis_noktasi || "-";

  if (bestPointRevenue) {
    bestPointRevenue.textContent = formatMoney(summary.en_basarili_satis_noktasi_ciro);
  }
}

function renderChannelChart(data) {
  if (!channelChartEl) return;

  const onlineData = data.find(item => item.kanal_tipi === "Online");
  const storeData = data.find(item => item.kanal_tipi === "Mağaza");

  const onlineTotal = Number(onlineData?.ciro || 0);
  const storeTotal = Number(storeData?.ciro || 0);
  const total = onlineTotal + storeTotal;

  if (channelApexChart) {
    channelApexChart.destroy();
  }

  if (total === 0) {
    channelChartEl.innerHTML = `<p class="empty-text">Kanal verisi bulunamadı.</p>`;
    return;
  }

  channelChartEl.innerHTML = "";

  const options = {
    chart: {
      type: "donut",
      height: 300,
      toolbar: { show: false },
      foreColor: getChartTheme().textColor,
      fontFamily: "Inter, sans-serif"
    },
    series: [onlineTotal, storeTotal],
    labels: ["Online", "Mağaza"],
    colors: ["#ff2525", "#555965"],
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
              formatter: () => formatMoney(total)
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
        return createTooltip(label, formatMoney(value));
      }
    }
  };

  channelApexChart = new ApexCharts(channelChartEl, options);
  channelApexChart.render();
}

function renderTable(data) {
  if (!pointTableBody || !pointCount) return;

  pointTableBody.innerHTML = "";

  if (!data || data.length === 0) {
    pointTableBody.innerHTML = `
      <tr>
        <td colspan="8">Veri bulunamadı.</td>
      </tr>
    `;

    pointCount.textContent = "0 kayıt listeleniyor";
    return;
  }

  data.forEach(point => {
    const score = Number(point.performans_skoru || 0);
    const status = point.durum || getScoreStatus(score);

    pointTableBody.innerHTML += `
      <tr>
        <td><strong>${point.satis_noktasi || "-"}</strong></td>

        <td>
          <span class="badge ${point.kanal_tipi === "Online" ? "online" : "store"}">
            ${point.kanal_tipi || "-"}
          </span>
        </td>

        <td>${point.sehir || "-"}</td>
        <td>${formatMoney(point.ciro)}</td>
        <td>${formatNumber(point.siparis)}</td>
        <td>${formatMoney(getAov(point))}</td>
        <td><strong>${score}</strong></td>

        <td>
          <span class="badge ${getStatusClass(status)}">
            ${status}
          </span>
        </td>
      </tr>
    `;
  });

  pointCount.textContent = `${formatNumber(data.length)} kayıt listeleniyor`;
}

function renderInsights(data) {
  if (!channelInsights) return;

  const onlineData = typeAnalysis.find(item => item.kanal_tipi === "Online");
  const storeData = typeAnalysis.find(item => item.kanal_tipi === "Mağaza");

  const onlineCiro = Number(onlineData?.ciro || 0);
  const storeCiro = Number(storeData?.ciro || 0);

  const winner = onlineCiro >= storeCiro ? "Online" : "Mağaza";
  const winnerCiro = Math.max(onlineCiro, storeCiro);

  const bestStore = [...data]
    .filter(item => item.kanal_tipi === "Mağaza")
    .sort((a, b) => Number(b.ciro || 0) - Number(a.ciro || 0))[0];

  channelInsights.innerHTML = `
    <div class="insight-item">
      <i class="fa-solid fa-chart-line"></i>
      <div>
        <h4>Öne çıkan kanal: ${winner}</h4>
        <p>${winner} kanalının cirosu ${formatMoney(winnerCiro)} seviyesinde.</p>
      </div>
    </div>

    <div class="insight-item">
      <i class="fa-solid fa-globe"></i>
      <div>
        <h4>Online kanal performansı</h4>
        <p>Online kanal cirosu ${formatMoney(onlineCiro)} ve sipariş sayısı ${formatNumber(onlineData?.siparis)}.</p>
      </div>
    </div>

    <div class="insight-item">
      <i class="fa-solid fa-store"></i>
      <div>
        <h4>En başarılı mağaza: ${bestStore?.satis_noktasi || "-"}</h4>
        <p>Şube bazlı kampanya ve stok planlaması bu mağazaya göre yapılabilir.</p>
      </div>
    </div>
  `;
}

function getBranchCoords(point, index = 0) {
  const name = normalizeText(point.satis_noktasi);
  const city = normalizeText(point.sehir);

  const branchCoords = [
    { key: "akhisar", coords: [38.9186, 27.8401] },
    { key: "novada", coords: [38.9186, 27.8401] },
    { key: "turgutlu", coords: [38.5002, 27.7084] },
    { key: "westpark", coords: [38.4556, 27.0836] },
    { key: "karsiyaka", coords: [38.4613, 27.1125] },
    { key: "sirin yer", coords: [38.3922, 27.1426] },
    { key: "sirinyer", coords: [38.3922, 27.1426] },
    { key: "bornova", coords: [38.4697, 27.2212] },
    { key: "alsancak", coords: [38.4383, 27.1453] },
    { key: "optimum", coords: [38.3272, 27.1349] },
    { key: "buca", coords: [38.3833, 27.1778] },
    { key: "menemen", coords: [38.6075, 27.0694] },
    { key: "cesme", coords: [38.3228, 26.3064] },
    { key: "denizli", coords: [37.7765, 29.0864] },
    { key: "forum aydin", coords: [37.8444, 27.8458] },
    { key: "kusadasi", coords: [37.8579, 27.2610] },
    { key: "bodrum", coords: [37.0344, 27.4305] },
    { key: "kadikoy", coords: [40.9903, 29.0272] },
    { key: "besiktas", coords: [41.0422, 29.0073] },
    { key: "fatih", coords: [41.0164, 28.9497] },
    { key: "cankaya", coords: [39.9179, 32.8627] },
    { key: "kizilay", coords: [39.9208, 32.8541] }
  ];

  const branchMatch = branchCoords.find(item => name.includes(item.key));

  if (branchMatch) {
    return branchMatch.coords;
  }

  const cityCoords = {
    istanbul: [41.0082, 28.9784],
    ankara: [39.9334, 32.8597],
    izmir: [38.4192, 27.1287],
    bursa: [40.1828, 29.0664],
    manisa: [38.6191, 27.4289],
    balikesir: [39.6484, 27.8826],
    aydin: [37.8560, 27.8416],
    denizli: [37.7765, 29.0864],
    mugla: [37.2153, 28.3636],
    antalya: [36.8969, 30.7133],
    eskisehir: [39.7767, 30.5206],
    konya: [37.8746, 32.4932],
    kocaeli: [40.7654, 29.9408],
    sakarya: [40.7731, 30.3948]
  };

  const base = cityCoords[city];

  if (!base) {
    return null;
  }

  const offsetAmount = 0.065;
  const angle = index * 55 * Math.PI / 180;

  return [
    base[0] + Math.sin(angle) * offsetAmount,
    base[1] + Math.cos(angle) * offsetAmount
  ];
}

function renderChannelMap(data) {
  if (!channelMapBox || typeof L === "undefined") return;

  const validData = data.filter(point => {
    const city = normalizeText(point.sehir);
    return city && city !== "online" && city !== "belirsiz" && city !== "-";
  });

  if (!channelMap) {
    channelMap = L.map("channelMap", {
      zoomControl: true,
      scrollWheelZoom: false
    }).setView([39.0, 35.0], 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: ""
    }).addTo(channelMap);
  }

  channelMap.eachLayer(layer => {
    if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
      channelMap.removeLayer(layer);
    }
  });

  const cityCounter = {};
  const bounds = [];

  validData.forEach(point => {
    const cityKey = normalizeText(point.sehir);
    cityCounter[cityKey] = (cityCounter[cityKey] || 0) + 1;

    const coords = getBranchCoords(point, cityCounter[cityKey]);
    if (!coords) return;

    bounds.push(coords);

    L.circleMarker(coords, {
      radius: 8,
      fillColor: "#ff2525",
      color: "#ffffff",
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9
    })
      .addTo(channelMap)
      .bindPopup(`
        <strong>${point.satis_noktasi || "-"}</strong><br>
        Kanal: ${point.kanal_tipi || "-"}<br>
        Şehir: ${point.sehir || "-"}<br>
        Ciro: ${formatMoney(point.ciro)}<br>
        Sipariş: ${point.siparis || 0}<br>
        Skor: ${point.performans_skoru || 0}
      `);
  });

  if (bounds.length > 0) {
    channelMap.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 9
    });
  }

  setTimeout(() => {
    channelMap.invalidateSize();
  }, 300);
}

function renderScoreDetails(data) {
  if (!scoreDetailBox) return;

  scoreDetailBox.innerHTML = "";

  if (!data || data.length === 0) {
    scoreDetailBox.innerHTML = `
      <div class="score-mini-card">
        <i class="fa-solid fa-circle-info"></i>
        <div>
          <h4>Veri bulunamadı</h4>
          <p>Şube performansı için satış noktası verisi yok.</p>
        </div>
        <strong class="score-value">0</strong>
      </div>
    `;
    return;
  }

  const sorted = [...data].sort(
    (a, b) => Number(b.performans_skoru || 0) - Number(a.performans_skoru || 0)
  );

  const best = sorted[0];
  const weakest = sorted[sorted.length - 1];

  const avgScore = Math.round(
    sorted.reduce((sum, item) => sum + Number(item.performans_skoru || 0), 0) / sorted.length
  );

  scoreDetailBox.innerHTML = `
    <div class="score-mini-card">
      <i class="fa-solid fa-trophy"></i>
      <div>
        <h4>En yüksek performans</h4>
        <p>${best.satis_noktasi} en yüksek şube skoruna sahip.</p>
      </div>
      <strong class="score-value">${best.performans_skoru}</strong>
    </div>

    <div class="score-mini-card">
      <i class="fa-solid fa-chart-simple"></i>
      <div>
        <h4>Ortalama performans skoru</h4>
        <p>Tüm satış noktalarının ortalama performans değeri.</p>
      </div>
      <strong class="score-value">${avgScore}</strong>
    </div>

    <div class="score-mini-card">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <div>
        <h4>Geliştirilecek satış noktası</h4>
        <p>${weakest.satis_noktasi} için kampanya, stok veya müşteri aksiyonu planlanabilir.</p>
      </div>
      <strong class="score-value">${weakest.performans_skoru}</strong>
    </div>
  `;
}

function renderAll(data) {
  renderTable(data);
  renderInsights(data);
  renderScoreDetails(data);
  renderChannelMap(data);
}

function fillFilters() {
  if (!cityFilter) return;

  const currentCity = cityFilter.value;

  const cities = [
    ...new Set(
      salesPoints
        .map(item => item.sehir)
        .filter(city => city && city !== "-")
    )
  ];

  cityFilter.innerHTML = `<option value="all">Tümü</option>`;

  cities.forEach(city => {
    cityFilter.innerHTML += `<option value="${city}">${city}</option>`;
  });

  if (cities.includes(currentCity)) {
    cityFilter.value = currentCity;
  }
}

function getFilterNumber(input) {
  if (!input || input.value === "") return null;
  return Number(input.value);
}

function applyFilters() {
  const searchValue = channelSearch ? normalizeText(channelSearch.value) : "";
  const typeValue = typeFilter ? typeFilter.value : "all";
  const cityValue = cityFilter ? cityFilter.value : "all";
  const statusValue = statusFilter ? statusFilter.value : "all";

  const minRevenue = getFilterNumber(minRevenueFilter);
  const maxRevenue = getFilterNumber(maxRevenueFilter);
  const minOrder = getFilterNumber(minOrderFilter);
  const maxOrder = getFilterNumber(maxOrderFilter);
  const minAov = getFilterNumber(minAovFilter);
  const maxAov = getFilterNumber(maxAovFilter);
  const minScore = getFilterNumber(minScoreFilter);
  const maxScore = getFilterNumber(maxScoreFilter);

  filteredPoints = salesPoints.filter(point => {
    const score = Number(point.performans_skoru || 0);
    const status = point.durum || getScoreStatus(score);
    const ciro = Number(point.ciro || 0);
    const siparis = Number(point.siparis || 0);
    const aov = Number(point.aov || 0);

    const searchMatch =
      normalizeText(point.satis_noktasi).includes(searchValue) ||
      normalizeText(point.kanal_tipi).includes(searchValue) ||
      normalizeText(point.sehir).includes(searchValue);

    const typeMatch = typeValue === "all" || point.kanal_tipi === typeValue;
    const cityMatch = cityValue === "all" || point.sehir === cityValue;
    const statusMatch = statusValue === "all" || status === statusValue;

    const revenueMatch =
      (minRevenue === null || ciro >= minRevenue) &&
      (maxRevenue === null || ciro <= maxRevenue);

    const orderMatch =
      (minOrder === null || siparis >= minOrder) &&
      (maxOrder === null || siparis <= maxOrder);

    const aovMatch =
      (minAov === null || aov >= minAov) &&
      (maxAov === null || aov <= maxAov);

    const scoreMatch =
      (minScore === null || score >= minScore) &&
      (maxScore === null || score <= maxScore);

    return (
      searchMatch &&
      typeMatch &&
      cityMatch &&
      statusMatch &&
      revenueMatch &&
      orderMatch &&
      aovMatch &&
      scoreMatch
    );
  });

  renderAll(filteredPoints);
}

function clearChannelFilters() {
  if (channelSearch) channelSearch.value = "";
  if (typeFilter) typeFilter.value = "all";
  if (cityFilter) cityFilter.value = "all";
  if (statusFilter) statusFilter.value = "all";

  if (minRevenueFilter) minRevenueFilter.value = "";
  if (maxRevenueFilter) maxRevenueFilter.value = "";
  if (minOrderFilter) minOrderFilter.value = "";
  if (maxOrderFilter) maxOrderFilter.value = "";
  if (minAovFilter) minAovFilter.value = "";
  if (maxAovFilter) maxAovFilter.value = "";
  if (minScoreFilter) minScoreFilter.value = "";
  if (maxScoreFilter) maxScoreFilter.value = "";

  filteredPoints = [...salesPoints];
  renderAll(filteredPoints);
}

function exportChannels() {
  let csv = "\uFEFFSatış Noktası,Kanal Tipi,Şehir,Ciro,Sipariş,AOV,Performans Skoru,Durum\n";

  filteredPoints.forEach(point => {
    csv += `"${point.satis_noktasi || ""}","${point.kanal_tipi || ""}","${point.sehir || ""}","${point.ciro || 0}","${point.siparis || 0}","${point.aov || 0}","${point.performans_skoru || 0}","${point.durum || ""}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "satis_noktalari.csv";
  link.click();

  URL.revokeObjectURL(url);
}

async function loadChannelsPage() {
  try {
    if (pointTableBody) {
      pointTableBody.innerHTML = `
        <tr>
          <td colspan="8">Veriler yükleniyor...</td>
        </tr>
      `;
    }

    const [summary, channels, typeData, cityData] = await Promise.all([
      apiRequest("/channels/summary"),
      apiRequest("/channels"),
      apiRequest("/channels/type-analysis"),
      apiRequest("/channels/city-analysis")
    ]);

    salesPoints = channels || [];
    filteredPoints = [...salesPoints];
    typeAnalysis = typeData || [];
    cityAnalysis = cityData || [];

    renderKpis(summary);
    renderChannelChart(typeAnalysis);
    fillFilters();
    renderAll(filteredPoints);

  } catch (error) {
    console.error("Channels yüklenemedi:", error);

    if (pointTableBody) {
      pointTableBody.innerHTML = `
        <tr>
          <td colspan="8">API bağlantısı kurulamadı.</td>
        </tr>
      `;
    }
  }
}

function setupChannelEvents() {
  if (channelSearch) {
    channelSearch.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(applyFilters, 350);
    });
  }

  if (typeFilter) typeFilter.addEventListener("change", applyFilters);
  if (cityFilter) cityFilter.addEventListener("change", applyFilters);
  if (statusFilter) statusFilter.addEventListener("change", applyFilters);

  [
    minRevenueFilter,
    maxRevenueFilter,
    minOrderFilter,
    maxOrderFilter,
    minAovFilter,
    maxAovFilter,
    minScoreFilter,
    maxScoreFilter
  ].forEach(input => {
    if (input) {
      input.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(applyFilters, 400);
      });
    }
  });

  if (clearChannelFiltersBtn) {
    clearChannelFiltersBtn.addEventListener("click", clearChannelFilters);
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", exportChannels);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  setupChannelEvents();
  loadChannelsPage();
});