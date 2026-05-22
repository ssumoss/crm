if (!localStorage.getItem("token")) {
  window.location.href = "login.html";
}

const searchInput = document.getElementById("searchInput");
const segmentFilter = document.getElementById("segmentFilter");
const cityFilter = document.getElementById("cityFilter");
const riskFilter = document.getElementById("riskFilter");

const minLtvFilter = document.getElementById("minLtvFilter");
const maxLtvFilter = document.getElementById("maxLtvFilter");
const minSpendingFilter = document.getElementById("minSpendingFilter");
const maxSpendingFilter = document.getElementById("maxSpendingFilter");
const startDateFilter = document.getElementById("startDateFilter");
const endDateFilter = document.getElementById("endDateFilter");

const tableBody = document.getElementById("customerTableBody");
const customerCount = document.getElementById("customerCount");
const selectedInfo = document.getElementById("selectedInfo");
const selectAll = document.getElementById("selectAll");
const exportBtn = document.getElementById("exportBtn");
const campaignBtn = document.getElementById("campaignBtn");
const pagination = document.getElementById("pagination");

const totalCustomerCard = document.getElementById("totalCustomerCard");
const highRiskCard = document.getElementById("highRiskCard");
const avgLtvCard = document.getElementById("avgLtvCard");
const championCard = document.getElementById("championCard");

let customers = [];
let filteredCustomers = [];

let currentPage = 1;
const pageLimit = 50;
let totalPages = 1;
let totalCustomerCount = 0;

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

function getInitials(name) {
  if (!name) return "?";

  return name
    .split(" ")
    .filter(Boolean)
    .map(word => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function getRiskLevel(churn) {
  const value = Number(churn || 0);

  if (value >= 70) return "Yüksek";
  if (value >= 40) return "Orta";
  return "Düşük";
}

function getSegmentClass(segment) {
  const value = (segment || "").toLowerCase();

  if (value.includes("şampiyon") || value.includes("sampiyon")) return "champion";
  if (value.includes("sadık") || value.includes("sadik")) return "loyal";
  if (value.includes("risk")) return "risk";
  if (value.includes("kayıp") || value.includes("kayip")) return "lost";

  return "lost";
}

function getRiskClass(risk) {
  if (risk === "Yüksek") return "risk-high";
  if (risk === "Orta") return "risk-mid";
  return "risk-low";
}

function getCurrentFilters() {
  return {
    search: searchInput.value.trim(),
    segment: segmentFilter.value || "all",
    city: cityFilter.value || "all",
    risk: riskFilter.value || "all",
    min_ltv: Number(minLtvFilter?.value || 0),
    max_ltv: Number(maxLtvFilter?.value || 0),
    min_spending: Number(minSpendingFilter?.value || 0),
    max_spending: Number(maxSpendingFilter?.value || 0),
    start_date: startDateFilter?.value || "",
    end_date: endDateFilter?.value || ""
  };
}

function buildCustomerQuery(page = 1, limit = pageLimit) {
  const filters = getCurrentFilters();
  const params = new URLSearchParams();

  params.append("page", page);
  params.append("limit", limit);

  if (filters.search) params.append("search", filters.search);
  if (filters.segment !== "all") params.append("segment", filters.segment);
  if (filters.city !== "all") params.append("city", filters.city);
  if (filters.risk !== "all") params.append("risk", filters.risk);

  if (filters.min_ltv > 0) params.append("min_ltv", filters.min_ltv);
  if (filters.max_ltv > 0) params.append("max_ltv", filters.max_ltv);
  if (filters.min_spending > 0) params.append("min_spending", filters.min_spending);
  if (filters.max_spending > 0) params.append("max_spending", filters.max_spending);

  if (filters.start_date) params.append("start_date", filters.start_date);
  if (filters.end_date) params.append("end_date", filters.end_date);

  return params.toString();
}

async function loadFilterOptions() {
  try {
    const data = await apiRequest("/customers/filter-options");

    segmentFilter.innerHTML = `<option value="all">Tümü</option>`;
    cityFilter.innerHTML = `<option value="all">Tümü</option>`;

    (data.segments || []).forEach(segment => {
      segmentFilter.innerHTML += `<option value="${segment}">${segment}</option>`;
    });

    (data.cities || []).forEach(city => {
      cityFilter.innerHTML += `<option value="${city}">${city}</option>`;
    });

  } catch (error) {
    console.error("Filtre seçenekleri yükleme hatası:", error);
  }
}

async function loadCustomers(page = 1) {
  try {
    currentPage = page;

    tableBody.innerHTML = `
      <tr>
        <td colspan="11">Müşteriler yükleniyor...</td>
      </tr>
    `;

    if (selectAll) {
      selectAll.checked = false;
    }

    const query = buildCustomerQuery(currentPage, pageLimit);
    const data = await apiRequest(`/customers/?${query}`);

    if (!data) return;

    totalPages = Number(data.toplam_sayfa || 1);
    totalCustomerCount = Number(data.kayit_sayisi || 0);

    customers = (data.veriler || []).map(customer => {
      const fullName = `${customer.adi || ""} ${customer.soyadi || ""}`.trim();

      return {
        id: customer.musteri_id,
        name: fullName || "-",
        phone: customer.gsm || "-",
        email: customer.mail || "-",
        city: customer.sehir || "-",
        segment: customer.segment || "-",
        rfm: customer.rfm_skor || 0,
        ltv: Number(customer.ltv || 0),
        churnValue: Number(customer.churn || 0),
        churn: getRiskLevel(customer.churn),
        spending: Number(customer.toplam_harcama || 0),
        lastOrder: customer.son_siparis || "-"
      };
    });

    filteredCustomers = [...customers];

    updateSummaryCards(data.ozet);
    renderTable(filteredCustomers);
    renderPagination();

  } catch (error) {
    console.error("Müşteri verisi çekme hatası:", error);

    tableBody.innerHTML = `
      <tr>
        <td colspan="11">Müşteri verisi yüklenirken hata oluştu.</td>
      </tr>
    `;
  }
}

function updateSummaryCards(summary) {
  if (!summary) {
    totalCustomerCard.textContent = "0";
    highRiskCard.textContent = "0";
    avgLtvCard.textContent = "₺0";
    championCard.textContent = "0";
    return;
  }

  totalCustomerCard.textContent = formatNumber(summary.toplam_musteri || 0);
  highRiskCard.textContent = formatNumber(summary.yuksek_riskli || 0);
  avgLtvCard.textContent = formatMoney(summary.ortalama_ltv || 0);
  championCard.textContent = formatNumber(summary.sampiyon_musteri || 0);
}

function renderTable(data) {
  tableBody.innerHTML = "";

  if (!data.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="11">Kayıt bulunamadı.</td>
      </tr>
    `;

    customerCount.textContent = "0 kayıt listeleniyor";
    selectedInfo.textContent = "0 müşteri seçildi";
    return;
  }

  data.forEach(customer => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>
        <input type="checkbox" class="row-check" data-id="${customer.id}" />
      </td>

      <td>
        <div class="customer-name">
          <div class="customer-avatar">${getInitials(customer.name)}</div>
          <strong>${customer.name}</strong>
        </div>
      </td>

      <td>
        <div class="contact-info">
          <span>${customer.phone}</span>
          <small>${customer.email}</small>
        </div>
      </td>

      <td>${customer.city}</td>

      <td>
        <span class="badge ${getSegmentClass(customer.segment)}">
          ${customer.segment}
        </span>
      </td>

      <td><strong>${customer.rfm}</strong></td>

      <td>${formatMoney(customer.ltv)}</td>

      <td>
        <span class="${getRiskClass(customer.churn)}">
          ${customer.churn} (%${customer.churnValue.toFixed(1)})
        </span>
      </td>

      <td>${formatMoney(customer.spending)}</td>

      <td>${customer.lastOrder}</td>

      <td>
        <button class="detail-btn" data-id="${customer.id}">Detay</button>
      </td>
    `;

    tableBody.appendChild(tr);
  });

  customerCount.textContent = `${totalCustomerCount} kayıt içinden bu sayfada ${data.length} kayıt listeleniyor`;
  updateSelectedCount();
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
        loadCustomers(page);
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

function applyFilters() {
  loadCustomers(1);
}

function updateSelectedCount() {
  const checkedRows = document.querySelectorAll(".row-check:checked");
  selectedInfo.textContent = `${checkedRows.length} müşteri seçildi`;
}

async function exportCustomers() {
  try {
    const query = buildCustomerQuery(1, 100000);
    const data = await apiRequest(`/customers/?${query}`);

    const exportList = (data.veriler || []).map(customer => {
      const fullName = `${customer.adi || ""} ${customer.soyadi || ""}`.trim();

      return {
        name: fullName || "-",
        phone: customer.gsm || "-",
        email: customer.mail || "-",
        city: customer.sehir || "-",
        segment: customer.segment || "-",
        rfm: customer.rfm_skor || 0,
        ltv: Number(customer.ltv || 0),
        churnValue: Number(customer.churn || 0),
        churn: getRiskLevel(customer.churn),
        spending: Number(customer.toplam_harcama || 0),
        lastOrder: customer.son_siparis || "-"
      };
    });

    if (!exportList.length) {
      alert("İndirilecek müşteri bulunamadı.");
      return;
    }

    let csvContent = "\uFEFFAd Soyad,Telefon,Mail,Şehir,Segment,RFM Skoru,LTV,Churn Riski,Churn Oranı,Toplam Harcama,Son Sipariş\n";

    exportList.forEach(customer => {
      csvContent += `"${customer.name}","${customer.phone}","${customer.email}","${customer.city}","${customer.segment}","${customer.rfm}","${customer.ltv}","${customer.churn}","${customer.churnValue}","${customer.spending}","${customer.lastOrder}"\n`;
    });

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "filtreli_musteriler.csv";
    link.click();

    URL.revokeObjectURL(url);

  } catch (error) {
    console.error("Müşteri export hatası:", error);
    alert("Müşteriler indirilirken hata oluştu.");
  }
}

searchInput.addEventListener("input", () => {
  clearTimeout(searchInput._timer);

  searchInput._timer = setTimeout(() => {
    applyFilters();
  }, 400);
});

segmentFilter.addEventListener("change", applyFilters);
cityFilter.addEventListener("change", applyFilters);
riskFilter.addEventListener("change", applyFilters);

[
  minLtvFilter,
  maxLtvFilter,
  minSpendingFilter,
  maxSpendingFilter,
  startDateFilter,
  endDateFilter
].forEach(input => {
  if (!input) return;

  input.addEventListener("input", () => {
    clearTimeout(input._timer);

    input._timer = setTimeout(() => {
      applyFilters();
    }, 500);
  });

  input.addEventListener("change", applyFilters);
});

tableBody.addEventListener("change", event => {
  if (event.target.classList.contains("row-check")) {
    updateSelectedCount();
  }
});

tableBody.addEventListener("click", event => {
  if (event.target.classList.contains("detail-btn")) {
    const id = event.target.dataset.id;
    window.open(`customer360.html?musteri_id=${id}`, "_blank", "noopener,noreferrer");
  }
});

selectAll.addEventListener("change", () => {
  const checks = document.querySelectorAll(".row-check");

  checks.forEach(check => {
    check.checked = selectAll.checked;
  });

  updateSelectedCount();
});

exportBtn.addEventListener("click", exportCustomers);

campaignBtn.addEventListener("click", () => {
  const selected = document.querySelectorAll(".row-check:checked");

  if (selected.length === 0) {
    alert("Lütfen kampanya göndermek için en az bir müşteri seç.");
    return;
  }

  alert(`${selected.length} müşteri için kampanya seçimi hazırlandı.`);
});

window.addEventListener("DOMContentLoaded", async () => {
  await loadFilterOptions();
  loadCustomers(1);
});