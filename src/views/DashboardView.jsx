import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildCriticalStock,
  createSupplierDraft,
  fetchCargoDelays,
  fetchDashboard,
  fetchForecast,
  fetchMorningReport,
} from "../api/kobiApi.js";
import {
  Card,
  EmptyState,
  ErrorBanner,
  RiskBadge,
  RiskMeter,
  SectionHead,
  SeverityDot,
  Sparkline,
  StockBar,
  cx,
} from "../components/ui.jsx";

const FORECAST_LOADING_MESSAGES = [
  "Satış trendleri analiz ediliyor...",
  "Talep tahmini oluşturuluyor...",
  "Stok tükenme riski hesaplanıyor...",
  "Operasyonel risk skorları hazırlanıyor...",
];

const INSIGHT_LOADING_MESSAGES = [
  "3 aylık satış geçmişi analiz ediliyor...",
  "Stok riskleri değerlendiriliyor...",
  "Talep anomalileri tespit ediliyor...",
  "Operasyonel öneriler oluşturuluyor...",
];

export default function DashboardView() {
  const [metrics, setMetrics] = useState(null);
  const [stock, setStock] = useState([]);
  const [cargo, setCargo] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [insight, setInsight] = useState(null);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [forecastLoading, setForecastLoading] = useState(true);
  const [forecastError, setForecastError] = useState("");
  const [aiLoadingStep, setAiLoadingStep] = useState(0);
  const [coreLoading, setCoreLoading] = useState(true);
  const [error, setError] = useState("");
  const [supplierDraftLoading, setSupplierDraftLoading] = useState(null);
  const [draftState, setDraftState] = useState({ item: null, draft: null, error: "" });
  const coreLoadStartedRef = useRef(false);
  const coreLoadedRef = useRef(false);
  const forecastLoadStartedRef = useRef(false);
  const forecastLoadedRef = useRef(false);
  const forecastRiskProductsRef = useRef([]);
  const criticalProductsRef = useRef([]);

  const loadForecast = useCallback(async () => {
    if (forecastLoadStartedRef.current || forecastLoadedRef.current) return;

    forecastLoadStartedRef.current = true;
    setForecastLoading(!forecastLoadedRef.current);
    setForecastError("");

    try {
      const forecastData = await fetchForecast();
      forecastLoadedRef.current = true;
      forecastRiskProductsRef.current = forecastData.riskProducts;
      setMetrics((current) => ({
        ...current,
        avgRiskScore: forecastData.metrics.avgRiskScore,
      }));
      setForecast(forecastData.products);
      setInsight(buildExecutiveInsight(forecastData));
      if (criticalProductsRef.current.length) {
        setStock(buildCriticalStock(criticalProductsRef.current, forecastData.riskProducts));
      }
    } catch (loadError) {
      forecastLoadStartedRef.current = false;
      setForecastError(`Yapay zeka katmanı yüklenemedi: ${loadError.message}`);
    } finally {
      setForecastLoading(false);
    }
  }, []);

  const loadCoreDashboard = useCallback(async ({ force = false } = {}) => {
    if (coreLoadStartedRef.current && !force) return;

    coreLoadStartedRef.current = true;
    setCoreLoading(!coreLoadedRef.current);
    setError("");

    try {
      const [dashboardData, cargoData] = await Promise.all([fetchDashboard(), fetchCargoDelays()]);
      criticalProductsRef.current = dashboardData.criticalProducts;
      setMetrics((current) => ({
        ...current,
        ...dashboardData.metrics,
        activeAlerts: dashboardData.metrics.activeAlerts ?? dashboardData.alerts.length,
        dashboardAlertCount: dashboardData.alerts.length,
        cargoIssueCount: cargoData.length,
        avgRiskScore: current?.avgRiskScore ?? null,
      }));
      setCargo(cargoData);
      setStock(buildCriticalStock(dashboardData.criticalProducts, forecastRiskProductsRef.current));
      coreLoadedRef.current = true;
      setCoreLoading(false);
    } catch (loadError) {
      setError(`Sistem verileri alınamadı: ${loadError.message}`);
      setCoreLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoreDashboard();
    loadForecast();
  }, [loadCoreDashboard, loadForecast]);

  useEffect(() => {
    if (!forecastLoading) return undefined;

    const timer = window.setInterval(() => {
      setAiLoadingStep((current) => current + 1);
    }, 2400);

    return () => window.clearInterval(timer);
  }, [forecastLoading]);

  async function generateReport() {
    setReportLoading(true);
    setReportError("");

    try {
      const nextReport = await fetchMorningReport();
      setReport(nextReport);
    } catch (generateError) {
      setReportError(generateError.message);
    } finally {
      setReportLoading(false);
    }
  }

  async function generateSupplierDraft(item) {
    setSupplierDraftLoading(item.sku);
    setDraftState({ item, draft: null, error: "" });

    try {
      const draft = await createSupplierDraft(item.sku);
      setDraftState({ item, draft, error: "" });
    } catch (draftError) {
      setDraftState({ item, draft: null, error: draftError.message });
    } finally {
      setSupplierDraftLoading(null);
    }
  }

  const today = useMemo(
    () => new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" }),
    [],
  );
  const hasForecast = forecast.length > 0;
  const showForecastSkeleton = !hasForecast && forecastLoading;
  const activeForecastMessage = FORECAST_LOADING_MESSAGES[aiLoadingStep % FORECAST_LOADING_MESSAGES.length];
  const activeInsightMessage = INSIGHT_LOADING_MESSAGES[aiLoadingStep % INSIGHT_LOADING_MESSAGES.length];

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-10">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-ink-500 mb-1.5">Operasyon Paneli</div>
          <h1 className="text-[28px] font-medium tracking-tight text-ink-900">Operasyonel İçgörü Merkezi</h1>
          <p className="text-[13.5px] text-ink-500 mt-1">Stok, kargo ve talep tahmini sinyalleri tek bir operasyonel görünümde.</p>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-mono uppercase tracking-wider text-ink-500">bugün</div>
          <div className="text-[13.5px] text-ink-900 font-medium capitalize">{today}</div>
        </div>
      </div>

      <ErrorBanner message={error} onRetry={() => loadCoreDashboard({ force: true })} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Toplam Sipariş" value={metrics?.totalOrders} delta="+8.4%" deltaPositive hint="son 7 güne göre" loading={coreLoading} />
        <MetricCard label="Kritik Stok Ürünü" value={metrics?.criticalStockCount} accent="warn" hint="yeniden sipariş eşiğinin altında" loading={coreLoading} />
        <MetricCard
          label="Aktif Uyarı"
          value={metrics?.activeAlerts}
          accent="danger"
          hint={`${metrics?.cargoIssueCount ?? cargo.length} kargo olayı · ${metrics?.dashboardAlertCount ?? 0} panel uyarısı`}
          loading={coreLoading}
        />
        <MetricCard
          label="Ortalama Risk Skoru"
          value={metrics?.avgRiskScore == null ? null : Math.round(metrics.avgRiskScore)}
          suffix="/100"
          accent={metrics?.avgRiskScore >= 60 ? "warn" : "ok"}
          hint="ürün bazında ağırlıklı"
          loading={metrics?.avgRiskScore == null && forecastLoading}
        />
      </div>

      <section>
        <SectionHead
          eyebrow="Stok"
          title="Kritik Stok Ürünleri"
          subtitle="Yeniden sipariş eşiğinin altına düşen veya yaklaşan ürünler."
          right={<MutedMeta>{coreLoading ? "yükleniyor" : `${stock.length} ürün`}</MutedMeta>}
        />
        {coreLoading ? (
          <CardGridSkeleton count={3} />
        ) : stock.length ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stock.map((item) => (
              <StockCard
                key={item.sku}
                item={item}
                loading={supplierDraftLoading === item.sku}
                onDraft={() => generateSupplierDraft(item)}
              />
            ))}
          </div>
        ) : (
          <EmptyState>Kritik stok ürünü bulunmuyor.</EmptyState>
        )}
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          <SectionHead
            eyebrow="Kargo"
            title="Problemli Kargolar"
            subtitle="Operasyonel müdahale gerektiren aktif kargo kayıtları."
            right={<MutedMeta>{coreLoading ? "yükleniyor" : `${cargo.length} açık olay`}</MutedMeta>}
          />
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] font-mono uppercase tracking-wider text-ink-500 border-b border-ink-200">
                    <th className="px-4 py-2.5 font-normal">Sipariş</th>
                    <th className="px-4 py-2.5 font-normal">Durum</th>
                    <th className="px-4 py-2.5 font-normal w-32">Teslimat</th>
                    <th className="px-4 py-2.5 font-normal w-40">Problem</th>
                    <th className="px-4 py-2.5 font-normal w-10" />
                  </tr>
                </thead>
                <tbody>
                  {coreLoading ? <CargoSkeleton /> : cargo.map((item) => <CargoRow key={item.id} c={item} />)}
                  {!coreLoading && cargo.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-4 py-10 text-center text-ink-500">
                        Problemli kargo kaydı bulunmuyor.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        <section>
          <SectionHead
            eyebrow="İş Akışı"
            title="Sabah Operasyon Raporu"
            subtitle="Günü yapay zeka tarafından özetlenmiş bir operasyon raporu ile başlat."
          />
          <MorningReportCard report={report} loading={reportLoading} error={reportError} onGenerate={generateReport} />
        </section>
      </div>

      <section>
        <SectionHead
          eyebrow="Analitik"
          title="Yapay Zeka Talep Tahmini"
          subtitle="3 aylık satış geçmişine dayalı operasyonel içgörüler."
          right={
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-ink-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-4 bg-ink-900 rounded-sm" /> Geçmiş
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-4 bg-accent-500 rounded-sm" /> Tahmin
              </span>
            </div>
          }
        />
        <ErrorBanner message={forecastError} />
        {showForecastSkeleton ? (
          <ForecastLoadingGrid activeMessage={activeForecastMessage} activeIndex={aiLoadingStep % FORECAST_LOADING_MESSAGES.length} />
        ) : hasForecast ? (
          <div className="grid md:grid-cols-2 gap-5">
            {forecast.map((item) => (
              <ForecastCard key={item.sku} f={item} />
            ))}
          </div>
        ) : (
          <EmptyState>Talep tahmini verisi bulunmuyor.</EmptyState>
        )}
      </section>

      {insight && (
        <section>
          <InsightCard items={insight} />
        </section>
      )}
      {!insight && forecastLoading && (
        <section>
          <InsightSkeleton activeMessage={activeInsightMessage} activeIndex={aiLoadingStep % INSIGHT_LOADING_MESSAGES.length} />
        </section>
      )}

      <footer className="pt-2 pb-6 text-center text-[11px] font-mono uppercase tracking-wider text-ink-400">
        kobiOS · operasyon zekası · v0.1 demo
      </footer>

      <SupplierDraftPanel state={draftState} onClose={() => setDraftState({ item: null, draft: null, error: "" })} />
    </div>
  );
}

function MetricCard({ label, value, suffix, hint, delta, deltaPositive, accent, loading }) {
  const accentBar = {
    warn: "bg-amber-500",
    danger: "bg-red-500",
    ok: "bg-emerald-500",
  }[accent] || "bg-ink-900";

  return (
    <Card className="p-5 relative overflow-hidden group hover:border-ink-300 transition-colors">
      <div className={cx("absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full", accentBar)} />
      <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-ink-500 mb-3">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[34px] font-medium tracking-tight text-ink-900 leading-none tabular-nums">
          {loading ? <span className="inline-block h-8 w-16 rounded bg-ink-100 animate-pulse" /> : value == null ? <span className="text-ink-300">—</span> : value}
        </span>
        {suffix && <span className="text-ink-400 text-sm font-mono">{suffix}</span>}
        {delta && (
          <span className={cx("ml-auto text-[11px] font-mono px-1.5 py-0.5 rounded", deltaPositive ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50")}>
            {delta}
          </span>
        )}
      </div>
      {hint && <div className="text-[12px] text-ink-500 mt-2.5">{hint}</div>}
    </Card>
  );
}

function buildExecutiveInsight(forecastData) {
  const products = forecastData.products || [];
  const riskProducts = forecastData.riskProducts || products;
  const highDemandProducts = products.slice(0, 2).map((item) => compactProductName(item.name));
  const urgentRisks = riskProducts
    .filter((item) => typeof item.stockoutDays === "number" && item.stockoutDays <= 3)
    .map((item) => item.stockoutDays);
  const stockoutText = urgentRisks.length
    ? `${Math.min(...urgentRisks)}-${Math.max(...urgentRisks)} gün içinde tükenme riski var`
    : "Kritik ürünler için stok tükenme riski yakından izlenmeli";
  const coverageRatio = forecastData.metrics.stockCoverageRatio;

  return [
    highDemandProducts.length
      ? `${highDemandProducts.join(" ve ")} için yüksek talep bekleniyor`
      : "Öne çıkan ürünlerde talep artışı bekleniyor",
    stockoutText,
    "Acil yeniden sipariş aksiyonu öneriliyor",
    `Mevcut stok karşılama oranı: ${coverageRatio == null ? "—" : coverageRatio}`,
  ];
}

function compactProductName(name = "") {
  if (name.includes("Domates")) return "Domates";
  if (name.includes("İncir") || name.includes("Ä°ncir")) return "Kuru İncir";
  if (name.includes("Zeytinya")) return "Zeytinyağı";
  return name.replace(/\s+\d+\s*(KG|L)$/i, "").trim();
}

function StockCard({ item, loading, onDraft }) {
  return (
    <Card className="p-5 flex flex-col gap-4 hover:border-ink-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-ink-400 mb-1">{item.sku}</div>
          <h3 className="text-[15px] font-medium text-ink-900 leading-snug">{item.name}</h3>
        </div>
        <RiskBadge level={item.risk} />
      </div>
      <StockBar current={item.current} threshold={item.threshold} />
      <div className="flex items-end justify-between border-t border-ink-100 -mx-5 px-5 pt-3 gap-3">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-ink-500">Önerilen yeniden sipariş</div>
          <div className="text-[22px] font-medium tabular-nums text-ink-900 leading-tight">
            {item.reorder} <span className="text-[12px] text-ink-400 font-mono">adet</span>
          </div>
        </div>
        <button
          onClick={onDraft}
          disabled={loading}
          className="self-end min-h-9 px-3 py-2 rounded-md bg-ink-900 text-paper text-[12.5px] font-medium hover:bg-ink-800 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-wait text-left"
        >
          {loading ? "Hazırlanıyor" : "Tedarik Taslağı Oluştur"}
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </Card>
  );
}

function CargoRow({ c }) {
  const sevTone = c.severity === "critical" ? "text-red-700" : "text-amber-700";

  return (
    <tr className="border-b border-ink-100 last:border-0 hover:bg-paper-soft transition-colors">
      <td className="px-4 py-3.5 align-top">
        <div className="flex items-center gap-2.5">
          <SeverityDot severity={c.severity} />
          <div>
            <div className="font-mono text-ink-900">#{c.id}</div>
            <div className="text-[12px] text-ink-500">{c.customer}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 align-top text-ink-700 max-w-md">{c.status}</td>
      <td className="px-4 py-3.5 align-top">
        <div className="font-mono text-[12.5px] text-ink-900">{c.eta}</div>
      </td>
      <td className="px-4 py-3.5 align-top">
        <span className={cx("inline-flex items-center gap-1.5 text-[12px] font-medium", sevTone)}>
          <span className={cx("w-1 h-1 rounded-full", c.severity === "critical" ? "bg-red-500" : "bg-amber-500")} />
          {c.problem}
        </span>
      </td>
      <td className="px-4 py-3.5 align-top text-right">
        <span className="text-ink-400 text-[12px]">→</span>
      </td>
    </tr>
  );
}

function ForecastCard({ f }) {
  const trendUp = f.trendPct >= 0;

  return (
    <Card className="p-5 hover:border-ink-300 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="text-[11px] font-mono uppercase tracking-wider text-ink-400 mb-1">{f.sku}</div>
          <h3 className="text-[16px] font-medium text-ink-900 leading-snug truncate">{f.name}</h3>
        </div>
        <span
          className={cx(
            "shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[12px] border",
            trendUp ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700",
          )}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" className={trendUp ? "" : "rotate-180"} aria-hidden="true">
            <path d="M2 8l4-4 4 4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {trendUp ? "+" : ""}
          {f.trendPct}%
        </span>
      </div>

      <div className="mb-4">
        <Sparkline series={f.series} height={56} />
        <div className="flex justify-between mt-1 text-[10.5px] font-mono uppercase tracking-wider text-ink-400">
          <span>12 hafta önce</span>
          <span>bu hafta</span>
          <span className="text-accent-700">+1 hafta tahmini</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat label="Beklenen talep" value={f.expectedDemand} suffix="adet" />
        <Stat
          label="Tükenme riski"
          value={f.stockoutDays ?? "—"}
          suffix={f.stockoutDays == null ? null : "gün"}
          danger={typeof f.stockoutDays === "number" && f.stockoutDays <= 3}
        />
        <Stat label="Sipariş önerisi" value={f.reorder} suffix="adet" />
      </div>

      <RiskMeter score={Math.round(f.riskScore || 0)} />
    </Card>
  );
}

function Stat({ label, value, suffix, danger }) {
  return (
    <div>
      <div className="text-[10.5px] font-mono uppercase tracking-wider text-ink-500 mb-0.5">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={cx("text-[20px] font-medium tabular-nums leading-none", danger ? "text-red-700" : "text-ink-900")}>{value}</span>
        {suffix && <span className="text-[11px] font-mono text-ink-400">{suffix}</span>}
      </div>
    </div>
  );
}

function ForecastLoadingGrid({ activeMessage, activeIndex }) {
  return (
    <div className="grid md:grid-cols-2 gap-5">
      {FORECAST_LOADING_MESSAGES.map((message, index) => (
        <ForecastLoadingCard
          key={message}
          message={message}
          active={index === activeIndex}
          activeMessage={activeMessage}
        />
      ))}
    </div>
  );
}

function ForecastLoadingCard({ message, active, activeMessage }) {
  return (
    <Card className={cx("p-5 hover:border-ink-300 transition-colors overflow-hidden", active && "border-ink-300")}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="text-[11px] font-mono uppercase tracking-wider text-ink-400 mb-1">AI ANALİZ</div>
          <h3 className="text-[16px] font-medium text-ink-900 leading-snug">{message}</h3>
        </div>
        <span
          className={cx(
            "shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[11px] border transition-colors",
            active ? "bg-accent-50 border-emerald-200 text-emerald-700" : "bg-ink-50 border-ink-200 text-ink-500",
          )}
        >
          <span className={cx("w-1.5 h-1.5 rounded-full", active ? "bg-accent-500 animate-pulse" : "bg-ink-300")} />
          işleniyor
        </span>
      </div>

      <div className="mb-4">
        <div className="h-14 rounded-lg border border-ink-100 bg-paper-soft overflow-hidden relative">
          <div className="absolute inset-x-4 top-1/2 h-px bg-ink-200" />
          <div className="absolute left-4 right-4 top-4 h-6">
            {[18, 31, 24, 42, 36, 54, 47, 65, 58, 72, 68, 83].map((height, index) => (
              <span
                key={index}
                className={cx(
                  "absolute bottom-0 w-1.5 rounded-full transition-all duration-700",
                  active ? "bg-ink-900/60 animate-pulse" : "bg-ink-200",
                )}
                style={{ left: `${index * 8.6}%`, height: `${height}%`, animationDelay: `${index * 90}ms` }}
              />
            ))}
          </div>
        </div>
        <div className="mt-2 text-[11px] font-mono text-ink-500 min-h-4">
          {active ? activeMessage : "Operasyon verisi sıraya alındı..."}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <LoadingStat label="Talep" active={active} />
        <LoadingStat label="Risk" active={active} />
        <LoadingStat label="Aksiyon" active={active} />
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-ink-500">Risk skoru</span>
          <span className="font-mono text-sm text-ink-400">hesaplanıyor</span>
        </div>
        <div className="h-1.5 w-full bg-ink-100 rounded-full overflow-hidden">
          <div
            className={cx("h-full rounded-full transition-all duration-700", active ? "bg-accent-500 animate-pulse" : "bg-ink-200")}
            style={{ width: active ? "68%" : "34%" }}
          />
        </div>
      </div>
    </Card>
  );
}

function LoadingStat({ label, active }) {
  return (
    <div>
      <div className="text-[10.5px] font-mono uppercase tracking-wider text-ink-500 mb-1">{label}</div>
      <div className={cx("h-6 rounded bg-ink-100", active && "animate-pulse")} />
    </div>
  );
}

function InsightCard({ items }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl text-paper p-7 shadow-[0_1px_0_rgba(15,15,12,0.02),0_18px_40px_-20px_rgba(15,15,12,0.35)]"
      style={{ background: "oklch(0.16 0.014 270)", border: "1px solid oklch(0.16 0.014 270)" }}
    >
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: "repeating-linear-gradient(135deg, #fff 0, #fff 1px, transparent 1px, transparent 8px)" }}
      />
      <div className="relative flex gap-5">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-paper/10 border border-paper/20 grid place-items-center">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 13L6 7L9.5 10.5L14 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="14" cy="3" r="1.4" fill="currentColor" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-paper/60">Yapay Zeka İçgörü</span>
            <span className="text-[11px] font-mono text-paper/40">·</span>
            <span className="text-[11px] font-mono text-paper/50">yönetici özeti</span>
          </div>
          <ul className="grid md:grid-cols-2 gap-x-8 gap-y-2 max-w-4xl">
            {items.map((item, index) => (
              <li key={index} className="flex gap-2.5 text-[15px] leading-relaxed text-paper/95">
                <span className="shrink-0 mt-2 w-1.5 h-1.5 rounded-full bg-accent-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function InsightSkeleton({ activeMessage, activeIndex }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl text-paper p-7 shadow-[0_1px_0_rgba(15,15,12,0.02),0_18px_40px_-20px_rgba(15,15,12,0.35)]"
      style={{ background: "oklch(0.16 0.014 270)", border: "1px solid oklch(0.16 0.014 270)" }}
    >
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: "repeating-linear-gradient(135deg, #fff 0, #fff 1px, transparent 1px, transparent 8px)" }}
      />
      <div className="relative flex gap-5">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-paper/10 border border-paper/20 grid place-items-center">
          <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-paper/60">AI Insight</span>
            <span className="text-[11px] font-mono text-paper/40">·</span>
            <span className="text-[11px] font-mono text-paper/50">analiz hazırlanıyor</span>
          </div>
          <div className="text-[15.5px] leading-relaxed text-paper/95 mb-4 min-h-6">{activeMessage}</div>
          <ul className="grid md:grid-cols-2 gap-x-8 gap-y-2 max-w-4xl">
            {INSIGHT_LOADING_MESSAGES.map((message, index) => (
              <li key={message} className="flex gap-2.5 text-[13px] leading-relaxed text-paper/75">
                <span
                  className={cx(
                    "shrink-0 mt-2 w-1.5 h-1.5 rounded-full",
                    index === activeIndex ? "bg-accent-500 animate-pulse" : "bg-paper/25",
                  )}
                />
                <span className={cx(index === activeIndex ? "text-paper/95" : "text-paper/60")}>{message}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function MorningReportCard({ report, loading, error, onGenerate }) {
  return (
    <Card className="p-5 flex flex-col gap-4 min-h-[340px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent-500" />
          <span className="text-[12px] font-mono uppercase tracking-wider text-ink-500">iş akışı · günlük</span>
        </div>
        {report && <span className="text-[11px] font-mono text-ink-400">oluşturuldu · {report.generatedAt}</span>}
      </div>

      {error && <ErrorBanner message={`Rapor alınamadı: ${error}`} />}

      {!report && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
          <div className="w-12 h-12 rounded-xl bg-ink-100 grid place-items-center mb-3">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5" className="text-ink-500" />
              <path d="M6 8h8M6 11h8M6 14h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-ink-500" />
            </svg>
          </div>
          <p className="text-[13.5px] text-ink-700 max-w-xs">
            Günün operasyonel önceliklerini, kritik kargo görevlerini ve stok uyarılarını tek bir brief'te topla.
          </p>
          <button
            onClick={onGenerate}
            className="mt-4 h-9 px-4 rounded-md bg-ink-900 text-paper text-[13px] font-medium hover:bg-ink-800 transition-colors inline-flex items-center gap-2"
          >
            Rapor Oluştur
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}

      {loading && (
        <div className="flex-1 flex flex-col gap-2 justify-center px-1">
          {[80, 95, 70, 88, 60].map((width, index) => (
            <div key={index} className="h-3 rounded bg-ink-100 animate-pulse" style={{ width: `${width}%` }} />
          ))}
        </div>
      )}

      {report && (
        <div className="space-y-4 overflow-y-auto pr-1 -mr-1">
          {report.sections.map((section, index) => (
            <div key={`${section.title}-${index}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono text-[11px] text-ink-400">{String(index + 1).padStart(2, "0")}</span>
                <h4 className="text-[13px] font-medium text-ink-900">{section.title}</h4>
              </div>
              <ul className="space-y-1.5">
                {section.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex gap-2 text-[12.5px] text-ink-700 leading-snug">
                    <span className="shrink-0 mt-1.5 w-1 h-1 rounded-full bg-ink-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <button onClick={onGenerate} className="text-[11.5px] font-mono uppercase tracking-wider text-ink-500 hover:text-ink-900 transition-colors">
            ↻ yeniden oluştur
          </button>
        </div>
      )}
    </Card>
  );
}

function SupplierDraftPanel({ state, onClose }) {
  if (!state.draft && !state.error) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/35 backdrop-blur-sm flex items-end sm:items-center justify-center px-4 py-6" role="dialog" aria-modal="true">
      <Card className="w-full max-w-2xl max-h-[82vh] overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-ink-200">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-ink-500">Tedarik Taslağı</div>
            <h3 className="text-[18px] font-medium text-ink-900 mt-1">{state.item?.name || state.draft?.product?.name || "Tedarik taslağı"}</h3>
          </div>
          <button onClick={onClose} className="rounded-md border border-ink-200 px-2 py-1 text-[12px] text-ink-500 hover:text-ink-900 hover:border-ink-300">
            Kapat
          </button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[65vh]">
          {state.error ? (
            <ErrorBanner message={`Tedarik taslağı oluşturulamadı: ${state.error}`} />
          ) : (
            <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-800 font-sans">{state.draft?.supplier_draft}</pre>
          )}
        </div>
      </Card>
    </div>
  );
}

function CardGridSkeleton({ count, columns = "grid md:grid-cols-2 lg:grid-cols-3 gap-4" }) {
  return (
    <div className={columns}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="p-5 space-y-4">
          <div className="h-4 w-24 bg-ink-100 rounded animate-pulse" />
          <div className="h-5 w-3/4 bg-ink-100 rounded animate-pulse" />
          <div className="h-12 w-full bg-ink-100 rounded animate-pulse" />
        </Card>
      ))}
    </div>
  );
}

function CargoSkeleton() {
  return Array.from({ length: 3 }).map((_, index) => (
    <tr key={index} className="border-b border-ink-100">
      <td className="px-4 py-3.5">
        <div className="h-8 w-28 bg-ink-100 rounded animate-pulse" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-4 w-full bg-ink-100 rounded animate-pulse" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-4 w-20 bg-ink-100 rounded animate-pulse" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-4 w-24 bg-ink-100 rounded animate-pulse" />
      </td>
      <td />
    </tr>
  ));
}

function MutedMeta({ children }) {
  return <span className="text-[11px] font-mono uppercase tracking-wider text-ink-500">{children}</span>;
}
