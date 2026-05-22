const segmentSearch = document.getElementById("segmentSearch");
const transitionFilter = document.getElementById("transitionFilter");
const yearFilter = document.getElementById("yearFilter");
const oldSegmentFilter = document.getElementById("oldSegmentFilter");
const newSegmentFilter = document.getElementById("newSegmentFilter");
const minRfmFilter = document.getElementById("minRfmFilter");
const maxRfmFilter = document.getElementById("maxRfmFilter");
const startDateFilter = document.getElementById("startDateFilter");
const endDateFilter = document.getElementById("endDateFilter");
const exportBtn = document.getElementById("exportBtn");

const totalHistory = document.getElementById("totalHistory");
const upCustomerCount = document.getElementById("upCustomerCount");
const downCustomerCount = document.getElementById("downCustomerCount");
const topTransition = document.getElementById("topTransition");
const topTransitionCount = document.getElementById("topTransitionCount");

const sankeyBox = document.getElementById("sankeyBox");
const upList = document.getElementById("upList");
const downList = document.getElementById("downList");
const historyTableBody = document.getElementById("historyTableBody");
const historyCountText = document.getElementById("historyCountText");
const yearCompareBox = document.getElementById("yearCompareBox");
const pagination = document.getElementById("pagination");

let rawSegmentRows = [];
let historyData = [];
let filteredHistory = [];

let currentPage = 1;
const pageLimit = 50;
let totalPages = 1;
let searchTimer = null;

const segmentRank = {
  "Kayıp": 1,
  "Kış Uykusunda": 2,
  "Uyumak Üzere": 3,
  "Risk Altında": 4,
  "Onları Kaybedemezsin": 5,
  "Dikkat Gerekiyor": 6,
  "Umut Verici": 7,
  "Yeni Müşteri": 8,
  "Potansiyel Sadık": 9,
  "Sadık Müşteri": 10,
  "Şampiyon": 11
};

function normalizeSegmentName(value) {
  return value || "-";
}

function getRank(segment) {
  return segmentRank[segment] || 0;
}

function getTransitionType(oldSegment, newSegment) {
  const oldRank = getRank(oldSegment);
  const newRank = getRank(newSegment);

  if (oldSegment === newSegment) return "Sabit";
  if (newRank > oldRank) return "Yükseldi";
  if (newRank < oldRank) return "Düştü";

  return "Sabit";
}

function getBadgeClass(type) {
  if (type === "Yükseldi") return "up";
  if (type === "Düştü") return "down";
  return "same";
}

function transitionKey(item) {
  return `${item.oldSegment} → ${item.newSegment}`;
}

function countTransitions(data) {
  return data.reduce((acc, item) => {
    const key = transitionKey(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("tr-TR");
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("tr-TR");
}

function getCurrentFilters() {
  return {
    search: segmentSearch?.value.trim() || "",
    year: yearFilter?.value || "all",
    transition: transitionFilter?.value || "all",
    old_segment: oldSegmentFilter?.value || "all",
    new_segment: newSegmentFilter?.value || "all",
    min_rfm: Number(minRfmFilter?.value || 0),
    max_rfm: Number(maxRfmFilter?.value || 0),
    start_date: startDateFilter?.value || "",
    end_date: endDateFilter?.value || ""
  };
}

function buildSegmentHistoryQuery() {
  const filters = getCurrentFilters();
  const params = new URLSearchParams();

  if (filters.search) params.append("search", filters.search);
  if (filters.year !== "all") params.append("year", filters.year);
  if (filters.transition !== "all") params.append("transition", filters.transition);
  if (filters.old_segment !== "all") params.append("old_segment", filters.old_segment);
  if (filters.new_segment !== "all") params.append("new_segment", filters.new_segment);
  if (filters.min_rfm > 0) params.append("min_rfm", filters.min_rfm);
  if (filters.max_rfm > 0) params.append("max_rfm", filters.max_rfm);
  if (filters.start_date) params.append("start_date", filters.start_date);
  if (filters.end_date) params.append("end_date", filters.end_date);

  const query = params.toString();
  return query ? `?${query}` : "";
}

async function loadSegmentHistory() {
  try {
    const raw = await apiRequest("/analytics/segment-history/");

    if (!raw) return;

    const rows = Array.isArray(raw) ? raw : raw.veriler || [];

    rawSegmentRows = rows;
    historyData = buildTransitionRows(rows);
    filteredHistory = [...historyData];

    fillSegmentFilters();
    currentPage = 1;
    renderAll(filteredHistory);

  } catch (error) {
    console.error("Segment geçmişi yüklenemedi:", error);

    if (historyTableBody) {
      historyTableBody.innerHTML = `
        <tr>
          <td colspan="8">Segment geçmişi yüklenirken hata oluştu.</td>
        </tr>
      `;
    }
  }
}

function buildTransitionRows(rows) {
  const grouped = {};

  rows.forEach(row => {
    const musteriId = row.musteri_id;

    if (!grouped[musteriId]) grouped[musteriId] = [];

    grouped[musteriId].push({
      id: row.gecmis_id,
      musteri_id: row.musteri_id,
      customer: row.musteri_ad_soyad || row.musteri || "-",
      year: Number(row.yil),
      segment: normalizeSegmentName(row.segment_adi || row.segment),
      rfm: row.toplam_rfm_skoru || 0,
      date: row.hesaplama_tarihi || null
    });
  });

  const transitions = [];

  Object.values(grouped).forEach(customerRows => {
    const sorted = customerRows.sort((a, b) => a.year - b.year);

    for (let i = 1; i < sorted.length; i++) {
      const previous = sorted[i - 1];
      const current = sorted[i];

      const oldSegment = previous.segment;
      const newSegment = current.segment;
      const type = getTransitionType(oldSegment, newSegment);

      transitions.push({
        id: current.id,
        customer: current.customer,
        oldSegment,
        newSegment,
        type,
        year: current.year,
        rfm: current.rfm,
        date: current.date ? formatDate(current.date) : `${current.year}`,
        rawDate: current.date,
        desc:
          type === "Sabit"
            ? `${previous.year} yılından ${current.year} yılına segmenti sabit kaldı.`
            : `${previous.year} yılından ${current.year} yılına segment değişimi.`
      });
    }
  });

  return transitions;
}

function fillSegmentFilters() {
  if (!oldSegmentFilter || !newSegmentFilter) return;

  const oldValue = oldSegmentFilter.value || "all";
  const newValue = newSegmentFilter.value || "all";

  const segments = Array.from(
    new Set(
      rawSegmentRows
        .map(row => row.segment_adi || row.segment)
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "tr"));

  oldSegmentFilter.innerHTML = `<option value="all">Tümü</option>`;
  newSegmentFilter.innerHTML = `<option value="all">Tümü</option>`;

  segments.forEach(segment => {
    oldSegmentFilter.innerHTML += `<option value="${segment}">${segment}</option>`;
    newSegmentFilter.innerHTML += `<option value="${segment}">${segment}</option>`;
  });

  oldSegmentFilter.value = segments.includes(oldValue) ? oldValue : "all";
  newSegmentFilter.value = segments.includes(newValue) ? newValue : "all";
}

function renderKpis(data) {
  const up = data.filter(item => item.type === "Yükseldi").length;
  const down = data.filter(item => item.type === "Düştü").length;

  const transitionCounts = countTransitions(data);
  const top = Object.entries(transitionCounts).sort((a, b) => b[1] - a[1])[0];

  if (totalHistory) totalHistory.textContent = formatNumber(data.length);
  if (upCustomerCount) upCustomerCount.textContent = formatNumber(up);
  if (downCustomerCount) downCustomerCount.textContent = formatNumber(down);
  if (topTransition) topTransition.textContent = top ? top[0] : "-";

  if (topTransitionCount) {
    topTransitionCount.textContent = top
      ? `${formatNumber(top[1])} müşteri`
      : "0 müşteri";
  }
}

function renderSankey(data) {
  if (!sankeyBox) return;

  sankeyBox.innerHTML = "";

  const transitionCounts = countTransitions(data);

  const entries = Object.entries(transitionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (!entries.length) {
    sankeyBox.innerHTML = `<p>Segment geçiş verisi bulunamadı.</p>`;
    return;
  }

  const max = Math.max(...entries.map(item => item[1]), 1);

  entries.forEach(([key, count]) => {
    const [oldSegment, newSegment] = key.split(" → ");
    const width = Math.max(Math.round((count / max) * 100), 6);
    const isSame = oldSegment === newSegment;

    sankeyBox.innerHTML += `
      <div class="sankey-row ${isSame ? "same-transition" : ""}">
        <div class="sankey-node">${oldSegment}</div>
        <div class="sankey-line">
          <b style="--w:${width}%"></b>
        </div>
        <div class="sankey-node">${newSegment}</div>
        <strong>${formatNumber(count)}</strong>
      </div>
    `;
  });
}

function renderUpDownLists(data) {
  if (!upList || !downList) return;

  const upCustomers = data.filter(item => item.type === "Yükseldi");
  const downCustomers = data.filter(item => item.type === "Düştü");

  upList.innerHTML = "";
  downList.innerHTML = "";

  if (upCustomers.length === 0) {
    upList.innerHTML = `
      <div class="insight-item up">
        <i class="fa-solid fa-circle-check"></i>
        <div>
          <h4>Yükselen müşteri yok</h4>
          <p>Seçilen filtrede olumlu segment geçişi bulunmuyor.</p>
        </div>
      </div>
    `;
  }

  if (downCustomers.length === 0) {
    downList.innerHTML = `
      <div class="insight-item">
        <i class="fa-solid fa-circle-check"></i>
        <div>
          <h4>Düşen müşteri yok</h4>
          <p>Seçilen filtrede riskli segment düşüşü bulunmuyor.</p>
        </div>
      </div>
    `;
  }

  upCustomers.slice(0, 5).forEach(item => {
    upList.innerHTML += `
      <div class="insight-item up">
        <i class="fa-solid fa-arrow-trend-up"></i>
        <div>
          <h4>${item.customer}</h4>
          <p>${item.oldSegment} → ${item.newSegment}</p>
        </div>
        <span class="badge up">Yükseldi</span>
      </div>
    `;
  });

  downCustomers.slice(0, 5).forEach(item => {
    downList.innerHTML += `
      <div class="insight-item">
        <i class="fa-solid fa-arrow-trend-down"></i>
        <div>
          <h4>${item.customer}</h4>
          <p>${item.oldSegment} → ${item.newSegment}</p>
        </div>
        <span class="badge down">Düştü</span>
      </div>
    `;
  });
}

function renderYearCompare() {
  if (!yearCompareBox) return;

  const yearMap = {};

  rawSegmentRows.forEach(row => {
    const year = Number(row.yil);
    const segment = row.segment_adi || row.segment || "-";

    if (!yearMap[year]) yearMap[year] = {};

    yearMap[year][segment] = (yearMap[year][segment] || 0) + 1;
  });

  const years = Object.keys(yearMap).sort();

  yearCompareBox.innerHTML = "";

  if (!years.length) {
    yearCompareBox.innerHTML = `<p>Yıllık segment dağılımı için veri bulunamadı.</p>`;
    return;
  }

  years.forEach(year => {
    const segmentEntries = Object.entries(yearMap[year])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const max = Math.max(...segmentEntries.map(item => item[1]), 1);

    let html = `
      <div class="year-compare-card">
        <h4>${year}</h4>
    `;

    segmentEntries.forEach(([segment, count]) => {
      const width = Math.max(Math.round((count / max) * 100), 6);

      html += `
        <div class="year-segment-row">
          <span>${segment}</span>
          <div><b style="--w:${width}%"></b></div>
          <strong>${formatNumber(count)}</strong>
        </div>
      `;
    });

    html += `</div>`;
    yearCompareBox.innerHTML += html;
  });
}

function renderTable(data) {
  if (!historyTableBody || !historyCountText) return;

  historyTableBody.innerHTML = "";

  if (!data.length) {
    historyTableBody.innerHTML = `
      <tr>
        <td colspan="8">Kayıt bulunamadı.</td>
      </tr>
    `;
    historyCountText.textContent = "0 kayıt listeleniyor";
    return;
  }

  const start = (currentPage - 1) * pageLimit;
  const end = start + pageLimit;
  const visibleData = data.slice(start, end);

  visibleData.forEach(item => {
    historyTableBody.innerHTML += `
      <tr>
        <td><strong>${item.customer}</strong></td>
        <td>${item.oldSegment}</td>
        <td>${item.newSegment}</td>
        <td><span class="badge ${getBadgeClass(item.type)}">${item.type}</span></td>
        <td>${item.year}</td>
        <td>${item.rfm}</td>
        <td>${item.date}</td>
        <td>${item.desc}</td>
      </tr>
    `;
  });

  historyCountText.textContent =
    `${formatNumber(data.length)} kayıt içinden bu sayfada ${formatNumber(visibleData.length)} kayıt listeleniyor`;
}

function renderPagination() {
  if (!pagination) return;

  pagination.innerHTML = "";

  totalPages = Math.ceil(filteredHistory.length / pageLimit);

  if (totalPages <= 1) return;

  function createPageButton(text, page, isActive = false, isDisabled = false) {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.className = isActive ? "page-btn active" : "page-btn";
    btn.disabled = isDisabled;

    if (!isDisabled && page) {
      btn.addEventListener("click", () => {
        currentPage = page;
        renderAll(filteredHistory);
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

function renderAll(data) {
  renderKpis(data);
  renderSankey(data);
  renderUpDownLists(data);
  renderYearCompare();
  renderTable(data);
  renderPagination();
}

function applyFilters() {
  currentPage = 1;

  const searchValue = segmentSearch
    ? segmentSearch.value.toLocaleLowerCase("tr-TR").trim()
    : "";

  const transitionValue = transitionFilter ? transitionFilter.value : "all";
  const yearValue = yearFilter ? yearFilter.value : "all";
  const oldSegmentValue = oldSegmentFilter ? oldSegmentFilter.value : "all";
  const newSegmentValue = newSegmentFilter ? newSegmentFilter.value : "all";
  const minRfmValue = Number(minRfmFilter?.value || 0);
  const maxRfmValue = Number(maxRfmFilter?.value || 0);
  const startDateValue = startDateFilter?.value || "";
  const endDateValue = endDateFilter?.value || "";

  filteredHistory = historyData.filter(item => {
    const customer = item.customer.toLocaleLowerCase("tr-TR");
    const oldSegment = item.oldSegment.toLocaleLowerCase("tr-TR");
    const newSegment = item.newSegment.toLocaleLowerCase("tr-TR");

    const searchMatch =
      customer.includes(searchValue) ||
      oldSegment.includes(searchValue) ||
      newSegment.includes(searchValue);

    const transitionMatch =
      transitionValue === "all" || item.type === transitionValue;

    const yearMatch =
      yearValue === "all" || String(item.year) === yearValue;

    const oldSegmentMatch =
      oldSegmentValue === "all" || item.oldSegment === oldSegmentValue;

    const newSegmentMatch =
      newSegmentValue === "all" || item.newSegment === newSegmentValue;

    const minRfmMatch =
      minRfmValue === 0 || Number(item.rfm || 0) >= minRfmValue;

    const maxRfmMatch =
      maxRfmValue === 0 || Number(item.rfm || 0) <= maxRfmValue;

    const itemDate = item.rawDate ? String(item.rawDate).slice(0, 10) : "";

    const startDateMatch =
      !startDateValue || itemDate >= startDateValue;

    const endDateMatch =
      !endDateValue || itemDate <= endDateValue;

    return (
      searchMatch &&
      transitionMatch &&
      yearMatch &&
      oldSegmentMatch &&
      newSegmentMatch &&
      minRfmMatch &&
      maxRfmMatch &&
      startDateMatch &&
      endDateMatch
    );
  });

  renderAll(filteredHistory);
}

function exportSegmentHistory() {
  let csv = "\uFEFFMüşteri,Önceki Segment,Yeni Segment,Geçiş Türü,Yıl,RFM,Tarih,Açıklama\n";

  filteredHistory.forEach(item => {
    csv += `"${item.customer}","${item.oldSegment}","${item.newSegment}","${item.type}","${item.year}","${item.rfm}","${item.date}","${item.desc}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "segment_gecmisi.csv";
  link.click();

  URL.revokeObjectURL(url);
}

function setupEvents() {
  if (segmentSearch) {
    segmentSearch.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(applyFilters, 350);
    });
  }

  [
    transitionFilter,
    yearFilter,
    oldSegmentFilter,
    newSegmentFilter,
    startDateFilter,
    endDateFilter
  ].forEach(select => {
    if (!select) return;
    select.addEventListener("change", applyFilters);
  });

  [
    minRfmFilter,
    maxRfmFilter
  ].forEach(input => {
    if (!input) return;

    input.addEventListener("input", () => {
      clearTimeout(input._timer);
      input._timer = setTimeout(applyFilters, 500);
    });
  });

  if (exportBtn) {
    exportBtn.addEventListener("click", exportSegmentHistory);
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  setupEvents();
  await loadSegmentHistory();
});