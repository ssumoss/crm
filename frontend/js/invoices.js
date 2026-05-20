let allInvoices = [];
let filteredInvoices = [];

let currentPage = 1;
const pageLimit = 50;
let totalPages = 1;
let totalInvoiceCount = 0;

let orderTrendChart = null;
let docTypeChart = null;
let returnTrendChart = null;

const invoiceSearch = document.getElementById("invoiceSearch");
const docTypeFilter = document.getElementById("docTypeFilter");
const salesPointFilter = document.getElementById("salesPointFilter");

const invoiceTableBody = document.getElementById("invoiceTableBody");
const invoiceCount = document.getElementById("invoiceCount");
const pagination = document.getElementById("pagination");

const invoiceModal = document.getElementById("invoiceModal");
const closeModalBtn = document.getElementById("closeModal");
const modalContent = document.getElementById("modalContent");

const orderTrendYear = document.getElementById("orderTrendYear");
const returnTrendYear = document.getElementById("returnTrendYear");
const basketYear = document.getElementById("basketYear");

let searchTimer = null;

function normalizeTR(value) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i");
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("tr-TR");
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0
  });
}

function formatDate(value) {
  if (!value || value === "-") return "-";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleDateString("tr-TR");
}

function safeText(value) {
  return value === null || value === undefined || value === "" ? "-" : value;
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
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
      min-width:120px;
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

async function loadInvoiceSummary() {
  const summary = await apiRequest("/invoices/summary");
  if (!summary) return;

  setText("totalInvoice", formatNumber(summary.toplam_fatura));
  setText("totalSales", formatMoney(summary.toplam_satis));
  setText("avgInvoice", formatMoney(summary.ortalama_fatura));
  setText("returnCount", formatNumber(summary.iade_sayisi));

  renderDocTypeChart(summary);
}

async function loadInvoiceTrend(year = 2025) {
  const data = await apiRequest(`/invoices/monthly-trend?year=${year}`);
  if (!data) return;
  renderOrderTrendChart(data);
}

async function loadReturnTrend(year = 2025) {
  const data = await apiRequest(`/invoices/monthly-trend?year=${year}`);
  if (!data) return;
  renderReturnTrendChart(data);
}

function renderOrderTrendChart(data) {
  const chartEl = document.querySelector("#orderTrendChart");
  if (!chartEl) return;

  const months = data.map(item => item.ay);
  const salesCounts = data.map(item => Number(item.satis_sayisi || 0));

  if (orderTrendChart) orderTrendChart.destroy();

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      type: "area",
      height: 280
    },
    series: [
      {
        name: "Satış Siparişi",
        data: salesCounts
      }
    ],
    xaxis: {
      categories: months
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
        return createTooltip(month, `${formatNumber(value)} satış`);
      }
    }
  };

  orderTrendChart = new ApexCharts(chartEl, options);
  orderTrendChart.render();
}

function renderDocTypeChart(summary) {
  const chartEl = document.querySelector("#docTypeChart");
  if (!chartEl) return;

  const saleCount = Number(summary.satis_sayisi || 0);
  const returnCount = Number(summary.iade_sayisi || 0);

  if (docTypeChart) docTypeChart.destroy();

  if (saleCount + returnCount === 0) {
    chartEl.innerHTML = `<p class="empty-text">Belge tipi verisi yok.</p>`;
    return;
  }

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      type: "donut",
      height: 280
    },
    series: [saleCount, returnCount],
    labels: ["Satış", "İade"],
    colors: ["#2279d6", "#ff2525"],
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
              label: "Belge",
              formatter: () => formatNumber(saleCount + returnCount)
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
      enabled: true,
      custom: function ({ series, seriesIndex, w }) {
        const label = w.globals.labels[seriesIndex];
        const value = series[seriesIndex];
        return createTooltip(label, `${formatNumber(value)} belge`);
      }
    }
  };

  docTypeChart = new ApexCharts(chartEl, options);
  docTypeChart.render();
}

function renderReturnTrendChart(data) {
  const chartEl = document.querySelector("#returnTrendChart");
  if (!chartEl) return;

  const months = data.map(item => item.ay);
  const returnCounts = data.map(item => Number(item.iade_sayisi || 0));

  if (returnTrendChart) returnTrendChart.destroy();

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      type: "bar",
      height: 280
    },
    series: [
      {
        name: "İade",
        data: returnCounts
      }
    ],
    xaxis: {
      categories: months
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
        const month = w.globals.labels[dataPointIndex];
        const value = series[seriesIndex][dataPointIndex];
        return createTooltip(month, `${formatNumber(value)} iade`);
      }
    }
  };

  returnTrendChart = new ApexCharts(chartEl, options);
  returnTrendChart.render();
}

async function loadBasketAnalysis(year = 2025) {
  const data = await apiRequest(`/invoices/basket-analysis?year=${year}`);
  if (!data) return;
  renderBasketAnalysis(data);
}

function renderBasketAnalysis(data) {
  const container = document.getElementById("basketAnalysis");
  if (!container) return;

  container.innerHTML = "";

  if (!data.length) {
    container.innerHTML = `<p class="empty-text">Bu yıl için sepet analizi verisi yok.</p>`;
    return;
  }

  data.forEach(item => {
    container.innerHTML += `
      <div class="basket-item">
        <i class="fa-solid fa-basket-shopping"></i>
        <div>
          <h4>${Number(item.kalem_sayisi || 0)} kalemli faturalar</h4>
          <p>Bu sepet yapısına sahip fatura sayısı</p>
        </div>
        <strong>${formatNumber(item.fatura_sayisi)} fatura</strong>
      </div>
    `;
  });
}

async function loadInvoices(page = 1) {
  try {
    currentPage = page;

    if (invoiceTableBody) {
      invoiceTableBody.innerHTML = `
        <tr>
          <td colspan="8">Faturalar yükleniyor...</td>
        </tr>
      `;
    }

    const data = await apiRequest(`/invoices/?page=${currentPage}&limit=${pageLimit}`);

    if (!data || !Array.isArray(data.veriler)) {
      invoiceTableBody.innerHTML = `
        <tr>
          <td colspan="8">Fatura verisi alınamadı.</td>
        </tr>
      `;
      return;
    }

    allInvoices = data.veriler;
    filteredInvoices = [...allInvoices];

    totalPages = Number(data.toplam_sayfa || 1);
    totalInvoiceCount = Number(data.toplam_kayit || 0);

    fillSalesPointFilter();
    renderTable(filteredInvoices);
    renderPagination();

  } catch (error) {
    console.error("Fatura verisi çekme hatası:", error);

    if (invoiceTableBody) {
      invoiceTableBody.innerHTML = `
        <tr>
          <td colspan="8">Fatura verisi yüklenirken hata oluştu.</td>
        </tr>
      `;
    }
  }
}

function renderTable(data) {
  if (!invoiceTableBody || !invoiceCount) return;

  invoiceTableBody.innerHTML = "";

  if (!data.length) {
    invoiceTableBody.innerHTML = `
      <tr>
        <td colspan="8">Kayıt bulunamadı.</td>
      </tr>
    `;

    invoiceCount.textContent = "0 kayıt listeleniyor";
    return;
  }

  data.forEach(invoice => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${safeText(invoice.fatura_no)}</td>
      <td>${safeText(invoice.musteri)}</td>
      <td>${formatMoney(invoice.tutar)}</td>
      <td>${formatDate(invoice.tarih)}</td>
      <td>${safeText(invoice.belge_tipi)}</td>
      <td>${safeText(invoice.satis_noktasi)}</td>
      <td>${safeText(invoice.kalem_sayisi)}</td>
      <td>
        <button class="detail-btn" data-id="${invoice.fatura_no}">
          Detay
        </button>
      </td>
    `;

    invoiceTableBody.appendChild(tr);
  });

  invoiceCount.textContent =
    `${formatNumber(totalInvoiceCount)} kayıt içinden bu sayfada ${formatNumber(data.length)} kayıt gösteriliyor`;
}

function renderPagination() {
  if (!pagination) return;

  pagination.innerHTML = "";

  if (totalPages <= 1) return;

  function createPageButton(text, page, isActive = false, isDisabled = false) {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.className = isActive ? "page-btn active" : "page-btn";
    btn.disabled = isDisabled;

    if (!isDisabled && page) {
      btn.addEventListener("click", () => {
        loadInvoices(page);
      });
    }

    return btn;
  }

  pagination.appendChild(
    createPageButton("‹", currentPage - 1, false, currentPage === 1)
  );

  pagination.appendChild(
    createPageButton("1", 1, currentPage === 1)
  );

  if (currentPage > 4) {
    const dots = document.createElement("span");
    dots.className = "page-dots";
    dots.textContent = "...";
    pagination.appendChild(dots);
  }

  const startPage = Math.max(2, currentPage - 1);
  const endPage = Math.min(totalPages - 1, currentPage + 1);

  for (let i = startPage; i <= endPage; i++) {
    pagination.appendChild(
      createPageButton(String(i), i, i === currentPage)
    );
  }

  if (currentPage < totalPages - 3) {
    const dots = document.createElement("span");
    dots.className = "page-dots";
    dots.textContent = "...";
    pagination.appendChild(dots);
  }

  if (totalPages > 1) {
    pagination.appendChild(
      createPageButton(String(totalPages), totalPages, currentPage === totalPages)
    );
  }

  pagination.appendChild(
    createPageButton("›", currentPage + 1, false, currentPage === totalPages)
  );
}

function fillSalesPointFilter() {
  if (!salesPointFilter) return;

  const currentValue = salesPointFilter.value;

  const salesPoints = [
    ...new Set(
      allInvoices
        .map(invoice => invoice.satis_noktasi)
        .filter(value => value && value !== "-")
    )
  ];

  salesPointFilter.innerHTML = `<option value="all">Satış Noktası: Tümü</option>`;

  salesPoints.forEach(point => {
    salesPointFilter.innerHTML += `<option value="${point}">${point}</option>`;
  });

  if (salesPoints.includes(currentValue)) {
    salesPointFilter.value = currentValue;
  }
}

function applyFilters() {
  const searchValue = invoiceSearch ? normalizeTR(invoiceSearch.value.trim()) : "";
  const docTypeValue = docTypeFilter ? docTypeFilter.value : "all";
  const salesPointValue = salesPointFilter ? salesPointFilter.value : "all";

  filteredInvoices = allInvoices.filter(invoice => {
    const invoiceNo = normalizeTR(invoice.fatura_no);
    const customer = normalizeTR(invoice.musteri);
    const salesPoint = normalizeTR(invoice.satis_noktasi);
    const docType = String(invoice.belge_tipi || "");

    const searchMatch =
      invoiceNo.includes(searchValue) ||
      customer.includes(searchValue) ||
      salesPoint.includes(searchValue);

    const docMatch =
      docTypeValue === "all" ||
      normalizeTR(docType) === normalizeTR(docTypeValue);

    const salesPointMatch =
      salesPointValue === "all" ||
      invoice.satis_noktasi === salesPointValue;

    return searchMatch && docMatch && salesPointMatch;
  });

  renderTable(filteredInvoices);
}

function openModal(faturaNo) {
  if (!modalContent || !invoiceModal) return;

  const invoice = allInvoices.find(item => String(item.fatura_no) === String(faturaNo));
  if (!invoice) return;

  modalContent.innerHTML = `
    <div class="modal-row">
      <span>Fatura No</span>
      <strong>${safeText(invoice.fatura_no)}</strong>
    </div>

    <div class="modal-row">
      <span>Müşteri</span>
      <strong>${safeText(invoice.musteri)}</strong>
    </div>

    <div class="modal-row">
      <span>Tutar</span>
      <strong>${formatMoney(invoice.tutar)}</strong>
    </div>

    <div class="modal-row">
      <span>Tarih</span>
      <strong>${formatDate(invoice.tarih)}</strong>
    </div>

    <div class="modal-row">
      <span>Belge Tipi</span>
      <strong>${safeText(invoice.belge_tipi)}</strong>
    </div>

    <div class="modal-row">
      <span>Satış Noktası</span>
      <strong>${safeText(invoice.satis_noktasi)}</strong>
    </div>

    <div class="modal-row">
      <span>Kalem Sayısı</span>
      <strong>${safeText(invoice.kalem_sayisi)}</strong>
    </div>
  `;

  invoiceModal.classList.add("show");
}

function closeModal() {
  if (invoiceModal) {
    invoiceModal.classList.remove("show");
  }
}

function setupEvents() {
  if (invoiceSearch) {
    invoiceSearch.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(applyFilters, 300);
    });
  }

  if (docTypeFilter) {
    docTypeFilter.addEventListener("change", applyFilters);
  }

  if (salesPointFilter) {
    salesPointFilter.addEventListener("change", applyFilters);
  }

  if (orderTrendYear) {
    orderTrendYear.addEventListener("change", event => {
      loadInvoiceTrend(Number(event.target.value));
    });
  }

  if (returnTrendYear) {
    returnTrendYear.addEventListener("change", event => {
      loadReturnTrend(Number(event.target.value));
    });
  }

  if (basketYear) {
    basketYear.addEventListener("change", event => {
      loadBasketAnalysis(Number(event.target.value));
    });
  }

  if (invoiceTableBody) {
    invoiceTableBody.addEventListener("click", event => {
      if (event.target.classList.contains("detail-btn")) {
        openModal(event.target.dataset.id);
      }
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeModal);
  }

  if (invoiceModal) {
    invoiceModal.addEventListener("click", event => {
      if (event.target === invoiceModal) {
        closeModal();
      }
    });
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  setupEvents();

  if (invoiceTableBody) {
    invoiceTableBody.innerHTML = `
      <tr>
        <td colspan="8">Faturalar yükleniyor...</td>
      </tr>
    `;
  }

  await loadInvoiceSummary();
  await loadInvoiceTrend(2025);
  await loadReturnTrend(2025);
  await loadBasketAnalysis(2025);
  await loadInvoices(1);
});