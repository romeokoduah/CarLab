/**
 * Ghana used-vehicle import duty estimator.
 *
 * IMPORTANT: this produces an ESTIMATE only. The binding figure comes from
 * ICUMS, which derives a Home Delivery Value (HDV) from the VIN, country of
 * origin and age — typically higher than market value. Rates also change with
 * each national budget, which is why the whole rate table lives in the database
 * (duty_config) and is editable from the admin rather than hardcoded here.
 *
 * Rate sources: GRA "Vehicle Importation" (duty bands + levies) and
 * trade.gov market intelligence (VAT 15%, overage brackets). GRA does not
 * publish a codified overage schedule — those brackets reflect broker practice.
 */

export type DutyFuel = "Petrol" | "Diesel";

/** Upper bound of an engine-capacity band, inclusive. `maxCc: null` = no limit. */
export interface DutyBand {
  maxCc: number | null;
  rate: number;
}

/** Age bracket: `minYears` inclusive, `maxYears` exclusive (`null` = no limit). */
export interface OverageBracket {
  minYears: number;
  maxYears: number | null;
  rate: number;
}

export interface DutyLevies {
  // Charged on CIF (part of the "customs levies").
  ecowas: number;
  au: number;
  specialImport: number;
  processingFee: number;
  examFee: number;
  // Charged on the taxable base (CIF + duty + customs levies).
  nhil: number;
  getfund: number;
  vat: number;
}

export interface DutyConfig {
  petrolBands: DutyBand[];
  dieselBands: DutyBand[];
  overage: OverageBracket[];
  levies: DutyLevies;
  /** Shown on the page so customers know how current the rates are. */
  note: string;
}

export const DEFAULT_DUTY_CONFIG: DutyConfig = {
  petrolBands: [
    { maxCc: 1000, rate: 5 },
    { maxCc: 3000, rate: 10 },
    { maxCc: null, rate: 20 },
  ],
  dieselBands: [
    { maxCc: 1500, rate: 5 },
    { maxCc: 2500, rate: 10 },
    { maxCc: null, rate: 20 },
  ],
  overage: [
    { minYears: 0, maxYears: 10, rate: 0 },
    { minYears: 10, maxYears: 12, rate: 12.5 },
    { minYears: 12, maxYears: null, rate: 20 },
  ],
  levies: {
    ecowas: 0.5,
    au: 0.2,
    specialImport: 2,
    processingFee: 1,
    examFee: 1,
    nhil: 2.5,
    getfund: 2.5,
    vat: 15,
  },
  note: "Rates per GRA and trade.gov, reviewed July 2026 (post 1 Jan 2026 VAT reforms; COVID-19 levy abolished).",
};

export interface DutyInput {
  /** Customs value (CIF) in GHS. */
  cif: number;
  fuel: DutyFuel;
  engineCc: number;
  yearOfManufacture: number;
  currentYear: number;
}

export interface DutyLine {
  label: string;
  /** What the rate is charged on — shown in the UI so the maths is auditable. */
  basis: string;
  rate: number;
  amount: number;
}

export interface DutyResult {
  cif: number;
  age: number;
  dutyRate: number;
  overageRate: number;
  lines: DutyLine[];
  total: number;
}

function bandRate(bands: DutyBand[], engineCc: number): number {
  for (const b of bands) {
    if (b.maxCc === null || engineCc <= b.maxCc) return b.rate;
  }
  return bands.length ? bands[bands.length - 1].rate : 0;
}

function overageRateFor(brackets: OverageBracket[], age: number): number {
  for (const b of brackets) {
    const aboveMin = age >= b.minYears;
    const belowMax = b.maxYears === null || age < b.maxYears;
    if (aboveMin && belowMax) return b.rate;
  }
  return 0;
}

/** Round to 2dp so floating-point noise never reaches the UI or the total. */
function money(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateDuty(
  input: DutyInput,
  config: DutyConfig = DEFAULT_DUTY_CONFIG,
): DutyResult {
  const cif = Number.isFinite(input.cif) && input.cif > 0 ? input.cif : 0;
  const engineCc = Number.isFinite(input.engineCc) ? input.engineCc : 0;
  const bands = input.fuel === "Diesel" ? config.dieselBands : config.petrolBands;
  const dutyRate = bandRate(bands, engineCc);

  const age = Math.max(0, input.currentYear - input.yearOfManufacture);
  const overageRate = overageRateFor(config.overage, age);

  const L = config.levies;
  const onCif = (rate: number) => money((cif * rate) / 100);

  const importDuty = onCif(dutyRate);
  const overagePenalty = onCif(overageRate);

  // Customs levies are charged on CIF.
  const ecowas = onCif(L.ecowas);
  const au = onCif(L.au);
  const specialImport = onCif(L.specialImport);
  const processingFee = onCif(L.processingFee);
  const examFee = onCif(L.examFee);

  // Taxable base = CIF + import duty + the customs levies above. NHIL, GETFund
  // and VAT (post-2026 reform) are each charged on this base. The overage
  // penalty is a separate charge and is not folded into the VAT base.
  const taxableBase = money(
    cif + importDuty + ecowas + au + specialImport + processingFee + examFee,
  );
  const onBase = (rate: number) => money((taxableBase * rate) / 100);
  const nhil = onBase(L.nhil);
  const getfund = onBase(L.getfund);
  const vat = onBase(L.vat);

  const BASE_LABEL = "CIF + Duty + levies";

  const lines: DutyLine[] = [
    { label: "Import Duty", basis: "CIF", rate: dutyRate, amount: importDuty },
  ];

  if (overageRate > 0) {
    lines.push({
      label: "Overage Penalty",
      basis: "CIF",
      rate: overageRate,
      amount: overagePenalty,
    });
  }

  lines.push(
    { label: "ECOWAS Levy", basis: "CIF", rate: L.ecowas, amount: ecowas },
    { label: "AU Levy", basis: "CIF", rate: L.au, amount: au },
    {
      label: "Special Import Levy",
      basis: "CIF",
      rate: L.specialImport,
      amount: specialImport,
    },
    {
      label: "Processing Fee",
      basis: "CIF",
      rate: L.processingFee,
      amount: processingFee,
    },
    { label: "Examination Fee", basis: "CIF", rate: L.examFee, amount: examFee },
    { label: "NHIL", basis: BASE_LABEL, rate: L.nhil, amount: nhil },
    { label: "GETFund Levy", basis: BASE_LABEL, rate: L.getfund, amount: getfund },
    { label: "VAT", basis: BASE_LABEL, rate: L.vat, amount: vat },
  );

  return {
    cif,
    age,
    dutyRate,
    overageRate,
    lines,
    total: money(lines.reduce((sum, l) => sum + l.amount, 0)),
  };
}
