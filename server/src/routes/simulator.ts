import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { OimlComplianceEngine } from '../engine/complianceEngine';
import { logAudit } from '../middleware/auditLogger';

const router = Router();

const safeParse = (str: string | null | undefined, def: any = null) => {
  if (!str) return def;
  try { return JSON.parse(str); } catch { return def; }
};

// Run a rule impact simulation
router.post('/run', authenticateToken, requireRoles(['ADMIN']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { name, description, baseRuleConfigId, simulatedRuleConfigId } = req.body;

      if (!name || !simulatedRuleConfigId) {
        res.status(400).json({ error: 'Simulation name and simulated rule config are required.' });
        return;
      }

      // Get the simulated rule config
      const simulatedConfig = await prisma.ruleConfiguration.findUnique({
        where: { id: simulatedRuleConfigId },
      });
      if (!simulatedConfig) {
        res.status(404).json({ error: 'Simulated rule configuration not found.' });
        return;
      }

      const simConfig = safeParse(simulatedConfig.configuration, {});

      // Get all completed evaluations with test records
      const evaluations = await prisma.evaluation.findMany({
        where: { state: 'Completed' },
        include: {
          instrument: true,
          testRecords: true,
          laboratory: { select: { name: true } },
        },
      });

      const results: any[] = [];
      let flippedCount = 0;

      for (const evaluation of evaluations) {
        const evalResult: any = {
          evaluationId: evaluation.id,
          evaluationNumber: evaluation.evaluationNumber,
          instrumentPassportId: evaluation.instrument.passportId,
          instrumentManufacturer: evaluation.instrument.manufacturer,
          instrumentModel: evaluation.instrument.model,
          accuracyClass: evaluation.instrument.accuracyClass,
          laboratoryName: (evaluation as any).laboratory?.name || 'N/A',
          testResults: [],
          originalOverallVerdict: 'PASS',
          simulatedOverallVerdict: 'PASS',
          flipped: false,
        };

        const specs = {
          accuracyClass: evaluation.instrument.accuracyClass,
          maxCapacity: evaluation.instrument.maxCapacity,
          minCapacity: evaluation.instrument.minCapacity,
          scaleIntervalE: evaluation.instrument.scaleIntervalE,
          scaleIntervalD: evaluation.instrument.scaleIntervalD,
          verificationUnits: evaluation.instrument.verificationUnits,
          temperatureRange: evaluation.instrument.temperatureRange,
        };

        // If simulated config has modified MPE brackets for this class, apply a tightening factor
        const simClasses = simConfig.classes || {};
        const simClassConfig = simClasses[evaluation.instrument.accuracyClass];
        let tighteningFactor = 1.0;
        if (simClassConfig && simClassConfig.mpeTighteningFactor) {
          tighteningFactor = simClassConfig.mpeTighteningFactor;
        }

        for (const testRecord of evaluation.testRecords) {
          const originalCompliance = safeParse(testRecord.complianceDetails);
          const originalVerdict = originalCompliance?.verdict || testRecord.status;
          const observations = safeParse(testRecord.observations, []);
          const envData = safeParse(testRecord.environmentalData, {});
          const testInputs = safeParse(testRecord.testInputs, {});

          let simulatedVerdict = originalVerdict;

          // Re-evaluate with simulated rule
          try {
            if (testRecord.testType === 'WEIGHING_PERFORMANCE' && observations.length > 0) {
              // Apply tightening factor to simulate stricter MPE
              const result = OimlComplianceEngine.evaluateWeighingPerformance(
                observations, specs, envData, testInputs.verificationType || 'INITIAL'
              );
              // Simulate: if tightening factor < 1, some passes might become fails
              if (tighteningFactor < 1.0 && result.verdict === 'PASS') {
                const calcOutput = result.calculationOutput as any;
                if (calcOutput && calcOutput.maxAbsError !== undefined) {
                  const tightenedMPE = (calcOutput.mpeAtMaxError || 1) * tighteningFactor;
                  if (Math.abs(calcOutput.maxAbsError) > tightenedMPE) {
                    simulatedVerdict = 'FAIL';
                  }
                }
              } else {
                simulatedVerdict = result.verdict;
              }
            } else if (testRecord.testType === 'REPEATABILITY' && observations.length > 0) {
              const nominalLoad = testInputs.nominalLoad || evaluation.instrument.maxCapacity * 0.5;
              const result = OimlComplianceEngine.evaluateRepeatability(
                nominalLoad, observations, specs, envData, testInputs.verificationType || 'INITIAL'
              );
              simulatedVerdict = result.verdict;
              if (tighteningFactor < 1.0 && result.verdict === 'PASS') {
                simulatedVerdict = 'REVIEW'; // Flag for review under stricter rules
              }
            } else if (testRecord.testType === 'ECCENTRICITY' && observations.length > 0) {
              const appliedLoad = testInputs.appliedLoad || evaluation.instrument.maxCapacity * 0.33;
              const result = OimlComplianceEngine.evaluateEccentricity(
                appliedLoad, observations, specs, envData, testInputs.verificationType || 'INITIAL'
              );
              simulatedVerdict = result.verdict;
            } else if (testRecord.testType === 'TARE' && observations.length > 0) {
              const result = OimlComplianceEngine.evaluateTare(
                observations[0], specs, envData, testInputs.verificationType || 'INITIAL'
              );
              simulatedVerdict = result.verdict;
            }
          } catch (err) {
            simulatedVerdict = 'ERROR';
          }

          const testFlipped = originalVerdict !== simulatedVerdict;
          evalResult.testResults.push({
            testType: testRecord.testType,
            originalVerdict,
            simulatedVerdict,
            flipped: testFlipped,
          });

          if (simulatedVerdict === 'FAIL') evalResult.simulatedOverallVerdict = 'FAIL';
          if (originalVerdict === 'FAIL') evalResult.originalOverallVerdict = 'FAIL';
        }

        evalResult.flipped = evalResult.originalOverallVerdict !== evalResult.simulatedOverallVerdict;
        if (evalResult.flipped) flippedCount++;
        results.push(evalResult);
      }

      // Save simulation run
      const simulationRun = await prisma.simulationRun.create({
        data: {
          name,
          description: description || null,
          baseRuleConfigId: baseRuleConfigId || 'default',
          simulatedRuleConfigId,
          results: JSON.stringify(results),
          totalEvaluations: evaluations.length,
          flippedCount,
          runById: req.user!.id,
          runByName: req.user!.name,
        },
      });

      await logAudit({
        entityType: 'SIMULATION', entityId: simulationRun.id, action: 'SIMULATION_RUN',
        actorId: req.user!.id, actorName: req.user!.name, actorRole: req.user!.role,
        description: `Rule impact simulation "${name}": ${flippedCount}/${evaluations.length} evaluations would flip verdict`,
        metadata: { simulatedRuleConfigId, flippedCount, totalEvaluations: evaluations.length },
      });

      res.json({
        simulation: {
          id: simulationRun.id,
          name: simulationRun.name,
          totalEvaluations: evaluations.length,
          flippedCount,
          results,
        },
        message: `Simulation complete. ${flippedCount} of ${evaluations.length} evaluations would change verdict.`,
      });
    } catch (error) {
      console.error('Simulation error:', error);
      res.status(500).json({ error: 'Simulation failed.' });
    }
  }
);

// List past simulation runs
router.get('/runs', authenticateToken, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const runs = await prisma.simulationRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const formatted = runs.map(r => ({
      ...r,
      results: safeParse(r.results, []),
    }));

    res.json({ runs: formatted });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch simulation runs.' });
  }
});

// Get single simulation run
router.get('/runs/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const run = await prisma.simulationRun.findUnique({ where: { id } });
    if (!run) { res.status(404).json({ error: 'Simulation run not found.' }); return; }

    res.json({ run: { ...run, results: safeParse(run.results, []) } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch simulation run.' });
  }
});

export default router;
