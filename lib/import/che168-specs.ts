/**
 * The "Full specifications" sheet for an imported car, built from che168's
 * parameter feed (lib/import/che168-api.ts).
 *
 * Numbers are copied literally with their units: a wheelbase or a torque
 * figure is never passed through the AI. Text values (suspension type, brakes,
 * gearbox…) are translated from a fixed glossary of che168's wording; only a
 * term the glossary doesn't know goes to DeepSeek for a translation, and a row
 * whose term comes back untranslated is left out rather than shown in Chinese.
 *
 * The Chinese emissions standard (国VI) is deliberately not shown: "China 6"
 * on a listing would reveal where the car is sourced, which the storefront
 * keeps out of every listing.
 */
import { specRows, type ListingFeeds } from "@/lib/import/che168-api";
import type { CarSpecGroup, CarSpecRow } from "@/lib/types";

/** che168's spec wording → buyer-facing English. */
const GLOSSARY: Record<string, string> = {
  // Aspiration and injection
  自然吸气: "Naturally aspirated",
  涡轮增压: "Turbocharged",
  双涡轮增压: "Twin-turbocharged",
  机械增压: "Supercharged",
  "涡轮增压+机械增压": "Turbo + supercharged",
  多点电喷: "Multi-point injection",
  直喷: "Direct injection",
  缸内直喷: "Direct injection",
  混合喷射: "Port + direct injection",
  // Gearboxes
  "无级变速箱(CVT)": "CVT (continuously variable)",
  "双离合变速箱(DCT)": "Dual-clutch (DCT)",
  "自动变速箱(AT)": "Automatic (AT)",
  "手动变速箱(MT)": "Manual (MT)",
  "机械式自动变速箱(AMT)": "Automated manual (AMT)",
  固定齿比变速箱: "Single-speed",
  电动车单速变速箱: "Single-speed",
  // Drive layout
  前置前驱: "Front engine, front-wheel drive",
  前置后驱: "Front engine, rear-wheel drive",
  前置四驱: "Front engine, all-wheel drive",
  后置后驱: "Rear engine, rear-wheel drive",
  中置后驱: "Mid engine, rear-wheel drive",
  后置四驱: "Rear engine, all-wheel drive",
  中置四驱: "Mid engine, all-wheel drive",
  双电机四驱: "Dual-motor all-wheel drive",
  适时四驱: "On-demand four-wheel drive",
  全时四驱: "Full-time four-wheel drive",
  分时四驱: "Part-time four-wheel drive",
  电动四驱: "Electric all-wheel drive",
  // Suspension
  麦弗逊式独立悬架: "MacPherson strut, independent",
  扭力梁式非独立悬架: "Torsion beam, semi-independent",
  多连杆式独立悬架: "Multi-link, independent",
  双叉臂式独立悬架: "Double wishbone, independent",
  双横臂式独立悬架: "Double wishbone, independent",
  五连杆式独立悬架: "Five-link, independent",
  四连杆式独立悬架: "Four-link, independent",
  整体桥式非独立悬架: "Solid axle",
  钢板弹簧式非独立悬架: "Leaf spring",
  // Steering, body
  电动助力: "Electric power steering",
  机械液压助力: "Hydraulic power steering",
  电子液压助力: "Electro-hydraulic power steering",
  承载式: "Unibody",
  非承载式: "Body-on-frame",
  // Brakes and spare
  通风盘式: "Ventilated disc",
  盘式: "Disc",
  鼓式: "Drum",
  陶瓷通风盘式: "Ceramic ventilated disc",
  电子驻车: "Electronic",
  手刹: "Hand lever",
  脚刹: "Foot-operated",
  非全尺寸: "Space-saver",
  全尺寸: "Full-size",
  无: "None",
  // Materials and fuel
  铝合金: "Aluminium alloy",
  铸铁: "Cast iron",
  汽油: "Petrol",
  柴油: "Diesel",
  // EV
  三元锂电池: "Lithium-ion (NMC)",
  磷酸铁锂电池: "Lithium iron phosphate (LFP)",
  单电机: "Single motor",
  双电机: "Dual motor",
};

/** che168 writes cylinder layout as a single letter. */
const LAYOUTS: Record<string, string> = { L: "Inline", V: "V", H: "Flat", W: "W" };

const num = (s: string | undefined): number | undefined => {
  if (s == null) return undefined;
  const n = Number(s.trim());
  return Number.isFinite(n) && n > 0 ? n : undefined;
};
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
/** A plain rpm figure or range ("6300", "1500-4000") as "6,300" / "1,500–4,000". */
const rpm = (s: string | undefined) => {
  const m = s?.trim().match(/^(\d+)(?:\s*[-–~]\s*(\d+))?$/);
  if (!m) return undefined;
  return m[2] ? `${fmt(+m[1])}–${fmt(+m[2])}` : fmt(+m[1]);
};
/** Literal values that need no translation: tyre sizes, DOHC, model codes. */
const latin = (s: string | undefined) =>
  s && /^[\x20-\x7E·×]+$/.test(s.trim()) ? s.trim() : undefined;

type Rows = Map<string, string>;
type Translate = (term: string | undefined) => string | undefined;

/** One number with its unit, from the first of `names` that has it. */
function measure(rows: Rows, names: string[], unit: string): string | undefined {
  for (const name of names) {
    const n = num(rows.get(name));
    if (n != null) return `${fmt(n)} ${unit}`;
  }
  return undefined;
}

function groups(rows: Rows, t: Translate): CarSpecGroup[] {
  const row = (label: string, value: string | undefined): CarSpecRow | null =>
    value ? { label, value } : null;

  // Engine & performance
  const cylinders = num(rows.get("气缸数(个)"));
  const layout = LAYOUTS[rows.get("气缸排列形式")?.trim() ?? ""];
  const ps = num(rows.get("最大马力(Ps)"));
  const kw = num(rows.get("最大功率(kW)"));
  const powerAt = rpm(rows.get("最大功率转速(rpm)"));
  const nm = num(rows.get("最大扭矩(N·m)"));
  const torqueAt = rpm(rows.get("最大扭矩转速(rpm)"));
  const grade = rows.get("燃油标号")?.match(/^(\d{2,3})号$/);
  const economy =
    (num(rows.get("WLTC综合油耗(L/100km)")) && ["WLTC", rows.get("WLTC综合油耗(L/100km)")!]) ||
    (num(rows.get("NEDC综合油耗(L/100km)")) && ["NEDC", rows.get("NEDC综合油耗(L/100km)")!]) ||
    (num(rows.get("综合油耗(L/100km)")) && ["", rows.get("综合油耗(L/100km)")!]) ||
    undefined;

  const engine = [
    row("Engine code", latin(rows.get("发动机型号"))),
    row("Displacement", measure(rows, ["排量(mL)"], "cc")),
    row("Aspiration", t(rows.get("进气形式"))),
    row(
      "Cylinders",
      cylinders ? (layout ? `${layout} ${cylinders}` : String(cylinders)) : undefined,
    ),
    row("Valves per cylinder", num(rows.get("每缸气门数(个)"))?.toString()),
    row("Valvetrain", latin(rows.get("配气机构"))),
    row(
      "Max power",
      ps || kw
        ? [ps ? `${fmt(ps)} PS` : "", kw ? (ps ? `(${fmt(kw)} kW)` : `${fmt(kw)} kW`) : "", powerAt ? `at ${powerAt} rpm` : ""]
            .filter(Boolean)
            .join(" ")
        : undefined,
    ),
    row("Max torque", nm ? `${fmt(nm)} N·m${torqueAt ? ` at ${torqueAt} rpm` : ""}` : undefined),
    row("Fuel injection", t(rows.get("供油方式"))),
    row("Fuel grade", grade ? `RON ${grade[1]}` : undefined),
    row("Top speed", measure(rows, ["最高车速(km/h)"], "km/h")),
    row("0–100 km/h", measure(rows, ["官方0-100km/h加速(s)"], "s")),
    row(
      economy && economy[0] ? `Fuel economy (${economy[0]})` : "Fuel economy",
      economy ? `${fmt(+economy[1])} L/100 km` : undefined,
    ),
  ];

  const electric = [
    row("Motor", t(rows.get("驱动电机数"))),
    row("Motor power", measure(rows, ["电动机总功率(kW)"], "kW")),
    row("Motor torque", measure(rows, ["电动机总扭矩(N·m)"], "N·m")),
    row("Battery type", t(rows.get("电池类型"))),
    row("Battery capacity", measure(rows, ["电池能量(kWh)"], "kWh")),
    row("Range (CLTC)", measure(rows, ["CLTC纯电续航里程(km)"], "km")),
    row("Range (WLTC)", measure(rows, ["WLTC纯电续航里程(km)"], "km")),
    row("Range (NEDC)", measure(rows, ["NEDC纯电续航里程(km)"], "km")),
    row("Fast charge", measure(rows, ["电池快充时间(小时)"], "h")),
  ];

  const gears = num(rows.get("挡位个数"));
  const drivetrain = [
    row("Transmission", t(rows.get("变速箱类型"))),
    row("Gears", gears ? String(gears) : undefined),
    row("Drive", t(rows.get("驱动方式"))),
    row("Four-wheel drive", t(rows.get("四驱形式"))),
  ];

  const chassis = [
    row("Front suspension", t(rows.get("前悬架类型"))),
    row("Rear suspension", t(rows.get("后悬架类型"))),
    row("Steering", t(rows.get("助力类型"))),
    row("Body construction", t(rows.get("车体结构"))),
    row("Front brakes", t(rows.get("前制动器类型"))),
    row("Rear brakes", t(rows.get("后制动器类型"))),
    row("Parking brake", t(rows.get("驻车制动类型"))),
  ];

  const front = latin(rows.get("前轮胎规格"));
  const rear = latin(rows.get("后轮胎规格"));
  const wheels = [
    row(front && front === rear ? "Tyres" : "Front tyres", front),
    row("Rear tyres", rear && rear !== front ? rear : undefined),
    row("Spare wheel", t(rows.get("备胎规格"))),
  ];

  const l = num(rows.get("长度(mm)"));
  const w = num(rows.get("宽度(mm)"));
  const h = num(rows.get("高度(mm)"));
  const dimensions = [
    row("Length × width × height", l && w && h ? `${fmt(l)} × ${fmt(w)} × ${fmt(h)} mm` : undefined),
    row("Wheelbase", measure(rows, ["轴距(mm)"], "mm")),
    row("Ground clearance", measure(rows, ["最小离地间隙(mm)", "满载最小离地间隙(mm)"], "mm")),
    row("Turning radius", measure(rows, ["最小转弯半径(m)"], "m")),
    row("Approach angle", measure(rows, ["接近角(°)"], "°")?.replace(" °", "°")),
    row("Departure angle", measure(rows, ["离去角(°)"], "°")?.replace(" °", "°")),
    row("Kerb weight", measure(rows, ["整备质量(kg)"], "kg")),
    row("Gross weight", measure(rows, ["最大满载质量(kg)"], "kg")),
    row("Fuel tank", measure(rows, ["油箱容积(L)"], "L")),
    row("Boot capacity", measure(rows, ["后备厢容积(L)"], "L")),
  ];

  return [
    { title: "Engine & performance", rows: engine },
    { title: "Electric drive", rows: electric },
    { title: "Transmission & drivetrain", rows: drivetrain },
    { title: "Chassis, steering & brakes", rows: chassis },
    { title: "Wheels & tyres", rows: wheels },
    { title: "Dimensions & weight", rows: dimensions },
  ]
    .map((g) => ({ title: g.title, rows: g.rows.filter((r): r is CarSpecRow => r !== null) }))
    .filter((g) => g.rows.length > 0);
}

/**
 * The text values on this car's sheet the glossary doesn't know, for
 * DeepSeek to translate. Empty when the glossary covers everything.
 */
export function specTermsToTranslate(feeds: ListingFeeds, srcId: string): string[] {
  const unknown = new Set<string>();
  groups(specRows(feeds, srcId), (term) => {
    const s = term?.trim();
    if (s && !GLOSSARY[s] && !latin(s)) unknown.add(s);
    return undefined;
  });
  return [...unknown];
}

/**
 * The full specification sheet, in English. `aiTerms` are DeepSeek's
 * translations of specTermsToTranslate; a term with no usable translation
 * leaves its row out.
 */
export function buildSpecGroups(
  feeds: ListingFeeds,
  srcId: string,
  aiTerms: Record<string, string> = {},
): CarSpecGroup[] {
  const translate: Translate = (term) => {
    const s = term?.trim();
    if (!s) return undefined;
    if (GLOSSARY[s]) return GLOSSARY[s];
    const plain = latin(s);
    if (plain) return plain;
    const ai = aiTerms[s]?.trim();
    // Only a short, Latin-script translation is shown.
    return ai && ai.length <= 60 && latin(ai) ? ai : undefined;
  };
  return groups(specRows(feeds, srcId), translate);
}
