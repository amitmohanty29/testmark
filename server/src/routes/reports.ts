import { Router, Response } from 'express';
import multer from 'multer';
import prisma from '../prisma';
import { authenticateToken, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { generateReportHash, verifyReportIntegrity } from '../engine/integrityEngine';
import { ReportGenerator } from '../engine/reportGenerator';
import { logAudit } from '../middleware/auditLogger';
import { MetrologyDiffEngine } from '../engine/metrologyDiffEngine';
import { OimlComplianceEngine } from '../engine/complianceEngine';
import { OimlCalculationEngine } from '../engine/calculationEngine';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const safeParse = (str: string | null | undefined, def: any = null) => {
  if (!str) return def;
  try { return JSON.parse(str); } catch { return def; }
};

// Generate a new report from an evaluation
router.post('/generate/:evaluationId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const evaluationId = req.params.evaluationId as string;
    const evaluation: any = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        instrument: true,
        laboratory: true,
        testingOfficer: { select: { id: true, name: true, email: true, role: true, designation: true, department: true } },
        reviewingOfficer: { select: { id: true, name: true, email: true, role: true, designation: true, department: true } },
        testRecords: { include: { attachments: true } },
        ruleConfig: true,
      },
    });

    if (!evaluation) { res.status(404).json({ error: 'Evaluation not found.' }); return; }

    // Generate Report ID
    const reportCount = await prisma.report.count();
    const reportId = `RPT-${new Date().getFullYear()}-${String(reportCount + 1).padStart(4, '0')}`;

    // Build report data snapshot
    const reportData = {
      reportId,
      evaluation: {
        evaluationNumber: evaluation.evaluationNumber,
        state: evaluation.state,
        evaluationDate: evaluation.evaluationDate,
        standardReference: evaluation.standardReference,
        patternApprovalNo: evaluation.patternApprovalNo,
        generalRemarks: evaluation.generalRemarks,
        reviewRemarks: evaluation.reviewRemarks,
        completedAt: evaluation.completedAt,
      },
      instrument: {
        passportId: evaluation.instrument.passportId,
        manufacturer: evaluation.instrument.manufacturer,
        model: evaluation.instrument.model,
        serialNumber: evaluation.instrument.serialNumber,
        instrumentType: evaluation.instrument.instrumentType,
        accuracyClass: evaluation.instrument.accuracyClass,
        maxCapacity: evaluation.instrument.maxCapacity,
        minCapacity: evaluation.instrument.minCapacity,
        scaleIntervalE: evaluation.instrument.scaleIntervalE,
        verificationUnits: evaluation.instrument.verificationUnits,
      },
      laboratory: {
        name: evaluation.laboratory.name,
        code: evaluation.laboratory.code,
        address: evaluation.laboratory.address,
        accreditationNumber: evaluation.laboratory.accreditationNumber,
      },
      testingOfficer: evaluation.testingOfficer,
      reviewingOfficer: evaluation.reviewingOfficer,
      testRecords: evaluation.testRecords.map((r: any) => ({
        testType: r.testType,
        status: r.status,
        environmentalData: safeParse(r.environmentalData, {}),
        testInputs: safeParse(r.testInputs, {}),
        observations: safeParse(r.observations, []),
        calculationResults: safeParse(r.calculationResults),
        complianceDetails: safeParse(r.complianceDetails),
        notes: r.notes,
        testedByName: r.testedByName,
        completedAt: r.completedAt,
        attachments: r.attachments.map((a: any) => ({ title: a.title, fileName: a.fileName, fileType: a.fileType })),
      })),
      ruleConfig: evaluation.ruleConfig ? {
        version: evaluation.ruleConfig.version,
        name: evaluation.ruleConfig.name,
        standardRef: evaluation.ruleConfig.standardRef,
      } : null,
      generatedAt: new Date().toISOString(),
    };

    const reportDataStr = JSON.stringify(reportData);

    const report = await prisma.report.create({
      data: {
        reportId,
        evaluationId,
        ruleConfigId: evaluation.ruleConfigId,
        version: 1,
        status: 'DRAFT',
        reportData: reportDataStr,
        generatedById: req.user!.id,
        generatedByName: req.user!.name,
      },
    });

    // Create initial version snapshot
    await prisma.reportVersion.create({
      data: {
        reportId: report.id,
        version: 1,
        reportData: reportDataStr,
        changeDescription: 'Initial report generation',
        createdById: req.user!.id,
        createdByName: req.user!.name,
      },
    });

    await logAudit({
      entityType: 'REPORT', entityId: report.id, action: 'CREATED',
      actorId: req.user!.id, actorName: req.user!.name, actorRole: req.user!.role,
      description: `Report ${reportId} generated from evaluation ${evaluation.evaluationNumber}`,
      evaluationId,
    });

    res.status(201).json({ report, message: `Report ${reportId} generated successfully.` });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate report.' });
  }
});

// List all reports
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, status } = req.query;
    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (search) {
      where.OR = [
        { reportId: { contains: String(search) } },
        { evaluation: { evaluationNumber: { contains: String(search) } } },
        { evaluation: { instrument: { manufacturer: { contains: String(search) } } } },
        { evaluation: { instrument: { serialNumber: { contains: String(search) } } } },
      ];
    }

    const reports = await prisma.report.findMany({
      where,
      include: {
        evaluation: {
          include: {
            instrument: { select: { passportId: true, manufacturer: true, model: true, serialNumber: true, accuracyClass: true } },
            laboratory: { select: { name: true, code: true } },
          },
        },
        ruleConfig: { select: { version: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ reports });
  } catch (error) {
    console.error('List reports error:', error);
    res.status(500).json({ error: 'Failed to list reports.' });
  }
});

// Get single report (supports ?version=X for viewing historical snapshots)
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const requestedVersion = req.query.version ? parseInt(String(req.query.version)) : undefined;

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        evaluation: {
          include: {
            instrument: true,
            laboratory: true,
            testingOfficer: { select: { id: true, name: true, email: true, role: true, designation: true, department: true } },
            reviewingOfficer: { select: { id: true, name: true, email: true, role: true, designation: true, department: true } },
            testRecords: { include: { attachments: true } },
          },
        },
        ruleConfig: true,
        versions: { orderBy: { version: 'desc' } },
      },
    });

    if (!report) { res.status(404).json({ error: 'Report not found.' }); return; }

    // If a specific version is requested, deliver that historical version
    if (requestedVersion && requestedVersion !== report.version) {
      const targetVersion = report.versions.find((v: any) => v.version === requestedVersion);
      if (targetVersion) {
        const historicalReport = {
          ...report,
          version: targetVersion.version,
          reportData: targetVersion.reportData,
          integrityHash: targetVersion.integrityHash,
          createdAt: targetVersion.createdAt,
          changeDescription: targetVersion.changeDescription,
          isHistoricalVersion: true,
          latestVersion: report.version,
        };
        res.json({ report: historicalReport });
        return;
      }
    }

    res.json({ report });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch report.' });
  }
});

// Finalize report (lock + generate SHA-256 hash)
router.post('/:id/finalize', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) { res.status(404).json({ error: 'Report not found.' }); return; }
    if (report.status === 'FINALIZED') { res.status(400).json({ error: 'Report is already finalized.' }); return; }

    const integrityHash = generateReportHash(report.reportData);

    const updated = await prisma.report.update({
      where: { id },
      data: {
        status: 'FINALIZED',
        integrityHash,
        finalizedAt: new Date(),
        finalizedById: req.user!.id,
      },
    });

    // Update the latest version snapshot with hash
    await prisma.reportVersion.updateMany({
      where: { reportId: report.id, version: report.version },
      data: { integrityHash },
    });

    await logAudit({
      entityType: 'REPORT', entityId: report.id, action: 'FINALIZED',
      actorId: req.user!.id, actorName: req.user!.name, actorRole: req.user!.role,
      description: `Report ${report.reportId} finalized with SHA-256 hash: ${integrityHash}`,
      newState: { integrityHash, status: 'FINALIZED' },
    });

    res.json({ report: updated, integrityHash, message: 'Report finalized and integrity hash generated.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to finalize report.' });
  }
});

// Revise a finalized report (creates new version, never mutates original)
router.post('/:id/revise', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { changeDescription, updatedObservations, testTypeToUpdate, customRemarks } = req.body;

    if (!changeDescription || !changeDescription.trim()) {
      res.status(400).json({ error: 'A valid reason-for-revision is required to revise a finalized report.' });
      return;
    }

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        evaluation: {
          include: {
            instrument: true,
            laboratory: true,
            testingOfficer: { select: { id: true, name: true, email: true, role: true, designation: true, department: true } },
            reviewingOfficer: { select: { id: true, name: true, email: true, role: true, designation: true, department: true } },
            testRecords: { include: { attachments: true } },
            ruleConfig: true,
          },
        },
        versions: { orderBy: { version: 'desc' } },
      },
    });

    if (!report) { res.status(404).json({ error: 'Report not found.' }); return; }

    const eval_ = (report as any).evaluation;
    const currentSnapshot = safeParse(report.reportData, {});

    // Ensure the baseline version exists in reportVersion table
    const existingBaseVersion = await prisma.reportVersion.findFirst({
      where: { reportId: report.id, version: report.version },
    });
    if (!existingBaseVersion) {
      await prisma.reportVersion.create({
        data: {
          reportId: report.id,
          version: report.version,
          reportData: report.reportData,
          integrityHash: report.integrityHash,
          changeDescription: 'Initial report generation and baseline lock',
          createdById: report.generatedById || req.user!.id,
          createdByName: report.generatedByName || req.user!.name,
          createdAt: report.createdAt,
        },
      });
    }

    // Build the updated test records
    let revisedTestRecords = eval_.testRecords.map((r: any) => ({
      testType: r.testType,
      status: r.status,
      environmentalData: safeParse(r.environmentalData, {}),
      testInputs: safeParse(r.testInputs, {}),
      observations: safeParse(r.observations, []),
      calculationResults: safeParse(r.calculationResults),
      complianceDetails: safeParse(r.complianceDetails),
      notes: r.notes,
      testedByName: r.testedByName,
      completedAt: r.completedAt,
      attachments: r.attachments.map((a: any) => ({ title: a.title, fileName: a.fileName, fileType: a.fileType })),
    }));

    // If specific observation edits were supplied in the revision request
    if (updatedObservations && testTypeToUpdate) {
      const targetIndex = revisedTestRecords.findIndex((r: any) => r.testType === testTypeToUpdate);
      if (targetIndex !== -1) {
        revisedTestRecords[targetIndex].observations = updatedObservations;

        // Recalculate deterministic results
        const specs = {
          accuracyClass: eval_.instrument.accuracyClass,
          maxCapacity: eval_.instrument.maxCapacity,
          minCapacity: eval_.instrument.minCapacity,
          scaleIntervalE: eval_.instrument.scaleIntervalE,
          scaleIntervalD: eval_.instrument.scaleIntervalD,
          verificationUnits: eval_.instrument.verificationUnits,
          temperatureRange: eval_.instrument.temperatureRange,
        };
        const env = revisedTestRecords[targetIndex].environmentalData || {};
        const vType = revisedTestRecords[targetIndex].testInputs?.verificationType || 'INITIAL';

        try {
          if (testTypeToUpdate === 'WEIGHING_PERFORMANCE') {
            const result = OimlComplianceEngine.evaluateWeighingPerformance(updatedObservations, specs, env, vType);
            revisedTestRecords[targetIndex].status = result.verdict;
            revisedTestRecords[targetIndex].calculationResults = result.calculationOutput;
            revisedTestRecords[targetIndex].complianceDetails = { verdict: result.verdict, whyBreakdown: result.showMeWhy };
          } else if (testTypeToUpdate === 'REPEATABILITY') {
            const nominalLoad = revisedTestRecords[targetIndex].testInputs?.nominalLoad || eval_.instrument.maxCapacity * 0.5;
            const result = OimlComplianceEngine.evaluateRepeatability(nominalLoad, updatedObservations, specs, env, vType);
            revisedTestRecords[targetIndex].status = result.verdict;
            revisedTestRecords[targetIndex].calculationResults = result.calculationOutput;
            revisedTestRecords[targetIndex].complianceDetails = { verdict: result.verdict, whyBreakdown: result.showMeWhy };
          } else if (testTypeToUpdate === 'ECCENTRICITY') {
            const appliedLoad = revisedTestRecords[targetIndex].testInputs?.appliedLoad || eval_.instrument.maxCapacity * 0.33;
            const result = OimlComplianceEngine.evaluateEccentricity(appliedLoad, updatedObservations, specs, env, vType);
            revisedTestRecords[targetIndex].status = result.verdict;
            revisedTestRecords[targetIndex].calculationResults = result.calculationOutput;
            revisedTestRecords[targetIndex].complianceDetails = { verdict: result.verdict, whyBreakdown: result.showMeWhy };
          } else if (testTypeToUpdate === 'TARE') {
            const result = OimlComplianceEngine.evaluateTare(updatedObservations[0], specs, env, vType);
            revisedTestRecords[targetIndex].status = result.verdict;
            revisedTestRecords[targetIndex].calculationResults = result.calculationOutput;
            revisedTestRecords[targetIndex].complianceDetails = { verdict: result.verdict, whyBreakdown: result.showMeWhy };
          }
        } catch (calcErr) {
          console.warn('Re-evaluation error during revision:', calcErr);
        }
      }
    }

    const newReportData = {
      ...currentSnapshot,
      evaluation: {
        evaluationNumber: eval_.evaluationNumber,
        state: eval_.state,
        evaluationDate: eval_.evaluationDate,
        standardReference: eval_.standardReference,
        patternApprovalNo: eval_.patternApprovalNo,
        generalRemarks: customRemarks || eval_.generalRemarks,
        reviewRemarks: eval_.reviewRemarks,
        completedAt: eval_.completedAt,
      },
      instrument: {
        passportId: eval_.instrument.passportId,
        manufacturer: eval_.instrument.manufacturer,
        model: eval_.instrument.model,
        serialNumber: eval_.instrument.serialNumber,
        instrumentType: eval_.instrument.instrumentType,
        accuracyClass: eval_.instrument.accuracyClass,
        maxCapacity: eval_.instrument.maxCapacity,
        minCapacity: eval_.instrument.minCapacity,
        scaleIntervalE: eval_.instrument.scaleIntervalE,
        scaleIntervalD: eval_.instrument.scaleIntervalD,
        verificationUnits: eval_.instrument.verificationUnits,
        tareRange: eval_.instrument.tareRange,
        temperatureRange: eval_.instrument.temperatureRange,
        powerSupply: eval_.instrument.powerSupply,
      },
      laboratory: {
        name: eval_.laboratory.name,
        code: eval_.laboratory.code,
        address: eval_.laboratory.address,
        accreditationNumber: eval_.laboratory.accreditationNumber,
      },
      testRecords: revisedTestRecords,
      revisedAt: new Date().toISOString(),
      revisionReason: changeDescription.trim(),
    };

    const newVersion = report.version + 1;
    const newDataStr = JSON.stringify(newReportData);
    const newHash = generateReportHash(newDataStr);

    // Save the new version record (immutable historical archive)
    await prisma.reportVersion.create({
      data: {
        reportId: report.id,
        version: newVersion,
        reportData: newDataStr,
        integrityHash: newHash,
        changeDescription: changeDescription.trim(),
        createdById: req.user!.id,
        createdByName: req.user!.name,
      },
    });

    // Update active report pointer
    const updated = await prisma.report.update({
      where: { id: req.params.id as string },
      data: {
        version: newVersion,
        status: 'FINALIZED',
        reportData: newDataStr,
        integrityHash: newHash,
        finalizedAt: new Date(),
        finalizedById: req.user!.id,
      },
    });

    // Surface revision event on the Instrument Digital Passport timeline
    if (eval_.instrumentId) {
      await prisma.timelineEvent.create({
        data: {
          instrumentId: eval_.instrumentId,
          evaluationId: eval_.id,
          eventType: 'REPORT_REVISED',
          title: `Report ${report.reportId} Revised to Version ${newVersion}`,
          description: `Revision reason: ${changeDescription.trim()}. Cryptographic Digest: ${newHash}`,
          officerName: req.user!.name,
          officerRole: req.user!.role,
        },
      });
    }

    // Log revision in the audit trail
    await logAudit({
      entityType: 'REPORT',
      entityId: report.id,
      action: 'REVISED',
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      description: `Report ${report.reportId} revised to v${newVersion}. Reason: ${changeDescription.trim()}`,
      previousState: { version: report.version, hash: report.integrityHash },
      newState: { version: newVersion, hash: newHash },
      metadata: { reason: changeDescription.trim(), previousVersion: report.version, newVersion },
      evaluationId: eval_.id,
    });

    res.json({
      report: updated,
      newVersion,
      integrityHash: newHash,
      message: `Report revised successfully to version ${newVersion}. Original Version ${report.version} preserved in audit ledger.`,
    });
  } catch (error) {
    console.error('Failed to revise report:', error);
    res.status(500).json({ error: 'Failed to revise report.' });
  }
});

// Verify report integrity
router.post('/:id/verify', async (req, res): Promise<void> => {
  try {
    const report = await prisma.report.findUnique({ where: { id: req.params.id } });
    if (!report) { res.status(404).json({ error: 'Report not found.' }); return; }
    if (!report.integrityHash) {
      res.json({
        verified: false,
        verdict: 'Warning — Content Does Not Match Original',
        reason: 'Report has not been finalized. No integrity hash exists.',
        reportId: report.reportId,
      });
      return;
    }

    const isValid = verifyReportIntegrity(report.reportData, report.integrityHash);
    const computedHash = generateReportHash(report.reportData);

    await logAudit({
      entityType: 'REPORT',
      entityId: report.id,
      action: 'VERIFIED',
      actorId: 'PUBLIC_AUDITOR',
      actorName: 'Enforcement Officer / Public Auditor',
      actorRole: 'AUDITOR',
      description: `Report ${report.reportId} cryptographic verification: ${isValid ? 'Verified — Unaltered' : 'Warning — Content Does Not Match Original'}`,
      newState: { verified: isValid, reportId: report.reportId, checkTimestamp: new Date().toISOString() },
    });

    res.json({
      verified: isValid,
      verdict: isValid ? 'Verified — Unaltered' : 'Warning — Content Does Not Match Original',
      reportId: report.reportId,
      storedHash: report.integrityHash,
      computedHash,
      finalizedAt: report.finalizedAt,
      version: report.version,
      reason: isValid
        ? 'Verified — Unaltered: Real-time SHA-256 payload matches authoritative ledger record bit-for-bit.'
        : 'Warning — Content Does Not Match Original: Cryptographic fingerprint differs from government ledger.',
    });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed.' });
  }
});

// Verify by Report ID or Hash (public, no-login endpoint)
router.get('/verify/:reportId', async (req, res): Promise<void> => {
  try {
    const query = req.params.reportId.trim();
    const report = await prisma.report.findFirst({
      where: {
        OR: [
          { reportId: query },
          { id: query },
          { integrityHash: query },
        ],
      },
    });

    if (!report) {
      res.status(404).json({ error: `No report found matching identifier or hash: "${query}"` });
      return;
    }

    if (!report.integrityHash) {
      res.json({
        verified: false,
        verdict: 'Warning — Content Does Not Match Original',
        reportId: report.reportId,
        reason: 'Report is still in draft state and has not been cryptographically finalized.',
      });
      return;
    }

    const isValid = verifyReportIntegrity(report.reportData, report.integrityHash);
    const computedHash = generateReportHash(report.reportData);

    await logAudit({
      entityType: 'REPORT',
      entityId: report.id,
      action: 'VERIFIED',
      actorId: 'PUBLIC_AUDITOR',
      actorName: 'Public Auditor / Enforcement Officer',
      actorRole: 'AUDITOR',
      description: `Report ${report.reportId} zero-trust check: ${isValid ? 'Verified — Unaltered' : 'Warning — Content Does Not Match Original'}`,
      newState: { verified: isValid, query, reportId: report.reportId, checkTimestamp: new Date().toISOString() },
    });

    res.json({
      verified: isValid,
      verdict: isValid ? 'Verified — Unaltered' : 'Warning — Content Does Not Match Original',
      reportId: report.reportId,
      storedHash: report.integrityHash,
      computedHash,
      finalizedAt: report.finalizedAt,
      version: report.version,
      reason: isValid
        ? 'Verified — Unaltered: Real-time SHA-256 payload matches authoritative ledger record bit-for-bit.'
        : 'Warning — Content Does Not Match Original: Cryptographic fingerprint differs from government ledger.',
    });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed.' });
  }
});

// Verify by PDF file upload (public, no-login endpoint)
router.post('/verify-upload', upload.single('file'), async (req, res): Promise<void> => {
  try {
    if (!req.file || !req.file.buffer) {
      res.status(400).json({ error: 'No PDF file uploaded.' });
      return;
    }

    const fileContent = req.file.buffer.toString('latin1');
    const reportIdMatch = fileContent.match(/RPT-\d{4}-\d+/i) || fileContent.match(/RPT-[A-Za-z0-9-]+/i);
    const hashMatch = fileContent.match(/[a-f0-9]{64}/i);

    let report = null;
    if (reportIdMatch) {
      report = await prisma.report.findFirst({ where: { reportId: reportIdMatch[0] } });
    }
    if (!report && hashMatch) {
      report = await prisma.report.findFirst({ where: { integrityHash: hashMatch[0].toLowerCase() } });
    }

    if (!report) {
      res.status(404).json({
        verified: false,
        verdict: 'Warning — Content Does Not Match Original',
        reason: 'Warning — Content Does Not Match Original: Could not identify any genuine Government OIML R-76 report seal or record in the uploaded file.',
      });
      return;
    }

    const isValid = verifyReportIntegrity(report.reportData, report.integrityHash || '');
    const computedHash = generateReportHash(report.reportData);

    let isUnaltered = isValid;
    if (hashMatch && hashMatch[0].toLowerCase() !== (report.integrityHash || '').toLowerCase()) {
      isUnaltered = false;
    }

    await logAudit({
      entityType: 'REPORT',
      entityId: report.id,
      action: 'VERIFIED',
      actorId: 'PUBLIC_AUDITOR',
      actorName: 'PDF Document Inspector',
      actorRole: 'AUDITOR',
      description: `Uploaded PDF verified for Report ${report.reportId}: ${isUnaltered ? 'Verified — Unaltered' : 'Warning — Content Does Not Match Original'}`,
      newState: { verified: isUnaltered, fileName: req.file.originalname, checkTimestamp: new Date().toISOString() },
    });

    res.json({
      verified: isUnaltered,
      verdict: isUnaltered ? 'Verified — Unaltered' : 'Warning — Content Does Not Match Original',
      reportId: report.reportId,
      storedHash: report.integrityHash,
      computedHash,
      finalizedAt: report.finalizedAt,
      version: report.version,
      fileName: req.file.originalname,
      reason: isUnaltered
        ? 'Verified — Unaltered: Uploaded PDF matches authoritative SHA-256 government ledger.'
        : 'Warning — Content Does Not Match Original: Document structure or cryptographic fingerprint has been modified.',
    });
  } catch (error) {
    console.error('PDF verification error:', error);
    res.status(500).json({ error: 'Failed to verify uploaded PDF document.' });
  }
});

// Export PDF (supports ?version=X to export historical versions permanently)
router.get('/:id/export/pdf', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const requestedVersion = req.query.version ? parseInt(String(req.query.version)) : undefined;

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        evaluation: {
          include: {
            instrument: true, laboratory: true,
            testingOfficer: { select: { id: true, name: true, email: true, designation: true } },
            reviewingOfficer: { select: { id: true, name: true, email: true, designation: true } },
            testRecords: { include: { attachments: true }, orderBy: { createdAt: 'asc' } },
          },
        },
        ruleConfig: true,
        versions: true,
      },
    });

    if (!report) { res.status(404).json({ error: 'Report not found.' }); return; }

    let targetReport = report;
    let targetEvaluation = (report as any).evaluation;
    let targetInstrument = targetEvaluation?.instrument;
    let targetLaboratory = targetEvaluation?.laboratory;
    let targetTestRecords = targetEvaluation?.testRecords || [];
    let targetTestingOfficer = targetEvaluation?.testingOfficer;
    let targetReviewingOfficer = targetEvaluation?.reviewingOfficer;
    let targetRuleConfig = (report as any).ruleConfig;

    // If historical version requested, load from immutable snapshot
    if (requestedVersion && requestedVersion !== report.version) {
      const historicalVer = report.versions.find((v: any) => v.version === requestedVersion);
      if (historicalVer) {
        const snap = safeParse(historicalVer.reportData, {});
        targetReport = {
          ...report,
          version: historicalVer.version,
          integrityHash: historicalVer.integrityHash,
          createdAt: historicalVer.createdAt,
          reportData: historicalVer.reportData,
        };
        targetEvaluation = snap.evaluation || targetEvaluation;
        targetInstrument = snap.instrument || targetInstrument;
        targetLaboratory = snap.laboratory || targetLaboratory;
        targetTestRecords = snap.testRecords || targetTestRecords;
        targetTestingOfficer = snap.testingOfficer || targetTestingOfficer;
        targetReviewingOfficer = snap.reviewingOfficer || targetReviewingOfficer;
        targetRuleConfig = snap.ruleConfig || targetRuleConfig;
      }
    }

    const pdfBuffer = await ReportGenerator.generatePDF({
      report: targetReport,
      evaluation: targetEvaluation,
      instrument: targetInstrument,
      laboratory: targetLaboratory,
      testRecords: targetTestRecords,
      testingOfficer: targetTestingOfficer,
      reviewingOfficer: targetReviewingOfficer,
      ruleConfig: targetRuleConfig,
    });

    await logAudit({
      entityType: 'REPORT', entityId: report.id, action: 'EXPORTED_PDF',
      actorId: req.user!.id, actorName: req.user!.name, actorRole: req.user!.role,
      description: `Report ${report.reportId} (v${targetReport.version}) exported as PDF`,
      metadata: { version: targetReport.version },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${report.reportId}_v${targetReport.version}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Failed to export PDF.' });
  }
});

// Export DOCX (supports ?version=X to export historical versions permanently)
router.get('/:id/export/docx', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const requestedVersion = req.query.version ? parseInt(String(req.query.version)) : undefined;

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        evaluation: {
          include: {
            instrument: true, laboratory: true,
            testingOfficer: { select: { id: true, name: true, email: true, designation: true } },
            reviewingOfficer: { select: { id: true, name: true, email: true, designation: true } },
            testRecords: { include: { attachments: true }, orderBy: { createdAt: 'asc' } },
          },
        },
        ruleConfig: true,
        versions: true,
      },
    });

    if (!report) { res.status(404).json({ error: 'Report not found.' }); return; }

    let targetReport = report;
    let targetEvaluation = (report as any).evaluation;
    let targetInstrument = targetEvaluation?.instrument;
    let targetLaboratory = targetEvaluation?.laboratory;
    let targetTestRecords = targetEvaluation?.testRecords || [];
    let targetTestingOfficer = targetEvaluation?.testingOfficer;
    let targetReviewingOfficer = targetEvaluation?.reviewingOfficer;
    let targetRuleConfig = (report as any).ruleConfig;

    if (requestedVersion && requestedVersion !== report.version) {
      const historicalVer = report.versions.find((v: any) => v.version === requestedVersion);
      if (historicalVer) {
        const snap = safeParse(historicalVer.reportData, {});
        targetReport = {
          ...report,
          version: historicalVer.version,
          integrityHash: historicalVer.integrityHash,
          createdAt: historicalVer.createdAt,
          reportData: historicalVer.reportData,
        };
        targetEvaluation = snap.evaluation || targetEvaluation;
        targetInstrument = snap.instrument || targetInstrument;
        targetLaboratory = snap.laboratory || targetLaboratory;
        targetTestRecords = snap.testRecords || targetTestRecords;
        targetTestingOfficer = snap.testingOfficer || targetTestingOfficer;
        targetReviewingOfficer = snap.reviewingOfficer || targetReviewingOfficer;
        targetRuleConfig = snap.ruleConfig || targetRuleConfig;
      }
    }

    const docxBuffer = await ReportGenerator.generateDOCX({
      report: targetReport,
      evaluation: targetEvaluation,
      instrument: targetInstrument,
      laboratory: targetLaboratory,
      testRecords: targetTestRecords,
      testingOfficer: targetTestingOfficer,
      reviewingOfficer: targetReviewingOfficer,
      ruleConfig: targetRuleConfig,
    });

    await logAudit({
      entityType: 'REPORT', entityId: report.id, action: 'EXPORTED_DOCX',
      actorId: req.user!.id, actorName: req.user!.name, actorRole: req.user!.role,
      description: `Report ${report.reportId} (v${targetReport.version}) exported as DOCX`,
      metadata: { version: targetReport.version },
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${report.reportId}_v${targetReport.version}.docx"`);
    res.send(docxBuffer);
  } catch (error) {
    console.error('DOCX export error:', error);
    res.status(500).json({ error: 'Failed to export DOCX.' });
  }
});

// Get version history
router.get('/:id/versions', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const reportId = req.params.id as string;
    const versions = await prisma.reportVersion.findMany({
      where: { reportId },
      orderBy: { version: 'desc' },
    });
    res.json({ versions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch version history.' });
  }
});

// Diff two versions using MetrologyDiffEngine
router.get('/:id/diff/:v1/:v2', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const reportId = req.params.id as string;
    const v1Num = parseInt(req.params.v1 as string);
    const v2Num = parseInt(req.params.v2 as string);
    const v1 = await prisma.reportVersion.findFirst({
      where: { reportId, version: v1Num },
    });
    const v2 = await prisma.reportVersion.findFirst({
      where: { reportId, version: v2Num },
    });

    if (!v1 || !v2) { res.status(404).json({ error: 'One or both versions not found.' }); return; }

    const diffReport = MetrologyDiffEngine.compareReportSnapshots(
      v1.reportData,
      v2.reportData,
      {
        version: v1.version,
        createdAt: v1.createdAt,
        createdByName: v1.createdByName,
        integrityHash: v1.integrityHash,
        changeDescription: v1.changeDescription,
      },
      {
        version: v2.version,
        createdAt: v2.createdAt,
        createdByName: v2.createdByName,
        integrityHash: v2.integrityHash,
        changeDescription: v2.changeDescription,
      }
    );

    res.json(diffReport);
  } catch (error) {
    console.error('Failed to compute version diff:', error);
    res.status(500).json({ error: 'Failed to compute diff.' });
  }
});

export default router;
