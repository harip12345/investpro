import { NextResponse } from "next/server";
import { getStockIndices, STOCK_UNIVERSE } from "@/lib/indices";

export const dynamic = "force-dynamic";

const FUNDAMENTAL_TYPES = [
  "trailingMarketCap", "trailingPeRatio", "trailingPbRatio",
  "trailingEnterprisesValueEBITDARatio", "annualTotalRevenue",
  "annualOperatingRevenue", "annualNetIncomeContinuousOperations", "annualNetIncome",
  "annualNetIncomeCommonStockholders", "annualGrossProfit", "annualEBITDA",
  "annualEBIT", "annualOperatingIncome", "annualFreeCashFlow",
  "annualOperatingCashFlow", "annualCapitalExpenditure", "annualStockholdersEquity",
  "annualCommonStockEquity", "annualTotalEquityGrossMinorityInterest",
  "annualTotalDebt", "annualTotalAssets", "annualTotalLiabilitiesNetMinorityInterest",
  "annualDilutedEPS", "annualBasicEPS", "annualDilutedAverageShares",
  "annualBasicAverageShares", "annualCashCashEquivalentsAndShortTermInvestments",
  "quarterlyTotalRevenue", "quarterlyOperatingRevenue",
  "quarterlyNetIncomeContinuousOperations", "quarterlyNetIncome",
  "quarterlyNetIncomeCommonStockholders", "quarterlyGrossProfit",
  "quarterlyEBITDA", "quarterlyEBIT", "quarterlyOperatingIncome",
  "quarterlyFreeCashFlow", "quarterlyOperatingCashFlow",
  "quarterlyCapitalExpenditure", "quarterlyStockholdersEquity",
  "quarterlyCommonStockEquity", "quarterlyTotalEquityGrossMinorityInterest",
  "quarterlyTotalDebt", "quarterlyTotalAssets", "quarterlyDilutedEPS",
  "quarterlyBasicEPS"
].join(",");

type SeriesItem = {
  asOfDate: string;
  currencyCode?: string;
  reportedValue?: { raw?: number; fmt?: string };
};

type SeriesResult = {
  meta?: { type?: string[] };
  [key: string]: unknown;
};

function industryFor(sector: string) {
  const industries: Record<string, string> = {
    Energy: "Energi & Pertambangan",
    Financial: "Jasa Keuangan",
    "Basic Materials": "Material Dasar",
    "Consumer Defensive": "Konsumen Primer",
    "Consumer Cyclical": "Konsumen Non-Primer",
    Infrastructure: "Infrastruktur",
    Industrials: "Perindustrian",
    Technology: "Teknologi",
    Healthcare: "Kesehatan",
    Properties: "Properti"
  };
  return industries[sector] ?? sector;
}

async function fetchFundamentals(symbol: string) {
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = period2 - (5 * 365 * 24 * 60 * 60);
  const url = `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${symbol}?symbol=${symbol}&type=${FUNDAMENTAL_TYPES}&period1=${period1}&period2=${period2}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(7000)
  });
  if (!response.ok) throw new Error(`Yahoo fundamentals failed: ${response.status}`);
  const data = await response.json();
  return (data.timeseries?.result ?? []) as SeriesResult[];
}

async function fetchChart(symbol: string) {
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1y&events=dividends`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(7000)
  });
  if (!response.ok) throw new Error(`Yahoo chart failed: ${response.status}`);
  const data = await response.json();
  return data.chart?.result?.[0];
}

async function fetchUsdIdr() {
  const response = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/USDIDR=X?interval=1d&range=5d", {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) throw new Error(`Yahoo FX failed: ${response.status}`);
  const data = await response.json();
  return data.chart?.result?.[0]?.meta?.regularMarketPrice ?? 1;
}

function items(results: SeriesResult[], type: string): SeriesItem[] {
  const result = results.find((entry) => entry.meta?.type?.includes(type));
  const value = result?.[type];
  return Array.isArray(value) ? value as SeriesItem[] : [];
}

function latest(results: SeriesResult[], type: string) {
  return items(results, type).at(-1)?.reportedValue?.raw ?? 0;
}

function moneyValue(item: SeriesItem | undefined, usdIdr: number) {
  const raw = item?.reportedValue?.raw ?? 0;
  return item?.currencyCode === "USD" ? raw * usdIdr : raw;
}

function latestMoney(results: SeriesResult[], type: string, usdIdr: number) {
  return moneyValue(items(results, type).at(-1), usdIdr);
}

function latestAny(results: SeriesResult[], types: string[]) {
  for (const type of types) {
    const value = latest(results, type);
    if (value) return value;
  }
  return 0;
}

function latestMoneyAny(results: SeriesResult[], types: string[], usdIdr: number) {
  for (const type of types) {
    const value = latestMoney(results, type, usdIdr);
    if (value) return value;
  }
  return 0;
}

function growth(results: SeriesResult[], type: string) {
  const values = items(results, type).map((item) => item.reportedValue?.raw ?? 0).filter((value) => value !== 0);
  if (values.length < 2) return 0;
  const previous = values.at(-2) ?? 0;
  return previous ? ((values.at(-1)! - previous) / Math.abs(previous)) * 100 : 0;
}

function growthAny(results: SeriesResult[], types: string[]) {
  for (const type of types) {
    const value = growth(results, type);
    if (value) return value;
  }
  return 0;
}

function pct(numerator: number, denominator: number) {
  return denominator ? (numerator / denominator) * 100 : 0;
}

function round(value: number, digits = 2) {
  return Number((Number.isFinite(value) ? value : 0).toFixed(digits));
}

function moneySeries(results: SeriesResult[], types: string[], usdIdr: number) {
  for (const type of types) {
    const values = items(results, type);
    if (values.length) {
      return new Map(values.map((item) => [item.asOfDate, moneyValue(item, usdIdr)]));
    }
  }
  return new Map<string, number>();
}

function buildFinancialHistory(results: SeriesResult[], prefix: "annual" | "quarterly", usdIdr: number, limit: number) {
  const revenue = moneySeries(results, [`${prefix}TotalRevenue`, `${prefix}OperatingRevenue`], usdIdr);
  const netIncome = moneySeries(results, [
    `${prefix}NetIncomeContinuousOperations`,
    `${prefix}NetIncomeCommonStockholders`,
    `${prefix}NetIncome`
  ], usdIdr);
  const directFcf = moneySeries(results, [`${prefix}FreeCashFlow`], usdIdr);
  const operatingCashFlow = moneySeries(results, [`${prefix}OperatingCashFlow`], usdIdr);
  const capitalExpenditure = moneySeries(results, [`${prefix}CapitalExpenditure`], usdIdr);
  const debt = moneySeries(results, [`${prefix}TotalDebt`], usdIdr);
  const equity = moneySeries(results, [
    `${prefix}StockholdersEquity`,
    `${prefix}CommonStockEquity`,
    `${prefix}TotalEquityGrossMinorityInterest`
  ], usdIdr);
  const eps = moneySeries(results, [`${prefix}DilutedEPS`, `${prefix}BasicEPS`], usdIdr);
  const dates = [...new Set([
    ...revenue.keys(), ...netIncome.keys(), ...directFcf.keys(),
    ...operatingCashFlow.keys(), ...debt.keys(), ...equity.keys(), ...eps.keys()
  ])].sort().slice(-limit);

  return dates.map((period) => {
    const freeCashFlow = directFcf.has(period)
      ? directFcf.get(period)!
      : (operatingCashFlow.get(period) ?? 0) + (capitalExpenditure.get(period) ?? 0);
    return {
      period,
      revenue: round((revenue.get(period) ?? 0) / 1e9),
      netIncome: round((netIncome.get(period) ?? 0) / 1e9),
      freeCashFlow: round(freeCashFlow / 1e9),
      debt: round((debt.get(period) ?? 0) / 1e9),
      equity: round((equity.get(period) ?? 0) / 1e9),
      eps: round(eps.get(period) ?? 0)
    };
  });
}

type QualityMetric = {
  key: string;
  label: string;
  available: boolean;
  applicable?: boolean;
  reason?: string;
};

function buildDataQuality(metrics: QualityMetric[], reportDate: string | null, source: string) {
  const applicable = metrics.filter((metric) => metric.applicable !== false);
  const available = applicable.filter((metric) => metric.available);
  return {
    percentage: applicable.length ? Math.round((available.length / applicable.length) * 100) : 0,
    available: available.length,
    applicable: applicable.length,
    total: metrics.length,
    reportDate,
    source,
    missing: metrics
      .filter((metric) => !metric.available || metric.applicable === false)
      .map((metric) => ({
        key: metric.key,
        label: metric.label,
        reason: metric.reason ?? "Tidak dipublikasikan oleh sumber data."
      }))
  };
}

function estimateDCF(fcf: number, netIncome: number, eps: number, growthRate: number, currentPrice: number) {
  if (!fcf || !netIncome || !eps) return { fairPrice: 0, upside: 0 };
  const growth = Math.max(-5, Math.min(12, growthRate)) / 100;
  const discount = 0.11;
  const terminalGrowth = 0.025;
  let fcfPerShare = (fcf / netIncome) * eps;
  let presentValue = 0;
  for (let year = 1; year <= 5; year += 1) {
    fcfPerShare *= 1 + growth;
    presentValue += fcfPerShare / Math.pow(1 + discount, year);
  }
  const terminal = (fcfPerShare * (1 + terminalGrowth)) / (discount - terminalGrowth);
  const fairPrice = Math.max(0, Math.round(presentValue + terminal / Math.pow(1 + discount, 5)));
  return { fairPrice, upside: currentPrice ? round(((fairPrice - currentPrice) / currentPrice) * 100) : 0 };
}

function emptyResponse(member: (typeof STOCK_UNIVERSE)[number]) {
  const source = "Data cadangan internal";
  const missing = [
    ["pe", "P/E"], ["pbv", "P/BV"], ["roe", "ROE"], ["der", "DER"],
    ["revenue", "Pendapatan"], ["netIncome", "Laba bersih"], ["freeCashFlow", "FCF"],
    ["eps", "EPS"], ["revenueGrowth", "Pertumbuhan pendapatan"]
  ].map(([key, label]) => ({ key, label, reason: "Sumber real-time sedang tidak tersedia." }));
  return {
    source: "static-fallback",
    dataStatus: { price: "static", fundamentals: "static", dcf: "derived", analysts: "unavailable", esg: "unavailable" },
    asOf: null,
    ticker: member.ticker,
    name: member.name,
    sector: member.sector,
    industry: industryFor(member.sector),
    marketCap: "-",
    indices: getStockIndices(member.ticker),
    ratios: { pe: 0, pbv: 0, roe: 0, der: 0, dividendYield: 0, grossMargin: 0, netMargin: 0, ebitdaMargin: 0, evEbitda: 0 },
    financials: { revenue: 0, netIncome: 0, grossProfit: 0, ebitda: 0, ebit: 0, freeCashFlow: 0, eps: 0, epsGrowth: 0, revenueGrowth: 0, bookValue: 0 },
    dcf: { fairPrice: 0, upside: 0 },
    analysts: { count: 0, buy: 0, hold: 0, sell: 0, targetPrice: 0, consensus: "Tidak tersedia" },
    peers: [],
    esg: { total: 0, environmental: 0, social: 0, governance: 0, risk: "Tidak tersedia" },
    dupont: { netMargin: 0, assetTurnover: 0, equityMultiplier: 0, roeEstimate: 0 },
    unavailableMetrics: ["pe", "pbv", "roe", "der", "grossMargin", "netMargin", "ebitdaMargin", "evEbitda", "eps", "freeCashFlow"],
    earningsTrend: [],
    annualHistory: [],
    quarterlyHistory: [],
    dataQuality: { percentage: 0, available: 0, applicable: missing.length, total: missing.length, reportDate: null, source, missing },
    warnings: [{ code: "source_unavailable", severity: "warning", title: "Data fundamental belum tersedia", detail: "Aplikasi sedang menampilkan data cadangan dan tidak mengisi rasio dengan angka buatan." }]
  };
}

export async function GET(request: Request) {
  const ticker = new URL(request.url).searchParams.get("ticker")?.toUpperCase() || "BBCA";
  const member = STOCK_UNIVERSE.find((stock) => stock.ticker === ticker);
  if (!member) return NextResponse.json({ error: "Ticker not found" }, { status: 404 });

  try {
    const symbol = `${ticker}.JK`;
    const [series, chart] = await Promise.all([fetchFundamentals(symbol), fetchChart(symbol)]);
    const reportingCurrency = items(series, "annualTotalRevenue").at(-1)?.currencyCode
      ?? items(series, "annualOperatingRevenue").at(-1)?.currencyCode
      ?? "IDR";
    const usdIdr = reportingCurrency === "USD" ? await fetchUsdIdr() : 1;
    const revenue = latestMoneyAny(series, ["annualTotalRevenue", "annualOperatingRevenue"], usdIdr);
    const netIncome = latestMoneyAny(series, [
      "annualNetIncomeContinuousOperations",
      "annualNetIncomeCommonStockholders",
      "annualNetIncome"
    ], usdIdr);
    const grossProfit = latestMoney(series, "annualGrossProfit", usdIdr);
    const ebitda = latestMoney(series, "annualEBITDA", usdIdr);
    const ebit = latestMoneyAny(series, ["annualEBIT", "annualOperatingIncome"], usdIdr);
    const operatingCashFlow = latestMoney(series, "annualOperatingCashFlow", usdIdr);
    const capitalExpenditure = latestMoney(series, "annualCapitalExpenditure", usdIdr);
    const reportedFreeCashFlow = latestMoney(series, "annualFreeCashFlow", usdIdr);
    const freeCashFlow = reportedFreeCashFlow || (operatingCashFlow ? operatingCashFlow + capitalExpenditure : 0);
    const equity = latestMoneyAny(series, [
      "annualStockholdersEquity",
      "annualCommonStockEquity",
      "annualTotalEquityGrossMinorityInterest"
    ], usdIdr);
    const debt = latestMoney(series, "annualTotalDebt", usdIdr);
    const dilutedShares = latestAny(series, ["annualDilutedAverageShares", "annualBasicAverageShares"]);
    const reportedEps = latestAny(series, ["annualDilutedEPS", "annualBasicEPS"]);
    const eps = reportedEps || (dilutedShares ? netIncome / dilutedShares : 0);
    const cash = latestMoney(series, "annualCashCashEquivalentsAndShortTermInvestments", usdIdr);
    const price = chart?.meta?.regularMarketPrice ?? member.fallbackPrice;
    const marketCap = latestMoney(series, "trailingMarketCap", usdIdr);
    const dividends = Object.values(chart?.events?.dividends ?? {}) as { amount?: number; date?: number }[];
    const cutoff = Date.now() / 1000 - 365 * 24 * 60 * 60;
    const annualDividend = dividends.filter((event) => (event.date ?? 0) >= cutoff).reduce((sum, event) => sum + (event.amount ?? 0), 0);
    const revenueGrowth = growthAny(series, ["annualTotalRevenue", "annualOperatingRevenue"]);
    const epsGrowth = growthAny(series, ["annualDilutedEPS", "annualBasicEPS"]);
    const roe = pct(netIncome, equity);
    const netMargin = pct(netIncome, revenue);
    const totalAssets = latestMoney(series, "annualTotalAssets", usdIdr) || equity + debt;
    const dcf = estimateDCF(freeCashFlow, netIncome, eps, revenueGrowth, price);
    const annualHistory = buildFinancialHistory(series, "annual", usdIdr, 5);
    const quarterlyHistory = buildFinancialHistory(series, "quarterly", usdIdr, 8);
    const asOf = annualHistory.at(-1)?.period
      ?? items(series, "annualTotalRevenue").at(-1)?.asOfDate
      ?? items(series, "annualOperatingRevenue").at(-1)?.asOfDate
      ?? null;
    const earningsTrend = items(series, "annualNetIncomeContinuousOperations").slice(-4).map((item) => ({
      year: Number(item.asOfDate.slice(0, 4)),
      value: round(moneyValue(item, usdIdr) / 1e12, 1)
    }));

    const pe = latest(series, "trailingPeRatio") || (netIncome > 0 && marketCap ? marketCap / netIncome : 0);
    const pbv = latest(series, "trailingPbRatio") || (equity > 0 && marketCap ? marketCap / equity : 0);
    const evEbitda = latest(series, "trailingEnterprisesValueEBITDARatio")
      || (ebitda > 0 && marketCap ? (marketCap + debt - cash) / ebitda : 0);
    const isFinancial = member.sector === "Financial";
    const hasRevenueHistory = annualHistory.filter((entry) => entry.revenue !== 0).length >= 2;
    const hasEpsHistory = items(series, "annualDilutedEPS").length >= 2 || items(series, "annualBasicEPS").length >= 2;
    const qualityMetrics: QualityMetric[] = [
      { key: "pe", label: "P/E", available: pe > 0, reason: netIncome <= 0 ? "Perusahaan merugi sehingga P/E tidak bermakna." : undefined },
      { key: "pbv", label: "P/BV", available: pbv > 0, reason: equity <= 0 ? "Ekuitas negatif atau nol sehingga P/BV tidak bermakna." : undefined },
      { key: "roe", label: "ROE", available: equity > 0, reason: equity <= 0 ? "Ekuitas negatif atau nol sehingga ROE tidak bermakna." : undefined },
      { key: "der", label: "DER", available: equity > 0, reason: equity <= 0 ? "Ekuitas negatif atau nol sehingga DER tidak bermakna." : undefined },
      { key: "dividendYield", label: "Dividend yield", available: Boolean(chart), reason: "Riwayat dividen satu tahun tidak tersedia." },
      { key: "revenue", label: "Pendapatan", available: revenue !== 0 },
      { key: "netIncome", label: "Laba bersih", available: netIncome !== 0 },
      { key: "freeCashFlow", label: "Free cash flow", available: freeCashFlow !== 0 },
      { key: "eps", label: "EPS", available: eps !== 0 },
      { key: "netMargin", label: "Margin bersih", available: revenue !== 0 },
      { key: "revenueGrowth", label: "Pertumbuhan pendapatan", available: hasRevenueHistory, reason: "Dibutuhkan sedikitnya dua laporan tahunan." },
      { key: "epsGrowth", label: "Pertumbuhan EPS", available: hasEpsHistory, reason: "Dibutuhkan sedikitnya dua laporan EPS tahunan." },
      { key: "grossMargin", label: "Margin kotor", available: grossProfit !== 0 && revenue !== 0, applicable: !isFinancial, reason: isFinancial ? "Tidak relevan untuk bank dan sebagian besar perusahaan jasa keuangan." : undefined },
      { key: "ebitdaMargin", label: "Margin EBITDA", available: ebitda !== 0 && revenue !== 0, applicable: !isFinancial, reason: isFinancial ? "Tidak relevan untuk bank dan sebagian besar perusahaan jasa keuangan." : undefined },
      { key: "evEbitda", label: "EV/EBITDA", available: evEbitda > 0, applicable: !isFinancial, reason: isFinancial ? "Tidak relevan untuk bank dan sebagian besar perusahaan jasa keuangan." : undefined }
    ];
    const dataQuality = buildDataQuality(qualityMetrics, asOf, "Yahoo Finance Fundamentals Timeseries");
    const warnings = [
      ...(netIncome < 0 ? [{
        code: "net_loss", severity: "danger", title: "Perusahaan merugi",
        detail: "Laba bersih laporan terakhir negatif. P/E dan rasio berbasis laba perlu diabaikan."
      }] : []),
      ...(equity <= 0 ? [{
        code: "negative_equity", severity: "danger", title: "Ekuitas negatif atau nol",
        detail: "P/BV, ROE, dan DER tidak bermakna ketika ekuitas tidak positif."
      }] : []),
      ...(freeCashFlow < 0 ? [{
        code: "negative_fcf", severity: "warning", title: "Free cash flow negatif",
        detail: "Arus kas operasi setelah belanja modal pada laporan terakhir bernilai negatif."
      }] : []),
      ...(dataQuality.percentage < 60 ? [{
        code: "low_completeness", severity: "warning", title: "Kelengkapan data rendah",
        detail: `Hanya ${dataQuality.percentage}% metrik yang relevan berhasil diisi dari sumber utama.`
      }] : [])
    ];
    const unavailableMetrics = [
      ...(!pe ? ["pe"] : []),
      ...(!pbv ? ["pbv"] : []),
      ...(!equity ? ["roe", "der"] : []),
      ...(!grossProfit || !revenue ? ["grossMargin"] : []),
      ...(!revenue ? ["netMargin"] : []),
      ...(!ebitda || !revenue ? ["ebitdaMargin", "evEbitda"] : []),
      ...(!revenue ? ["revenue", "revenueGrowth"] : []),
      ...(!netIncome ? ["netIncome"] : []),
      ...(!grossProfit ? ["grossProfit"] : []),
      ...(!ebitda ? ["ebitda"] : []),
      ...(!ebit ? ["ebit"] : []),
      ...(!eps ? ["eps"] : []),
      ...(!freeCashFlow ? ["freeCashFlow"] : [])
    ];

    return NextResponse.json({
      source: "yahoo-fundamentals-timeseries",
      dataStatus: { price: "real", fundamentals: "real", dcf: "derived", analysts: "unavailable", esg: "unavailable" },
      asOf,
      ticker,
      name: chart?.meta?.longName ?? chart?.meta?.shortName ?? member.name,
      sector: member.sector,
      industry: industryFor(member.sector),
      marketCap: marketCap ? `${round(marketCap / 1e12)}T` : "-",
      indices: getStockIndices(ticker),
      ratios: {
        pe: round(pe),
        pbv: round(pbv),
        roe: round(roe),
        der: round(equity ? debt / equity : 0),
        dividendYield: round(pct(annualDividend, price)),
        grossMargin: round(pct(grossProfit, revenue)),
        netMargin: round(netMargin),
        ebitdaMargin: round(pct(ebitda, revenue)),
        evEbitda: round(evEbitda)
      },
      financials: {
        revenue: round(revenue / 1e9),
        netIncome: round(netIncome / 1e9),
        grossProfit: round(grossProfit / 1e9),
        ebitda: round(ebitda / 1e9),
        ebit: round(ebit / 1e9),
        freeCashFlow: round(freeCashFlow / 1e9),
        eps: round(eps),
        epsGrowth: round(epsGrowth),
        revenueGrowth: round(revenueGrowth),
        bookValue: round(latest(series, "trailingPbRatio") ? price / latest(series, "trailingPbRatio") : 0)
      },
      dcf,
      analysts: { count: 0, buy: 0, hold: 0, sell: 0, targetPrice: 0, consensus: "Tidak tersedia" },
      peers: STOCK_UNIVERSE.filter((stock) => stock.sector === member.sector && stock.ticker !== ticker).slice(0, 4).map((stock) => ({
        ticker: stock.ticker, name: stock.name, pe: 0, pbv: 0, roe: 0, der: 0, marketCap: "-"
      })),
      esg: { total: 0, environmental: 0, social: 0, governance: 0, risk: "Tidak tersedia" },
      dupont: {
        netMargin: round(netMargin),
        assetTurnover: round(totalAssets ? revenue / totalAssets : 0),
        equityMultiplier: round(equity ? totalAssets / equity : 0),
        roeEstimate: round(roe)
      },
      unavailableMetrics,
      earningsTrend,
      annualHistory,
      quarterlyHistory,
      dataQuality,
      warnings
    }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch (error) {
    console.error(`Fundamentals error for ${ticker}:`, error);
    return NextResponse.json(emptyResponse(member), {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" }
    });
  }
}
