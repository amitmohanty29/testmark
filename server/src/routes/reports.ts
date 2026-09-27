import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { generateReportHash, verifyReportIntegrity } from '../engine/integrityEngine';
import { ReportGenerator } from '../engine/reportGenerator';
import { logAudit } from '../middleware/auditLogger';

const router = Router();

const safeParse = (str: string | null | undefined, def: any = null) => {
  if (!str) return def;
  try { return JSON.parse(str); } catch { return def; }
};

// Generate a new report from an evaluation
router.post('/generate/:evaluationId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { evaluationId } = req.params;
    const evaluation = await prisma.evaluation.findUnique({
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
      testRecords: evaluation.testRecords.map(r => ({
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
        attachments: r.attachments.map(a => ({ title: a.title, fileName: a.fileName, fileType: a.fileType })),
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

// Get single report
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
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
    res.json({ report });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch report.' });
  }
});

// Finalize report (lock + generate SHA-256 hash)
router.post('/:id/finalize', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const report = await prisma.report.findUnique({ where: { id: req.params.id } });
    if (!report) { res.status(404).json({ error: 'Report not found.' }); return; }
    if (report.status === 'FINALIZED') { res.status(400).json({ error: 'Report is already finalized.' }); return; }

    const integrityHash = generateReportHash(report.reportData);

    const updated = await prisma.report.update({
      where: { id: req.params.id },
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

// Revise a finalized report (creates new version)
router.post('/:id/revise', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { changeDescription } = req.body;
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
      include: {
        evaluation: {
          include: {
            instrument: true, laboratory: true,
            testingOfficer: { select: { id: true, name: true, email: true, role: true, designation: true, department: true } },
            reviewingOfficer: { select: { id: true, name: true, email: true, role: true, designation: true, department: true } },
            testRecords: { include: { attachments: true } },
            ruleConfig: true,
          },
        },
      },
    });

    if (!report) { res.status(404).json({ error: 'Report not found.' }); return; }

    const eval_ = report.evaluation;
    const newReportData = {
      ...safeParse(report.reportData, {}),
      evaluation: {
        evaluationNumber: eval_.evaluationNumber, state: eval_.state,
        evaluationDate: eval_.evaluationDate, standardReference: eval_.standardReference,
        patternApprovalNo: eval_.patternApprovalNo, generalRemarks: eval_.generalRemarks,
        reviewRemarks: eval_.reviewRemarks, completedAt: eval_.completedAt,
      },
      testRecords: eval_.testRecords.map((r: any) => ({
        testType: r.testType, status: r.status,
        environmentalData: safeParse(r.environmentalData, {}),
        testInputs: safeParse(r.testInputs, {}),
        observations: safeParse(r.observations, []),
        calculationResults: safeParse(r.calculationResults),
        complianceDetails: safeParse(r.complianceDetails),
        notes: r.notes, testedByName: r.testedByName, completedAt: r.completedAt,
        attachments: r.attachments.map((a: any) => ({ title: a.title, fileName: a.fileName, fileType: a.fileType })),
      })),
      revisedAt: new Date().toISOString(),
    };

    const newVersion = report.version + 1;
    const newDataStr = JSON.stringify(newReportData);
    const newHash = generateReportHash(newDataStr);

    const updated = await prisma.report.update({
      where: { id: req.params.id },
      data: {
        version: newVersion,
        status: 'FINALIZED',
        reportData: newDataStr,
        integrityHash: newHash,
        finalizedAt: new Date(),
        finalizedById: req.user!.id,
      },
    });

    await prisma.reportVersion.create({
      data: {
        reportId: report.id,
        version: newVersion,
        reportData: newDataStr,
        integrityHash: newHash,
        changeDescription: changeDescription || 'Report revised with latest evaluation data',
        createdById: req.user!.id,
        createdByName: req.user!.name,
      },
    });

    await logAudit({
      entityType: 'REPORT', entityId: report.id, action: 'REVISED',
      actorId: req.user!.id, actorName: req.user!.name, actorRole: req.user!.role,
      description: `Report ${report.reportId} revised to v${newVersion}. ${changeDescription || ''}`,
      previousState: { version: report.version, hash: report.integrityHash },
      newState: { version: newVersion, hash: newHash },
    });

    res.json({ report: updated, message: `Report revised to version ${newVersion}.` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to revise report.' });
  }
});

// Verify report integrity
router.post('/:id/verify', async (req, res): Promise<void> => {
  try {
    const report = await prisma.report.findUnique({ where: { id: req.params.id } });
    if (!report) { res.status(404).json({ error: 'Report not found.' }); return; }
    if (!report.integrityHash) {
      res.json({ verified: false, reason: 'Report has not been finalized. No integrity hash exists.', reportId: report.reportId });
      return;
    }

    const isValid = verifyReportIntegrity(report.reportData, report.integrityHash);
    res.json({
      verified: isValid,
      reportId: report.reportId,
      storedHash: report.integrityHash,
      computedHash: generateReportHash(report.reportData),
      finalizedAt: report.finalizedAt,
      reason: isValid ? 'Report data matches stored hash. Document integrity confirmed.' : 'INTEGRITY VIOLATION: Report data has been altered since finalization.',
    });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed.' });
  }
});

// Verify by Report ID (public endpoint)
router.get('/verify/:reportId', async (req, res): Promise<void> => {
  try {
    const report = await prisma.report.findUnique({ where: { reportId: req.params.reportId } });
    if (!report) { res.status(404).json({ error: 'Report not found.' }); return; }
    if (!report.integrityHash) {
      res.json({ verified: false, reportId: report.reportId, reason: 'Not finalized.' });
      return;
    }
    const isValid = verifyReportIntegrity(report.reportData, report.integrityHash);
    res.json({
      verified: isValid,
      reportId: report.reportId,
      storedHash: report.integrityHash,
      computedHash: generateReportHash(report.reportData),
      finalizedAt: report.finalizedAt,
      version: report.version,
      reason: isValid ? 'Integrity confirmed.' : 'INTEGRITY VIOLATION.',
    });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed.' });
  }
});

// Export PDF
router.get('/:id/export/pdf', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
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
      },
    });

    if (!report) { res.status(404).json({ error: 'Report not found.' }); return; }

    const pdfBuffer = await ReportGenerator.generatePDF({
      report,
      evaluation: report.evaluation,
      instrument: report.evaluation.instrument,
      laboratory: report.evaluation.laboratory,
      testRecords: report.evaluation.testRecords,
      testingOfficer: report.evaluation.testingOfficer,
      reviewingOfficer: report.evaluation.reviewingOfficer,
      ruleConfig: report.ruleConfig,
    });

    await logAudit({
      entityType: 'REPORT', entityId: report.id, action: 'EXPORTED_PDF',
      actorId: req.user!.id, actorName: req.user!.name, actorRole: req.user!.role,
      description: `Report ${report.reportId} exported as PDF`,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${report.reportId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Failed to export PDF.' });
  }
});

// Export DOCX
router.get('/:id/export/docx', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
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
      },
    });

    if (!report) { res.status(404).json({ error: 'Report not found.' }); return; }

    const docxBuffer = await ReportGenerator.generateDOCX({
      report,
      evaluation: report.evaluation,
      instrument: report.evaluation.instrument,
      laboratory: report.evaluation.laboratory,
      testRecords: report.evaluation.testRecords,
      testingOfficer: report.evaluation.testingOfficer,
      reviewingOfficer: report.evaluation.reviewingOfficer,
      ruleConfig: report.ruleConfig,
    });

    await logAudit({
      entityType: 'REPORT', entityId: report.id, action: 'EXPORTED_DOCX',
      actorId: req.user!.id, actorName: req.user!.name, actorRole: req.user!.role,
      description: `Report ${report.reportId} exported as DOCX`,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${report.reportId}.docx"`);
    res.send(docxBuffer);
  } catch (error) {
    console.error('DOCX export error:', error);
    res.status(500).json({ error: 'Failed to export DOCX.' });
  }
});

// Get version history
router.get('/:id/versions', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const versions = await prisma.reportVersion.findMany({
      where: { reportId: req.params.id },
      orderBy: { version: 'desc' },
    });
    res.json({ versions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch version history.' });
  }
});

// Diff two versions
router.get('/:id/diff/:v1/:v2', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const v1 = await prisma.reportVersion.findFirst({
      where: { reportId: req.params.id, version: parseInt(req.params.v1) },
    });
    const v2 = await prisma.reportVersion.findFirst({
      where: { reportId: req.params.id, version: parseInt(req.params.v2) },
    });

    if (!v1 || !v2) { res.status(404).json({ error: 'One or both versions not found.' }); return; }

    const data1 = safeParse(v1.reportData, {});
    const data2 = safeParse(v2.reportData, {});

    // Compute field-level diffs
    const diffs: any[] = [];
    const compareObjects = (obj1: any, obj2: any, path: string = '') => {
      const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);
      allKeys.forEach(key => {
        const fullPath = path ? `${path}.${key}` : key;
        const val1 = obj1?.[key];
        const val2 = obj2?.[key];
        if (JSON.stringify(val1) !== JSON.stringify(val2)) {
          if (typeof val1 === 'object' && typeof val2 === 'object' && val1 && val2 && !Array.isArray(val1)) {
            compareObjects(val1, val2, fullPath);
          } else {
            diffs.push({ field: fullPath, oldValue: val1, newValue: val2 });
          }
        }
      });
    };

    compareObjects(data1, data2);

    res.json({
      version1: { version: v1.version, createdAt: v1.createdAt, createdByName: v1.createdByName },
      version2: { version: v2.version, createdAt: v2.createdAt, createdByName: v2.createdByName },
      diffs,
      totalChanges: diffs.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to compute diff.' });
  }
});

export default router;
