const productSearch = document.getElementById("productSearch");
const categoryFilter = document.getElementById("categoryFilter");
const performanceFilter = document.getElementById("performanceFilter");
const exportBtn = document.getElementById("exportBtn");

const totalProducts = document.getElementById("totalProducts");
const bestSeller = document.getElementById("bestSeller");
const bestSellerCount = document.getElementById("bestSellerCount");
const topRevenueProduct = document.getElementById("topRevenueProduct");
const topRevenueAmount = document.getElementById("topRevenueAmount");
const leastSeller = document.getElementById("leastSeller");
const leastSellerCount = document.getElementById("leastSellerCount");

const topProducts = document.getElementById("topProducts");
const revenueBars = document.getElementById("revenueBars");
const bundleList = document.getElementById("bundleList");
const productTableBody = document.getElementById("productTableBody");
const productCount = document.getElementById("productCount");

let products = [];
let filteredProducts = [];

let topProductsApexChart = null;
let revenueApexChart = null;

function formatNumber(value) {
  return Number(value || 0).toLocaleString("tr-TR");
}

function formatMoney(value) {
  return "₺" + Number(value || 0).toLocaleString("tr-TR");
}

function normalizeTR(value) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i");
}

function getPerformanceClass(performance) {
  if (performance === "Yüksek") return "high";
  if (performance === "Orta") return "mid";
  return "low";
}

function getPriorityClass(priority) {
  const value = String(priority || "").toLowerCase();

  if (value.includes("yüksek") || value.includes("yuksek")) return "high";
  if (value.includes("düşük") || value.includes("dusuk")) return "low";

  return "medium";
}

function getSuggestion(product) {
  if (product.performance === "Yüksek") {
    return "Stok ve kampanya desteği artırılabilir";
  }

  if (product.performance === "Orta") {
    return "Çapraz satış veya vitrin görünürlüğü artırılabilir";
  }

  return "İndirim veya kampanya önerilir";
}

function normalizeProduct(item) {
  return {
    id: item.urun_id,
    code: item.urun_kodu,
    name: item.urun_adi,
    brand: item.marka || "-",
    sales: Number(item.toplam_satis_adedi || 0),
    revenue: Number(item.toplam_ciro || 0),
    score: Number(item.performans_skoru || 0),
    performance: item.performans || "Düşük"
  };
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

async function loadProductsSummary() {
  const data = await apiRequest("/products/summary");
  if (!data) return;

  if (totalProducts) totalProducts.textContent = formatNumber(data.toplam_urun);

  if (bestSeller) bestSeller.textContent = data.en_cok_satan_urun || "-";
  if (bestSellerCount) {
    bestSellerCount.textContent = `${formatNumber(data.en_cok_satis_adedi)} satış`;
  }

  if (topRevenueProduct) topRevenueProduct.textContent = data.en_yuksek_ciro_urun || "-";
  if (topRevenueAmount) topRevenueAmount.textContent = formatMoney(data.en_yuksek_ciro || 0);

  if (leastSeller) leastSeller.textContent = data.en_az_satan_urun || "-";
  if (leastSellerCount) {
    leastSellerCount.textContent = `${formatNumber(data.en_az_satis_adedi)} satış`;
  }
}

async function loadProducts() {
  const data = await apiRequest("/products/");

  products = (data?.veriler || []).map(normalizeProduct);
  filteredProducts = [...products];

  fillBrandFilter(products);
  renderAll(filteredProducts);
}

async function loadBundles() {
  if (!bundleList) return;

  try {
    const data = await apiRequest("/products/bundles");

    bundleList.innerHTML = "";

    if (!data || data.length === 0) {
      bundleList.innerHTML = `
        <div class="bundle-item">
          <i class="fa-solid fa-circle-info"></i>
          <div>
            <h4>Birlikte satılan ürün bulunamadı</h4>
            <p>Aynı faturada birlikte geçen ürün çifti yok.</p>
          </div>
          <strong>-</strong>
        </div>
      `;
      return;
    }

    data.slice(0, 5).forEach(item => {
      bundleList.innerHTML += `
        <div class="bundle-item">
          <i class="fa-solid fa-link"></i>
          <div>
            <h4>${item.urun_1} + ${item.urun_2}</h4>
            <p>Aynı faturada birlikte satılma sayısı.</p>
          </div>
          <strong>${formatNumber(item.birlikte_satis_sayisi)}</strong>
        </div>
      `;
    });
  } catch (error) {
    console.error("Birlikte satılan ürünler yüklenemedi:", error);

    bundleList.innerHTML = `
      <div class="bundle-item">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <div>
          <h4>Birlikte satılan ürünler yüklenemedi</h4>
          <p>/products/bundles endpointini ve token yetkisini kontrol et.</p>
        </div>
        <strong>-</strong>
      </div>
    `;
  }
}

function fillBrandFilter(data) {
  if (!categoryFilter) return;

  const brands = [...new Set(data.map(item => item.brand).filter(Boolean))];

  categoryFilter.innerHTML = `<option value="all">Tümü</option>`;

  brands.forEach(brand => {
    categoryFilter.innerHTML += `
      <option value="${brand}">${brand}</option>
    `;
  });
}

function renderTable(data) {
  if (!productTableBody || !productCount) return;

  productTableBody.innerHTML = "";

  if (data.length === 0) {
    productTableBody.innerHTML = `
      <tr>
        <td colspan="8">Ürün bulunamadı.</td>
      </tr>
    `;
    productCount.textContent = "0 ürün listeleniyor";
    return;
  }

  data.forEach(product => {
    productTableBody.innerHTML += `
      <tr>
        <td><strong>${product.name}</strong></td>
        <td>${product.code || "-"}</td>
        <td>${product.brand}</td>
        <td>${formatNumber(product.sales)}</td>
        <td>${formatMoney(product.revenue)}</td>
        <td><strong>${product.score}</strong></td>
        <td>
          <span class="badge ${getPerformanceClass(product.performance)}">
            ${product.performance}
          </span>
        </td>
        <td>${getSuggestion(product)}</td>
      </tr>
    `;
  });

  productCount.textContent = `${formatNumber(data.length)} ürün listeleniyor`;
}

function renderTopProducts(data) {
  if (!topProducts) return;

  const sorted = [...data]
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 10);

  if (topProductsApexChart) {
    topProductsApexChart.destroy();
  }

  if (!sorted.length) {
    topProducts.innerHTML = `<p class="empty-text">Gösterilecek ürün yok.</p>`;
    return;
  }

  const labels = sorted.map(product => product.name);
  const values = sorted.map(product => Number(product.sales || 0));

  topProducts.innerHTML = "";

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      type: "bar",
      height: 340
    },
    series: [
      {
        name: "Satış",
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
        columnWidth: "50%"
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
        return createTooltip(name, `${formatNumber(value)} satış`);
      }
    }
  };

  topProductsApexChart = new ApexCharts(topProducts, options);
  topProductsApexChart.render();
}

function renderRevenueBars(data) {
  if (!revenueBars) return;

  const sorted = [...data]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  if (revenueApexChart) {
    revenueApexChart.destroy();
  }

  if (!sorted.length) {
    revenueBars.innerHTML = `<p class="empty-text">Gösterilecek ürün yok.</p>`;
    return;
  }

  const labels = sorted.map(product => product.name);
  const values = sorted.map(product => Number(product.revenue || 0));

  revenueBars.innerHTML = "";

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      type: "bar",
      height: 340
    },
    series: [
      {
        name: "Ciro",
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
        formatter: value => formatMoney(value)
      }
    },
    colors: ["#d9141c"],
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
        const name = w.globals.labels[dataPointIndex];
        const value = series[seriesIndex][dataPointIndex];
        return createTooltip(name, formatMoney(value));
      }
    }
  };

  revenueApexChart = new ApexCharts(revenueBars, options);
  revenueApexChart.render();
}

async function loadProductAiActions() {
  const container = document.getElementById("productSuggestions");
  const sourceText = document.getElementById("productAiSourceText");

  if (!container) return;

  if (sourceText) {
    sourceText.textContent = "AI ürün önerileri hazırlanıyor";
  }

  container.innerHTML = `
    <div class="ai-loading-card">
      <i class="fa-solid fa-brain"></i>
      <div>
        <h4>AI ürün önerileri hazırlanıyor</h4>
        <p>Ürün performansı analiz edilerek aksiyon önerileri oluşturuluyor.</p>
      </div>
    </div>
  `;

  try {
    const data = await apiRequest("/ai-actions/products");

    if (!data || !Array.isArray(data.actions) || data.actions.length === 0) {
      container.innerHTML = `
        <div class="ai-loading-card ai-error-card">
          <i class="fa-solid fa-circle-info"></i>
          <div>
            <h4>Öneri bulunamadı</h4>
            <p>AI ürün önerileri alınamadı.</p>
          </div>
        </div>
      `;

      if (sourceText) {
        sourceText.textContent = "Öneri bulunamadı";
      }

      return;
    }

    container.innerHTML = data.actions.map(action => {
      const icon = action.ikon || "fa-solid fa-lightbulb";
      const priority = action.oncelik || "Orta";
      const priorityClass = getPriorityClass(priority);
      const title = action.baslik || "AI Ürün Önerisi";
      const description = action.aciklama || "Bu ürün için aksiyon önerisi oluşturuldu.";

      return `
        <div class="insight-item ai-product-item">
          <i class="${icon}"></i>
          <div>
            <div class="ai-action-title-row">
              <h4>${title}</h4>
              <span class="ai-priority ${priorityClass}">
                ${priority}
              </span>
            </div>
            <p>${description}</p>
          </div>
          <button type="button" class="ai-action-btn">Uygula</button>
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
    console.error("Ürün AI önerileri yüklenemedi:", error);

    container.innerHTML = `
      <div class="ai-loading-card ai-error-card">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <div>
          <h4>AI önerileri yüklenemedi</h4>
          <p>/ai-actions/products endpointini ve yetki kontrolünü kontrol et.</p>
        </div>
      </div>
    `;

    if (sourceText) {
      sourceText.textContent = "AI önerileri yüklenemedi";
    }
  }
}

function renderAll(data) {
  renderTable(data);
  renderTopProducts(data);
  renderRevenueBars(data);
}

function applyFilters() {
  const searchValue = productSearch ? normalizeTR(productSearch.value.trim()) : "";
  const brandValue = categoryFilter ? categoryFilter.value : "all";
  const performanceValue = performanceFilter ? performanceFilter.value : "all";

  filteredProducts = products.filter(product => {
    const searchMatch =
      normalizeTR(product.name).includes(searchValue) ||
      normalizeTR(product.brand).includes(searchValue) ||
      normalizeTR(product.code).includes(searchValue);

    const brandMatch =
      brandValue === "all" || product.brand === brandValue;

    const performanceMatch =
      performanceValue === "all" || product.performance === performanceValue;

    return searchMatch && brandMatch && performanceMatch;
  });

  renderAll(filteredProducts);
}

function cleanCsvValue(value) {
  const text = String(value ?? "").replaceAll('"', '""');
  return `"${text}"`;
}

function exportProducts() {
  let csv = "Ürün Kodu;Ürün;Marka;Satış Sayısı;Ciro;Performans Skoru;Performans\n";

  filteredProducts.forEach(product => {
    csv += [
      cleanCsvValue(product.code),
      cleanCsvValue(product.name),
      cleanCsvValue(product.brand),
      cleanCsvValue(product.sales),
      cleanCsvValue(product.revenue),
      cleanCsvValue(product.score),
      cleanCsvValue(product.performance)
    ].join(";") + "\n";
  });

  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "urunler.csv";
  link.click();

  URL.revokeObjectURL(url);
}

function bindEvents() {
  if (productSearch) productSearch.addEventListener("input", applyFilters);
  if (categoryFilter) categoryFilter.addEventListener("change", applyFilters);
  if (performanceFilter) performanceFilter.addEventListener("change", applyFilters);
  if (exportBtn) exportBtn.addEventListener("click", exportProducts);
}

async function initProductsPage() {
  try {
    bindEvents();

    await loadProductsSummary();
    await loadProducts();
    await loadBundles();
    await loadProductAiActions();
  } catch (error) {
    console.error("Ürünler sayfası yüklenemedi:", error);

    if (productTableBody) {
      productTableBody.innerHTML = `
        <tr>
          <td colspan="8">Ürün verileri yüklenemedi. Token, API veya yetki kontrol edilmeli.</td>
        </tr>
      `;
    }

    if (bundleList) {
      bundleList.innerHTML = `
        <div class="bundle-item">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <div>
            <h4>Veri yüklenemedi</h4>
            <p>Backend, token veya products API kontrol edilmeli.</p>
          </div>
          <strong>-</strong>
        </div>
      `;
    }
  }
}

window.addEventListener("DOMContentLoaded", initProductsPage);