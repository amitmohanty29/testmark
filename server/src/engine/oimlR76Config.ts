/**
 * OIML R-76 Config: Standard Parameters and Maximum Permissible Error (MPE) Tables
 * Reference: OIML R 76-1:2006 (E) "Non-automatic weighing instruments"
 * Part 1: Metrological and technical requirements - Tests
 */

export interface MPEBracket {
  minM: number; // in units of e (verification scale intervals)
  maxM: number; // in units of e, Infinity for unbounded
  mpeInE: number; // 0.5, 1.0, 1.5 for initial verification
  description: string;
}

export interface AccuracyClassConfig {
  code: string;
  name: string;
  symbol: string;
  minScaleIntervalE: number; // in grams
  minVerificationIntervals: number; // min n = Max / e
  maxVerificationIntervals: number; // max n = Max / e
  minCapacityRatio: number; // Min in units of e (e.g. 100e, 20e)
  mpeBrackets: MPEBracket[];
}

export interface TestClauseReference {
  testType: string;
  title: string;
  clause: string;
  standard: string;
  summary: string;
  criteriaRule: string;
}

export const OIML_R76_CLASSES: Record<string, AccuracyClassConfig> = {
  'Class I': {
    code: 'Class I',
    name: 'Special Accuracy',
    symbol: '①',
    minScaleIntervalE: 0.001, // 1 mg
    minVerificationIntervals: 50000,
    maxVerificationIntervals: 1000000,
    minCapacityRatio: 100, // Min = 100e
    mpeBrackets: [
      { minM: 0, maxM: 50000, mpeInE: 0.5, description: '0 ≤ m ≤ 50 000 e' },
      { minM: 50000, maxM: 200000, mpeInE: 1.0, description: '50 000 e < m ≤ 200 000 e' },
      { minM: 200000, maxM: Infinity, mpeInE: 1.5, description: 'm > 200 000 e' },
    ],
  },
  'Class II': {
    code: 'Class II',
    name: 'High Accuracy',
    symbol: '②',
    minScaleIntervalE: 0.001,
    minVerificationIntervals: 100,
    maxVerificationIntervals: 100000,
    minCapacityRatio: 20, // Min = 20e (or 50e if e >= 0.1g)
    mpeBrackets: [
      { minM: 0, maxM: 5000, mpeInE: 0.5, description: '0 ≤ m ≤ 5 000 e' },
      { minM: 5000, maxM: 20000, mpeInE: 1.0, description: '5 000 e < m ≤ 20 000 e' },
      { minM: 20000, maxM: 100000, mpeInE: 1.5, description: '20 000 e < m ≤ 100 000 e' },
    ],
  },
  'Class III': {
    code: 'Class III',
    name: 'Medium Accuracy',
    symbol: '③',
    minScaleIntervalE: 0.1,
    minVerificationIntervals: 100,
    maxVerificationIntervals: 10000,
    minCapacityRatio: 20, // Min = 20e
    mpeBrackets: [
      { minM: 0, maxM: 500, mpeInE: 0.5, description: '0 ≤ m ≤ 500 e' },
      { minM: 500, maxM: 2000, mpeInE: 1.0, description: '500 e < m ≤ 2 000 e' },
      { minM: 2000, maxM: 10000, mpeInE: 1.5, description: '2 000 e < m ≤ 10 000 e' },
    ],
  },
  'Class IV': {
    code: 'Class IV',
    name: 'Ordinary Accuracy',
    symbol: '④',
    minScaleIntervalE: 5.0,
    minVerificationIntervals: 100,
    maxVerificationIntervals: 1000,
    minCapacityRatio: 10, // Min = 10e
    mpeBrackets: [
      { minM: 0, maxM: 50, mpeInE: 0.5, description: '0 ≤ m ≤ 50 e' },
      { minM: 50, maxM: 200, mpeInE: 1.0, description: '50 e < m ≤ 200 e' },
      { minM: 200, maxM: 1000, mpeInE: 1.5, description: '200 e < m ≤ 1 000 e' },
    ],
  },
};

export const OIML_CLAUSE_REFERENCES: Record<string, TestClauseReference> = {
  WEIGHING_PERFORMANCE: {
    testType: 'WEIGHING_PERFORMANCE',
    title: 'Weighing Performance & Accuracy Test',
    clause: 'OIML R 76-1:2006 Clause A.4.4 & Clause 3.5.1',
    standard: 'OIML R 76-1:2006 (Table 6)',
    summary: 'Evaluate instrument indication error across loading and unloading cycles up to Max Capacity.',
    criteriaRule: '|Corrected Error Ec| ≤ MPE for every applied test load.',
  },
  REPEATABILITY: {
    testType: 'REPEATABILITY',
    title: 'Repeatability Test',
    clause: 'OIML R 76-1:2006 Clause A.4.10 & Clause 3.6.1',
    standard: 'OIML R 76-1:2006 (Clause 3.6.1)',
    summary: 'Evaluate agreement between results of successive weighings of the same load carried out under identical conditions.',
    criteriaRule: 'Max Difference (Imax - Imin) ≤ |MPE| of the test load.',
  },
  ECCENTRICITY: {
    testType: 'ECCENTRICITY',
    title: 'Eccentricity (Off-Center Loading) Test',
    clause: 'OIML R 76-1:2006 Clause A.4.7',
    standard: 'OIML R 76-1:2006 (Clause 3.6.2 & A.4.7)',
    summary: 'Evaluate indication consistency when load is applied off-center in four quadrant positions and center.',
    criteriaRule: '|Corrected Error Ec| ≤ MPE at eccentricity test load for all 5 load positions.',
  },
  TARE: {
    testType: 'TARE',
    title: 'Tare Setting & Net Weighing Test',
    clause: 'OIML R 76-1:2006 Clause A.4.6 & Clause 3.6.1',
    standard: 'OIML R 76-1:2006 (Clause 3.6.1 / 3.6.2)',
    summary: 'Verify accuracy of tare balance setting and subsequent net load measurement accuracy.',
    criteriaRule: 'Tare setting error ≤ ±0.25 e, and Net Load error |Ec_net| ≤ MPE(Net Load).',
  },
};

/**
 * Inspection multipliers
 */
export const VERIFICATION_MULTIPLIERS = {
  INITIAL: 1.0, // Initial verification / pattern approval
  IN_SERVICE: 2.0, // In-service inspection per OIML R-76 Clause 3.5.2
};
