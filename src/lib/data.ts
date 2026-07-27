export type Stock = {
  ticker: string;
  name: string;
  price: number;
  change: number;
  pe: number;
  pbv: number;
  roe: number;
  der: number;
  dividendYield: number;
  marketCap: string;
  score: number;
  trend: "Bullish" | "Neutral" | "Bearish";
  indices?: string[];
};

export const stocks: Stock[] = [
  { ticker: "BBCA", name: "Bank Central Asia", price: 6175, change: 0.82, pe: 24.1, pbv: 4.8, roe: 19.7, der: 4.1, dividendYield: 2.1, marketCap: "1218T", score: 88, trend: "Bullish", indices: ["LQ45", "IDX30", "KOMPAS100", "SRI-KEHATI"] },
  { ticker: "BMRI", name: "Bank Mandiri", price: 6425, change: 0.8, pe: 11.9, pbv: 2.0, roe: 21.3, der: 5.4, dividendYield: 4.7, marketCap: "600T", score: 86, trend: "Bullish", indices: ["LQ45", "IDX30", "KOMPAS100"] },
  { ticker: "ASII", name: "Astra International", price: 4920, change: -0.6, pe: 7.6, pbv: 1.0, roe: 13.8, der: 0.9, dividendYield: 6.3, marketCap: "199T", score: 80, trend: "Neutral", indices: ["LQ45", "IDX30", "KOMPAS100"] },
  { ticker: "TLKM", name: "Telkom Indonesia", price: 3150, change: -1.1, pe: 12.8, pbv: 2.1, roe: 16.4, der: 0.3, dividendYield: 5.5, marketCap: "312T", score: 78, trend: "Neutral", indices: ["LQ45", "IDX30", "KOMPAS100"] },
  { ticker: "ADRO", name: "Alamtri Resources", price: 2860, change: 2.2, pe: 5.2, pbv: 1.3, roe: 24.9, der: 0.5, dividendYield: 8.6, marketCap: "91T", score: 83, trend: "Bullish", indices: ["LQ45", "IDX30", "KOMPAS100"] },
  { ticker: "BBRI", name: "Bank Rakyat Indonesia", price: 4870, change: 0.65, pe: 12.5, pbv: 2.8, roe: 20.1, der: 5.2, dividendYield: 3.2, marketCap: "680T", score: 85, trend: "Bullish", indices: ["LQ45", "IDX30", "KOMPAS100"] },
  { ticker: "BBNI", name: "Bank Negara Indonesia", price: 4520, change: -0.3, pe: 10.2, pbv: 1.5, roe: 15.8, der: 4.8, dividendYield: 4.5, marketCap: "210T", score: 79, trend: "Neutral", indices: ["LQ45", "IDX30", "KOMPAS100"] },
  { ticker: "UNVR", name: "Unilever Indonesia", price: 2600, change: -0.8, pe: 28.0, pbv: 35.0, roe: 22.0, der: 0.1, dividendYield: 1.8, marketCap: "380T", score: 72, trend: "Neutral", indices: ["LQ45", "IDX30", "KOMPAS100", "SRI-KEHATI"] },
  { ticker: "ICBP", name: "Indofood CBP", price: 10700, change: 0.4, pe: 14.8, pbv: 3.9, roe: 18.5, der: 0.4, dividendYield: 2.0, marketCap: "173T", score: 76, trend: "Bullish", indices: ["LQ45", "KOMPAS100"] },
  { ticker: "GGRM", name: "Gudang Garam", price: 19800, change: -1.2, pe: 8.5, pbv: 1.2, roe: 14.3, der: 0.6, dividendYield: 7.2, marketCap: "70T", score: 74, trend: "Bearish", indices: ["LQ45", "KOMPAS100"] },
  { ticker: "HMSP", name: "HM Sampoerna", price: 720, change: 0.2, pe: 12.1, pbv: 3.4, roe: 16.2, der: 0.2, dividendYield: 6.5, marketCap: "150T", score: 71, trend: "Neutral", indices: ["LQ45", "KOMPAS100"] },
  { ticker: "UNTR", name: "United Tractors", price: 19500, change: 1.3, pe: 7.0, pbv: 1.5, roe: 22.5, der: 0.3, dividendYield: 5.8, marketCap: "95T", score: 85, trend: "Bullish", indices: ["LQ45", "KOMPAS100"] },
  { ticker: "EXCL", name: "XL Axiata", price: 2100, change: -0.9, pe: 22.5, pbv: 1.8, roe: 8.2, der: 0.8, dividendYield: 1.2, marketCap: "48T", score: 66, trend: "Neutral", indices: ["LQ45"] },
  { ticker: "JSMR", name: "Jasa Marga", price: 4800, change: 0.3, pe: 15.2, pbv: 2.0, roe: 12.5, der: 1.2, dividendYield: 3.0, marketCap: "55T", score: 73, trend: "Neutral", indices: ["LQ45", "KOMPAS100"] },
  { ticker: "PTBA", name: "Bukit Asam", price: 2800, change: 1.8, pe: 4.8, pbv: 1.1, roe: 18.2, der: 0.2, dividendYield: 9.0, marketCap: "35T", score: 80, trend: "Bullish", indices: ["LQ45", "KOMPAS100"] },
  { ticker: "PGAS", name: "Perusahaan Gas Negara", price: 2900, change: -0.5, pe: 13.5, pbv: 1.6, roe: 11.8, der: 0.5, dividendYield: 3.5, marketCap: "62T", score: 74, trend: "Neutral", indices: ["LQ45", "KOMPAS100"] },
  { ticker: "INDY", name: "Indika Energy", price: 2700, change: 1.1, pe: 6.5, pbv: 0.8, roe: 12.5, der: 0.4, dividendYield: 5.0, marketCap: "18T", score: 77, trend: "Bullish", indices: ["KOMPAS100"] },
  { ticker: "AKRA", name: "AKR Corporindo", price: 1350, change: 0.7, pe: 11.8, pbv: 1.3, roe: 11.5, der: 0.3, dividendYield: 3.2, marketCap: "21T", score: 76, trend: "Neutral", indices: ["KOMPAS100"] }
];

export const marketSummary = [
  { label: "IHSG", value: "7,245.18", change: 0.72 },
  { label: "LQ45", value: "926.44", change: 0.55 },
  { label: "IDX30", value: "482.17", change: 0.48 },
  { label: "Kompas100", value: "1,104.33", change: 0.64 }
];

export const watchlist = ["BBCA", "BMRI", "TLKM", "ADRO"];

export const portfolio = [
  { ticker: "BBCA", allocation: 35, avgPrice: 9500, currentPrice: 9875 },
  { ticker: "BMRI", allocation: 25, avgPrice: 6100, currentPrice: 6425 },
  { ticker: "ASII", allocation: 20, avgPrice: 5050, currentPrice: 4920 },
  { ticker: "ADRO", allocation: 20, avgPrice: 2700, currentPrice: 2860 }
];

export const newsItems = [
  { title: "Sektor perbankan memimpin penguatan indeks", source: "Market Desk", sentiment: "Positive" },
  { title: "Harga batu bara menopang emiten energi besar", source: "Daily Equity", sentiment: "Positive" },
  { title: "Investor menanti rilis kinerja kuartalan emiten konsumer", source: "Investor Note", sentiment: "Neutral" }
];

export const priceSeries = [72, 74, 73, 77, 79, 78, 81, 84, 83, 86, 88, 91];
