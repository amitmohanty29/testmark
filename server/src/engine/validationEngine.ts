/**
 * OIML R-76 Input Validation & Cross-Field Logic Engine
 * Detects anomalies, parameter inconsistencies, and flags them for human review.
 */

import { OIML_R76_CLASSES } from './oimlR76Config';

export interface AnomalyFinding {
  code: string;
  field: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  description: string;
  clauseReference?: string;
  suggestedAction?: string;
}

export interface EnvironmentalConditions {
  temperatureCelsius?: number;
  relativeHumidity?: number;
  atmosphericPressureHpa?: number;
  isInstrumentLevel?: boolean;
  standardWeightsCertificate?: string;
  inspectorName?: string;
  notes?: string;
}

export interface InstrumentSpecs {
  accuracyClass: string;
  maxCapacity: number;
  minCapacity: number;
  scaleIntervalE: number;
  scaleIntervalD?: number | null;
  verificationUnits: string;
  temperatureRange?: string | null;
}

export class OimlValidationEngine {
  /**
   * Validate Instrument Technical Metrology Parameters
   * Performs cross-field checks: n = Max / e, Min / e, e vs class limits
   */
  public static validateInstrumentMetrology(specs: InstrumentSpecs): AnomalyFinding[] {
    const findings: AnomalyFinding[] = [];
    const classConfig = OIML_R76_CLASSES[specs.accuracyClass];

    if (!classConfig) {
      findings.push({
        code: 'UNKNOWN_ACCURACY_CLASS',
        field: 'accuracyClass',
        severity: 'CRITICAL',
        title: 'Unrecognized Accuracy Class',
        description: `Accuracy Class "${specs.accuracyClass}" is not recognized under OIML R-76.`,
        clauseReference: 'OIML R 76-1:2006 Clause 3.2',
        suggestedAction: 'Select Class I, Class II, Class III, or Class IV.',
      });
      return findings;
    }

    // Verification scale interval count n = Max / e
    if (specs.scaleIntervalE > 0) {
      const n = Math.round(specs.maxCapacity / specs.scaleIntervalE);

      if (n < classConfig.minVerificationIntervals) {
        findings.push({
          code: 'INTERVAL_COUNT_BELOW_MIN',
          field: 'maxCapacity',
          severity: 'WARNING',
          title: 'Verification Scale Intervals (n) Below Class Minimum',
          description: `Calculated n = Max / e = ${n} is lower than minimum prescribed n = ${classConfig.minVerificationIntervals} for ${specs.accuracyClass}.`,
          clauseReference: 'OIML R 76-1:2006 Table 3',
          suggestedAction: 'Review whether instrument is classified under a lower accuracy class.',
        });
      }

      if (n > classConfig.maxVerificationIntervals) {
        findings.push({
          code: 'INTERVAL_COUNT_ABOVE_MAX',
          field: 'maxCapacity',
          severity: 'WARNING',
          title: 'Verification Scale Intervals (n) Exceeds Class Maximum',
          description: `Calculated n = Max / e = ${n} exceeds maximum allowed n = ${classConfig.maxVerificationIntervals} for ${specs.accuracyClass}.`,
          clauseReference: 'OIML R 76-1:2006 Table 3',
          suggestedAction: 'Verify instrument scale interval or check if Class II/I is appropriate.',
        });
      }

      // Check Min Capacity ratio: Min in e
      const minInE = Math.round(specs.minCapacity / specs.scaleIntervalE);
      if (minInE < classConfig.minCapacityRatio) {
        findings.push({
          code: 'MIN_CAPACITY_BELOW_THRESHOLD',
          field: 'minCapacity',
          severity: 'WARNING',
          title: 'Minimum Capacity Below OIML Threshold',
          description: `Declared Min = ${specs.minCapacity} ${specs.verificationUnits} (${minInE} e) is below the standard minimum of ${classConfig.minCapacityRatio} e.`,
          clauseReference: 'OIML R 76-1:2006 Table 3',
          suggestedAction: 'Flag for Reviewing Officer review during pattern approval.',
        });
      }
    }

    // Check d vs e relationship: d <= e <= 10d
    if (specs.scaleIntervalD && specs.scaleIntervalD > 0 && specs.scaleIntervalE > 0) {
      if (specs.scaleIntervalD > specs.scaleIntervalE) {
        findings.push({
          code: 'INTERVAL_D_EXCEEDS_E',
          field: 'scaleIntervalD',
          severity: 'CRITICAL',
          title: 'Actual Scale Interval (d) Exceeds Verification Interval (e)',
          description: `Actual scale interval d (${specs.scaleIntervalD}) cannot be greater than verification scale interval e (${specs.scaleIntervalE}).`,
          clauseReference: 'OIML R 76-1:2006 Clause 3.4.1',
          suggestedAction: 'Correct the instrument scale configuration.',
        });
      }
    }

    return findings;
  }

  /**
   * Validate Environmental Conditions against Declared Instrument Limits
   */
  public static validateEnvironmentalConditions(
    env: EnvironmentalConditions,
    specs: InstrumentSpecs
  ): AnomalyFinding[] {
    const findings: AnomalyFinding[] = [];

    // Check Instrument Levelling
    if (env.isInstrumentLevel === false) {
      findings.push({
        code: 'INSTRUMENT_NOT_LEVEL',
        field: 'isInstrumentLevel',
        severity: 'CRITICAL',
        title: 'Instrument Leveling Bubble Displaced',
        description: 'Testing NAWI without level bubble centered invalidates gravity-induced load cell readings.',
        clauseReference: 'OIML R 76-1:2006 Clause 3.9.1.1',
        suggestedAction: 'Adjust leveling feet until circular bubble level is centered before testing.',
      });
    }

    // Parse Temperature range from instrument string if available (e.g. "+10°C to +40°C")
    let minTemp = -10;
    let maxTemp = 40;

    if (specs.temperatureRange) {
      const match = specs.temperatureRange.match(/([+-]?\d+)[^\d]+([+-]?\d+)/);
      if (match) {
        minTemp = parseInt(match[1], 10);
        maxTemp = parseInt(match[2], 10);
      }
    }

    if (env.temperatureCelsius !== undefined && env.temperatureCelsius !== null) {
      const temp = Number(env.temperatureCelsius);
      if (temp < minTemp || temp > maxTemp) {
        findings.push({
          code: 'TEMPERATURE_OUT_OF_RANGE',
          field: 'temperatureCelsius',
          severity: 'WARNING',
          title: 'Ambient Temperature Outside Operating Range',
          description: `Observed temperature ${temp}°C is outside the declared range (${minTemp}°C to ${maxTemp}°C).`,
          clauseReference: 'OIML R 76-1:2006 Clause 3.9.2.2',
          suggestedAction: 'Require Human Review: Evaluate if thermal drift compensated or if re-test in controlled room needed.',
        });
      }
    }

    // Relative humidity check (standard laboratory conditions 20% - 85% RH)
    if (env.relativeHumidity !== undefined && env.relativeHumidity !== null) {
      const rh = Number(env.relativeHumidity);
      if (rh < 10 || rh > 90) {
        findings.push({
          code: 'EXTREME_HUMIDITY',
          field: 'relativeHumidity',
          severity: 'INFO',
          title: 'Extreme Laboratory Humidity',
          description: `Relative humidity at ${rh}% is outside optimal laboratory bounds (20% to 85%).`,
          clauseReference: 'OIML R 76-1:2006 Clause A.4.1.1',
          suggestedAction: 'Ensure condensation has not formed on load receptor or test weights.',
        });
      }
    }

    return findings;
  }

  /**
   * Validate Observation Data Entries
   */
  public static validateObservations(
    testType: string,
    observations: any[],
    specs: InstrumentSpecs
  ): AnomalyFinding[] {
    const findings: AnomalyFinding[] = [];

    if (!observations || observations.length === 0) {
      findings.push({
        code: 'NO_OBSERVATIONS',
        field: 'observations',
        severity: 'CRITICAL',
        title: 'Missing Test Observations',
        description: 'No observation entries were provided for this test module.',
        suggestedAction: 'Enter required test load measurements.',
      });
      return findings;
    }

    const maxAllowedLoad = specs.maxCapacity * 1.05; // Max + 9e overload margin

    for (let i = 0; i < observations.length; i++) {
      const row = observations[i];
      const load = Number(row.appliedLoad);
      const indication = Number(row.indication);
      const deltaL = row.deltaL !== undefined ? Number(row.deltaL) : undefined;

      // Range check
      if (load < 0) {
        findings.push({
          code: 'NEGATIVE_LOAD',
          field: `observations[${i}].appliedLoad`,
          severity: 'CRITICAL',
          title: `Negative Applied Load at Step ${i + 1}`,
          description: `Applied test load cannot be negative: ${load}.`,
        });
      }

      if (load > maxAllowedLoad) {
        findings.push({
          code: 'LOAD_EXCEEDS_CAPACITY',
          field: `observations[${i}].appliedLoad`,
          severity: 'WARNING',
          title: `Applied Load Exceeds Max Capacity at Step ${i + 1}`,
          description: `Applied load ${load} ${specs.verificationUnits} exceeds Max Capacity ${specs.maxCapacity} ${specs.verificationUnits}.`,
          clauseReference: 'OIML R 76-1:2006 Clause 4.1.2.6',
          suggestedAction: 'Verify if overload test was intended or correct entry.',
        });
      }

      // Small weights deltaL check
      if (deltaL !== undefined && !isNaN(deltaL)) {
        if (deltaL < 0) {
          findings.push({
            code: 'NEGATIVE_DELTA_L',
            field: `observations[${i}].deltaL`,
            severity: 'CRITICAL',
            title: `Negative Turning Point Load ΔL at Step ${i + 1}`,
            description: `Small weights ΔL cannot be negative: ${deltaL}.`,
          });
        }
        if (deltaL >= specs.scaleIntervalE) {
          findings.push({
            code: 'DELTA_L_EXCEEDS_E',
            field: `observations[${i}].deltaL`,
            severity: 'WARNING',
            title: `Turning Point Weight ΔL Exceeds Scale Interval e at Step ${i + 1}`,
            description: `ΔL (${deltaL}) is ≥ verification interval e (${specs.scaleIntervalE}). Next graduation should have switched earlier.`,
            clauseReference: 'OIML R 76-1:2006 Clause A.4.4.3',
            suggestedAction: 'Review turning point observation procedure.',
          });
        }
      }
    }

    // Specific test type checks
    if (testType === 'REPEATABILITY' && observations.length < 3) {
      findings.push({
        code: 'INSUFFICIENT_REPEATABILITY_RUNS',
        field: 'observations',
        severity: 'WARNING',
        title: 'Insufficient Repeatability Series',
        description: `Only ${observations.length} runs recorded. OIML R-76 requires at least 3 successive weighings (or 10 for Class I/II).`,
        clauseReference: 'OIML R 76-1:2006 Clause A.4.10',
        suggestedAction: 'Perform additional weighings to satisfy statistical sample requirement.',
      });
    }

    if (testType === 'ECCENTRICITY' && observations.length < 5) {
      findings.push({
        code: 'INCOMPLETE_ECCENTRICITY_POINTS',
        field: 'observations',
        severity: 'WARNING',
        title: 'Incomplete Eccentricity Positions',
        description: `Only ${observations.length} positions recorded. Standard platform eccentricity requires 5 positions (Center + 4 quadrants).`,
        clauseReference: 'OIML R 76-1:2006 Clause A.4.7',
        suggestedAction: 'Ensure all 4 corners and center are recorded.',
      });
    }

    return findings;
  }
}
