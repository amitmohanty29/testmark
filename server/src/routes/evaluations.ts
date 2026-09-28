import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { PassportService } from '../engine/passportService';

const router = Router();

// Generate unique Evaluation ID: "EV-2026-XXXX"
const generateEvaluationId = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const count = await prisma.evaluation.count();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `EV-${currentYear}-${(count + 1).toString().padStart(4, '0')}-${randomSuffix.toString().slice(-2)}`;
};

// List all evaluations with filters (state, instrumentId, officer)
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { state, search, instrumentId } = req.query;

    const where: any = {};

    if (state && typeof state === 'string' && state !== 'ALL') {
      where.state = state;
    }

    if (instrumentId && typeof instrumentId === 'string') {
      where.instrumentId = instrumentId;
    }

    if (search && typeof search === 'string') {
      const q = search.trim();
      where.OR = [
        { evaluationNumber: { contains: q } },
        { instrument: { model: { contains: q } } },
        { instrument: { serialNumber: { contains: q } } },
        { instrument: { manufacturer: { contains: q } } },
        { laboratory: { name: { contains: q } } },
      ];
    }

    const evaluations = await prisma.evaluation.findMany({
      where,
      include: {
        instrument: {
          select: {
            id: true,
            passportId: true,
            model: true,
            manufacturer: true,
            serialNumber: true,
            accuracyClass: true,
            maxCapacity: true,
            minCapacity: true,
            verificationUnits: true,
          },
        },
        laboratory: {
          select: {
            id: true,
            name: true,
            code: true,
            accreditationNumber: true,
          },
        },
        testingOfficer: {
          select: {
            id: true,
            name: true,
            email: true,
            designation: true,
          },
        },
        reviewingOfficer: {
          select: {
            id: true,
            name: true,
            email: true,
            designation: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ evaluations });
  } catch (error) {
    console.error('List evaluations error:', error);
    res.status(500).json({ error: 'Failed to retrieve evaluations.' });
  }
});

// Get single evaluation by ID
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const evaluation = await prisma.evaluation.findFirst({
      where: {
        OR: [{ id }, { evaluationNumber: id }],
      },
      include: {
        instrument: {
          include: {
            documents: true,
          },
        },
        laboratory: true,
        testingOfficer: {
          select: { id: true, name: true, email: true, designation: true, department: true },
        },
        reviewingOfficer: {
          select: { id: true, name: true, email: true, designation: true, department: true },
        },
        timelineEvents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!evaluation) {
      res.status(404).json({ error: 'Evaluation record not found.' });
      return;
    }

    res.json({ evaluation });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve evaluation.' });
  }
});

// Create new evaluation
router.post('/', authenticateToken, requireRoles(['TESTING_OFFICER', 'ADMIN']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      instrumentId,
      laboratoryId,
      evaluationDate,
      testingOfficerId,
      reviewingOfficerId,
      standardReference,
      generalRemarks,
      initialState,
    } = req.body;

    if (!instrumentId || !laboratoryId) {
      res.status(400).json({ error: 'Instrument and Laboratory are required to initialize an Evaluation.' });
      return;
    }

    // Verify instrument exists
    const instrument = await prisma.instrument.findUnique({ where: { id: instrumentId } });
    if (!instrument) {
      res.status(404).json({ error: 'Selected instrument not found.' });
      return;
    }

    // Verify lab exists
    const laboratory = await prisma.laboratory.findUnique({ where: { id: laboratoryId } });
    if (!laboratory) {
      res.status(404).json({ error: 'Selected laboratory not found.' });
      return;
    }

    const assignedTestingOfficerId = testingOfficerId || req.user!.id;
    const evaluationNumber = await generateEvaluationId();
    const state = initialState || 'Draft';

    const activeRuleConfig = await prisma.ruleConfiguration.findFirst({
      where: { isActive: true, isDraft: false },
      orderBy: { createdAt: 'desc' },
    });

    const passport = await PassportService.getOrCreatePassportForInstrument(prisma, instrumentId, req.user?.id);

    const evaluation = await prisma.evaluation.create({
      data: {
        evaluationNumber,
        instrumentId,
        passportId: passport.id,
        laboratoryId,
        evaluationDate: evaluationDate ? new Date(evaluationDate) : new Date(),
        testingOfficerId: assignedTestingOfficerId,
        reviewingOfficerId: reviewingOfficerId || null,
        standardReference: activeRuleConfig ? activeRuleConfig.standardRef : (standardReference || 'OIML R 76-1 (Edition 2006)'),
        generalRemarks: generalRemarks?.trim() || null,
        state,
        ruleConfigId: activeRuleConfig ? activeRuleConfig.id : null,
      },
      include: {
        instrument: true,
        laboratory: true,
        testingOfficer: { select: { name: true, email: true } },
      },
    });

    // Update instrument status to IN_EVALUATION if currently ACTIVE
    if (instrument.status === 'ACTIVE') {
      await prisma.instrument.update({
        where: { id: instrumentId },
        data: { status: 'IN_EVALUATION' },
      });
    }

    // Record on Passport Event Log
    await PassportService.recordEvent(
      prisma,
      passport.id,
      'EVALUATION_CREATED',
      'EVALUATION',
      evaluation.id,
      req.user!.id,
      `Evaluation ${evaluationNumber} created (${evaluation.standardReference}) at ${laboratory.name}. Testing Officer: ${req.user!.name}.`,
      {
        evaluationNumber,
        laboratory: laboratory.name,
        standardReference: evaluation.standardReference,
        ruleVersion: activeRuleConfig?.version || '1.0.0',
        ruleConfigId: activeRuleConfig?.id || null,
        state,
      }
    );

    // Log to Digital Passport timeline
    await prisma.timelineEvent.create({
      data: {
        instrumentId,
        evaluationId: evaluation.id,
        eventType: 'EVALUATION_INITIATED',
        title: `Evaluation Session Initiated: ${evaluationNumber}`,
        description: `Evaluation session created at ${laboratory.name}. Testing Officer assigned: ${req.user!.name}. Current State: ${state}.`,
        officerName: req.user!.name,
        officerRole: req.user!.role,
      },
    });

    res.status(201).json({
      evaluation,
      message: `Evaluation ${evaluationNumber} created successfully.`,
    });
  } catch (error) {
    console.error('Create evaluation error:', error);
    res.status(500).json({ error: 'Failed to create evaluation session.' });
  }
});

// Update evaluation state (Workflow transitions: Draft -> In Progress -> Under Review -> Completed)
router.patch('/:id/state', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { state, reviewRemarks, reviewingOfficerId } = req.body;

    const validStates = ['Draft', 'In Progress', 'Under Review', 'Completed'];
    if (!state || !validStates.includes(state)) {
      res.status(400).json({
        error: `Invalid state '${state}'. Permitted states: ${validStates.join(', ')}`,
      });
      return;
    }

    const evaluation = await prisma.evaluation.findUnique({
      where: { id },
      include: { instrument: true },
    });

    if (!evaluation) {
      res.status(404).json({ error: 'Evaluation not found.' });
      return;
    }

    const userRole = req.user!.role;
    const previousState = evaluation.state;

    // RBAC validation for state transitions
    if (state === 'Completed' && userRole !== 'REVIEWING_OFFICER' && userRole !== 'ADMIN') {
      res.status(403).json({
        error: 'Only a Reviewing Officer or Admin can approve and mark an evaluation as Completed.',
      });
      return;
    }

    const updateData: any = {
      state,
      updatedAt: new Date(),
    };

    if (reviewRemarks !== undefined) {
      updateData.reviewRemarks = reviewRemarks;
    }

    if (state === 'Completed') {
      updateData.completedAt = new Date();
      updateData.reviewingOfficerId = req.user!.id;

      // Update instrument status to CERTIFIED if all checks pass
      await prisma.instrument.update({
        where: { id: evaluation.instrumentId },
        data: { status: 'CERTIFIED' },
      });
    }

    if (reviewingOfficerId) {
      updateData.reviewingOfficerId = reviewingOfficerId;
    }

    const updated = await prisma.evaluation.update({
      where: { id },
      data: updateData,
      include: {
        laboratory: true,
        testingOfficer: true,
        reviewingOfficer: true,
      },
    });

    // Record Passport Events
    try {
      const passport = await PassportService.getOrCreatePassportForInstrument(prisma, evaluation.instrumentId, req.user?.id);
      if (state === 'Under Review') {
        await PassportService.recordEvent(
          prisma,
          passport.id,
          'SUBMITTED_FOR_REVIEW',
          'EVALUATION',
          evaluation.id,
          req.user!.id,
          `Evaluation ${evaluation.evaluationNumber} submitted for Reviewing Officer endorsement.`,
          { evaluationNumber: evaluation.evaluationNumber, previousState, newState: state }
        );
      } else if (state === 'Completed') {
        await PassportService.recordEvent(
          prisma,
          passport.id,
          'REVIEW_APPROVED',
          'EVALUATION',
          evaluation.id,
          req.user!.id,
          `Evaluation ${evaluation.evaluationNumber} approved and certified. Remarks: "${reviewRemarks || 'Approved'}".`,
          { evaluationNumber: evaluation.evaluationNumber, remarks: reviewRemarks, status: 'CERTIFIED' }
        );
      } else if (previousState === 'Under Review' && (state === 'In Progress' || state === 'Draft')) {
        await PassportService.recordEvent(
          prisma,
          passport.id,
          'REVIEW_RETURNED',
          'EVALUATION',
          evaluation.id,
          req.user!.id,
          `Evaluation ${evaluation.evaluationNumber} returned for revision. Remarks: "${reviewRemarks || 'Returned for adjustments'}".`,
          { evaluationNumber: evaluation.evaluationNumber, remarks: reviewRemarks, previousState, newState: state }
        );
      }
    } catch (passErr) {
      console.warn('Failed to record passport event for state transition:', passErr);
    }

    // Record state change in timeline
    await prisma.timelineEvent.create({
      data: {
        instrumentId: evaluation.instrumentId,
        evaluationId: evaluation.id,
        eventType: 'STATE_TRANSITION',
        title: `Evaluation ${evaluation.evaluationNumber} State: ${state}`,
        description: `Transitioned from [${previousState}] to [${state}] by ${req.user!.name} (${userRole}).${
          reviewRemarks ? ` Remarks: "${reviewRemarks}"` : ''
        }`,
        officerName: req.user!.name,
        officerRole: userRole,
      },
    });

    res.json({
      evaluation: updated,
      message: `Evaluation state transitioned to ${state}`,
    });
  } catch (error) {
    console.error('State transition error:', error);
    res.status(500).json({ error: 'Failed to update evaluation state.' });
  }
});

// Update general evaluation details
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { patternApprovalNo, generalRemarks, standardReference, reviewingOfficerId } = req.body;

    const evaluation = await prisma.evaluation.findUnique({ where: { id } });
    if (!evaluation) {
      res.status(404).json({ error: 'Evaluation not found.' });
      return;
    }

    const updated = await prisma.evaluation.update({
      where: { id },
      data: {
        ...(patternApprovalNo !== undefined && { patternApprovalNo }),
        ...(generalRemarks !== undefined && { generalRemarks }),
        ...(standardReference !== undefined && { standardReference }),
        ...(reviewingOfficerId !== undefined && { reviewingOfficerId }),
      },
    });

    res.json({ evaluation: updated, message: 'Evaluation details updated.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update evaluation.' });
  }
});

export default router;
