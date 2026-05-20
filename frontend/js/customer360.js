if (!localStorage.getItem("token")) {
  window.location.href = "login.html";
}

let currentCustomerId = null;
let spendingChart = null;
let frequencyChart = null;
let brandChart = null;

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

function getPriorityClass(priority) {
  const value = String(priority || "").toLowerCase();

  if (value.includes("yüksek") || value.includes("yuksek")) return "high";
  if (value.includes("düşük") || value.includes("dusuk")) return "low";

  return "medium";
}

function getCustomerIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("musteri_id");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function getChartTheme() {
  const isLight = document.body.classList.contains("light-mode");

  return {
    mode: isLight ? "light" : "dark",
    textColor: isLight ? "#161616" : "#f8f8f8",
    mutedColor: isLight ? "#777b86" : "#9ca0aa",
    gridColor: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)",
    tooltipBg: isLight ? "#ffffff" : "#161a22"
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
        speed: 700
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

async function loadCustomer(customerId) {
  currentCustomerId = customerId;

  const detail = await apiRequest(`/customers/${customerId}`);
  const analytics = await apiRequest(`/customers/${customerId}/analytics`);

  if (!detail || !analytics) return;

  renderCustomer(detail, analytics);
  setupYearSelects();

  await loadSpendingTrend(2025);
  await loadOrderFrequency(2025);
  await loadBrandDistribution(2025);
  await loadSegmentHistoryYears();
  await loadCustomerAi(customerId);
}

function renderCustomer(detail, analytics) {
  const fullName = `${detail.adi || ""} ${detail.soyadi || ""}`.trim();
  const churn = Number(analytics.churn || 0);
  const riskLevel = getRiskLevel(churn);
  const totalSpending = Number(detail.toplam_harcama || 0);
  const orderCount = Number(detail.siparis_sayisi || 0);
  const aov = orderCount > 0 ? totalSpending / orderCount : 0;

  setText("customerAvatar", getInitials(fullName));
  setText("customerName", fullName || "-");

  const phoneEl = document.getElementById("customerPhone");
  if (phoneEl) {
    phoneEl.innerHTML = `<i class="fa-solid fa-phone"></i> ${detail.gsm || "-"}`;
  }

  const mailEl = document.getElementById("customerMail");
  if (mailEl) {
    mailEl.innerHTML = `<i class="fa-solid fa-envelope"></i> ${detail.mail || "-"}`;
  }

  const cityEl = document.getElementById("customerCity");
  if (cityEl) {
    cityEl.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${detail.sehir || "-"}`;
  }

  setText("customerSegmentBadge", analytics.segment || "-");
  setText("customerRiskBadge", `Churn Riski: ${riskLevel} (%${churn.toFixed(1)})`);

  setText("kpiSegment", analytics.segment || "-");
  setText("kpiRfm", analytics.rfm_skor || 0);
  setText("kpiLtv", formatMoney(analytics.ltv));
  setText("kpiChurn", riskLevel);
  setText("kpiSpending", formatMoney(totalSpending));
  setText("kpiAov", formatMoney(aov));
  setText("kpiOrders", formatNumber(orderCount));

  renderRiskCards(detail, analytics, riskLevel);
}

function renderRiskCards(detail, analytics, riskLevel) {
  const churn = Number(analytics.churn || 0);
  const ltv = Number(analytics.ltv || 0);

  if (riskLevel === "Yüksek") {
    setText("riskAlertTitle", "Bu müşteri yüksek risk altında");
    setText("riskAlertText", `Churn olasılığı %${churn.toFixed(1)}. Geri kazanım kampanyası önerilir.`);
  } else if (riskLevel === "Orta") {
    setText("riskAlertTitle", "Bu müşteri orta riskte");
    setText("riskAlertText", `Churn olasılığı %${churn.toFixed(1)}. Takip ve sadakat teklifi önerilir.`);
  } else {
    setText("riskAlertTitle", "Bu müşteri düşük riskte");
    setText("riskAlertText", `Churn olasılığı %${churn.toFixed(1)}. Mevcut bağlılık korunabilir.`);
  }

  setText("lastOrderAlertTitle", "Son sipariş bilgisi");
  setText("lastOrderAlertText", `Son sipariş tarihi: ${detail.son_siparis || "-"}`);

  if (ltv >= 10000 && churn >= 40) {
    setText("ltvAlertTitle", "LTV yüksek ama churn riski artıyor");
    setText("ltvAlertText", "Yüksek değerli müşteri için özel kampanya önerilir.");
    setText("actionTitle", "VIP Sadakat + Churn Önleme Kampanyası Önerilir");
    setText("actionText", "Bu müşteri yüksek LTV değerine sahip ve churn riski taşıyor. Özel indirim veya VIP kupon önerilebilir.");
  } else if (churn >= 70) {
    setText("ltvAlertTitle", "Risk öncelikli aksiyon gerekli");
    setText("ltvAlertText", "Müşteri kaybını önlemek için hızlı aksiyon önerilir.");
    setText("actionTitle", "Win-back Kampanyası Önerilir");
    setText("actionText", "Bu müşteri yüksek churn riskinde. Geri kazanım kampanyası veya özel kupon önerilir.");
  } else {
    setText("ltvAlertTitle", "Müşteri değeri stabil");
    setText("ltvAlertText", "Müşteri davranışı düzenli takip edilebilir.");
    setText("actionTitle", "Sadakat Kampanyası Önerilir");
    setText("actionText", "Bu müşteri için bağlılığı güçlendirecek özel teklif önerilebilir.");
  }
}

function setupYearSelects() {
  const years = [2023, 2024, 2025];

  fillYearSelect("spendingYearSelect", years, 2025);
  fillYearSelect("frequencyYearSelect", years, 2025);
  fillYearSelect("brandYearSelect", years, 2025);

  document.getElementById("spendingYearSelect")?.addEventListener("change", e => {
    loadSpendingTrend(Number(e.target.value));
  });

  document.getElementById("frequencyYearSelect")?.addEventListener("change", e => {
    loadOrderFrequency(Number(e.target.value));
  });

  document.getElementById("brandYearSelect")?.addEventListener("change", e => {
    loadBrandDistribution(Number(e.target.value));
  });
}

function fillYearSelect(id, years, defaultYear) {
  const select = document.getElementById(id);
  if (!select) return;

  select.innerHTML = "";

  years.forEach(year => {
    select.innerHTML += `<option value="${year}">${year}</option>`;
  });

  select.value = defaultYear;
}

async function loadSpendingTrend(year) {
  const data = await apiRequest(`/customers/${currentCustomerId}/spending-trend?year=${year}`);
  if (!data) return;

  const values = data.map(item => Number(item.toplam_harcama || 0));
  const months = data.map(item => item.ay);

  if (spendingChart) {
    spendingChart.destroy();
  }

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      type: "area",
      height: 260
    },
    series: [
      {
        name: "Harcama",
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
        formatter: value => formatMoney(value)
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
    tooltip: {
      theme: getChartTheme().mode,
      y: {
        formatter: value => formatMoney(value)
      }
    }
  };

  spendingChart = new ApexCharts(document.querySelector("#spendingChart"), options);
  spendingChart.render();
}

async function loadOrderFrequency(year) {
  const data = await apiRequest(`/customers/${currentCustomerId}/order-frequency?year=${year}`);
  if (!data) return;

  const values = data.map(item => Number(item.siparis_sayisi || 0));
  const months = data.map(item => item.ay);

  if (frequencyChart) {
    frequencyChart.destroy();
  }

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      type: "bar",
      height: 260
    },
    series: [
      {
        name: "Sipariş",
        data: values
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
        columnWidth: "48%"
      }
    },
    dataLabels: {
      enabled: false
    },
    tooltip: {
      theme: getChartTheme().mode,
      y: {
        formatter: value => `${value} sipariş`
      }
    }
  };

  frequencyChart = new ApexCharts(document.querySelector("#orderFrequencyChart"), options);
  frequencyChart.render();
}

async function loadBrandDistribution(year) {
  const data = await apiRequest(`/customers/${currentCustomerId}/brand-distribution?year=${year}`);
  if (!data) return;

  const labels = data.map(item => item.marka || "Bilinmeyen");
  const values = data.map(item => Number(item.adet || 0));

  if (brandChart) {
    brandChart.destroy();
  }

  const options = {
    ...getBaseChartOptions(),
    chart: {
      ...getBaseChartOptions().chart,
      type: "donut",
      height: 280
    },
    series: values,
    labels,
    colors: ["#ff2525", "#d9141c", "#8a8d95", "#333842", "#555965"],
    legend: {
      position: "bottom",
      labels: {
        colors: getChartTheme().textColor
      }
    },
    stroke: {
      colors: ["transparent"]
    },
    plotOptions: {
      pie: {
        donut: {
          size: "68%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Marka",
              formatter: () => labels.length
            }
          }
        }
      }
    },
    tooltip: {
      theme: getChartTheme().mode,
      y: {
        formatter: value => `${value} adet`
      }
    }
  };

  brandChart = new ApexCharts(document.querySelector("#brandChart"), options);
  brandChart.render();
}

async function loadSegmentHistoryYears() {
  const data = await apiRequest(`/customers/${currentCustomerId}/segment-history-years`);
  if (!data) return;

  const timeline = document.getElementById("segmentTimeline");
  if (!timeline) return;

  timeline.innerHTML = "";

  if (!data.length) {
    timeline.innerHTML = `<p>Segment geçmişi bulunamadı.</p>`;
    return;
  }

  data.forEach(item => {
    const segment =
      item.segment ||
      item.segment_adi ||
      item.segmentAdi ||
      item.durum ||
      "-";

    timeline.innerHTML += `
      <div class="timeline-item ${Number(item.yil) === 2025 ? "active" : ""}">
        <span></span>
        <div>
          <h4>${item.yil}</h4>
          <p>${segment}</p>
        </div>
      </div>
    `;
  });
}

async function loadCustomerAi(customerId) {
  const container = document.getElementById("customerAiActions");
  const sourceText = document.getElementById("customerAiSourceText");

  if (!container || !customerId) return;

  if (sourceText) {
    sourceText.textContent = "AI önerileri hazırlanıyor";
  }

  container.innerHTML = `
    <div class="ai-box">
      <div class="ai-icon">
        <i class="fa-solid fa-brain"></i>
      </div>

      <div>
        <h4>AI müşteri önerileri hazırlanıyor</h4>
        <p>Müşterinin LTV, churn, segment ve RFM verileri analiz ediliyor.</p>
      </div>

      <button>Analiz</button>
    </div>
  `;

  try {
    const data = await apiRequest(`/ai-actions/customer360/${customerId}`);

    if (!data || !Array.isArray(data.actions) || data.actions.length === 0) {
      throw new Error("AI önerisi alınamadı");
    }

    container.innerHTML = data.actions.map(action => {
      const icon = action.ikon || "fa-solid fa-lightbulb";
      const priority = action.oncelik || "Orta";
      const priorityClass = getPriorityClass(priority);

      return `
        <div class="ai-box ai-customer-card">
          <div class="ai-icon">
            <i class="${icon}"></i>
          </div>

          <div>
            <div class="ai-customer-title-row">
              <h4>${action.baslik || "AI Müşteri Önerisi"}</h4>
              <span class="ai-priority ${priorityClass}">
                ${priority}
              </span>
            </div>
            <p>${action.aciklama || "Bu müşteri için aksiyon önerisi oluşturuldu."}</p>
          </div>

          <button type="button">Uygula</button>
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
    console.error("Customer360 AI error:", error);

    container.innerHTML = `
      <div class="ai-box">
        <div class="ai-icon">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>

        <div>
          <h4>AI önerileri yüklenemedi</h4>
          <p>/ai-actions/customer360/${customerId} endpointini ve yetki kontrolünü kontrol et.</p>
        </div>

        <button>Hata</button>
      </div>
    `;

    if (sourceText) {
      sourceText.textContent = "AI önerileri yüklenemedi";
    }
  }
}

function setupCustomerSearch() {
  const input = document.getElementById("customerSearchInput");
  const resultsBox = document.getElementById("customerSearchResults");

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
      const data = await apiRequest(`/dashboard/search?q=${encodeURIComponent(query)}`);

      if (!data) return;

      resultsBox.innerHTML = "";
      resultsBox.style.display = "block";

      const customers = data.musteriler || [];

      if (!customers.length) {
        resultsBox.innerHTML = `<div class="search-item">Sonuç bulunamadı</div>`;
        return;
      }

      customers.forEach(customer => {
        resultsBox.innerHTML += `
          <div class="search-item" data-id="${customer.musteri_id}">
            <strong>${customer.ad_soyad}</strong>
            <span>Müşteri detayına git</span>
          </div>
        `;
      });

      resultsBox.querySelectorAll(".search-item[data-id]").forEach(item => {
        item.addEventListener("click", () => {
          const id = item.dataset.id;
          window.location.href = `customer360.html?musteri_id=${id}`;
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

window.addEventListener("DOMContentLoaded", async () => {
  setupCustomerSearch();

  const customerId = getCustomerIdFromUrl();

  if (!customerId) {
    alert("Müşteri seçmeden bu sayfaya erişemezsin.");
    window.location.href = "customers.html";
    return;
  }

  await loadCustomer(customerId);
});