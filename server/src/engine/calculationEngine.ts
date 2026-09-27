/**
 * OIML R-76 Deterministic Calculation Engine
 * Pure, data-driven calculation logic for Non-Automatic Weighing Instruments (NAWI)
 * Reference: OIML R 76-1:2006 (E)
 */

import {
  OIML_R76_CLASSES,
  OIML_CLAUSE_REFERENCES,
  VERIFICATION_MULTIPLIERS,
  MPEBracket,
} from './oimlR76Config';

export type VerificationType = 'INITIAL' | 'IN_SERVICE';

export interface MPEResult {
  load: number;
  scaleIntervalE: number;
  mInE: number; // load / e
  mpeInE: number; // e.g. 0.5, 1.0, 1.5
  mpeValue: number; // in instrument engineering units (e.g. g or kg)
  bracketDescription: string;
  clauseReference: string;
  accuracyClass: string;
  verificationType: VerificationType;
}

export interface WeighingPointObservation {
  id?: string;
  step: number;
  direction: 'ASCENDING' | 'DESCENDING';
  appliedLoad: number; // L
  indication: number; // I
  deltaL?: number; // Small weights added to reach next turning point (optional)
  notes?: string;
}

export interface WeighingPointResult {
  step: number;
  direction: 'ASCENDING' | 'DESCENDING';
  appliedLoad: number;
  indication: number;
  deltaL: number;
  calculatedP: number; // Indication prior to rounding: P = I + 0.5e - deltaL
  errorE: number; // E = P - L
  correctedErrorEc: number; // Ec = E - E0
  mpeResult: MPEResult;
  isPass: boolean;
  margin: number; // MPE - |Ec|
  utilizationPercentage: number; // (|Ec| / MPE) * 100
  whyBreakdown: {
    formula: string;
    calculationText: string;
    comparisonText: string;
    verdictRule: string;
    clause: string;
  };
}

export interface RepeatabilityObservation {
  id?: string;
  runIndex: number;
  appliedLoad: number;
  indication: number;
  deltaL?: number;
}

export interface RepeatabilityResult {
  nominalLoad: number;
  runs: Array<{
    runIndex: number;
    indication: number;
    deltaL: number;
    calculatedP: number;
    errorE: number;
  }>;
  minP: number;
  maxP: number;
  observedRange: number; // maxP - minP
  meanP: number;
  stdDeviation: number;
  mpeResult: MPEResult;
  isPass: boolean;
  margin: number;
  whyBreakdown: {
    formula: string;
    calculationText: string;
    comparisonText: string;
    verdictRule: string;
    clause: string;
  };
}

export interface EccentricityObservation {
  id?: string;
  positionIndex: number;
  positionName: string; // "1. Center", "2. Front-Left", "3. Rear-Left", "4. Rear-Right", "5. Front-Right"
  appliedLoad: number;
  indication: number;
  deltaL?: number;
}

export interface EccentricityResult {
  appliedLoad: number;
  points: Array<{
    positionIndex: number;
    positionName: string;
    indication: number;
    deltaL: number;
    calculatedP: number;
    errorE: number;
    correctedErrorEc: number;
    isPass: boolean;
    margin: number;
    deviationFromCenter: number;
  }>;
  zeroErrorE0: number;
  maxEccentricError: number;
  maxDeviationFromCenter: number;
  mpeResult: MPEResult;
  isPass: boolean;
  whyBreakdown: {
    formula: string;
    calculationText: string;
    comparisonText: string;
    verdictRule: string;
    clause: string;
  };
}

export interface TareObservation {
  tareLoad: number; // Load applied to set tare
  tareIndication: number; // Indication with tare load
  tareDeltaL?: number; // Small weights for tare zero/indication
  netLoad: number; // Additional net load placed
  netIndication: number; // Indication for net load
  netDeltaL?: number;
}

export interface TareResult {
  tareLoad: number;
  tareIndication: number;
  tareP: number;
  tareError: number; // Et = Pt - Lt
  tareMaxPermissibleLimit: number; // 0.25e
  tareSettingPass: boolean;

  netLoad: number;
  netIndication: number;
  netP: number;
  netErrorE: number;
  netCorrectedErrorEc: number; // Ec = E_net - E_tare
  netMpeResult: MPEResult;
  netWeighingPass: boolean;

  isPass: boolean;
  whyBreakdown: {
    tareSettingFormula: string;
    tareSettingComparison: string;
    netWeighingFormula: string;
    netWeighingComparison: string;
    clause: string;
  };
}

export class OimlCalculationEngine {
  /**
   * Determine Maximum Permissible Error (MPE) for a given load under OIML R-76
   */
  public static getMPE(
    load: number,
    scaleIntervalE: number,
    accuracyClass: string,
    verificationType: VerificationType = 'INITIAL'
  ): MPEResult {
    const classConfig = OIML_R76_CLASSES[accuracyClass] || OIML_R76_CLASSES['Class III'];
    const multiplier = VERIFICATION_MULTIPLIERS[verificationType] || 1.0;

    // Load expressed in verification scale intervals e: m = L / e
    const safeE = scaleIntervalE > 0 ? scaleIntervalE : 1.0;
    const absLoad = Math.abs(load);
    const mInE = Math.round((absLoad / safeE) * 1000000) / 1000000;

    // Locate bracket in MPE configuration
    let matchedBracket: MPEBracket = classConfig.mpeBrackets[0];
    for (const bracket of classConfig.mpeBrackets) {
      if (mInE >= bracket.minM && (bracket.maxM === Infinity || mInE <= bracket.maxM)) {
        matchedBracket = bracket;
        break;
      }
    }

    const baseMpeInE = matchedBracket.mpeInE;
    const finalMpeInE = baseMpeInE * multiplier;
    const mpeValue = Math.round(finalMpeInE * safeE * 1000000) / 1000000;

    const clauseRef =
      verificationType === 'INITIAL'
        ? 'OIML R 76-1:2006 Clause 3.5.1 (Table 6)'
        : 'OIML R 76-1:2006 Clause 3.5.2 (In-Service Inspection)';

    return {
      load: absLoad,
      scaleIntervalE: safeE,
      mInE,
      mpeInE: finalMpeInE,
      mpeValue,
      bracketDescription: `${matchedBracket.description} (Base: ±${baseMpeInE} e${
        multiplier > 1 ? ` × ${multiplier}` : ''
      })`,
      clauseReference: clauseRef,
      accuracyClass: classConfig.code,
      verificationType,
    };
  }

  /**
   * Calculate Turning Point indication P and error E per Clause A.4.4.3
   * P = I + 0.5*e - deltaL
   * E = P - L
   */
  public static calculateSinglePoint(
    load: number,
    indication: number,
    scaleIntervalE: number,
    deltaL?: number
  ): { calculatedP: number; errorE: number; usedTurningPoint: boolean } {
    const safeE = scaleIntervalE > 0 ? scaleIntervalE : 1.0;
    const hasDelta = deltaL !== undefined && deltaL !== null && !isNaN(Number(deltaL));

    if (hasDelta) {
      // Clause A.4.4.3: Turning point formula
      const calculatedP = indication + 0.5 * safeE - Number(deltaL);
      const errorE = calculatedP - load;
      return {
        calculatedP: Math.round(calculatedP * 1000000) / 1000000,
        errorE: Math.round(errorE * 1000000) / 1000000,
        usedTurningPoint: true,
      };
    } else {
      // Direct discrete digital indication
      const errorE = indication - load;
      return {
        calculatedP: indication,
        errorE: Math.round(errorE * 1000000) / 1000000,
        usedTurningPoint: false,
      };
    }
  }

  /**
   * Weighing Performance & Accuracy Test (Clause A.4.4)
   * Calculates Ec = E - E0 for each observation and tests against MPE
   */
  public static calculateWeighingPerformance(
    observations: WeighingPointObservation[],
    scaleIntervalE: number,
    accuracyClass: string,
    verificationType: VerificationType = 'INITIAL'
  ): {
    results: WeighingPointResult[];
    zeroErrorE0: number;
    maxError: number;
    maxErrorStep: number;
    allPassed: boolean;
    passCount: number;
    failCount: number;
  } {
    if (!observations || observations.length === 0) {
      return {
        results: [],
        zeroErrorE0: 0,
        maxError: 0,
        maxErrorStep: 0,
        allPassed: false,
        passCount: 0,
        failCount: 0,
      };
    }

    // 1. Determine Zero Load Error E0 (first load = 0 point, or step 1)
    const zeroPoint = observations.find((o) => Math.abs(o.appliedLoad) < 1e-9) || observations[0];
    const zeroCalc = this.calculateSinglePoint(
      zeroPoint.appliedLoad,
      zeroPoint.indication,
      scaleIntervalE,
      zeroPoint.deltaL
    );
    const zeroErrorE0 = zeroCalc.errorE;

    let maxError = 0;
    let maxErrorStep = 0;
    let passCount = 0;
    let failCount = 0;

    const results: WeighingPointResult[] = observations.map((obs) => {
      const { calculatedP, errorE, usedTurningPoint } = this.calculateSinglePoint(
        obs.appliedLoad,
        obs.indication,
        scaleIntervalE,
        obs.deltaL
      );

      // Corrected Error Ec = E - E0
      const correctedErrorEc = Math.round((errorE - zeroErrorE0) * 1000000) / 1000000;
      const mpeResult = this.getMPE(obs.appliedLoad, scaleIntervalE, accuracyClass, verificationType);

      // Metrological tolerance comparison with small numerical safety epsilon
      const isPass = Math.abs(correctedErrorEc) <= mpeResult.mpeValue + 1e-6;
      if (isPass) passCount++;
      else failCount++;

      const absEc = Math.abs(correctedErrorEc);
      if (absEc > maxError) {
        maxError = absEc;
        maxErrorStep = obs.step;
      }

      const margin = Math.round((mpeResult.mpeValue - absEc) * 1000000) / 1000000;
      const utilizationPercentage =
        mpeResult.mpeValue > 0 ? Math.round((absEc / mpeResult.mpeValue) * 10000) / 100 : 0;

      // Deterministic "Show Me Why" explanation strings
      const formulaStr = usedTurningPoint
        ? `P = I + 0.5e - ΔL = ${obs.indication} + ${0.5 * scaleIntervalE} - ${obs.deltaL || 0} = ${calculatedP}\n` +
          `E = P - L = ${calculatedP} - ${obs.appliedLoad} = ${errorE}\n` +
          `Ec = E - E0 = ${errorE} - (${zeroErrorE0}) = ${correctedErrorEc}`
        : `E = I - L = ${obs.indication} - ${obs.appliedLoad} = ${errorE}\n` +
          `Ec = E - E0 = ${errorE} - (${zeroErrorE0}) = ${correctedErrorEc}`;

      const comparisonStr = `|Ec| = ${absEc} ${accuracyClass ? '' : ''} ≤ MPE = ±${mpeResult.mpeValue} (±${mpeResult.mpeInE} e)`;

      return {
        step: obs.step,
        direction: obs.direction,
        appliedLoad: obs.appliedLoad,
        indication: obs.indication,
        deltaL: obs.deltaL || 0,
        calculatedP,
        errorE,
        correctedErrorEc,
        mpeResult,
        isPass,
        margin,
        utilizationPercentage,
        whyBreakdown: {
          formula: formulaStr,
          calculationText: `Load L=${obs.appliedLoad}, Indication I=${obs.indication}, Observed Error Ec=${correctedErrorEc}`,
          comparisonText: comparisonStr,
          verdictRule: isPass
            ? `PASS: Corrected indication error ${absEc} is within permissible limit of ${mpeResult.mpeValue}.`
            : `FAIL: Corrected indication error ${absEc} exceeds maximum permissible error of ${mpeResult.mpeValue}.`,
          clause: mpeResult.clauseReference,
        },
      };
    });

    return {
      results,
      zeroErrorE0,
      maxError,
      maxErrorStep,
      allPassed: failCount === 0 && passCount > 0,
      passCount,
      failCount,
    };
  }

  /**
   * Repeatability Test (Clause A.4.10)
   * Successive weighings at same nominal load: delta = Imax - Imin <= |MPE|
   */
  public static calculateRepeatability(
    nominalLoad: number,
    runs: RepeatabilityObservation[],
    scaleIntervalE: number,
    accuracyClass: string,
    verificationType: VerificationType = 'INITIAL'
  ): RepeatabilityResult {
    const safeRuns = runs && runs.length > 0 ? runs : [];
    const calculatedRuns = safeRuns.map((run) => {
      const { calculatedP, errorE } = this.calculateSinglePoint(
        nominalLoad,
        run.indication,
        scaleIntervalE,
        run.deltaL
      );
      return {
        runIndex: run.runIndex,
        indication: run.indication,
        deltaL: run.deltaL || 0,
        calculatedP,
        errorE,
      };
    });

    const pValues = calculatedRuns.map((r) => r.calculatedP);
    const minP = pValues.length ? Math.min(...pValues) : 0;
    const maxP = pValues.length ? Math.max(...pValues) : 0;
    const observedRange = Math.round((maxP - minP) * 1000000) / 1000000;

    const meanP =
      pValues.length > 0
        ? Math.round((pValues.reduce((sum, val) => sum + val, 0) / pValues.length) * 1000000) / 1000000
        : 0;

    // Standard deviation
    const variance =
      pValues.length > 1
        ? pValues.reduce((sum, val) => sum + Math.pow(val - meanP, 2), 0) / (pValues.length - 1)
        : 0;
    const stdDeviation = Math.round(Math.sqrt(variance) * 1000000) / 1000000;

    const mpeResult = this.getMPE(nominalLoad, scaleIntervalE, accuracyClass, verificationType);
    const isPass = pValues.length >= 2 && observedRange <= mpeResult.mpeValue + 1e-6;
    const margin = Math.round((mpeResult.mpeValue - observedRange) * 1000000) / 1000000;

    return {
      nominalLoad,
      runs: calculatedRuns,
      minP,
      maxP,
      observedRange,
      meanP,
      stdDeviation,
      mpeResult,
      isPass,
      margin,
      whyBreakdown: {
        formula: `Δ = P_max - P_min = ${maxP} - ${minP} = ${observedRange}\nStandard Deviation s = ${stdDeviation}`,
        calculationText: `Nominal Load L=${nominalLoad}, ${calculatedRuns.length} successive runs performed. Min P=${minP}, Max P=${maxP}.`,
        comparisonText: `Δ = ${observedRange} ≤ |MPE| = ${mpeResult.mpeValue} (±${mpeResult.mpeInE} e)`,
        verdictRule: isPass
          ? `PASS: Repeatability spread (${observedRange}) is within the allowable maximum permissible error (${mpeResult.mpeValue}).`
          : `FAIL: Spread between weighings (${observedRange}) exceeds permissible error limit (${mpeResult.mpeValue}).`,
        clause: OIML_CLAUSE_REFERENCES.REPEATABILITY.clause,
      },
    };
  }

  /**
   * Eccentricity (Off-Center Loading) Test (Clause A.4.7)
   * Error at 5 positions: Center, Front-Left, Rear-Left, Rear-Right, Front-Right
   */
  public static calculateEccentricity(
    appliedLoad: number,
    points: EccentricityObservation[],
    scaleIntervalE: number,
    accuracyClass: string,
    verificationType: VerificationType = 'INITIAL'
  ): EccentricityResult {
    const safePoints = points && points.length > 0 ? points : [];
    const mpeResult = this.getMPE(appliedLoad, scaleIntervalE, accuracyClass, verificationType);

    // Find center point (positionIndex 1 or first point)
    const centerObs = safePoints.find((p) => p.positionIndex === 1) || safePoints[0];
    const centerCalc = centerObs
      ? this.calculateSinglePoint(appliedLoad, centerObs.indication, scaleIntervalE, centerObs.deltaL)
      : { calculatedP: appliedLoad, errorE: 0 };
    const centerError = centerCalc.errorE;

    let maxEccError = 0;
    let maxDevFromCenter = 0;
    let allPointsPass = safePoints.length > 0;

    const evaluatedPoints = safePoints.map((pt) => {
      const calc = this.calculateSinglePoint(appliedLoad, pt.indication, scaleIntervalE, pt.deltaL);
      // In eccentricity test, corrected error Ec is evaluated against MPE
      const correctedErrorEc = calc.errorE;
      const isPass = Math.abs(correctedErrorEc) <= mpeResult.mpeValue + 1e-6;
      if (!isPass) allPointsPass = false;

      const absError = Math.abs(correctedErrorEc);
      if (absError > maxEccError) maxEccError = absError;

      const deviationFromCenter = Math.abs(calc.errorE - centerError);
      if (deviationFromCenter > maxDevFromCenter) maxDevFromCenter = deviationFromCenter;

      return {
        positionIndex: pt.positionIndex,
        positionName: pt.positionName,
        indication: pt.indication,
        deltaL: pt.deltaL || 0,
        calculatedP: calc.calculatedP,
        errorE: calc.errorE,
        correctedErrorEc,
        isPass,
        margin: Math.round((mpeResult.mpeValue - absError) * 1000000) / 1000000,
        deviationFromCenter: Math.round(deviationFromCenter * 1000000) / 1000000,
      };
    });

    return {
      appliedLoad,
      points: evaluatedPoints,
      zeroErrorE0: 0,
      maxEccentricError: Math.round(maxEccError * 1000000) / 1000000,
      maxDeviationFromCenter: Math.round(maxDevFromCenter * 1000000) / 1000000,
      mpeResult,
      isPass: allPointsPass,
      whyBreakdown: {
        formula: `For each position i:\nEc,i = P_i - L_ecc\nCondition: |Ec,i| ≤ MPE(L_ecc)`,
        calculationText: `Eccentricity Load L=${appliedLoad}. Evaluated across ${evaluatedPoints.length} positions. Max error observed = ${maxEccError}.`,
        comparisonText: `Max |Ec| = ${maxEccError} ≤ MPE = ${mpeResult.mpeValue} (±${mpeResult.mpeInE} e)`,
        verdictRule: allPointsPass
          ? `PASS: All off-center positions comply with maximum permissible error of ${mpeResult.mpeValue}.`
          : `FAIL: One or more off-center positions exceeded maximum permissible error of ${mpeResult.mpeValue}.`,
        clause: OIML_CLAUSE_REFERENCES.ECCENTRICITY.clause,
      },
    };
  }

  /**
   * Tare Balancing & Net Weighing Test (Clause A.4.6 & Clause 3.6.1)
   */
  public static calculateTare(
    obs: TareObservation,
    scaleIntervalE: number,
    accuracyClass: string,
    verificationType: VerificationType = 'INITIAL'
  ): TareResult {
    const safeE = scaleIntervalE > 0 ? scaleIntervalE : 1.0;

    // 1. Tare Setting Accuracy (Clause 3.6.1: tare error must not exceed ±0.25 e)
    const tareCalc = this.calculateSinglePoint(
      obs.tareLoad,
      obs.tareIndication,
      safeE,
      obs.tareDeltaL
    );
    const tareError = Math.round(tareCalc.errorE * 1000000) / 1000000;
    const tareLimit = Math.round(0.25 * safeE * 1000000) / 1000000;
    const tareSettingPass = Math.abs(tareError) <= tareLimit + 1e-6;

    // 2. Net Load Weighing Accuracy
    const netCalc = this.calculateSinglePoint(
      obs.netLoad,
      obs.netIndication,
      safeE,
      obs.netDeltaL
    );
    const netErrorE = Math.round(netCalc.errorE * 1000000) / 1000000;
    // Corrected error accounting for tare zero effect: Ec = E_net - E_tare
    const netCorrectedErrorEc = Math.round((netErrorE - tareError) * 1000000) / 1000000;
    const netMpeResult = this.getMPE(obs.netLoad, safeE, accuracyClass, verificationType);
    const netWeighingPass = Math.abs(netCorrectedErrorEc) <= netMpeResult.mpeValue + 1e-6;

    const overallPass = tareSettingPass && netWeighingPass;

    return {
      tareLoad: obs.tareLoad,
      tareIndication: obs.tareIndication,
      tareP: tareCalc.calculatedP,
      tareError,
      tareMaxPermissibleLimit: tareLimit,
      tareSettingPass,

      netLoad: obs.netLoad,
      netIndication: obs.netIndication,
      netP: netCalc.calculatedP,
      netErrorE,
      netCorrectedErrorEc,
      netMpeResult,
      netWeighingPass,

      isPass: overallPass,
      whyBreakdown: {
        tareSettingFormula: `Tare Error Et = Pt - Lt = ${tareCalc.calculatedP} - ${obs.tareLoad} = ${tareError}\nTare Setting Criteria: |Et| ≤ 0.25 e = ±${tareLimit}`,
        tareSettingComparison: `|Et| = ${Math.abs(tareError)} ≤ 0.25 e = ${tareLimit} → ${
          tareSettingPass ? 'PASS' : 'FAIL'
        }`,
        netWeighingFormula: `Net Indication Error Ec = E_net - E_tare = ${netErrorE} - (${tareError}) = ${netCorrectedErrorEc}\nNet MPE = ±${netMpeResult.mpeValue} (±${netMpeResult.mpeInE} e)`,
        netWeighingComparison: `|Ec_net| = ${Math.abs(netCorrectedErrorEc)} ≤ MPE = ${netMpeResult.mpeValue} → ${
          netWeighingPass ? 'PASS' : 'FAIL'
        }`,
        clause: OIML_CLAUSE_REFERENCES.TARE.clause,
      },
    };
  }
}
