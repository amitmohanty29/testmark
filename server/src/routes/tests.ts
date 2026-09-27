import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { OimlComplianceEngine, TestComplianceResult } from '../engine/complianceEngine';
import { VerificationType } from '../engine/calculationEngine';

const router = Router();

// Helper to safely parse JSON
const safeParse = (str: string | null | undefined, defaultValue: any = null) => {
  if (!str) return defaultValue;
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
};

// 1. Get all test records for an evaluation
router.get('/:evaluationId/tests', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const evaluationId = req.params.evaluationId as string;

    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        instrument: true,
      },
    });

    if (!evaluation) {
      res.status(404).json({ error: 'Evaluation session not found.' });
      return;
    }

    const testRecords = await prisma.testRecord.findMany({
      where: { evaluationId },
      include: {
        attachments: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Format parsed records
    const formatted = testRecords.map((rec) => ({
      id: rec.id,
      evaluationId: rec.evaluationId,
      testType: rec.testType,
      status: rec.status,
      environmentalData: safeParse(rec.environmentalData, {}),
      testInputs: safeParse(rec.testInputs, {}),
      observations: safeParse(rec.observations, []),
      calculationResults: safeParse(rec.calculationResults, null),
      complianceDetails: safeParse(rec.complianceDetails, null),
      notes: rec.notes || '',
      testedById: rec.testedById,
      testedByName: rec.testedByName,
      completedAt: rec.completedAt,
      createdAt: rec.createdAt,
      updatedAt: rec.updatedAt,
      attachments: rec.attachments,
    }));

    res.json({
      testRecords: formatted,
      evaluationState: evaluation.state,
      instrument: evaluation.instrument,
    });
  } catch (error) {
    console.error('Fetch test records error:', error);
    res.status(500).json({ error: 'Failed to retrieve test records.' });
  }
});

// 2. Real-time Calculation & Compliance Evaluation (Preview endpoint)
router.post(
  '/:evaluationId/calculate/:testType',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const evaluationId = req.params.evaluationId as string;
      const testType = req.params.testType as string;
      const {
        observations,
        environmentalData = {},
        verificationType = 'INITIAL',
        tareObservation,
        nominalLoad,
        appliedLoad,
      } = req.body;

      const evaluation = await prisma.evaluation.findUnique({
        where: { id: evaluationId },
        include: { instrument: true },
      });

      if (!evaluation || !evaluation.instrument) {
        res.status(404).json({ error: 'Evaluation or associated instrument not found.' });
        return;
      }

      const specs = {
        accuracyClass: evaluation.instrument.accuracyClass,
        maxCapacity: evaluation.instrument.maxCapacity,
        minCapacity: evaluation.instrument.minCapacity,
        scaleIntervalE: evaluation.instrument.scaleIntervalE,
        scaleIntervalD: evaluation.instrument.scaleIntervalD,
        verificationUnits: evaluation.instrument.verificationUnits,
        temperatureRange: evaluation.instrument.temperatureRange,
      };

      let result: TestComplianceResult;

      switch (testType) {
        case 'WEIGHING_PERFORMANCE':
          result = OimlComplianceEngine.evaluateWeighingPerformance(
            observations || [],
            specs,
            environmentalData,
            verificationType as VerificationType
          );
          break;

        case 'REPEATABILITY':
          result = OimlComplianceEngine.evaluateRepeatability(
            Number(nominalLoad || evaluation.instrument.maxCapacity * 0.5),
            observations || [],
            specs,
            environmentalData,
            verificationType as VerificationType
          );
          break;

        case 'ECCENTRICITY':
          result = OimlComplianceEngine.evaluateEccentricity(
            Number(appliedLoad || Math.round(evaluation.instrument.maxCapacity * 0.33 * 100) / 100),
            observations || [],
            specs,
            environmentalData,
            verificationType as VerificationType
          );
          break;

        case 'TARE':
          result = OimlComplianceEngine.evaluateTare(
            tareObservation || {
              tareLoad: 0,
              tareIndication: 0,
              netLoad: 0,
              netIndication: 0,
            },
            specs,
            environmentalData,
            verificationType as VerificationType
          );
          break;

        default:
          res.status(400).json({ error: `Unsupported test module type: ${testType}` });
          return;
      }

      res.json({ result });
    } catch (error) {
      console.error('Calculation error:', error);
      res.status(500).json({ error: 'Calculation engine failed.' });
    }
  }
);

// 3. Save or Update Test Record (Supports Save/Resume and Final Submission)
router.put(
  '/:evaluationId/tests/:testType',
  authenticateToken,
  requireRoles(['TESTING_OFFICER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const evaluationId = req.params.evaluationId as string;
      const testType = req.params.testType as string;
      const {
        observations,
        environmentalData = {},
        testInputs = {},
        notes = '',
        status, // 'DRAFT' | 'PASS' | 'FAIL' | 'REVIEW'
        verificationType = 'INITIAL',
        tareObservation,
        nominalLoad,
        appliedLoad,
      } = req.body;

      const evaluation = await prisma.evaluation.findUnique({
        where: { id: evaluationId },
        include: { instrument: true },
      });

      if (!evaluation || !evaluation.instrument) {
        res.status(404).json({ error: 'Evaluation or instrument not found.' });
        return;
      }

      // Check evaluation state: cannot edit if Under Review or Completed
      if (evaluation.state === 'Completed' || evaluation.state === 'Under Review') {
        res.status(400).json({
          error: `Cannot modify test entries while evaluation is in '${evaluation.state}' state.`,
        });
        return;
      }

      const specs = {
        accuracyClass: evaluation.instrument.accuracyClass,
        maxCapacity: evaluation.instrument.maxCapacity,
        minCapacity: evaluation.instrument.minCapacity,
        scaleIntervalE: evaluation.instrument.scaleIntervalE,
        scaleIntervalD: evaluation.instrument.scaleIntervalD,
        verificationUnits: evaluation.instrument.verificationUnits,
        temperatureRange: evaluation.instrument.temperatureRange,
      };

      // Run compliance evaluation
      let complianceResult: TestComplianceResult | null = null;
      let calculatedStatus = status || 'DRAFT';

      if ((observations && observations.length > 0) || tareObservation) {
        try {
          if (testType === 'WEIGHING_PERFORMANCE') {
            complianceResult = OimlComplianceEngine.evaluateWeighingPerformance(
              observations,
              specs,
              environmentalData,
              verificationType
            );
          } else if (testType === 'REPEATABILITY') {
            complianceResult = OimlComplianceEngine.evaluateRepeatability(
              Number(nominalLoad || testInputs.nominalLoad || evaluation.instrument.maxCapacity * 0.5),
              observations,
              specs,
              environmentalData,
              verificationType
            );
          } else if (testType === 'ECCENTRICITY') {
            complianceResult = OimlComplianceEngine.evaluateEccentricity(
              Number(appliedLoad || testInputs.appliedLoad || Math.round(evaluation.instrument.maxCapacity * 0.33 * 100) / 100),
              observations,
              specs,
              environmentalData,
              verificationType
            );
          } else if (testType === 'TARE') {
            complianceResult = OimlComplianceEngine.evaluateTare(
              tareObservation,
              specs,
              environmentalData,
              verificationType
            );
          }

          if (complianceResult) {
            calculatedStatus = complianceResult.verdict;
          }
        } catch (calcErr) {
          console.warn('Calculation warning during save:', calcErr);
        }
      }

      // Find existing record or create new
      const existing = await prisma.testRecord.findFirst({
        where: {
          evaluationId,
          testType,
        },
      });

      const dataToSave = {
        testType,
        status: calculatedStatus,
        environmentalData: JSON.stringify(environmentalData),
        testInputs: JSON.stringify({ ...testInputs, nominalLoad, appliedLoad, verificationType }),
        observations: JSON.stringify(observations || (tareObservation ? [tareObservation] : [])),
        calculationResults: complianceResult ? JSON.stringify(complianceResult.calculationOutput) : null,
        complianceDetails: complianceResult ? JSON.stringify(complianceResult) : null,
        notes: notes?.trim() || null,
        testedById: req.user!.id,
        testedByName: req.user!.name,
        completedAt: calculatedStatus !== 'DRAFT' ? new Date() : null,
      };

      let savedRecord;
      if (existing) {
        savedRecord = await prisma.testRecord.update({
          where: { id: existing.id },
          data: dataToSave,
          include: { attachments: true },
        });
      } else {
        savedRecord = await prisma.testRecord.create({
          data: {
            ...dataToSave,
            evaluationId,
          },
          include: { attachments: true },
        });
      }

      // Automatically move evaluation state to "In Progress" if currently "Draft"
      if (evaluation.state === 'Draft') {
        await prisma.evaluation.update({
          where: { id: evaluationId },
          data: { state: 'In Progress' },
        });
      }

      // Log timeline entry
      await prisma.timelineEvent.create({
        data: {
          instrumentId: evaluation.instrumentId,
          evaluationId,
          eventType: 'TEST_LOGGED',
          title: `OIML Test Logged: ${testType}`,
          description: `Test module [${testType}] updated by ${req.user!.name}. Result: [${calculatedStatus}].`,
          officerName: req.user!.name,
          officerRole: req.user!.role,
        },
      });

      res.json({
        message: `Test record for ${testType} successfully saved.`,
        record: {
          ...savedRecord,
          environmentalData: safeParse(savedRecord.environmentalData, {}),
          testInputs: safeParse(savedRecord.testInputs, {}),
          observations: safeParse(savedRecord.observations, []),
          calculationResults: safeParse(savedRecord.calculationResults, null),
          complianceDetails: safeParse(savedRecord.complianceDetails, null),
        },
        complianceResult,
      });
    } catch (error) {
      console.error('Save test record error:', error);
      res.status(500).json({ error: 'Failed to save test record.' });
    }
  }
);

// 4. Attach Photo or Document to Test Record
router.post(
  '/:evaluationId/tests/:testRecordId/attachments',
  authenticateToken,
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const testRecordId = req.params.testRecordId as string;
      const { title, fileType, fileUrl } = req.body;

      const record = await prisma.testRecord.findUnique({
        where: { id: testRecordId },
      });

      if (!record) {
        res.status(404).json({ error: 'Test record not found.' });
        return;
      }

      let finalUrl = fileUrl || '';
      let finalName = title || 'Evidence Attachment';
      let fileSize: number | null = null;

      if (req.file) {
        finalUrl = `/uploads/${req.file.filename}`;
        finalName = req.file.originalname;
        fileSize = req.file.size;
      }

      if (!finalUrl) {
        res.status(400).json({ error: 'No file uploaded or fileUrl provided.' });
        return;
      }

      const attachment = await prisma.testAttachment.create({
        data: {
          testRecordId,
          title: title || finalName,
          fileName: finalName,
          fileUrl: finalUrl,
          fileType: fileType || (req.file?.mimetype.startsWith('image') ? 'PHOTO' : 'DOCUMENT'),
          fileSize,
        },
      });

      res.status(201).json({
        attachment,
        message: 'Evidence attachment linked to test module.',
      });
    } catch (error) {
      console.error('Attachment upload error:', error);
      res.status(500).json({ error: 'Failed to link attachment.' });
    }
  }
);

// 5. Delete Attachment
router.delete(
  '/:evaluationId/tests/:testRecordId/attachments/:attachmentId',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const attachmentId = req.params.attachmentId as string;

      await prisma.testAttachment.delete({
        where: { id: attachmentId },
      });

      res.json({ message: 'Evidence attachment removed.' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to remove attachment.' });
    }
  }
);

// 6. Two-Level Workflow: Testing Officer Submits for Review
router.post(
  '/:evaluationId/workflow/submit',
  authenticateToken,
  requireRoles(['TESTING_OFFICER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const evaluationId = req.params.evaluationId as string;
      const { notes } = req.body;

      const evaluation = await prisma.evaluation.findUnique({
        where: { id: evaluationId },
        include: {
          instrument: true,
        },
      });

      if (!evaluation) {
        res.status(404).json({ error: 'Evaluation session not found.' });
        return;
      }

      const testRecords = await prisma.testRecord.findMany({
        where: { evaluationId },
      });

      // Check that at least 2 test modules have been completed
      const completedTests = testRecords.filter(
        (t) => t.status === 'PASS' || t.status === 'FAIL' || t.status === 'REVIEW'
      );

      if (completedTests.length < 2) {
        res.status(400).json({
          error: `Minimum 2 completed test modules required before submitting for review. Currently completed: ${completedTests.length}`,
        });
        return;
      }

      const updated = await prisma.evaluation.update({
        where: { id: evaluationId },
        data: {
          state: 'Under Review',
          generalRemarks: notes
            ? `${evaluation.generalRemarks ? evaluation.generalRemarks + '\n' : ''}Submission Notes: ${notes}`
            : evaluation.generalRemarks,
        },
        include: {
          testingOfficer: true,
          reviewingOfficer: true,
          laboratory: true,
          instrument: true,
        },
      });

      await prisma.timelineEvent.create({
        data: {
          instrumentId: evaluation.instrumentId,
          evaluationId,
          eventType: 'STATE_TRANSITION',
          title: `Submitted for Officer Review (${evaluation.evaluationNumber})`,
          description: `Testing Officer ${req.user!.name} submitted evaluation with ${completedTests.length} completed test modules. Pending Reviewing Officer endorsement.`,
          officerName: req.user!.name,
          officerRole: req.user!.role,
        },
      });

      res.json({
        evaluation: updated,
        message: 'Evaluation submitted to Reviewing Officer for compliance review.',
      });
    } catch (error) {
      console.error('Submit for review error:', error);
      res.status(500).json({ error: 'Failed to submit evaluation for review.' });
    }
  }
);

// 7. Two-Level Workflow: Reviewing Officer Review Action (Approve or Return)
router.post(
  '/:evaluationId/workflow/review',
  authenticateToken,
  requireRoles(['REVIEWING_OFFICER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const evaluationId = req.params.evaluationId as string;
      const { action, remarks } = req.body; // action: 'APPROVE' | 'RETURN'

      if (!action || !['APPROVE', 'RETURN'].includes(action)) {
        res.status(400).json({ error: 'Invalid review action. Must be APPROVE or RETURN.' });
        return;
      }

      if (!remarks || remarks.trim().length === 0) {
        res.status(400).json({ error: 'Official review comments/remarks are mandatory.' });
        return;
      }

      const evaluation = await prisma.evaluation.findUnique({
        where: { id: evaluationId },
        include: { instrument: true },
      });

      if (!evaluation) {
        res.status(404).json({ error: 'Evaluation session not found.' });
        return;
      }

      const testRecords = await prisma.testRecord.findMany({
        where: { evaluationId },
      });

      if (action === 'APPROVE') {
        // Verify no test module is in FAIL state
        const failedTests = testRecords.filter((t) => t.status === 'FAIL');
        if (failedTests.length > 0) {
          res.status(400).json({
            error: `Cannot approve evaluation: ${failedTests.length} test module(s) marked as FAIL. All tests must be PASS or justified under REVIEW.`,
          });
          return;
        }

        const updated = await prisma.evaluation.update({
          where: { id: evaluationId },
          data: {
            state: 'Completed',
            reviewRemarks: remarks.trim(),
            reviewingOfficerId: req.user!.id,
            completedAt: new Date(),
          },
          include: {
            instrument: true,
            testingOfficer: true,
            reviewingOfficer: true,
          },
        });

        // Mark instrument as CERTIFIED
        await prisma.instrument.update({
          where: { id: evaluation.instrumentId },
          data: { status: 'CERTIFIED' },
        });

        await prisma.timelineEvent.create({
          data: {
            instrumentId: evaluation.instrumentId,
            evaluationId,
            eventType: 'CERTIFIED',
            title: `Evaluation Approved & Certified (${evaluation.evaluationNumber})`,
            description: `Reviewing Officer ${req.user!.name} approved the test results and endorsed OIML R-76 compliance. Remarks: "${remarks.trim()}". Digital Passport certified.`,
            officerName: req.user!.name,
            officerRole: req.user!.role,
          },
        });

        res.json({
          evaluation: updated,
          message: 'Evaluation successfully approved and marked Completed. Instrument certified.',
        });
      } else {
        // RETURN with comments -> goes back to "In Progress"
        const updated = await prisma.evaluation.update({
          where: { id: evaluationId },
          data: {
            state: 'In Progress',
            reviewRemarks: `[RETURNED on ${new Date().toLocaleDateString('en-IN')}] ${remarks.trim()}`,
            reviewingOfficerId: req.user!.id,
          },
          include: {
            instrument: true,
            testingOfficer: true,
            reviewingOfficer: true,
          },
        });

        await prisma.timelineEvent.create({
          data: {
            instrumentId: evaluation.instrumentId,
            evaluationId,
            eventType: 'REVIEW_FEEDBACK',
            title: `Evaluation Returned for Revision (${evaluation.evaluationNumber})`,
            description: `Reviewing Officer ${req.user!.name} returned the evaluation to In Progress. Reasons/Comments: "${remarks.trim()}".`,
            officerName: req.user!.name,
            officerRole: req.user!.role,
          },
        });

        res.json({
          evaluation: updated,
          message: 'Evaluation returned to In Progress. Testing Officer has been notified.',
        });
      }
    } catch (error) {
      console.error('Review action error:', error);
      res.status(500).json({ error: 'Failed to process review action.' });
    }
  }
);

export default router;
