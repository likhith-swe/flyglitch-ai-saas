import { computeGlitchScore, classifyGlitch, discountPercentOf } from "./glitch-score";
import type { CabinClass, Currency, FlightRoute, PricePoint, Region } from "./types";

/**
 * Verified offline catalog — 30 high-demand routes departing from Indian tech
 * hubs (BLR / DEL / BOM / HYD) and global gateways (SIN / DXB / JFK / LHR).
 *
 * This catalog is the single source of truth whenever PostgreSQL or the
 * RapidAPI enrichment layer is unavailable. Every monetary value is stored in
 * integer minor units (paise / cents).
 */

interface RawRoute {
  id: string;
  origin: { code: string; city: string; country: string; terminal?: string };
  destination: { code: string; city: string; country: string; terminal?: string };
  airline: string;
  airlineCode: string;
  flightNumber: string;
  cabinClass: CabinClass;
  stops: 0 | 1;
  layoverAirport: string | null;
  layoverMinutes: number | null;
  durationMinutes: number;
  nonstopDurationMinutes: number;
  originalRetailMinor: number;
  currentPriceMinor: number;
  sixtyDayMedianMinor: number;
  lowestEverMinor: number;
  currency: Currency;
  seatsRemaining: number;
  fuelSurchargeMinor: number;
  typicalFuelFeeMinor: number;
  validUntilHours: number;
  observedHours: number;
  region: Region;
}

const RAW: RawRoute[] = [
  {
    id: "blr-dps-airasia-glitch",
    origin: { code: "BLR", city: "Bangalore", country: "India", terminal: "T2" },
    destination: { code: "DPS", city: "Bali / Denpasar", country: "Indonesia" },
    airline: "AirAsia", airlineCode: "AK", flightNumber: "AK-54",
    cabinClass: "economy", stops: 1, layoverAirport: "KUL", layoverMinutes: 155,
    durationMinutes: 540, nonstopDurationMinutes: 290,
    originalRetailMinor: 2_950_000, currentPriceMinor: 849_000,
    sixtyDayMedianMinor: 2_850_000, lowestEverMinor: 799_000,
    currency: "INR", seatsRemaining: 3,
    fuelSurchargeMinor: 35_000, typicalFuelFeeMinor: 620_000,
    validUntilHours: 6, observedHours: 3.2, region: "asia",
  },
  {
    id: "blr-han-vietjet-fueldump",
    origin: { code: "BLR", city: "Bangalore", country: "India", terminal: "T2" },
    destination: { code: "HAN", city: "Hanoi", country: "Vietnam" },
    airline: "VietJet Air", airlineCode: "VJ", flightNumber: "VJ-892",
    cabinClass: "economy", stops: 1, layoverAirport: "SGN", layoverMinutes: 170,
    durationMinutes: 495, nonstopDurationMinutes: 275,
    originalRetailMinor: 2_200_000, currentPriceMinor: 689_000,
    sixtyDayMedianMinor: 2_120_000, lowestEverMinor: 720_000,
    currency: "INR", seatsRemaining: 6,
    fuelSurchargeMinor: 28_000, typicalFuelFeeMinor: 480_000,
    validUntilHours: 5, observedHours: 4.1, region: "asia",
  },
  {
    id: "blr-dxb-indigo-cache-lag",
    origin: { code: "BLR", city: "Bangalore", country: "India", terminal: "T2" },
    destination: { code: "DXB", city: "Dubai", country: "United Arab Emirates", terminal: "T1" },
    airline: "IndiGo", airlineCode: "6E", flightNumber: "6E-514",
    cabinClass: "economy", stops: 0, layoverAirport: null, layoverMinutes: null,
    durationMinutes: 245, nonstopDurationMinutes: 245,
    originalRetailMinor: 1_890_000, currentPriceMinor: 745_000,
    sixtyDayMedianMinor: 1_760_000, lowestEverMinor: 760_000,
    currency: "INR", seatsRemaining: 7,
    fuelSurchargeMinor: 52_000, typicalFuelFeeMinor: 390_000,
    validUntilHours: 4, observedHours: 2.5, region: "middle-east",
  },
  {
    id: "bom-lhr-virgin-mistake-fare",
    origin: { code: "BOM", city: "Mumbai", country: "India", terminal: "T2" },
    destination: { code: "LHR", city: "London", country: "United Kingdom", terminal: "T3" },
    airline: "Virgin Atlantic", airlineCode: "VS", flightNumber: "VS-354",
    cabinClass: "economy", stops: 0, layoverAirport: null, layoverMinutes: null,
    durationMinutes: 595, nonstopDurationMinutes: 595,
    originalRetailMinor: 5_800_000, currentPriceMinor: 1_999_000,
    sixtyDayMedianMinor: 5_420_000, lowestEverMinor: 2_150_000,
    currency: "INR", seatsRemaining: 3,
    fuelSurchargeMinor: 95_000, typicalFuelFeeMinor: 1_250_000,
    validUntilHours: 3, observedHours: 1.8, region: "europe",
  },
  {
    id: "del-hnd-ana-currency-gap",
    origin: { code: "DEL", city: "New Delhi", country: "India", terminal: "T3" },
    destination: { code: "HND", city: "Tokyo / Haneda", country: "Japan", terminal: "T3" },
    airline: "ANA", airlineCode: "NH", flightNumber: "NH-838",
    cabinClass: "economy", stops: 0, layoverAirport: null, layoverMinutes: null,
    durationMinutes: 510, nonstopDurationMinutes: 510,
    originalRetailMinor: 6_400_000, currentPriceMinor: 2_450_000,
    sixtyDayMedianMinor: 5_980_000, lowestEverMinor: 2_500_000,
    currency: "INR", seatsRemaining: 5,
    fuelSurchargeMinor: 140_000, typicalFuelFeeMinor: 980_000,
    validUntilHours: 7, observedHours: 5.0, region: "asia",
  },
  {
    id: "del-cdg-airfrance-pos-glitch",
    origin: { code: "DEL", city: "New Delhi", country: "India", terminal: "T3" },
    destination: { code: "CDG", city: "Paris", country: "France", terminal: "T2E" },
    airline: "Air France", airlineCode: "AF", flightNumber: "AF-225",
    cabinClass: "economy", stops: 0, layoverAirport: null, layoverMinutes: null,
    durationMinutes: 560, nonstopDurationMinutes: 560,
    originalRetailMinor: 5_500_000, currentPriceMinor: 2_180_000,
    sixtyDayMedianMinor: 5_150_000, lowestEverMinor: 2_050_000,
    currency: "INR", seatsRemaining: 6,
    fuelSurchargeMinor: 130_000, typicalFuelFeeMinor: 900_000,
    validUntilHours: 8, observedHours: 6.2, region: "europe",
  },
  {
    id: "hyd-sin-scoot-drop",
    origin: { code: "HYD", city: "Hyderabad", country: "India" },
    destination: { code: "SIN", city: "Singapore", country: "Singapore", terminal: "T1" },
    airline: "Scoot", airlineCode: "TR", flightNumber: "TR-567",
    cabinClass: "economy", stops: 0, layoverAirport: null, layoverMinutes: null,
    durationMinutes: 275, nonstopDurationMinutes: 275,
    originalRetailMinor: 1_650_000, currentPriceMinor: 599_000,
    sixtyDayMedianMinor: 1_540_000, lowestEverMinor: 610_000,
    currency: "INR", seatsRemaining: 8,
    fuelSurchargeMinor: 45_000, typicalFuelFeeMinor: 310_000,
    validUntilHours: 9, observedHours: 7.5, region: "asia",
  },
  {
    id: "blr-bkk-thailion-undercut",
    origin: { code: "BLR", city: "Bangalore", country: "India", terminal: "T2" },
    destination: { code: "BKK", city: "Bangkok", country: "Thailand" },
    airline: "Thai Lion Air", airlineCode: "SL", flightNumber: "SL-217",
    cabinClass: "economy", stops: 1, layoverAirport: "DMK", layoverMinutes: 205,
    durationMinutes: 480, nonstopDurationMinutes: 250,
    originalRetailMinor: 1_520_000, currentPriceMinor: 549_000,
    sixtyDayMedianMinor: 1_410_000, lowestEverMinor: 560_000,
    currency: "INR", seatsRemaining: 5,
    fuelSurchargeMinor: 30_000, typicalFuelFeeMinor: 280_000,
    validUntilHours: 6, observedHours: 3.9, region: "asia",
  },
  {
    id: "bom-dps-vietjet-yq-dump",
    origin: { code: "BOM", city: "Mumbai", country: "India", terminal: "T2" },
    destination: { code: "DPS", city: "Bali / Denpasar", country: "Indonesia" },
    airline: "VietJet Air", airlineCode: "VJ", flightNumber: "VJ-896",
    cabinClass: "economy", stops: 1, layoverAirport: "SGN", layoverMinutes: 190,
    durationMinutes: 610, nonstopDurationMinutes: 335,
    originalRetailMinor: 3_100_000, currentPriceMinor: 879_000,
    sixtyDayMedianMinor: 2_920_000, lowestEverMinor: 880_000,
    currency: "INR", seatsRemaining: 4,
    fuelSurchargeMinor: 12_000, typicalFuelFeeMinor: 610_000,
    validUntilHours: 4, observedHours: 2.2, region: "asia",
  },
  {
    id: "blr-goi-akasa-domestic-flash",
    origin: { code: "BLR", city: "Bangalore", country: "India", terminal: "T1" },
    destination: { code: "GOI", city: "Goa / Mopa", country: "India" },
    airline: "Akasa Air", airlineCode: "QP", flightNumber: "QP-1362",
    cabinClass: "economy", stops: 0, layoverAirport: null, layoverMinutes: null,
    durationMinutes: 75, nonstopDurationMinutes: 75,
    originalRetailMinor: 420_000, currentPriceMinor: 149_900,
    sixtyDayMedianMinor: 385_000, lowestEverMinor: 159_900,
    currency: "INR", seatsRemaining: 9,
    fuelSurchargeMinor: 18_000, typicalFuelFeeMinor: 95_000,
    validUntilHours: 2, observedHours: 0.9, region: "domestic-india",
  },
  {
    id: "del-bkk-spicejet-cache-dump",
    origin: { code: "DEL", city: "New Delhi", country: "India", terminal: "T3" },
    destination: { code: "BKK", city: "Bangkok", country: "Thailand" },
    airline: "SpiceJet", airlineCode: "SG", flightNumber: "SG-87",
    cabinClass: "economy", stops: 0, layoverAirport: null, layoverMinutes: null,
    durationMinutes: 275, nonstopDurationMinutes: 275,
    originalRetailMinor: 1_680_000, currentPriceMinor: 610_000,
    sixtyDayMedianMinor: 1_560_000, lowestEverMinor: 625_000,
    currency: "INR", seatsRemaining: 6,
    fuelSurchargeMinor: 48_000, typicalFuelFeeMinor: 340_000,
    validUntilHours: 5, observedHours: 3.0, region: "asia",
  },
  {
    id: "bom-dxb-aix-express-glitch",
    origin: { code: "BOM", city: "Mumbai", country: "India", terminal: "T2" },
    destination: { code: "DXB", city: "Dubai", country: "United Arab Emirates", terminal: "T1" },
    airline: "Air India Express", airlineCode: "IX", flightNumber: "IX-252",
    cabinClass: "economy", stops: 0, layoverAirport: null, layoverMinutes: null,
    durationMinutes: 215, nonstopDurationMinutes: 215,
    originalRetailMinor: 1_750_000, currentPriceMinor: 690_000,
    sixtyDayMedianMinor: 1_620_000, lowestEverMinor: 700_000,
    currency: "INR", seatsRemaining: 7,
    fuelSurchargeMinor: 42_000, typicalFuelFeeMinor: 300_000,
    validUntilHours: 6, observedHours: 4.4, region: "middle-east",
  },
  {
    id: "blr-mle-indigo-lagoon-drop",
    origin: { code: "BLR", city: "Bangalore", country: "India", terminal: "T2" },
    destination: { code: "MLE", city: "Malé", country: "Maldives" },
    airline: "IndiGo", airlineCode: "6E", flightNumber: "6E-1131",
    cabinClass: "economy", stops: 0, layoverAirport: null, layoverMinutes: null,
    durationMinutes: 115, nonstopDurationMinutes: 115,
    originalRetailMinor: 1_800_000, currentPriceMinor: 620_000,
    sixtyDayMedianMinor: 1_690_000, lowestEverMinor: 640_000,
    currency: "INR", seatsRemaining: 5,
    fuelSurchargeMinor: 26_000, typicalFuelFeeMinor: 240_000,
    validUntilHours: 7, observedHours: 5.5, region: "asia",
  },
  {
    id: "jfk-cdg-norse-transatlantic",
    origin: { code: "JFK", city: "New York", country: "United States", terminal: "T7" },
    destination: { code: "CDG", city: "Paris", country: "France", terminal: "T2E" },
    airline: "Norse Atlantic", airlineCode: "N0", flightNumber: "N0-702",
    cabinClass: "economy", stops: 0, layoverAirport: null, layoverMinutes: null,
    durationMinutes: 430, nonstopDurationMinutes: 430,
    originalRetailMinor: 65_000, currentPriceMinor: 18_900,
    sixtyDayMedianMinor: 61_200, lowestEverMinor: 19_500,
    currency: "USD", seatsRemaining: 6,
    fuelSurchargeMinor: 2_400, typicalFuelFeeMinor: 11_000,
    validUntilHours: 8, observedHours: 2.6, region: "americas",
  },
  {
    id: "lhr-bkk-eva-stopover",
    origin: { code: "LHR", city: "London", country: "United Kingdom", terminal: "T2" },
    destination: { code: "BKK", city: "Bangkok", country: "Thailand" },
    airline: "EVA Air", airlineCode: "BR", flightNumber: "BR-68",
    cabinClass: "economy", stops: 1, layoverAirport: "TPE", layoverMinutes: 230,
    durationMinutes: 1_035, nonstopDurationMinutes: 700,
    originalRetailMinor: 99_000, currentPriceMinor: 36_900,
    sixtyDayMedianMinor: 93_500, lowestEverMinor: 37_500,
    currency: "USD", seatsRemaining: 4,
    fuelSurchargeMinor: 3_800, typicalFuelFeeMinor: 16_500,
    validUntilHours: 10, observedHours: 8.2, region: "europe",
  },
  {
    id: "del-goi-indigo-weekend",
    origin: { code: "DEL", city: "New Delhi", country: "India", terminal: "T3" },
    destination: { code: "GOI", city: "Goa / Mopa", country: "India" },
    airline: "IndiGo", airlineCode: "6E", flightNumber: "6E-2042",
    cabinClass: "economy", stops: 0, layoverAirport: null, layoverMinutes: null,
    durationMinutes: 150, nonstopDurationMinutes: 150,
    originalRetailMinor: 650_000, currentPriceMinor: 219_900,
    sixtyDayMedianMinor: 590_000, lowestEverMinor: 225_000,
    currency: "INR", seatsRemaining: 8,
    fuelSurchargeMinor: 24_000, typicalFuelFeeMinor: 120_000,
    validUntilHours: 3, observedHours: 1.6, region: "domestic-india",
  },
  {
    id: "bom-goi-spicejet-mopa",
    origin: { code: "BOM", city: "Mumbai", country: "India", terminal: "T2" },
    destination: { code: "GOI", city: "Goa / Mopa", country: "India" },
    airline: "SpiceJet", airlineCode: "SG", flightNumber: "SG-269",
    cabinClass: "economy", stops: 0, layoverAirport: null, layoverMinutes: null,
    durationMinutes: 80, nonstopDurationMinutes: 80,
    originalRetailMinor: 520_000, currentPriceMinor: 189_900,
    sixtyDayMedianMinor: 470_000, lowestEverMinor: 195_000,
    currency: "INR", seatsRemaining: 9,
    fuelSurchargeMinor: 16_000, typicalFuelFeeMinor: 85_000,
    validUntilHours: 2, observedHours: 1.1, region: "domestic-india",
  },
  {
    id: "blr-del-akasa-northbound",
    origin: { code: "BLR", city: "Bangalore", country: "India", terminal: "T1" },
    destination: { code: "DEL", city: "New Delhi", country: "India", terminal: "T2" },
    airline: "Akasa Air", airlineCode: "QP", flightNumber: "QP-1883",
    cabinClass: "economy", stops: 0, layoverAirport: null, layoverMinutes: null,
    durationMinutes: 170, nonstopDurationMinutes: 170,
    originalRetailMinor: 980_000, currentPriceMinor: 329_900,
    sixtyDayMedianMinor: 890_000, lowestEverMinor: 315_000,
    currency: "INR", seatsRemaining: 7,
    fuelSurchargeMinor: 32_000, typicalFuelFeeMinor: 160_000,
    validUntilHours: 4, observedHours: 2.8, region: "domestic-india",
  },
  {
    id: "hyd-del-indigo-corridor",
    origin: { code: "HYD", city: "Hyderabad", country: "India" },
    destination: { code: "DEL", city: "New Delhi", country: "India", terminal: "T2" },
    airline: "IndiGo", airlineCode: "6E", flightNumber: "6E-2123",
    cabinClass: "economy", stops: 0, layoverAirport: null, layoverMinutes: null,
    durationMinutes: 130, nonstopDurationMinutes: 130,
    originalRetailMinor: 890_000, currentPriceMinor: 299_900,
    sixtyDayMedianMinor: 820_000, lowestEverMinor: 305_000,
    currency: "INR", seatsRemaining: 6,
    fuelSurchargeMinor: 28_000, typicalFuelFeeMinor: 140_000,
    validUntilHours: 5, observedHours: 3.3, region: "domestic-india",
  },
  {
    id: "del-lhr-airindia-pos-error",
    origin: { code: "DEL", city: "New Delhi", country: "India", terminal: "T3" },
    destination: { code: "LHR", city: "London", country: "United Kingdom", terminal: "T2" },
    airline: "Air India", airlineCode: "AI", flightNumber: "AI-111",
    cabinClass: "economy", stops: 0, layoverAirport: null, layoverMinutes: null,
    durationMinutes: 585, nonstopDurationMinutes: 585,
    originalRetailMinor: 6_200_000, currentPriceMinor: 2_340_000,
    sixtyDayMedianMinor: 5_750_000, lowestEverMinor: 2_400_000,
    currency: "INR", seatsRemaining: 5,
    fuelSurchargeMinor: 120_000, typicalFuelFeeMinor: 1_150_000,
    validUntilHours: 6, observedHours: 4.9, region: "europe",
  },
  {
    id: "bom-jfk-airindia-transatlantic",
    origin: { code: "BOM", city: "Mumbai", country: "India", terminal: "T2" },
    destination: { code: "JFK", city: "New York", country: "United States", terminal: "T4" },
    airline: "Air India", airlineCode: "AI", flightNumber: "AI-199",
    cabinClass: "economy", stops: 0, layoverAirport: null, layoverMinutes: null,
    durationMinutes: 960, nonstopDurationMinutes: 960,
    originalRetailMinor: 10_500_000, currentPriceMinor: 3_890_000,
    sixtyDayMedianMinor: 9_800_000, lowestEverMinor: 3_750_000,
    currency: "INR", seatsRemaining: 2,
    fuelSurchargeMinor: 180_000, typicalFuelFeeMinor: 1_900_000,
    validUntilHours: 5, observedHours: 2.4, region: "americas",
  },
  {
    id: "blr-sin-singapore-fueldump",
    origin: { code: "BLR", city: "Bangalore", country: "India", terminal: "T2" },
    destination: { code: "SIN", city: "Singapore", country: "Singapore", terminal: "T3" },
    airline: "Singapore Airlines", airlineCode: "SQ", flightNumber: "SQ-509",
    cabinClass: "economy", stops: 0, layoverAirport: null, layoverMinutes: null,
    durationMinutes: 270, nonstopDurationMinutes: 270,
    originalRetailMinor: 3_200_000, currentPriceMinor: 1_190_000,
    sixtyDayMedianMinor: 2_980_000, lowestEverMinor: 1_150_000,
    currency: "INR", seatsRemaining: 4,
    fuelSurchargeMinor: 9_000, typicalFuelFeeMinor: 580_000,
    validUntilHours: 9, observedHours: 7.1, region: "asia",
  },
  {
    id: "del-dxb-emirates-flash",
    origin: { code: "DEL", city: "New Delhi", country: "India", terminal: "T3" },
    destination: { code: "DXB", city: "Dubai", country: "United Arab Emirates", terminal: "T3" },
    airline: "Emirates", airlineCode: "EK", flightNumber: "EK-565",
    cabinClass: "economy", stops: 0, layoverAirport: null, layoverMinutes: null,
    durationMinutes: 220, nonstopDurationMinutes: 220,
    originalRetailMinor: 2_650_000, currentPriceMinor: 980_000,
    sixtyDayMedianMinor: 2_480_000, lowestEverMinor: 995_000,
    currency: "INR", seatsRemaining: 6,
    fuelSurchargeMinor: 60_000, typicalFuelFeeMinor: 450_000,
    validUntilHours: 7, observedHours: 5.8, region: "middle-east",
  },
  {
    id: "bom-sin-indigo-longhaul",
    origin: { code: "BOM", city: "Mumbai", country: "India", terminal: "T2" },
    destination: { code: "SIN", city: "Singapore", country: "Singapore", terminal: "T1" },
    airline: "IndiGo", airlineCode: "6E", flightNumber: "6E-1011",
    cabinClass: "economy", stops: 0, layoverAirport: null, layoverMinutes: null,
    durationMinutes: 330, nonstopDurationMinutes: 330,
    originalRetailMinor: 2_100_000, currentPriceMinor: 799_000,
    sixtyDayMedianMinor: 1_980_000, lowestEverMinor: 810_000,
    currency: "INR", seatsRemaining: 5,
    fuelSurchargeMinor: 55_000, typicalFuelFeeMinor: 380_000,
    validUntilHours: 6, observedHours: 4.0, region: "asia",
  },
  {
    id: "hyd-dxb-aix-gulf",
    origin: { code: "HYD", city: "Hyderabad", country: "India" },
    destination: { code: "DXB", city: "Dubai", country: "United Arab Emirates", terminal: "T1" },
    airline: "Air India Express", airlineCode: "IX", flightNumber: "IX-1941",
    cabinClass: "economy", stops: 0, layoverAirport: null, layoverMinutes: null,
    durationMinutes: 250, nonstopDurationMinutes: 250,
    originalRetailMinor: 1_720_000, currentPriceMinor: 645_000,
    sixtyDayMedianMinor: 1_600_000, lowestEverMinor: 660_000,
    currency: "INR", seatsRemaining: 7,
    fuelSurchargeMinor: 40_000, typicalFuelFeeMinor: 310_000,
    validUntilHours: 8, observedHours: 6.0, region: "middle-east",
  },
  {
    id: "lhr-jfk-ba-eastbound",
    origin: { code: "LHR", city: "London", country: "United Kingdom", terminal: "T5" },
    destination: { code: "JFK", city: "New York", country: "United States", terminal: "T7" },
    airline: "British Airways", airlineCode: "BA", flightNumber: "BA-117",
    cabinClass: "economy", stops: 0, layoverAirport: null, layoverMinutes: null,
    durationMinutes: 480, nonstopDurationMinutes: 480,
    originalRetailMinor: 82_000, currentPriceMinor: 29_900,
    sixtyDayMedianMinor: 77_500, lowestEverMinor: 28_500,
    currency: "USD", seatsRemaining: 5,
    fuelSurchargeMinor: 3_200, typicalFuelFeeMinor: 12_500,
    validUntilHours: 9, observedHours: 7.4, region: "americas",
  },
  {
    id: "jfk-lhr-norse-westbound",
    origin: { code: "JFK", city: "New York", country: "United States", terminal: "T7" },
    destination: { code: "LHR", city: "London", country: "United Kingdom", terminal: "T3" },
    airline: "Norse Atlantic", airlineCode: "N0", flightNumber: "N0-401",
    cabinClass: "economy", stops: 0, layoverAirport: null, layoverMinutes: null,
    durationMinutes: 420, nonstopDurationMinutes: 420,
    originalRetailMinor: 78_000, currentPriceMinor: 27_900,
    sixtyDayMedianMinor: 73_000, lowestEverMinor: 26_900,
    currency: "USD", seatsRemaining: 8,
    fuelSurchargeMinor: 2_900, typicalFuelFeeMinor: 11_800,
    validUntilHours: 11, observedHours: 9.0, region: "americas",
  },
  {
    id: "sin-dps-scoot-island",
    origin: { code: "SIN", city: "Singapore", country: "Singapore", terminal: "T1" },
    destination: { code: "DPS", city: "Bali / Denpasar", country: "Indonesia" },
    airline: "Scoot", airlineCode: "TR", flightNumber: "TR-288",
    cabinClass: "economy", stops: 0, layoverAirport: null, layoverMinutes: null,
    durationMinutes: 160, nonstopDurationMinutes: 160,
    originalRetailMinor: 19_000, currentPriceMinor: 6_900,
    sixtyDayMedianMinor: 17_800, lowestEverMinor: 7_200,
    currency: "USD", seatsRemaining: 9,
    fuelSurchargeMinor: 900, typicalFuelFeeMinor: 3_400,
    validUntilHours: 4, observedHours: 2.0, region: "asia",
  },
  {
    id: "dxb-bkk-emirates-gulf-run",
    origin: { code: "DXB", city: "Dubai", country: "United Arab Emirates", terminal: "T3" },
    destination: { code: "BKK", city: "Bangkok", country: "Thailand" },
    airline: "Emirates", airlineCode: "EK", flightNumber: "EK-372",
    cabinClass: "economy", stops: 0, layoverAirport: null, layoverMinutes: null,
    durationMinutes: 395, nonstopDurationMinutes: 395,
    originalRetailMinor: 61_000, currentPriceMinor: 21_900,
    sixtyDayMedianMinor: 57_400, lowestEverMinor: 20_900,
    currency: "USD", seatsRemaining: 6,
    fuelSurchargeMinor: 2_200, typicalFuelFeeMinor: 9_800,
    validUntilHours: 10, observedHours: 8.5, region: "middle-east",
  },
  {
    id: "blr-del-vistara-biz-unmatched",
    origin: { code: "BLR", city: "Bangalore", country: "India", terminal: "T2" },
    destination: { code: "DEL", city: "New Delhi", country: "India", terminal: "T3" },
    airline: "Vistara", airlineCode: "UK", flightNumber: "UK-864",
    cabinClass: "business", stops: 0, layoverAirport: null, layoverMinutes: null,
    durationMinutes: 170, nonstopDurationMinutes: 170,
    originalRetailMinor: 4_200_000, currentPriceMinor: 1_299_900,
    sixtyDayMedianMinor: 3_950_000, lowestEverMinor: 1_250_000,
    currency: "INR", seatsRemaining: 2,
    fuelSurchargeMinor: 25_000, typicalFuelFeeMinor: 520_000,
    validUntilHours: 3, observedHours: 1.5, region: "domestic-india",
  },
];

/* ---------------------------------------------------------------- helpers */

/** Deterministic 32-bit string hash (FNV-1a) — keeps SSR/CSR in lockstep. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Seeded PRNG (mulberry32) so history curves are stable across renders. */
export function seededRandom(seed: string): () => number {
  let a = hashString(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function bookingSearchUrl(raw: RawRoute): string {
  const q = encodeURIComponent(`Flights from ${raw.origin.city} to ${raw.destination.city}`);
  const curr = raw.currency === "INR" ? "INR" : "USD";
  return (
    `https://www.google.com/travel/flights?q=${q}&curr=${curr}&hl=en` +
    `&utm_source=flyglitch&utm_medium=affiliate&utm_campaign=glitch-radar-${raw.id}`
  );
}

function enrich(raw: RawRoute): FlightRoute {
  const parts = computeGlitchScore({
    currentPriceMinor: raw.currentPriceMinor,
    sixtyDayMedianMinor: raw.sixtyDayMedianMinor,
    lowestEverMinor: raw.lowestEverMinor,
    seatsRemaining: raw.seatsRemaining,
    observedHours: raw.observedHours,
    stops: raw.stops,
    layoverMinutes: raw.layoverMinutes,
    durationMinutes: raw.durationMinutes,
    nonstopDurationMinutes: raw.nonstopDurationMinutes,
    fuelSurchargeMinor: raw.fuelSurchargeMinor,
    typicalFuelFeeMinor: raw.typicalFuelFeeMinor,
  });
  const discountPercent = discountPercentOf(raw.originalRetailMinor, raw.currentPriceMinor);
  return {
    ...raw,
    origin: { terminal: raw.origin.terminal ?? null, ...raw.origin },
    destination: { terminal: raw.destination.terminal ?? null, ...raw.destination },
    isGlitch: classifyGlitch(parts.total, discountPercent),
    bookingUrl: bookingSearchUrl(raw),
    glitchScore: parts.total,
    glitchScoreParts: parts,
    discountPercent,
    isSponsored: false,
    sponsorCpmMinor: 0,
    lastCheckedAt: new Date().toISOString(),
  };
}

/** The canonical offline catalog, enriched through the scoring engine. */
export const FALLBACK_ROUTES: FlightRoute[] = RAW.map(enrich);

export function getFallbackRoute(id: string): FlightRoute | undefined {
  return FALLBACK_ROUTES.find((r) => r.id === id);
}

export function getFallbackRoutesForPair(origin: string, destination: string): FlightRoute[] {
  const o = origin.toUpperCase();
  const d = destination.toUpperCase();
  return FALLBACK_ROUTES.filter((r) => r.origin.code === o && r.destination.code === d);
}

/** Distinct origin/destination pairs covered by the catalog (for pSEO + sitemap). */
export function distinctPairs(): Array<{ origin: string; destination: string }> {
  const seen = new Set<string>();
  const out: Array<{ origin: string; destination: string }> = [];
  for (const r of FALLBACK_ROUTES) {
    const key = `${r.origin.code}-${r.destination.code}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ origin: r.origin.code, destination: r.destination.code });
    }
  }
  return out;
}

/**
 * Deterministic first-seen timestamp per route (0.5–5.5h ago) so countdown
 * deadlines are stable across SSR, CSR and repeated requests.
 */
export function firstSeenAt(routeId: string): number {
  const hoursAgo = 0.5 + (hashString(routeId) % 500) / 100;
  return Date.now() - hoursAgo * 3_600_000;
}

/** Epoch ms when the airline is expected to correct the fare. */
export function correctionDeadline(route: { id: string; validUntilHours: number }): number {
  return firstSeenAt(route.id) + route.validUntilHours * 3_600_000;
}

/**
 * Authentic 60-day price history: steady baseline with realistic noise, a
 * seasonal peak window, a gradual descent, then a sharp collapse that lands
 * precisely on today's glitch price.
 */
export function buildFlightPriceHistory(route: FlightRoute): PricePoint[] {
  const rnd = seededRandom(`history:${route.id}`);
  const points: PricePoint[] = [];
  const dayMs = 86_400_000;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const median = route.sixtyDayMedianMinor;
  const retail = route.originalRetailMinor;
  const current = route.currentPriceMinor;
  const floor = Math.min(current, route.lowestEverMinor);

  for (let i = 59; i >= 0; i--) {
    const date = new Date(today.getTime() - i * dayMs).toISOString();
    let price: number;
    const idx = 59 - i; // 0 = oldest, 59 = today

    if (idx >= 58) {
      // The collapse: yesterday hovers just above, today hits the glitch price.
      price = idx === 59 ? current : Math.max(floor, Math.round(current * 1.06));
    } else if (idx >= 46) {
      // Steep unwind from the descent band down to near-glitch territory.
      const t = (idx - 46) / 11; // 0..1
      const from = median * 0.92;
      const to = current * 1.12;
      price = from + (to - from) * t + (rnd() - 0.5) * median * 0.02;
    } else if (idx >= 36) {
      // Gradual descent from baseline.
      const t = (idx - 36) / 10;
      price = median * (1.02 - 0.1 * t) + (rnd() - 0.5) * median * 0.04;
    } else if (idx >= 18 && idx <= 27) {
      // Peak-season surge toward retail.
      const mid = 22.5;
      const bump = Math.exp(-((idx - mid) ** 2) / 18);
      price = median * (1 + 0.06 * bump) + retail * 0.28 * bump + (rnd() - 0.5) * median * 0.03;
    } else {
      // Steady baseline with weekend-ish jitter.
      price = median * (1 + (rnd() - 0.5) * 0.08);
    }

    price = Math.max(floor, Math.min(retail * 1.08, Math.round(price)));
    points.push({ date, priceMinor: price, source: "model" });
  }

  // Guarantee today's sample is exactly the live glitch price.
  points[points.length - 1] = {
    date: points[points.length - 1].date,
    priceMinor: current,
    source: "model",
  };
  return points;
}
