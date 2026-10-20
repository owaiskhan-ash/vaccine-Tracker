/**
 * The suggestion catalogue — India's National Immunization Schedule (UIP).
 *
 * Nothing here is ever added to a child's record automatically. These doses are
 * only *offered* as suggestions, and only while they are missing from what the
 * parent has entered. Doses are matched to entries by id or by name, so a
 * parent who types "Penta 2" themselves is never nagged about it again.
 *
 * Source: Ministry of Health & Family Welfare, National Immunization Schedule,
 * including the fIPV third dose added on 1 January 2023 and the nationwide PCV
 * rollout completed in 2021.
 */

export type StageId = 'birth' | 'w6' | 'w10' | 'w14' | 'm9' | 'm16' | 'y2to5' | 'y5' | 'y10';

export type Stage = {
  id: StageId;
  label: string;
  short: string;
  monthOffset: number;
  /** exact age in days, used for the week-based visits */
  dayOffset?: number;
  eyebrow: string;
};

export type DoseDef = {
  id: string;
  name: string;
  short: string;
  stage: StageId;
  protects: string;
  route: string;
  detail: string;
  /** overrides the stage's age, e.g. the later Vitamin A and Td doses */
  monthOffset?: number;
};

export const STAGES: Stage[] = [
  { id: 'birth', label: 'At birth', short: 'Birth', monthOffset: 0, dayOffset: 0, eyebrow: 'Day 0' },
  { id: 'w6', label: '6 weeks', short: '6 wks', monthOffset: 1.5, dayOffset: 42, eyebrow: 'First visit' },
  { id: 'w10', label: '10 weeks', short: '10 wks', monthOffset: 2.5, dayOffset: 70, eyebrow: 'Second visit' },
  { id: 'w14', label: '14 weeks', short: '14 wks', monthOffset: 3.5, dayOffset: 98, eyebrow: 'Third visit' },
  { id: 'm9', label: '9 months', short: '9 mths', monthOffset: 9, eyebrow: 'Half birthday' },
  { id: 'm16', label: '16–24 months', short: '16 mths', monthOffset: 16, eyebrow: 'Toddler visit' },
  { id: 'y2to5', label: '2–5 years', short: '2–5 yrs', monthOffset: 24, eyebrow: 'Vitamin A series' },
  { id: 'y5', label: '5–6 years', short: '5 yrs', monthOffset: 60, eyebrow: 'Before school' },
  { id: 'y10', label: '10 & 16 years', short: '10+ yrs', monthOffset: 120, eyebrow: 'Later childhood' },
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
    detail: 'The pneumococcal conjugate vaccine is part of the national programme across India.',
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
    detail: 'Two drops by mouth. A booster follows at 16–24 months.',
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

export const DOSE_BY_ID: Record<string, DoseDef> = Object.fromEntries(DOSES.map((d) => [d.id, d]));

export const SCHEDULE_SOURCE = 'India · NIS schedule';

export const DOSE_NAMES = DOSES.map((d) => d.name);
