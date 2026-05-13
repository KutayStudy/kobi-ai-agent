const API_BASE = import.meta.env.VITE_KOBI_API_BASE || "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    ...options,
  });

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message = data?.detail || data?.error || `Sistem isteği başarısız oldu (${response.status})`;
    throw new Error(message);
  }

  return data;
}

export async function sendChatMessage(message) {
  const data = await request(`/chat?message=${encodeURIComponent(message)}`, { method: "POST" });

  return {
    text: data.answer || "Yanıt alınamadı.",
    meta: {
      intent: data.intent,
      orderId: data.data?.order_id,
    },
    trace: data.agent_trace,
    raw: data,
  };
}

export async function fetchOrders() {
  const orders = await request("/orders");
  return orders.map((order) => ({
    id: order.id,
    customer: order.customer_name,
    status: order.status,
    raw: order,
  }));
}

export async function fetchCargoDelays() {
  const delays = await request("/cargo/delays");
  return delays.map((delay) => ({
    id: delay.order_id,
    customer: delay.customer_name,
    status: delay.cargo_status,
    eta: delay.estimated_delivery,
    problem: delay.problem,
    severity: delay.problem === "Teslimat Sorunu" ? "critical" : "warning",
  }));
}

export async function fetchForecast() {
  const data = await request("/analytics/forecast");
  const topProducts = data.top_expected_products || [];
  const products = topProducts.map(mapForecastProduct);

  return {
    products,
    riskProducts: (data.risk_sorted_products || []).map(mapForecastProduct),
    metrics: {
      avgRiskScore: normalizeNumber(data.operational_metrics?.average_risk_score),
      stockCoverageRatio: normalizeNumber(data.operational_metrics?.stock_coverage_ratio),
      raw: data.operational_metrics || {},
    },
    aiInsight: data.ai_insight,
    raw: data,
  };
}

function mapForecastProduct(product) {
  return {
    sku: product.product_id,
    name: product.product,
    expectedDemand: product.expected_next_week_demand,
    trendPct: product.three_month_trend_percentage,
    stockoutDays: product.estimated_stockout_days,
    riskScore: product.risk_score,
    reorder: product.suggested_reorder_quantity,
    series: product.last_12_weeks_sales || [],
    raw: product,
  };
}

export async function fetchDashboard() {
  const data = await request("/dashboard");
  return {
    metrics: {
      totalOrders: normalizeNumber(data.total_orders),
      totalProducts: normalizeNumber(data.total_products),
      criticalStockCount: normalizeNumber(data.critical_stock_count),
      activeAlerts: normalizeNumber(data.active_alert_count ?? data.activeAlertCount ?? data.active_alerts),
    },
    criticalProducts: data.critical_products || [],
    alerts: data.alerts || [],
    aiSummary: data.ai_summary,
    raw: data,
  };
}

function normalizeNumber(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isNaN(number) ? value : number;
}

export async function fetchMorningReport() {
  const data = await request("/workflow/morning-report");
  return {
    title: data.title || "Sabah Operasyon Raporu",
    generatedAt: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
    sections: reportToSections(data.report),
    rawReport: data.report,
    workflowData: data.workflow_data,
  };
}

export async function createSupplierDraft(productId) {
  return request(`/supplier/draft/${encodeURIComponent(productId)}`, { method: "POST" });
}

export function buildCriticalStock(criticalProducts, riskProducts = []) {
  const riskByProductId = new Map(riskProducts.map((item) => [String(item.sku), item]));

  return criticalProducts.map((product) => {
    const forecast = riskByProductId.get(String(product.id));
    const fallbackReorder = Math.max(product.critical_stock * 2 - product.stock, product.critical_stock);

    return {
      sku: product.id,
      name: product.name,
      current: product.stock,
      threshold: product.critical_stock,
      risk: product.stock <= product.critical_stock ? "HIGH" : "LOW",
      reorder: forecast?.reorder ?? fallbackReorder,
    };
  });
}

function reportToSections(report) {
  if (!report) return [];

  const lines = String(report)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const sections = [];
  let current = { title: "Operasyon Özeti", items: [] };

  for (const line of lines) {
    const normalized = line.replace(/^[-*•]\s*/, "").trim();
    const isLikelyHeading =
      normalized.length <= 64 &&
      /[:：]$/.test(normalized) &&
      !normalized.includes(".") &&
      !normalized.includes("#");

    if (isLikelyHeading) {
      if (current.items.length) sections.push(current);
      current = { title: normalized.replace(/[:：]$/, ""), items: [] };
    } else {
      current.items.push(normalized);
    }
  }

  if (current.items.length) sections.push(current);
  return sections.length ? sections : [{ title: "Operasyon Özeti", items: [String(report)] }];
}
