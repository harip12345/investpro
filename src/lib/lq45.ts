export const LQ45_PERIOD = "4 Mei - 31 Juli 2026";

export interface LQ45Member {
  ticker: string;
  name: string;
  sector: string;
  indexWeight: number;
  fallbackPrice: number;
}

export const LQ45_MEMBERS: LQ45Member[] = [
  { ticker: "AADI", name: "Adaro Andalan Indonesia", sector: "Energy", indexWeight: 0.95, fallbackPrice: 8825 },
  { ticker: "ADMR", name: "Adaro Minerals Indonesia", sector: "Energy", indexWeight: 0.51, fallbackPrice: 1540 },
  { ticker: "ADRO", name: "Alamtri Resources Indonesia", sector: "Energy", indexWeight: 1.2, fallbackPrice: 2520 },
  { ticker: "AKRA", name: "AKR Corporindo", sector: "Energy", indexWeight: 0.55, fallbackPrice: 1380 },
  { ticker: "AMMN", name: "Amman Mineral Internasional", sector: "Basic Materials", indexWeight: 4.33, fallbackPrice: 3930 },
  { ticker: "AMRT", name: "Sumber Alfaria Trijaya", sector: "Consumer Defensive", indexWeight: 1.43, fallbackPrice: 1415 },
  { ticker: "ANTM", name: "Aneka Tambang", sector: "Basic Materials", indexWeight: 1.97, fallbackPrice: 3050 },
  { ticker: "ASII", name: "Astra International", sector: "Industrials", indexWeight: 6.73, fallbackPrice: 5225 },
  { ticker: "BBCA", name: "Bank Central Asia", sector: "Financial", indexWeight: 15, fallbackPrice: 6525 },
  { ticker: "BBNI", name: "Bank Negara Indonesia", sector: "Financial", indexWeight: 3.16, fallbackPrice: 3620 },
  { ticker: "BBRI", name: "Bank Rakyat Indonesia", sector: "Financial", indexWeight: 12.91, fallbackPrice: 3070 },
  { ticker: "BBTN", name: "Bank Tabungan Negara", sector: "Financial", indexWeight: 0.4, fallbackPrice: 1275 },
  { ticker: "BMRI", name: "Bank Mandiri", sector: "Financial", indexWeight: 9.86, fallbackPrice: 4470 },
  { ticker: "BRPT", name: "Barito Pacific", sector: "Basic Materials", indexWeight: 3.25, fallbackPrice: 1735 },
  { ticker: "BUMI", name: "Bumi Resources", sector: "Energy", indexWeight: 2.12, fallbackPrice: 153 },
  { ticker: "CPIN", name: "Charoen Pokphand Indonesia", sector: "Consumer Defensive", indexWeight: 1.41, fallbackPrice: 3130 },
  { ticker: "CUAN", name: "Petrindo Jaya Kreasi", sector: "Energy", indexWeight: 1.46, fallbackPrice: 660 },
  { ticker: "DEWA", name: "Darma Henwa", sector: "Energy", indexWeight: 0.8, fallbackPrice: 370 },
  { ticker: "EMTK", name: "Elang Mahkota Teknologi", sector: "Technology", indexWeight: 0.86, fallbackPrice: 540 },
  { ticker: "ESSA", name: "ESSA Industries Indonesia", sector: "Basic Materials", indexWeight: 0.47, fallbackPrice: 605 },
  { ticker: "EXCL", name: "XLSMART Telecom Sejahtera", sector: "Infrastructure", indexWeight: 1.01, fallbackPrice: 2610 },
  { ticker: "GOTO", name: "GoTo Gojek Tokopedia", sector: "Technology", indexWeight: 2.62, fallbackPrice: 50 },
  { ticker: "HRTA", name: "Hartadinata Abadi", sector: "Consumer Cyclical", indexWeight: 0.23, fallbackPrice: 1930 },
  { ticker: "ICBP", name: "Indofood CBP Sukses Makmur", sector: "Consumer Defensive", indexWeight: 0.93, fallbackPrice: 6925 },
  { ticker: "INCO", name: "Vale Indonesia", sector: "Basic Materials", indexWeight: 0.85, fallbackPrice: 4950 },
  { ticker: "INDF", name: "Indofood Sukses Makmur", sector: "Consumer Defensive", indexWeight: 1.71, fallbackPrice: 6750 },
  { ticker: "INKP", name: "Indah Kiat Pulp & Paper", sector: "Basic Materials", indexWeight: 1.24, fallbackPrice: 7700 },
  { ticker: "ISAT", name: "Indosat Ooredoo Hutchison", sector: "Infrastructure", indexWeight: 0.6, fallbackPrice: 1935 },
  { ticker: "ITMG", name: "Indo Tambangraya Megah", sector: "Energy", indexWeight: 0.58, fallbackPrice: 24400 },
  { ticker: "JPFA", name: "Japfa Comfeed Indonesia", sector: "Consumer Defensive", indexWeight: 0.72, fallbackPrice: 2070 },
  { ticker: "KLBF", name: "Kalbe Farma", sector: "Healthcare", indexWeight: 0.97, fallbackPrice: 770 },
  { ticker: "MAPI", name: "Mitra Adiperkasa", sector: "Consumer Cyclical", indexWeight: 0.61, fallbackPrice: 1500 },
  { ticker: "MBMA", name: "Merdeka Battery Materials", sector: "Basic Materials", indexWeight: 1.17, fallbackPrice: 520 },
  { ticker: "MDKA", name: "Merdeka Copper Gold", sector: "Basic Materials", indexWeight: 2.29, fallbackPrice: 2690 },
  { ticker: "MEDC", name: "Medco Energi Internasional", sector: "Energy", indexWeight: 0.59, fallbackPrice: 1275 },
  { ticker: "PGAS", name: "Perusahaan Gas Negara", sector: "Energy", indexWeight: 1.16, fallbackPrice: 1505 },
  { ticker: "PGEO", name: "Pertamina Geothermal Energy", sector: "Infrastructure", indexWeight: 0.27, fallbackPrice: 1015 },
  { ticker: "PTBA", name: "Bukit Asam", sector: "Energy", indexWeight: 0.65, fallbackPrice: 2430 },
  { ticker: "SCMA", name: "Surya Citra Media", sector: "Consumer Cyclical", indexWeight: 0.13, fallbackPrice: 208 },
  { ticker: "SMGR", name: "Semen Indonesia", sector: "Basic Materials", indexWeight: 0.45, fallbackPrice: 1515 },
  { ticker: "TLKM", name: "Telkom Indonesia", sector: "Infrastructure", indexWeight: 8.01, fallbackPrice: 2730 },
  { ticker: "TOWR", name: "Sarana Menara Nusantara", sector: "Infrastructure", indexWeight: 0.56, fallbackPrice: 408 },
  { ticker: "UNTR", name: "United Tractors", sector: "Industrials", indexWeight: 2.43, fallbackPrice: 26350 },
  { ticker: "UNVR", name: "Unilever Indonesia", sector: "Consumer Defensive", indexWeight: 0.54, fallbackPrice: 1750 },
  { ticker: "WIFI", name: "Solusi Sinergi Digital", sector: "Consumer Cyclical", indexWeight: 0.31, fallbackPrice: 2010 }
];
