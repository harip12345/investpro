import { LQ45_MEMBERS, LQ45_PERIOD } from "@/lib/lq45";

export const IDX30_PERIOD = "4 Mei - 31 Juli 2026";
export const JII_PERIOD = "2 Juni - 30 November 2026";
export const KOMPAS100_PERIOD = "4 Mei - 31 Juli 2026";
export const SRI_KEHATI_PERIOD = "2 Juni - 30 November 2026";

export const IDX30_TICKERS = [
  "AADI", "ADMR", "ADRO", "AMRT", "ANTM", "ASII", "BBCA", "BBNI", "BBRI", "BMRI",
  "BRPT", "BUMI", "CPIN", "EMTK", "GOTO", "ICBP", "INCO", "INDF", "INKP", "JPFA",
  "KLBF", "MBMA", "MDKA", "MEDC", "PGAS", "PGEO", "PTBA", "TLKM", "UNTR", "UNVR"
] as const;

export const JII_TICKERS = [
  "AADI", "ADMR", "ADRO", "ANTM", "ARCI", "BKSL", "BRIS", "BRMS", "BUMI", "CPIN",
  "DEWA", "ENRG", "EXCL", "ICBP", "INDF", "INKP", "JPFA", "KLBF", "MBMA", "MDKA",
  "MEDC", "PGAS", "PTBA", "RAJA", "RATU", "TLKM", "TPIA", "UNTR", "UNVR", "WIFI"
] as const;

export const KOMPAS100_TICKERS = [
  "AADI", "ACES", "ADMR", "ADRO", "AKRA", "AMMN", "AMRT", "ANTM", "ARCI", "ARTO",
  "ASII", "BBCA", "BBNI", "BBRI", "BBTN", "BBYB", "BKSL", "BMRI", "BREN", "BRIS",
  "BRMS", "BRPT", "BSDE", "BTPS", "BUKA", "BULL", "BUMI", "BUVA", "CBDK", "CMRY",
  "CPIN", "CTRA", "CUAN", "DEWA", "DSNG", "DSSA", "ELSA", "EMTK", "ENRG", "ERAA",
  "ESSA", "EXCL", "FILM", "GOTO", "HEAL", "HMSP", "HRTA", "HRUM", "ICBP", "IMPC",
  "INCO", "INDF", "INDY", "INET", "INKP", "INTP", "ISAT", "ITMG", "JPFA", "JSMR",
  "KIJA", "KLBF", "KPIG", "MAPA", "MAPI", "MBMA", "MDKA", "MEDC", "MIKA", "MTEL",
  "MYOR", "NCKL", "PANI", "PGAS", "PGEO", "PNLF", "PSAB", "PTBA", "PTRO", "PWON",
  "RAJA", "RATU", "SCMA", "SGER", "SIDO", "SMGR", "SMIL", "SMRA", "SSIA", "TAPG",
  "TCPI", "TINS", "TLKM", "TOBA", "TOWR", "TPIA", "UNTR", "UNVR", "WIFI", "WIRG"
] as const;

export const SRI_KEHATI_TICKERS = [
  "AKRA", "ANTM", "ASII", "AVIA", "BBCA", "BBNI", "BBRI", "BBTN", "BMRI", "DSNG",
  "EMTK", "ICBP", "INDF", "INTP", "ISAT", "JSMR", "KLBF", "MTEL", "PGAS", "PGEO",
  "POWR", "PWON", "SIDO", "SMGR", "UNVR"
] as const;

export const SHARIA_EXTRA_MEMBERS = [
  { ticker: "ARCI", name: "Archi Indonesia", sector: "Basic Materials", indexWeight: 0, fallbackPrice: 645 },
  { ticker: "BKSL", name: "Sentul City", sector: "Properties", indexWeight: 0, fallbackPrice: 132 },
  { ticker: "BRIS", name: "Bank Syariah Indonesia", sector: "Financial", indexWeight: 0, fallbackPrice: 1880 },
  { ticker: "BRMS", name: "Bumi Resources Minerals", sector: "Basic Materials", indexWeight: 0, fallbackPrice: 392 },
  { ticker: "ENRG", name: "Energi Mega Persada", sector: "Energy", indexWeight: 0, fallbackPrice: 232 },
  { ticker: "RAJA", name: "Rukun Raharja", sector: "Energy", indexWeight: 0, fallbackPrice: 1840 },
  { ticker: "RATU", name: "Raharja Energi Cepu", sector: "Energy", indexWeight: 0, fallbackPrice: 6675 },
  { ticker: "TPIA", name: "Chandra Asri Pacific", sector: "Basic Materials", indexWeight: 0, fallbackPrice: 7350 }
] as const;

export const KOMPAS100_EXTRA_MEMBERS = [
  { ticker: "ACES", name: "Aspirasi Hidup Indonesia", sector: "Consumer Cyclical", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "ARTO", name: "Bank Jago", sector: "Financial", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "BBYB", name: "Bank Neo Commerce", sector: "Financial", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "BREN", name: "Barito Renewables Energy", sector: "Infrastructure", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "BSDE", name: "Bumi Serpong Damai", sector: "Properties", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "BTPS", name: "Bank BTPN Syariah", sector: "Financial", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "BUKA", name: "Bukalapak.com", sector: "Technology", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "BULL", name: "Buana Lintas Lautan", sector: "Industrials", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "BUVA", name: "Bukit Uluwatu Villa", sector: "Consumer Cyclical", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "CBDK", name: "Bangun Kosambi Sukses", sector: "Properties", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "CMRY", name: "Cisarua Mountain Dairy", sector: "Consumer Defensive", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "CTRA", name: "Ciputra Development", sector: "Properties", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "DSNG", name: "Dharma Satya Nusantara", sector: "Consumer Defensive", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "DSSA", name: "Dian Swastatika Sentosa", sector: "Energy", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "ELSA", name: "Elnusa", sector: "Energy", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "ERAA", name: "Erajaya Swasembada", sector: "Consumer Cyclical", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "FILM", name: "MD Pictures", sector: "Consumer Cyclical", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "HEAL", name: "Medikaloka Hermina", sector: "Healthcare", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "HMSP", name: "HM Sampoerna", sector: "Consumer Defensive", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "HRUM", name: "Harum Energy", sector: "Energy", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "IMPC", name: "Impack Pratama Industri", sector: "Basic Materials", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "INDY", name: "Indika Energy", sector: "Energy", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "INET", name: "Sinergi Inti Andalan Prima", sector: "Technology", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "INTP", name: "Indocement Tunggal Prakarsa", sector: "Basic Materials", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "JSMR", name: "Jasa Marga", sector: "Infrastructure", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "KIJA", name: "Kawasan Industri Jababeka", sector: "Properties", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "KPIG", name: "MNC Land", sector: "Properties", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "MAPA", name: "Map Aktif Adiperkasa", sector: "Consumer Cyclical", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "MIKA", name: "Mitra Keluarga Karyasehat", sector: "Healthcare", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "MTEL", name: "Dayamitra Telekomunikasi", sector: "Infrastructure", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "MYOR", name: "Mayora Indah", sector: "Consumer Defensive", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "NCKL", name: "Trimegah Bangun Persada", sector: "Basic Materials", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "PANI", name: "Pantai Indah Kapuk Dua", sector: "Properties", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "PNLF", name: "Panin Financial", sector: "Financial", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "PSAB", name: "J Resources Asia Pasifik", sector: "Basic Materials", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "PTRO", name: "Petrosea", sector: "Energy", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "PWON", name: "Pakuwon Jati", sector: "Properties", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "SGER", name: "Sumber Global Energy", sector: "Energy", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "SIDO", name: "Industri Jamu dan Farmasi Sido Muncul", sector: "Healthcare", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "SMIL", name: "Sarana Mitra Luas", sector: "Industrials", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "SMRA", name: "Summarecon Agung", sector: "Properties", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "SSIA", name: "Surya Semesta Internusa", sector: "Properties", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "TAPG", name: "Triputra Agro Persada", sector: "Consumer Defensive", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "TCPI", name: "Transcoal Pacific", sector: "Industrials", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "TINS", name: "Timah", sector: "Basic Materials", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "TOBA", name: "TBS Energi Utama", sector: "Energy", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "WIRG", name: "WIR Asia", sector: "Technology", indexWeight: 0, fallbackPrice: 0 }
] as const;

export const SRI_KEHATI_EXTRA_MEMBERS = [
  { ticker: "AVIA", name: "Avia Avian", sector: "Basic Materials", indexWeight: 0, fallbackPrice: 0 },
  { ticker: "POWR", name: "Cikarang Listrindo", sector: "Infrastructure", indexWeight: 0, fallbackPrice: 0 }
] as const;

const combinedUniverse = [
  ...LQ45_MEMBERS,
  ...SHARIA_EXTRA_MEMBERS,
  ...KOMPAS100_EXTRA_MEMBERS,
  ...SRI_KEHATI_EXTRA_MEMBERS
];

export const STOCK_UNIVERSE = Array.from(
  new Map(combinedUniverse.map((member) => [member.ticker, member])).values()
);

const lq45Set = new Set(LQ45_MEMBERS.map((member) => member.ticker));
const idx30Set = new Set<string>(IDX30_TICKERS);
const jiiSet = new Set<string>(JII_TICKERS);
const kompas100Set = new Set<string>(KOMPAS100_TICKERS);
const sriKehatiSet = new Set<string>(SRI_KEHATI_TICKERS);

const otherIndices: Record<string, string[]> = {
  BBCA: ["BISNIS27"],
  BMRI: ["BISNIS27"],
  ASII: ["BISNIS27"],
  TLKM: ["BISNIS27"],
  BBRI: ["BISNIS27"]
};

export function getStockIndices(ticker: string) {
  return [
    ...(lq45Set.has(ticker) ? ["LQ45"] : []),
    ...(idx30Set.has(ticker) ? ["IDX30"] : []),
    ...(jiiSet.has(ticker) ? ["JII"] : []),
    ...(kompas100Set.has(ticker) ? ["KOMPAS100"] : []),
    ...(sriKehatiSet.has(ticker) ? ["SRI-KEHATI"] : []),
    ...(otherIndices[ticker] ?? [])
  ];
}

export const INDEX_PERIODS = {
  LQ45: LQ45_PERIOD,
  IDX30: IDX30_PERIOD,
  JII: JII_PERIOD,
  KOMPAS100: KOMPAS100_PERIOD,
  "SRI-KEHATI": SRI_KEHATI_PERIOD
};
