import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// Generate unique Passport ID: "IN-NAWI-2026-XXXX"
const generatePassportId = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const count = await prisma.instrument.count();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `IN-NAWI-${currentYear}-${(count + 1).toString().padStart(4, '0')}-${randomSuffix.toString().slice(-2)}`;
};

// List instruments with optional search and filters
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, accuracyClass, status } = req.query;

    const where: any = {};

    if (search && typeof search === 'string') {
      const q = search.trim();
      where.OR = [
        { model: { contains: q } },
        { manufacturer: { contains: q } },
        { serialNumber: { contains: q } },
        { passportId: { contains: q } },
      ];
    }

    if (accuracyClass && typeof accuracyClass === 'string' && accuracyClass !== 'ALL') {
      where.accuracyClass = accuracyClass;
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status;
    }

    const instruments = await prisma.instrument.findMany({
      where,
      include: {
        evaluations: {
          select: {
            id: true,
            evaluationNumber: true,
            state: true,
            evaluationDate: true,
            laboratory: { select: { name: true } },
          },
          orderBy: { evaluationDate: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            evaluations: true,
            documents: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ instruments });
  } catch (error) {
    console.error('Fetch instruments error:', error);
    res.status(500).json({ error: 'Failed to retrieve instruments.' });
  }
});

// Get single instrument with full relations
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const instrument = await prisma.instrument.findFirst({
      where: {
        OR: [{ id }, { passportId: id }, { serialNumber: id }],
      },
      include: {
        documents: { orderBy: { uploadedAt: 'desc' } },
        evaluations: {
          include: {
            laboratory: true,
            testingOfficer: { select: { id: true, name: true, email: true, designation: true } },
            reviewingOfficer: { select: { id: true, name: true, email: true, designation: true } },
          },
          orderBy: { evaluationDate: 'desc' },
        },
        createdBy: { select: { id: true, name: true, designation: true } },
      },
    });

    if (!instrument) {
      res.status(404).json({ error: 'Instrument profile not found in National Registry.' });
      return;
    }

    res.json({ instrument });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve instrument profile.' });
  }
});

// Digital Passport view (Single Source of Truth)
router.get('/:id/passport', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const instrument = await prisma.instrument.findFirst({
      where: {
        OR: [{ id }, { passportId: id }, { serialNumber: id }],
      },
      include: {
        documents: { orderBy: { uploadedAt: 'desc' } },
        evaluations: {
          include: {
            laboratory: true,
            testingOfficer: { select: { id: true, name: true, designation: true, department: true } },
            reviewingOfficer: { select: { id: true, name: true, designation: true, department: true } },
          },
          orderBy: { evaluationDate: 'desc' },
        },
        timelineEvents: {
          orderBy: { createdAt: 'desc' },
        },
        createdBy: { select: { id: true, name: true, designation: true } },
      },
    });

    if (!instrument) {
      res.status(404).json({ error: 'Instrument Digital Passport not found.' });
      return;
    }

    // Compute passport statistics
    const totalEvaluations = instrument.evaluations.length;
    const completedEvaluations = instrument.evaluations.filter((e: any) => e.state === 'Completed').length;
    const activeEvaluations = instrument.evaluations.filter((e: any) => e.state !== 'Completed').length;
    const lastEvaluation = instrument.evaluations[0] || null;

    res.json({
      passport: {
        ...instrument,
        summary: {
          totalEvaluations,
          completedEvaluations,
          activeEvaluations,
          lastEvaluationDate: lastEvaluation ? lastEvaluation.evaluationDate : null,
          currentCertificationStatus: completedEvaluations > 0 ? 'CERTIFIED_OIML_R76' : 'PENDING_FINAL_CERTIFICATION',
        },
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load Digital Passport.' });
  }
});

// Create new instrument profile
router.post('/', authenticateToken, requireRoles(['TESTING_OFFICER', 'ADMIN']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      manufacturer,
      model,
      serialNumber,
      instrumentType,
      accuracyClass,
      maxCapacity,
      minCapacity,
      scaleIntervalE,
      scaleIntervalD,
      verificationUnits,
      capacityRangeType,
      tareRange,
      temperatureRange,
      powerSupply,
      technicalSpecs,
    } = req.body;

    if (!manufacturer || !model || !serialNumber || !instrumentType || !accuracyClass || maxCapacity === undefined || minCapacity === undefined || scaleIntervalE === undefined) {
      res.status(400).json({ error: 'Please provide all mandatory metrological parameters (Manufacturer, Model, Serial, Class, Max, Min, e).' });
      return;
    }

    // Metrological OIML R-76 checks
    const maxVal = parseFloat(maxCapacity);
    const minVal = parseFloat(minCapacity);
    const eVal = parseFloat(scaleIntervalE);

    if (maxVal <= minVal) {
      res.status(400).json({ error: 'OIML R-76 rule: Max capacity must be strictly greater than Min capacity.' });
      return;
    }
    if (eVal <= 0) {
      res.status(400).json({ error: 'Verification scale interval (e) must be positive.' });
      return;
    }

    // Check unique serial number
    const existing = await prisma.instrument.findUnique({
      where: { serialNumber: serialNumber.trim() },
    });
    if (existing) {
      res.status(400).json({ error: `An instrument with Serial Number "${serialNumber}" is already registered.` });
      return;
    }

    const passportId = await generatePassportId();

    const instrument = await prisma.instrument.create({
      data: {
        passportId,
        manufacturer: manufacturer.trim(),
        model: model.trim(),
        serialNumber: serialNumber.trim(),
        instrumentType: instrumentType.trim(),
        accuracyClass: accuracyClass.trim(),
        maxCapacity: maxVal,
        minCapacity: minVal,
        scaleIntervalE: eVal,
        scaleIntervalD: scaleIntervalD ? parseFloat(scaleIntervalD) : null,
        verificationUnits: verificationUnits || 'g',
        capacityRangeType: capacityRangeType || 'Single-Interval',
        tareRange: tareRange?.trim() || null,
        temperatureRange: temperatureRange?.trim() || '+10°C to +40°C',
        powerSupply: powerSupply?.trim() || '230V AC, 50Hz / Battery backup',
        technicalSpecs: technicalSpecs ? (typeof technicalSpecs === 'object' ? JSON.stringify(technicalSpecs) : technicalSpecs) : null,
        createdById: req.user!.id,
      },
    });

    // Record initial Passport Creation in timeline
    await prisma.timelineEvent.create({
      data: {
        instrumentId: instrument.id,
        eventType: 'PASSPORT_CREATED',
        title: 'Digital Metrology Passport Initialized',
        description: `Instrument profile registered under OIML R-76 framework. Assigned permanent Passport ID: ${passportId}.`,
        officerName: req.user!.name,
        officerRole: req.user!.role,
      },
    });

    res.status(201).json({
      instrument,
      message: `Instrument registered successfully with Passport ID ${passportId}`,
    });
  } catch (error: any) {
    console.error('Create instrument error:', error);
    res.status(500).json({ error: 'Failed to create instrument profile.' });
  }
});

// Update instrument profile
router.put('/:id', authenticateToken, requireRoles(['TESTING_OFFICER', 'ADMIN']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const {
      manufacturer,
      model,
      instrumentType,
      accuracyClass,
      maxCapacity,
      minCapacity,
      scaleIntervalE,
      scaleIntervalD,
      verificationUnits,
      capacityRangeType,
      tareRange,
      temperatureRange,
      powerSupply,
      technicalSpecs,
      status,
    } = req.body;

    const existing = await prisma.instrument.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Instrument not found.' });
      return;
    }

    const updated = await prisma.instrument.update({
      where: { id },
      data: {
        ...(manufacturer && { manufacturer: manufacturer.trim() }),
        ...(model && { model: model.trim() }),
        ...(instrumentType && { instrumentType: instrumentType.trim() }),
        ...(accuracyClass && { accuracyClass: accuracyClass.trim() }),
        ...(maxCapacity !== undefined && { maxCapacity: parseFloat(maxCapacity) }),
        ...(minCapacity !== undefined && { minCapacity: parseFloat(minCapacity) }),
        ...(scaleIntervalE !== undefined && { scaleIntervalE: parseFloat(scaleIntervalE) }),
        ...(scaleIntervalD !== undefined && { scaleIntervalD: parseFloat(scaleIntervalD) }),
        ...(verificationUnits && { verificationUnits }),
        ...(capacityRangeType && { capacityRangeType }),
        ...(tareRange !== undefined && { tareRange }),
        ...(temperatureRange !== undefined && { temperatureRange }),
        ...(powerSupply !== undefined && { powerSupply }),
        ...(technicalSpecs !== undefined && {
          technicalSpecs: typeof technicalSpecs === 'object' ? JSON.stringify(technicalSpecs) : technicalSpecs,
        }),
        ...(status && { status }),
      },
    });

    // Record timeline update
    await prisma.timelineEvent.create({
      data: {
        instrumentId: id,
        eventType: 'SPECIFICATION_UPDATED',
        title: 'Instrument Profile & Specifications Updated',
        description: `Metrological and technical specifications updated by ${req.user!.name} (${req.user!.role}).`,
        officerName: req.user!.name,
        officerRole: req.user!.role,
      },
    });

    res.json({ instrument: updated, message: 'Instrument specifications successfully updated.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update instrument.' });
  }
});

// Upload supporting technical document
router.post('/:id/documents', authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { title } = req.body;

    const instrument = await prisma.instrument.findUnique({ where: { id } });
    if (!instrument) {
      res.status(404).json({ error: 'Instrument not found.' });
      return;
    }

    let fileUrl = '';
    let fileName = '';
    let fileType = '';
    let fileSize = 0;

    if (req.file) {
      fileName = req.file.originalname;
      fileUrl = `/uploads/${req.file.filename}`;
      fileType = req.file.mimetype;
      fileSize = req.file.size;
    } else if (req.body.externalUrl) {
      fileUrl = req.body.externalUrl;
      fileName = req.body.fileName || 'Technical Specification Document.pdf';
      fileType = 'application/pdf';
    } else {
      res.status(400).json({ error: 'Document file or document URL must be provided.' });
      return;
    }

    const document = await prisma.instrumentDocument.create({
      data: {
        title: title?.trim() || fileName,
        fileName,
        fileUrl,
        fileType,
        fileSize,
        instrumentId: id,
      },
    });

    // Record on timeline
    await prisma.timelineEvent.create({
      data: {
        instrumentId: id,
        eventType: 'DOCUMENT_UPLOADED',
        title: `Technical Document Attached: ${document.title}`,
        description: `Official document "${fileName}" added to Digital Passport dossier.`,
        officerName: req.user!.name,
        officerRole: req.user!.role,
      },
    });

    res.status(201).json({ document, message: 'Document uploaded and linked to instrument passport.' });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Failed to upload document.' });
  }
});

export default router;
