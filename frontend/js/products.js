const productSearch = document.getElementById("productSearch");
const categoryFilter = document.getElementById("categoryFilter");
const performanceFilter = document.getElementById("performanceFilter");

const minSalesFilter = document.getElementById("minSalesFilter");
const maxSalesFilter = document.getElementById("maxSalesFilter");
const minRevenueFilter = document.getElementById("minRevenueFilter");
const maxRevenueFilter = document.getElementById("maxRevenueFilter");
const minScoreFilter = document.getElementById("minScoreFilter");
const maxScoreFilter = document.getElementById("maxScoreFilter");

const clearProductFiltersBtn = document.getElementById("clearProductFiltersBtn");
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
const productPagination = document.getElementById("productPagination");

let products = [];
let filteredProducts = [];

let currentPage = 1;
const pageLimit = 10;
let totalPages = 1;
let totalProductCount = 0;

let topProductsApexChart = null;
let revenueApexChart = null;
let searchTimer = null;

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
      <div style="font-size:12px;color:${theme.mutedColor};font-weight:800;margin-bottom:5px;">
        ${title}
      </div>
      <div style="font-size:15px;color:${theme.textColor};font-weight:900;">
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

function buildProductQueryParams(page = 1) {
  const params = new URLSearchParams();

  params.append("page", page);
  params.append("limit", pageLimit);

  if (productSearch && productSearch.value.trim()) {
    params.append("search", productSearch.value.trim());
  }

  if (categoryFilter && categoryFilter.value !== "all") {
    params.append("marka", categoryFilter.value);
  }

  if (performanceFilter && performanceFilter.value !== "all") {
    params.append("performance", performanceFilter.value);
  }

  if (minSalesFilter && minSalesFilter.value) {
    params.append("min_satis", minSalesFilter.value);
  }

  if (maxSalesFilter && maxSalesFilter.value) {
    params.append("max_satis", maxSalesFilter.value);
  }

  if (minRevenueFilter && minRevenueFilter.value) {
    params.append("min_ciro", minRevenueFilter.value);
  }

  if (maxRevenueFilter && maxRevenueFilter.value) {
    params.append("max_ciro", maxRevenueFilter.value);
  }

  if (minScoreFilter && minScoreFilter.value) {
    params.append("min_skor", minScoreFilter.value);
  }

  if (maxScoreFilter && maxScoreFilter.value) {
    params.append("max_skor", maxScoreFilter.value);
  }

  return params;
}

async function loadProducts(page = 1) {
  try {
    currentPage = page;

    if (productTableBody) {
      productTableBody.innerHTML = `
        <tr>
          <td colspan="8">Ürünler yükleniyor...</td>
        </tr>
      `;
    }

    const params = buildProductQueryParams(currentPage);
    const data = await apiRequest(`/products/?${params.toString()}`);

    if (!data || !Array.isArray(data.veriler)) {
      if (productTableBody) {
        productTableBody.innerHTML = `
          <tr>
            <td colspan="8">Ürün verisi alınamadı.</td>
          </tr>
        `;
      }
      return;
    }

    products = data.veriler.map(normalizeProduct);
    filteredProducts = [...products];

    totalPages = Number(data.toplam_sayfa || 1);
    totalProductCount = Number(data.toplam_kayit || data.kayit_sayisi || 0);

    await fillBrandFilter();

    renderAll(filteredProducts);
    renderPagination();

  } catch (error) {
    console.error("Ürün verisi çekme hatası:", error);

    if (productTableBody) {
      productTableBody.innerHTML = `
        <tr>
          <td colspan="8">Ürün verileri yüklenemedi. API, token veya yetki kontrol edilmeli.</td>
        </tr>
      `;
    }
  }
}

async function fillBrandFilter() {
  if (!categoryFilter) return;

  const currentValue = categoryFilter.value;

  const data = await apiRequest("/products/?page=1&limit=100");
  const list = Array.isArray(data?.veriler) ? data.veriler.map(normalizeProduct) : [];

  const brands = [...new Set(list.map(item => item.brand).filter(Boolean))];

  categoryFilter.innerHTML = `<option value="all">Tümü</option>`;

  brands.forEach(brand => {
    categoryFilter.innerHTML += `
      <option value="${brand}">${brand}</option>
    `;
  });

  if (brands.includes(currentValue)) {
    categoryFilter.value = currentValue;
  }
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

function renderTable(data) {
  if (!productTableBody || !productCount) return;

  productTableBody.innerHTML = "";

  if (!data.length) {
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

  productCount.textContent =
    `${formatNumber(totalProductCount)} ürün içinden bu sayfada ${formatNumber(data.length)} ürün gösteriliyor`;
}

function renderPagination() {
  if (!productPagination) return;

  productPagination.innerHTML = "";

  if (totalPages <= 1) return;

  function createPageButton(text, page, isActive = false, isDisabled = false) {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.className = isActive ? "page-btn active" : "page-btn";
    btn.disabled = isDisabled;

    if (!isDisabled && page) {
      btn.addEventListener("click", () => {
        loadProducts(page);
      });
    }

    return btn;
  }

  productPagination.appendChild(
    createPageButton("‹", currentPage - 1, false, currentPage === 1)
  );

  productPagination.appendChild(
    createPageButton("1", 1, currentPage === 1)
  );

  if (currentPage > 4) {
    const dots = document.createElement("span");
    dots.className = "page-dots";
    dots.textContent = "...";
    productPagination.appendChild(dots);
  }

  const startPage = Math.max(2, currentPage - 1);
  const endPage = Math.min(totalPages - 1, currentPage + 1);

  for (let i = startPage; i <= endPage; i++) {
    productPagination.appendChild(
      createPageButton(String(i), i, i === currentPage)
    );
  }

  if (currentPage < totalPages - 3) {
    const dots = document.createElement("span");
    dots.className = "page-dots";
    dots.textContent = "...";
    productPagination.appendChild(dots);
  }

  if (totalPages > 1) {
    productPagination.appendChild(
      createPageButton(String(totalPages), totalPages, currentPage === totalPages)
    );
  }

  productPagination.appendChild(
    createPageButton("›", currentPage + 1, false, currentPage === totalPages)
  );
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
  loadProducts(1);
}

function clearProductFilters() {
  if (productSearch) productSearch.value = "";
  if (categoryFilter) categoryFilter.value = "all";
  if (performanceFilter) performanceFilter.value = "all";

  if (minSalesFilter) minSalesFilter.value = "";
  if (maxSalesFilter) maxSalesFilter.value = "";
  if (minRevenueFilter) minRevenueFilter.value = "";
  if (maxRevenueFilter) maxRevenueFilter.value = "";
  if (minScoreFilter) minScoreFilter.value = "";
  if (maxScoreFilter) maxScoreFilter.value = "";

  loadProducts(1);
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
  if (productSearch) {
    productSearch.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(applyFilters, 400);
    });
  }

  if (categoryFilter) {
    categoryFilter.addEventListener("change", applyFilters);
  }

  if (performanceFilter) {
    performanceFilter.addEventListener("change", applyFilters);
  }

  [
    minSalesFilter,
    maxSalesFilter,
    minRevenueFilter,
    maxRevenueFilter,
    minScoreFilter,
    maxScoreFilter
  ].forEach(input => {
    if (input) {
      input.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(applyFilters, 500);
      });
    }
  });

  if (clearProductFiltersBtn) {
    clearProductFiltersBtn.addEventListener("click", clearProductFilters);
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", exportProducts);
  }
}

async function initProductsPage() {
  try {
    bindEvents();

    await loadProductsSummary();
    await loadProducts(1);
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