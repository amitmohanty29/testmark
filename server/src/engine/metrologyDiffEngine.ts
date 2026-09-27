/**
 * MarkSure Metrology Differential Engine
 * Computes deep, field-by-field differences between two report versions for Non-Automatic Weighing Instruments (OIML R-76).
 * Compares:
 * 1. Instrument and Laboratory technical specifications
 * 2. Every test observation (load points, indication, turning points, error, Ec, MPE)
 * 3. Every calculated metric (max error, repeatability range, standard deviation, eccentricity deviation, tare error)
 * 4. Every compliance result and test verdict (PASS / FAIL / REVIEW)
 */

export interface MetrologyDiffItem {
  id: string;
  category: 'OBSERVATION' | 'CALCULATION' | 'COMPLIANCE' | 'INSTRUMENT' | 'LABORATORY' | 'METADATA';
  label: string; // e.g. "Observation (Test: Repeatability, Trial 2)" or "Result (Test: Repeatability)"
  testType?: string;
  field: string;
  oldValue: any;
  newValue: any;
  oldFormatted: string;
  newFormatted: string;
  impact: 'CRITICAL' | 'WARNING' | 'NEUTRAL';
  description?: string;
}

export interface MetrologyDiffReport {
  version1: {
    version: number;
    createdAt?: string;
    createdByName?: string;
    integrityHash?: string | null;
    changeDescription?: string | null;
  };
  version2: {
    version: number;
    createdAt?: string;
    createdByName?: string;
    integrityHash?: string | null;
    changeDescription?: string | null;
  };
  summary: {
    totalChanges: number;
    observationChanges: number;
    calculationChanges: number;
    complianceChanges: number;
    specificationChanges: number;
    metadataChanges: number;
    verdictFlipped: boolean;
    originalOverallVerdict: string;
    newOverallVerdict: string;
  };
  diffs: MetrologyDiffItem[];
}

const safeParse = (str: any, fallback: any = null) => {
  if (typeof str === 'object' && str !== null) return str;
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

const formatValue = (val: any): string => {
  if (val === null || val === undefined) return 'None / Not Specified';
  if (typeof val === 'number') {
    return Number.isInteger(val) ? val.toString() : val.toFixed(4).replace(/\.?0+$/, '');
  }
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'object') {
    if (Array.isArray(val)) return `[${val.length} items]`;
    return JSON.stringify(val);
  }
  return String(val);
};

export class MetrologyDiffEngine {
  public static compareReportSnapshots(
    snap1: any,
    snap2: any,
    v1Meta: { version: number; createdAt?: any; createdByName?: string; integrityHash?: string | null; changeDescription?: string | null },
    v2Meta: { version: number; createdAt?: any; createdByName?: string; integrityHash?: string | null; changeDescription?: string | null }
  ): MetrologyDiffReport {
    const d1 = safeParse(snap1, {});
    const d2 = safeParse(snap2, {});

    const diffs: MetrologyDiffItem[] = [];

    // ── 1. Instrument Specifications Diff ──
    const inst1 = d1.instrument || {};
    const inst2 = d2.instrument || {};
    const instFields: Array<{ key: string; label: string }> = [
      { key: 'manufacturer', label: 'Manufacturer' },
      { key: 'model', label: 'Model' },
      { key: 'serialNumber', label: 'Serial Number' },
      { key: 'accuracyClass', label: 'Accuracy Class' },
      { key: 'maxCapacity', label: 'Maximum Capacity (Max)' },
      { key: 'minCapacity', label: 'Minimum Capacity (Min)' },
      { key: 'scaleIntervalE', label: 'Verification Scale Interval (e)' },
      { key: 'scaleIntervalD', label: 'Actual Scale Interval (d)' },
      { key: 'verificationUnits', label: 'Verification Units' },
      { key: 'capacityRangeType', label: 'Capacity Range Type' },
      { key: 'tareRange', label: 'Tare Range' },
      { key: 'temperatureRange', label: 'Operating Temperature Range' },
      { key: 'powerSupply', label: 'Power Supply' },
    ];

    instFields.forEach(({ key, label }) => {
      const v1 = inst1[key];
      const v2 = inst2[key];
      if (v1 !== undefined && v2 !== undefined && String(v1).trim() !== String(v2).trim()) {
        diffs.push({
          id: `inst-${key}`,
          category: 'INSTRUMENT',
          label: `Instrument (${label})`,
          field: `instrument.${key}`,
          oldValue: v1,
          newValue: v2,
          oldFormatted: formatValue(v1),
          newFormatted: formatValue(v2),
          impact: key === 'accuracyClass' || key === 'scaleIntervalE' || key === 'maxCapacity' ? 'CRITICAL' : 'NEUTRAL',
          description: `Instrument parameter ${label} revised`,
        });
      }
    });

    // ── 2. Laboratory Diff ──
    const lab1 = d1.laboratory || {};
    const lab2 = d2.laboratory || {};
    const labFields: Array<{ key: string; label: string }> = [
      { key: 'name', label: 'Laboratory Name' },
      { key: 'code', label: 'Laboratory Code' },
      { key: 'accreditationNumber', label: 'Accreditation Number' },
      { key: 'address', label: 'Address' },
    ];

    labFields.forEach(({ key, label }) => {
      const v1 = lab1[key];
      const v2 = lab2[key];
      if (v1 !== undefined && v2 !== undefined && String(v1).trim() !== String(v2).trim()) {
        diffs.push({
          id: `lab-${key}`,
          category: 'LABORATORY',
          label: `Accredited Lab (${label})`,
          field: `laboratory.${key}`,
          oldValue: v1,
          newValue: v2,
          oldFormatted: formatValue(v1),
          newFormatted: formatValue(v2),
          impact: 'NEUTRAL',
          description: `Laboratory identifier ${label} updated`,
        });
      }
    });

    // ── 3. Evaluation Remarks & Metadata ──
    const eval1 = d1.evaluation || {};
    const eval2 = d2.evaluation || {};
    const evalFields: Array<{ key: string; label: string }> = [
      { key: 'standardReference', label: 'Testing Standard' },
      { key: 'patternApprovalNo', label: 'Pattern Approval No.' },
      { key: 'generalRemarks', label: 'Testing Officer Remarks' },
      { key: 'reviewRemarks', label: 'Reviewing Officer Remarks' },
    ];

    evalFields.forEach(({ key, label }) => {
      const v1 = eval1[key];
      const v2 = eval2[key];
      if (v1 !== undefined && v2 !== undefined && String(v1).trim() !== String(v2).trim()) {
        diffs.push({
          id: `eval-${key}`,
          category: 'METADATA',
          label: `Evaluation (${label})`,
          field: `evaluation.${key}`,
          oldValue: v1,
          newValue: v2,
          oldFormatted: formatValue(v1),
          newFormatted: formatValue(v2),
          impact: 'NEUTRAL',
          description: `${label} updated in evaluation notes`,
        });
      }
    });

    // ── 4. Test Records: Observations, Calculations & Compliance ──
    const testRecords1: any[] = d1.testRecords || [];
    const testRecords2: any[] = d2.testRecords || [];

    const allTestTypes = Array.from(
      new Set([...testRecords1.map((r) => r.testType), ...testRecords2.map((r) => r.testType)])
    );

    const friendlyTestName: Record<string, string> = {
      WEIGHING_PERFORMANCE: 'Weighing Performance',
      REPEATABILITY: 'Repeatability',
      ECCENTRICITY: 'Eccentricity (Corner Load)',
      TARE: 'Tare & Net Evaluation',
    };

    allTestTypes.forEach((testType) => {
      const t1 = testRecords1.find((r) => r.testType === testType);
      const t2 = testRecords2.find((r) => r.testType === testType);
      const tName = friendlyTestName[testType] || testType;

      if (!t1 && t2) {
        diffs.push({
          id: `test-added-${testType}`,
          category: 'COMPLIANCE',
          testType,
          label: `Test Record Added (${tName})`,
          field: `testRecords.${testType}`,
          oldValue: 'Not Present',
          newValue: t2.status || 'PASS',
          oldFormatted: 'None',
          newFormatted: `Added with Status: ${t2.status}`,
          impact: 'WARNING',
        });
        return;
      }

      if (t1 && !t2) {
        diffs.push({
          id: `test-removed-${testType}`,
          category: 'COMPLIANCE',
          testType,
          label: `Test Record Removed (${tName})`,
          field: `testRecords.${testType}`,
          oldValue: t1.status,
          newValue: 'Removed',
          oldFormatted: `Status: ${t1.status}`,
          newFormatted: 'Removed',
          impact: 'CRITICAL',
        });
        return;
      }

      if (!t1 || !t2) return;

      // 4a. Test-level verdict diff
      const verdict1 = t1.status;
      const verdict2 = t2.status;
      if (verdict1 && verdict2 && verdict1 !== verdict2) {
        diffs.push({
          id: `verdict-${testType}`,
          category: 'COMPLIANCE',
          testType,
          label: `Result (Test: ${tName})`,
          field: `testRecords.${testType}.status`,
          oldValue: verdict1,
          newValue: verdict2,
          oldFormatted: verdict1,
          newFormatted: verdict2,
          impact: verdict2 === 'FAIL' ? 'CRITICAL' : verdict1 === 'FAIL' ? 'WARNING' : 'NEUTRAL',
          description: `Overall compliance verdict changed from ${verdict1} to ${verdict2}`,
        });
      }

      // 4b. Environmental Conditions Diff
      const env1 = safeParse(t1.environmentalData, {});
      const env2 = safeParse(t2.environmentalData, {});
      const envFields = [
        { key: 'temperature', label: 'Ambient Temperature', unit: '°C' },
        { key: 'relativeHumidity', label: 'Relative Humidity', unit: '%' },
        { key: 'atmosphericPressure', label: 'Atmospheric Pressure', unit: 'hPa' },
        { key: 'instrumentLevel', label: 'Level Vial Alignment', unit: '' },
      ];
      envFields.forEach(({ key, label, unit }) => {
        const ev1 = env1[key];
        const ev2 = env2[key];
        if (ev1 !== undefined && ev2 !== undefined && String(ev1).trim() !== String(ev2).trim()) {
          diffs.push({
            id: `env-${testType}-${key}`,
            category: 'OBSERVATION',
            testType,
            label: `Environmental (${tName}, ${label})`,
            field: `testRecords.${testType}.environmental.${key}`,
            oldValue: ev1,
            newValue: ev2,
            oldFormatted: `${formatValue(ev1)}${unit ? ' ' + unit : ''}`,
            newFormatted: `${formatValue(ev2)}${unit ? ' ' + unit : ''}`,
            impact: 'WARNING',
            description: `Environmental test condition updated for ${tName}`,
          });
        }
      });

      // 4c. Specific Observations Diff
      const obs1 = safeParse(t1.observations, []);
      const obs2 = safeParse(t2.observations, []);

      if (testType === 'REPEATABILITY') {
        // Repeatability: Compare trial runs (Trial 1, Trial 2, Trial 3...)
        const maxTrials = Math.max(obs1.length, obs2.length);
        for (let i = 0; i < maxTrials; i++) {
          const row1 = obs1[i];
          const row2 = obs2[i];
          const trialNum = i + 1;

          if (row1 && row2) {
            const ind1 = row1.indication !== undefined ? row1.indication : row1.load;
            const ind2 = row2.indication !== undefined ? row2.indication : row2.load;
            if (ind1 !== undefined && ind2 !== undefined && Number(ind1) !== Number(ind2)) {
              diffs.push({
                id: `obs-rep-trial-${trialNum}`,
                category: 'OBSERVATION',
                testType,
                label: `Observation (Test: Repeatability, Trial ${trialNum})`,
                field: `testRecords.REPEATABILITY.observations[${i}].indication`,
                oldValue: ind1,
                newValue: ind2,
                oldFormatted: `${formatValue(ind1)} ${inst2.verificationUnits || 'kg'}`,
                newFormatted: `${formatValue(ind2)} ${inst2.verificationUnits || 'kg'}`,
                impact: 'WARNING',
                description: `Indication at Trial ${trialNum} modified from ${ind1} to ${ind2}`,
              });
            }
          }
        }
      } else if (testType === 'WEIGHING_PERFORMANCE') {
        // Weighing performance: Compare load points
        const maxPoints = Math.max(obs1.length, obs2.length);
        for (let i = 0; i < maxPoints; i++) {
          const row1 = obs1[i];
          const row2 = obs2[i];
          const loadLabel = row2?.appliedLoad ?? row2?.load ?? row1?.appliedLoad ?? row1?.load ?? `Point ${i + 1}`;
          const units = inst2.verificationUnits || 'g';

          if (row1 && row2) {
            // Indication
            const ind1 = row1.indication;
            const ind2 = row2.indication;
            if (ind1 !== undefined && ind2 !== undefined && Number(ind1) !== Number(ind2)) {
              diffs.push({
                id: `obs-wp-ind-${i}`,
                category: 'OBSERVATION',
                testType,
                label: `Observation (Test: Weighing Performance, Load: ${loadLabel}${units}, Indication)`,
                field: `testRecords.WEIGHING_PERFORMANCE.observations[${i}].indication`,
                oldValue: ind1,
                newValue: ind2,
                oldFormatted: `${formatValue(ind1)} ${units}`,
                newFormatted: `${formatValue(ind2)} ${units}`,
                impact: 'WARNING',
                description: `Observed scale indication at load ${loadLabel}${units} changed`,
              });
            }

            // Error Ec
            const err1 = row1.correctedErrorEc ?? row1.error;
            const err2 = row2.correctedErrorEc ?? row2.error;
            if (err1 !== undefined && err2 !== undefined && Math.abs(Number(err1) - Number(err2)) > 0.00001) {
              diffs.push({
                id: `obs-wp-err-${i}`,
                category: 'OBSERVATION',
                testType,
                label: `Observation (Test: Weighing Performance, Load: ${loadLabel}${units}, Error Ec)`,
                field: `testRecords.WEIGHING_PERFORMANCE.observations[${i}].errorEc`,
                oldValue: err1,
                newValue: err2,
                oldFormatted: `${formatValue(err1)} ${units}`,
                newFormatted: `${formatValue(err2)} ${units}`,
                impact: 'WARNING',
                description: `Corrected error at load ${loadLabel}${units} revised`,
              });
            }

            // Load point verdict
            const v1 = row1.verdict ?? (row1.isPass !== undefined ? (row1.isPass ? 'PASS' : 'FAIL') : undefined);
            const v2 = row2.verdict ?? (row2.isPass !== undefined ? (row2.isPass ? 'PASS' : 'FAIL') : undefined);
            if (v1 && v2 && v1 !== v2) {
              diffs.push({
                id: `obs-wp-verdict-${i}`,
                category: 'COMPLIANCE',
                testType,
                label: `Result (Test: Weighing Performance, Load: ${loadLabel}${units})`,
                field: `testRecords.WEIGHING_PERFORMANCE.observations[${i}].verdict`,
                oldValue: v1,
                newValue: v2,
                oldFormatted: v1,
                newFormatted: v2,
                impact: v2 === 'FAIL' ? 'CRITICAL' : 'WARNING',
                description: `Compliance verdict at load ${loadLabel}${units} flipped from ${v1} to ${v2}`,
              });
            }
          }
        }
      } else if (testType === 'ECCENTRICITY') {
        const maxPoints = Math.max(obs1.length, obs2.length);
        for (let i = 0; i < maxPoints; i++) {
          const row1 = obs1[i];
          const row2 = obs2[i];
          const posName = row2?.positionName || row1?.positionName || `Position ${i + 1}`;
          const units = inst2.verificationUnits || 'g';

          if (row1 && row2) {
            const ind1 = row1.indication;
            const ind2 = row2.indication;
            if (ind1 !== undefined && ind2 !== undefined && Number(ind1) !== Number(ind2)) {
              diffs.push({
                id: `obs-ecc-ind-${i}`,
                category: 'OBSERVATION',
                testType,
                label: `Observation (Test: Eccentricity, ${posName})`,
                field: `testRecords.ECCENTRICITY.observations[${i}].indication`,
                oldValue: ind1,
                newValue: ind2,
                oldFormatted: `${formatValue(ind1)} ${units}`,
                newFormatted: `${formatValue(ind2)} ${units}`,
                impact: 'WARNING',
                description: `Eccentric corner indication at ${posName} revised`,
              });
            }
          }
        }
      } else if (testType === 'TARE') {
        const r1 = obs1[0] || {};
        const r2 = obs2[0] || {};
        const units = inst2.verificationUnits || 'g';

        if (r1.tareLoad !== undefined && r2.tareLoad !== undefined && Number(r1.tareLoad) !== Number(r2.tareLoad)) {
          diffs.push({
            id: `obs-tare-load`,
            category: 'OBSERVATION',
            testType,
            label: `Observation (Test: Tare, Tare Load)`,
            field: `testRecords.TARE.observations.tareLoad`,
            oldValue: r1.tareLoad,
            newValue: r2.tareLoad,
            oldFormatted: `${formatValue(r1.tareLoad)} ${units}`,
            newFormatted: `${formatValue(r2.tareLoad)} ${units}`,
            impact: 'NEUTRAL',
          });
        }
        if (r1.tareIndication !== undefined && r2.tareIndication !== undefined && Number(r1.tareIndication) !== Number(r2.tareIndication)) {
          diffs.push({
            id: `obs-tare-ind`,
            category: 'OBSERVATION',
            testType,
            label: `Observation (Test: Tare, Tare Indication)`,
            field: `testRecords.TARE.observations.tareIndication`,
            oldValue: r1.tareIndication,
            newValue: r2.tareIndication,
            oldFormatted: `${formatValue(r1.tareIndication)} ${units}`,
            newFormatted: `${formatValue(r2.tareIndication)} ${units}`,
            impact: 'WARNING',
          });
        }
        if (r1.netLoad !== undefined && r2.netLoad !== undefined && Number(r1.netLoad) !== Number(r2.netLoad)) {
          diffs.push({
            id: `obs-net-load`,
            category: 'OBSERVATION',
            testType,
            label: `Observation (Test: Tare, Net Load)`,
            field: `testRecords.TARE.observations.netLoad`,
            oldValue: r1.netLoad,
            newValue: r2.netLoad,
            oldFormatted: `${formatValue(r1.netLoad)} ${units}`,
            newFormatted: `${formatValue(r2.netLoad)} ${units}`,
            impact: 'NEUTRAL',
          });
        }
      }

      // 4d. Calculations Diff
      const calc1 = safeParse(t1.calculationResults, {});
      const calc2 = safeParse(t2.calculationResults, {});
      const units = inst2.verificationUnits || 'g';

      if (testType === 'WEIGHING_PERFORMANCE') {
        const err1 = calc1.maxError ?? calc1.maxAbsError;
        const err2 = calc2.maxError ?? calc2.maxAbsError;
        if (err1 !== undefined && err2 !== undefined && Math.abs(Number(err1) - Number(err2)) > 0.00001) {
          diffs.push({
            id: `calc-wp-maxerr`,
            category: 'CALCULATION',
            testType,
            label: `Calculation (Test: Weighing Performance, Max Observed Error)`,
            field: `testRecords.WEIGHING_PERFORMANCE.calculations.maxAbsError`,
            oldValue: err1,
            newValue: err2,
            oldFormatted: `${formatValue(err1)} ${units}`,
            newFormatted: `${formatValue(err2)} ${units}`,
            impact: 'WARNING',
            description: `Maximum observed error across all load steps revised`,
          });
        }
        const mpe1 = calc1.maxMPE ?? calc1.mpeAtMaxError;
        const mpe2 = calc2.maxMPE ?? calc2.mpeAtMaxError;
        if (mpe1 !== undefined && mpe2 !== undefined && Number(mpe1) !== Number(mpe2)) {
          diffs.push({
            id: `calc-wp-mpe`,
            category: 'CALCULATION',
            testType,
            label: `Calculation (Test: Weighing Performance, Applicable MPE)`,
            field: `testRecords.WEIGHING_PERFORMANCE.calculations.mpe`,
            oldValue: mpe1,
            newValue: mpe2,
            oldFormatted: `±${formatValue(mpe1)} ${units}`,
            newFormatted: `±${formatValue(mpe2)} ${units}`,
            impact: 'CRITICAL',
          });
        }
      } else if (testType === 'REPEATABILITY') {
        const range1 = calc1.observedRange ?? calc1.range;
        const range2 = calc2.observedRange ?? calc2.range;
        if (range1 !== undefined && range2 !== undefined && Math.abs(Number(range1) - Number(range2)) > 0.00001) {
          diffs.push({
            id: `calc-rep-range`,
            category: 'CALCULATION',
            testType,
            label: `Calculation (Test: Repeatability, Observed Range [Emax - Emin])`,
            field: `testRecords.REPEATABILITY.calculations.observedRange`,
            oldValue: range1,
            newValue: range2,
            oldFormatted: `${formatValue(range1)} ${units}`,
            newFormatted: `${formatValue(range2)} ${units}`,
            impact: 'WARNING',
            description: `Repeatability range delta observed across series`,
          });
        }
        const std1 = calc1.stdDeviation;
        const std2 = calc2.stdDeviation;
        if (std1 !== undefined && std2 !== undefined && Math.abs(Number(std1) - Number(std2)) > 0.00001) {
          diffs.push({
            id: `calc-rep-stddev`,
            category: 'CALCULATION',
            testType,
            label: `Calculation (Test: Repeatability, Standard Deviation s)`,
            field: `testRecords.REPEATABILITY.calculations.stdDeviation`,
            oldValue: std1,
            newValue: std2,
            oldFormatted: formatValue(std1),
            newFormatted: formatValue(std2),
            impact: 'NEUTRAL',
          });
        }
      } else if (testType === 'ECCENTRICITY') {
        const dev1 = calc1.maxDeviationFromCenter ?? calc1.maxEccentricError;
        const dev2 = calc2.maxDeviationFromCenter ?? calc2.maxEccentricError;
        if (dev1 !== undefined && dev2 !== undefined && Math.abs(Number(dev1) - Number(dev2)) > 0.00001) {
          diffs.push({
            id: `calc-ecc-dev`,
            category: 'CALCULATION',
            testType,
            label: `Calculation (Test: Eccentricity, Max Corner Deviation)`,
            field: `testRecords.ECCENTRICITY.calculations.maxDeviation`,
            oldValue: dev1,
            newValue: dev2,
            oldFormatted: `${formatValue(dev1)} ${units}`,
            newFormatted: `${formatValue(dev2)} ${units}`,
            impact: 'WARNING',
          });
        }
      }
    });

    // ── Overall Verdict Diff ──
    const getOverallVerdict = (snap: any): string => {
      const records = snap.testRecords || [];
      if (records.some((r: any) => r.status === 'FAIL')) return 'FAIL';
      if (records.some((r: any) => r.status === 'REVIEW')) return 'REVIEW';
      if (records.length > 0 && records.every((r: any) => r.status === 'PASS')) return 'PASS';
      return snap.evaluation?.state || 'PASS';
    };

    const overall1 = getOverallVerdict(d1);
    const overall2 = getOverallVerdict(d2);
    const verdictFlipped = overall1 !== overall2;

    if (verdictFlipped) {
      diffs.unshift({
        id: 'overall-certificate-verdict',
        category: 'COMPLIANCE',
        label: 'Overall Report Verdict',
        field: 'overallVerdict',
        oldValue: overall1,
        newValue: overall2,
        oldFormatted: overall1,
        newFormatted: overall2,
        impact: overall2 === 'FAIL' ? 'CRITICAL' : 'WARNING',
        description: `Authoritative certification outcome flipped from ${overall1} to ${overall2}`,
      });
    }

    return {
      version1: {
        version: v1Meta.version,
        createdAt: v1Meta.createdAt ? new Date(v1Meta.createdAt).toISOString() : undefined,
        createdByName: v1Meta.createdByName,
        integrityHash: v1Meta.integrityHash,
        changeDescription: v1Meta.changeDescription,
      },
      version2: {
        version: v2Meta.version,
        createdAt: v2Meta.createdAt ? new Date(v2Meta.createdAt).toISOString() : undefined,
        createdByName: v2Meta.createdByName,
        integrityHash: v2Meta.integrityHash,
        changeDescription: v2Meta.changeDescription,
      },
      summary: {
        totalChanges: diffs.length,
        observationChanges: diffs.filter((d) => d.category === 'OBSERVATION').length,
        calculationChanges: diffs.filter((d) => d.category === 'CALCULATION').length,
        complianceChanges: diffs.filter((d) => d.category === 'COMPLIANCE').length,
        specificationChanges: diffs.filter((d) => d.category === 'INSTRUMENT' || d.category === 'LABORATORY').length,
        metadataChanges: diffs.filter((d) => d.category === 'METADATA').length,
        verdictFlipped,
        originalOverallVerdict: overall1,
        newOverallVerdict: overall2,
      },
      diffs,
    };
  }
}
