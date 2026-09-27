import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { RuleSimulationEngine, SimulationFilters } from '../engine/ruleSimulationEngine';
import { ReportGenerator } from '../engine/reportGenerator';
import { logAudit } from '../middleware/auditLogger';

const router = Router();

const safeParse = (str: string | null | undefined, def: any = null) => {
  if (!str) return def;
  try { return JSON.parse(str); } catch { return def; }
};

// Run a rule impact simulation (strictly read-only against historical evaluation records)
router.post('/run', authenticateToken, requireRoles(['ADMIN']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { name, description, baseRuleConfigId, simulatedRuleConfigId, filters } = req.body;

      if (!name || !simulatedRuleConfigId) {
        res.status(400).json({ error: 'Simulation name and candidate draft rule config are required.' });
        return;
      }

      // Get the simulated draft rule config
      const simulatedConfig = await prisma.ruleConfiguration.findUnique({
        where: { id: simulatedRuleConfigId },
      });
      if (!simulatedConfig) {
        res.status(404).json({ error: 'Candidate rule configuration not found.' });
        return;
      }

      // Get baseline rule config for reference
      let baseConfig = null;
      if (baseRuleConfigId && baseRuleConfigId !== 'default') {
        baseConfig = await prisma.ruleConfiguration.findUnique({ where: { id: baseRuleConfigId } });
      } else {
        baseConfig = await prisma.ruleConfiguration.findFirst({ where: { isActive: true } });
      }

      // Build database query filters
      const simFilters: SimulationFilters = filters || {};
      const whereClause: any = { state: 'Completed' };

      // Date range filter
      if (simFilters.startDate || simFilters.endDate) {
        whereClause.evaluationDate = {};
        if (simFilters.startDate) {
          whereClause.evaluationDate.gte = new Date(simFilters.startDate);
        }
        if (simFilters.endDate) {
          // Set to end of the day
          const end = new Date(simFilters.endDate);
          end.setHours(23, 59, 59, 999);
          whereClause.evaluationDate.lte = end;
        }
      }

      // Accuracy Class filter
      if (simFilters.accuracyClass && simFilters.accuracyClass !== 'ALL') {
        whereClause.instrument = {
          ...whereClause.instrument,
          accuracyClass: simFilters.accuracyClass,
        };
      }

      // Instrument Type filter
      if (simFilters.instrumentType && simFilters.instrumentType !== 'ALL') {
        whereClause.instrument = {
          ...whereClause.instrument,
          instrumentType: { contains: simFilters.instrumentType },
        };
      }

      // Query historical evaluations with test records (strictly read-only)
      const evaluations = await prisma.evaluation.findMany({
        where: whereClause,
        include: {
          instrument: true,
          testRecords: true,
          laboratory: { select: { name: true, code: true } },
        },
        orderBy: { evaluationDate: 'desc' },
      });

      // Execute simulation engine
      const simOutput = RuleSimulationEngine.runSimulation(
        evaluations,
        simulatedConfig.configuration,
        simFilters
      );

      // Save simulation run record
      const simulationRun = await prisma.simulationRun.create({
        data: {
          name,
          description: description || null,
          baseRuleConfigId: baseConfig?.id || 'default',
          simulatedRuleConfigId,
          results: JSON.stringify({
            results: simOutput.results,
            summary: simOutput.summary,
            filters: simFilters,
            simulatedRuleConfig: {
              id: simulatedConfig.id,
              version: simulatedConfig.version,
              name: simulatedConfig.name,
              standardRef: simulatedConfig.standardRef,
            },
            baseRuleConfig: baseConfig ? {
              id: baseConfig.id,
              version: baseConfig.version,
              name: baseConfig.name,
            } : null,
          }),
          totalEvaluations: simOutput.summary.totalEvaluations,
          flippedCount: simOutput.summary.flippedCount,
          runById: req.user!.id,
          runByName: req.user!.name,
        },
      });

      await logAudit({
        entityType: 'SIMULATION',
        entityId: simulationRun.id,
        action: 'SIMULATION_RUN',
        actorId: req.user!.id,
        actorName: req.user!.name,
        actorRole: req.user!.role,
        description: `Rule impact simulation "${name}": ${simOutput.summary.flippedCount}/${simOutput.summary.totalEvaluations} evaluations would change outcome under ${simulatedConfig.version}`,
        metadata: {
          simulatedRuleConfigId,
          simulatedVersion: simulatedConfig.version,
          totalEvaluations: simOutput.summary.totalEvaluations,
          flippedCount: simOutput.summary.flippedCount,
          passToFailCount: simOutput.summary.passToFailCount,
          passToReviewCount: simOutput.summary.passToReviewCount,
          filters: simFilters,
        },
      });

      res.json({
        simulation: {
          id: simulationRun.id,
          name: simulationRun.name,
          description: simulationRun.description,
          totalEvaluations: simOutput.summary.totalEvaluations,
          flippedCount: simOutput.summary.flippedCount,
          passToFailCount: simOutput.summary.passToFailCount,
          passToReviewCount: simOutput.summary.passToReviewCount,
          unchangedCount: simOutput.summary.unchangedCount,
          affectedPercentage: simOutput.summary.affectedPercentage,
          filters: simFilters,
          results: simOutput.results,
          createdAt: simulationRun.createdAt,
          runByName: simulationRun.runByName,
          simulatedRuleConfig: {
            id: simulatedConfig.id,
            version: simulatedConfig.version,
            name: simulatedConfig.name,
          },
        },
        message: `Simulation complete. ${simOutput.summary.flippedCount} of ${simOutput.summary.totalEvaluations} evaluations would change verdict under ${simulatedConfig.version}.`,
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

    const formatted = runs.map((r) => {
      const parsed = safeParse(r.results, {});
      return {
        ...r,
        summary: parsed.summary || {
          totalEvaluations: r.totalEvaluations,
          flippedCount: r.flippedCount,
        },
        filters: parsed.filters || {},
        simulatedRuleConfig: parsed.simulatedRuleConfig,
        baseRuleConfig: parsed.baseRuleConfig,
        results: parsed.results || [],
      };
    });

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

    const parsed = safeParse(run.results, {});
    res.json({
      run: {
        ...run,
        summary: parsed.summary || {
          totalEvaluations: run.totalEvaluations,
          flippedCount: run.flippedCount,
        },
        filters: parsed.filters || {},
        simulatedRuleConfig: parsed.simulatedRuleConfig,
        baseRuleConfig: parsed.baseRuleConfig,
        results: parsed.results || [],
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch simulation run.' });
  }
});

// Export simulation comparison report as PDF (clearly branded "Simulation Only — Not a Legal Record")
router.get('/runs/:id/export/pdf', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const run = await prisma.simulationRun.findUnique({ where: { id } });
    if (!run) { res.status(404).json({ error: 'Simulation run not found.' }); return; }

    const parsed = safeParse(run.results, {});
    const results = parsed.results || [];
    const summary = parsed.summary || {
      totalEvaluations: run.totalEvaluations,
      flippedCount: run.flippedCount,
    };
    const filters = parsed.filters || {};

    const pdfBuffer = await ReportGenerator.generateSimulationReportPDF({
      simulation: {
        ...run,
        simulatedRuleConfig: parsed.simulatedRuleConfig,
        baseRuleConfig: parsed.baseRuleConfig,
      },
      results,
      summary,
      filters,
    });

    await logAudit({
      entityType: 'SIMULATION',
      entityId: run.id,
      action: 'EXPORTED_PDF',
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      description: `Simulation run "${run.name}" exported as PDF comparison report`,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="MarkSure_Simulation_${run.id.slice(0, 8)}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Simulation PDF export error:', error);
    res.status(500).json({ error: 'Failed to export simulation comparison report as PDF.' });
  }
});

// Export simulation comparison report as CSV
router.get('/runs/:id/export/csv', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const run = await prisma.simulationRun.findUnique({ where: { id } });
    if (!run) { res.status(404).json({ error: 'Simulation run not found.' }); return; }

    const parsed = safeParse(run.results, {});
    const results: any[] = parsed.results || [];

    const headers = [
      'SIMULATION NOTICE: SIMULATION ONLY - NOT A LEGAL RECORD',
      'Evaluation Number',
      'Evaluation Date',
      'Passport ID',
      'Manufacturer',
      'Model',
      'Serial Number',
      'Accuracy Class',
      'Original Verdict',
      'Simulated Verdict',
      'Outcome Shift',
      'Impact Deltas',
    ];

    const rows = results.map((r: any) => [
      '',
      `"${r.evaluationNumber}"`,
      `"${r.evaluationDate ? new Date(r.evaluationDate).toLocaleDateString('en-IN') : ''}"`,
      `"${r.instrumentPassportId || ''}"`,
      `"${r.instrumentManufacturer || ''}"`,
      `"${r.instrumentModel || ''}"`,
      `"${r.instrumentSerialNumber || ''}"`,
      `"${r.accuracyClass || ''}"`,
      `"${r.originalOverallVerdict || 'PASS'}"`,
      `"${r.simulatedOverallVerdict || 'PASS'}"`,
      `"${r.flipped ? `SHIFT (${r.originalOverallVerdict} -> ${r.simulatedOverallVerdict})` : 'UNCHANGED'}"`,
      `"${(r.impactDeltas || []).join('; ')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="MarkSure_Simulation_${run.id.slice(0, 8)}.csv"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export simulation CSV.' });
  }
});

export default router;
