/**
 * Vaccine definitions for India's National Immunization Schedule (UIP).
 *
 * Source: Ministry of Health & Family Welfare, National Immunization Schedule,
 * including the fIPV third dose introduced on 1 January 2023 and the nationwide
 * PCV rollout completed in 2021. JE is offered in endemic districts only.
 *
 * Due dates are calculated from the baby's date of birth. A dose is considered
 * "due" from its recommended age and "overdue" only once the recommended window
 * has closed, so parents aren't alarmed by a normal few days' delay.
 */

export type StageId = 'birth' | 'w6' | 'w10' | 'w14' | 'm9' | 'm16' | 'y2to5' | 'y5' | 'y10';

export type DoseId = string;

export type Stage = {
  id: StageId;
  label: string;
  short: string;
  monthOffset: number;
  /** exact age in days, used for the week-based visits */
  dayOffset?: number;
  /** absolute end of the recommended age window, in months */
  windowEndMonth: number;
  eyebrow: string;
  note: string;
};

export type DoseDef = {
  id: DoseId;
  name: string;
  short: string;
  stage: StageId;
  protects: string;
  route: string;
  detail: string;
  /** only shown when the parent turns on JE in settings */
  optional?: boolean;
  /** for stage-less timing (Vitamin A series uses these) */
  monthOffset?: number;
  tag?: string;
};

export const STAGES: Stage[] = [
  {
    id: 'birth',
    label: 'At birth',
    short: 'Birth',
    monthOffset: 0,
    dayOffset: 0,
    windowEndMonth: 0.5,
    eyebrow: 'Day 0',
    note: 'Before you leave the hospital.',
  },
  {
    id: 'w6',
    label: '6 weeks',
    short: '6 wks',
    monthOffset: 1.5,
    dayOffset: 42,
    windowEndMonth: 2.5,
    eyebrow: 'First visit',
    note: 'The first big round of protection.',
  },
  {
    id: 'w10',
    label: '10 weeks',
    short: '10 wks',
    monthOffset: 2.5,
    dayOffset: 70,
    windowEndMonth: 3.5,
    eyebrow: 'Second visit',
    note: 'A shorter visit than the last one.',
  },
  {
    id: 'w14',
    label: '14 weeks',
    short: '14 wks',
    monthOffset: 3.5,
    dayOffset: 98,
    windowEndMonth: 4.5,
    eyebrow: 'Third visit',
    note: 'Completes the primary doses.',
  },
  {
    id: 'm9',
    label: '9 months',
    short: '9 mths',
    monthOffset: 9,
    windowEndMonth: 12,
    eyebrow: 'Half birthday',
    note: 'Can be given until the first birthday.',
  },
  {
    id: 'm16',
    label: '16–24 months',
    short: '16 mths',
    monthOffset: 16,
    windowEndMonth: 24,
    eyebrow: 'Toddler visit',
    note: 'A wide window — any time between 16 and 24 months.',
  },
  {
    id: 'y2to5',
    label: '2–5 years',
    short: '2–5 yrs',
    monthOffset: 24,
    windowEndMonth: 60,
    eyebrow: 'Vitamin A series',
    note: 'Vitamin A, every six months until age five.',
  },
  {
    id: 'y5',
    label: '5–6 years',
    short: '5 yrs',
    monthOffset: 60,
    windowEndMonth: 72,
    eyebrow: 'Before school',
    note: 'One last booster before school.',
  },
  {
    id: 'y10',
    label: '10 & 16 years',
    short: '10+ yrs',
    monthOffset: 120,
    windowEndMonth: 204,
    eyebrow: 'Later childhood',
    note: 'Tetanus and diphtheria boosters.',
  },
];

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s])) as Record<StageId, Stage>;

export const DOSES: DoseDef[] = [
  // At birth
  {
    id: 'bcg',
    name: 'BCG',
    short: 'BCG',
    stage: 'birth',
    protects: 'Severe TB, including TB meningitis',
    route: 'Injection · left upper arm',
    detail: 'A single injection, usually given on the left upper arm. A small scar later is normal.',
  },
  {
    id: 'hepb0',
    name: 'Hepatitis B birth dose',
    short: 'Hep B',
    stage: 'birth',
    protects: 'Hepatitis B',
    route: 'Injection · thigh',
    detail: 'Best given within the first 24 hours of birth.',
  },
  {
    id: 'opv0',
    name: 'OPV 0',
    short: 'OPV 0',
    stage: 'birth',
    protects: 'Polio',
    route: 'Oral drops',
    detail: 'Two drops by mouth — the zero dose of the polio series.',
  },

  // 6 weeks
  {
    id: 'penta1',
    name: 'Pentavalent 1',
    short: 'Penta 1',
    stage: 'w6',
    protects: 'Diphtheria, tetanus, whooping cough, hepatitis B and Hib',
    route: 'Injection · thigh',
    detail: 'A five-in-one injection that covers five serious infections in a single shot.',
  },
  {
    id: 'opv1',
    name: 'OPV 1',
    short: 'OPV 1',
    stage: 'w6',
    protects: 'Polio',
    route: 'Oral drops',
    detail: 'Two drops by mouth.',
  },
  {
    id: 'rota1',
    name: 'Rotavirus 1',
    short: 'Rota 1',
    stage: 'w6',
    protects: 'Severe rotavirus diarrhoea',
    route: 'Oral',
    detail: 'An oral vaccine. The number of doses depends on the brand used in your state.',
  },
  {
    id: 'fipv1',
    name: 'fIPV 1',
    short: 'fIPV 1',
    stage: 'w6',
    protects: 'Polio',
    route: 'Intradermal · right arm',
    detail: 'A small fractional dose of injectable polio vaccine, given into the top layer of skin.',
  },
  {
    id: 'pcv1',
    name: 'PCV 1',
    short: 'PCV 1',
    stage: 'w6',
    protects: 'Pneumonia and meningitis',
    route: 'Injection · thigh',
    detail: 'The pneumococcal conjugate vaccine is now part of the national programme across India.',
  },

  // 10 weeks
  {
    id: 'penta2',
    name: 'Pentavalent 2',
    short: 'Penta 2',
    stage: 'w10',
    protects: 'Diphtheria, tetanus, whooping cough, hepatitis B and Hib',
    route: 'Injection · thigh',
    detail: 'The second dose of the five-in-one vaccine.',
  },
  {
    id: 'opv2',
    name: 'OPV 2',
    short: 'OPV 2',
    stage: 'w10',
    protects: 'Polio',
    route: 'Oral drops',
    detail: 'Two drops by mouth.',
  },
  {
    id: 'rota2',
    name: 'Rotavirus 2',
    short: 'Rota 2',
    stage: 'w10',
    protects: 'Severe rotavirus diarrhoea',
    route: 'Oral',
    detail: 'The second oral rotavirus dose.',
  },

  // 14 weeks
  {
    id: 'penta3',
    name: 'Pentavalent 3',
    short: 'Penta 3',
    stage: 'w14',
    protects: 'Diphtheria, tetanus, whooping cough, hepatitis B and Hib',
    route: 'Injection · thigh',
    detail: 'The third and final primary dose of the five-in-one vaccine.',
  },
  {
    id: 'opv3',
    name: 'OPV 3',
    short: 'OPV 3',
    stage: 'w14',
    protects: 'Polio',
    route: 'Oral drops',
    detail: 'Two drops by mouth. A booster comes at 16–24 months.',
  },
  {
    id: 'rota3',
    name: 'Rotavirus 3',
    short: 'Rota 3',
    stage: 'w14',
    protects: 'Severe rotavirus diarrhoea',
    route: 'Oral',
    detail: 'The last rotavirus dose for most brands used in the programme.',
  },
  {
    id: 'fipv2',
    name: 'fIPV 2',
    short: 'fIPV 2',
    stage: 'w14',
    protects: 'Polio',
    route: 'Intradermal · right arm',
    detail: 'The second fractional polio dose. A third is given at nine months.',
  },
  {
    id: 'pcv2',
    name: 'PCV 2',
    short: 'PCV 2',
    stage: 'w14',
    protects: 'Pneumonia and meningitis',
    route: 'Injection · thigh',
    detail: 'Completes the primary pneumococcal doses; a booster follows at nine months.',
  },

  // 9 months
  {
    id: 'mr1',
    name: 'MR 1',
    short: 'MR 1',
    stage: 'm9',
    protects: 'Measles and rubella',
    route: 'Injection · right upper arm',
    detail: 'A mild fever or rash five to twelve days after this dose is common and settles on its own.',
  },
  {
    id: 'fipv3',
    name: 'fIPV 3',
    short: 'fIPV 3',
    stage: 'm9',
    protects: 'Polio',
    route: 'Intradermal · left arm',
    detail: 'Added to the national schedule in 2023 and usually given at the same visit as MR 1.',
  },
  {
    id: 'pcvb',
    name: 'PCV booster',
    short: 'PCV-B',
    stage: 'm9',
    protects: 'Pneumonia and meningitis',
    route: 'Injection · thigh',
    detail: 'The booster that completes the pneumococcal series.',
  },
  {
    id: 'vita1',
    name: 'Vitamin A · dose 1',
    short: 'Vit A 1',
    stage: 'm9',
    protects: 'Immunity, eyesight and growth',
    route: 'Oral syrup',
    detail: 'The first of nine Vitamin A doses, given every six months until age five.',
  },
  {
    id: 'je1',
    name: 'JE 1',
    short: 'JE 1',
    stage: 'm9',
    protects: 'Japanese encephalitis',
    route: 'Injection',
    detail: 'Given only in districts where Japanese encephalitis is endemic. Ask your health worker if it applies to you.',
    optional: true,
  },

  // 16–24 months
  {
    id: 'mr2',
    name: 'MR 2',
    short: 'MR 2',
    stage: 'm16',
    protects: 'Measles and rubella',
    route: 'Injection · upper arm',
    detail: 'The second measles–rubella dose. Together with MR 1, it gives strong, lasting protection.',
  },
  {
    id: 'dptb1',
    name: 'DPT booster 1',
    short: 'DPT-B1',
    stage: 'm16',
    protects: 'Diphtheria, tetanus and whooping cough',
    route: 'Injection · thigh',
    detail: 'A booster to keep protection strong as your child grows.',
  },
  {
    id: 'opvb',
    name: 'OPV booster',
    short: 'OPV-B',
    stage: 'm16',
    protects: 'Polio',
    route: 'Oral drops',
    detail: 'A final polio booster dose for early childhood.',
  },
  {
    id: 'vita2',
    name: 'Vitamin A · dose 2',
    short: 'Vit A 2',
    stage: 'm16',
    protects: 'Immunity, eyesight and growth',
    route: 'Oral syrup',
    detail: 'The second Vitamin A dose. Further doses continue every six months until age five.',
  },
  {
    id: 'je2',
    name: 'JE 2',
    short: 'JE 2',
    stage: 'm16',
    protects: 'Japanese encephalitis',
    route: 'Injection',
    detail: 'The second JE dose, only in endemic districts.',
    optional: true,
  },

  // 2–5 years: Vitamin A series
  ...([3, 4, 5, 6, 7, 8, 9] as const).map<DoseDef>((n, i) => ({
    id: `vita${n}`,
    name: `Vitamin A · dose ${n}`,
    short: `Vit A ${n}`,
    stage: 'y2to5',
    protects: 'Immunity, eyesight and growth',
    route: 'Oral syrup',
    detail: 'Vitamin A is given every six months until your child turns five.',
    monthOffset: 24 + i * 6,
  })),

  // 5–6 years
  {
    id: 'dptb2',
    name: 'DPT booster 2',
    short: 'DPT-B2',
    stage: 'y5',
    protects: 'Diphtheria, tetanus and whooping cough',
    route: 'Injection · upper arm',
    detail: 'The last DPT booster of early childhood, before school.',
  },

  // 10–16 years
  {
    id: 'td1',
    name: 'Td · 10 years',
    short: 'Td 10',
    stage: 'y10',
    protects: 'Tetanus and diphtheria',
    route: 'Injection · upper arm',
    detail: 'A tetanus–diphtheria booster at ten years of age.',
    monthOffset: 120,
  },
  {
    id: 'td2',
    name: 'Td · 16 years',
    short: 'Td 16',
    stage: 'y10',
    protects: 'Tetanus and diphtheria',
    route: 'Injection · upper arm',
    detail: 'The final scheduled tetanus–diphtheria booster at sixteen years.',
    monthOffset: 192,
  },
];

export const DOSE_BY_ID: Record<DoseId, DoseDef> = Object.fromEntries(DOSES.map((d) => [d.id, d]));

/**
 * How long after the recommended age a dose can be given before the app
 * politely calls it late. Primary visits are tight; the 9- and 16-month visits
 * have the wide windows the national schedule gives them.
 */
export function graceDaysFor(stage: StageId): number {
  switch (stage) {
    case 'birth':
      return 14;
    case 'w6':
    case 'w10':
    case 'w14':
      return 28;
    case 'm9':
      return 92; // the first birthday
    case 'm16':
      return 244; // the second birthday
    case 'y2to5':
      return 60;
    case 'y5':
      return 365;
    case 'y10':
      return 365;
    default:
      return 30;
  }
}

export const SCHEDULE_SOURCE =
  'India · National Immunization Schedule (UIP)';

export const SCHEDULE_NOTE =
  'Built on India’s Universal Immunization Programme schedule, including the fIPV third dose added in 2023. JE is offered in endemic districts only. This app is a personal tracker, not medical advice — always confirm timings with your paediatrician or health worker.';
