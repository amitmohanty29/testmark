import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { PassportService } from '../engine/passportService';
import { logAudit } from '../middleware/auditLogger';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const router = Router();

// 1. List & Search Passports
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      q,
      passportId,
      serialNumber,
      manufacturer,
      model,
      instrumentType,
      accuracyClass,
      complianceStatus,
      result,
      startDate,
      endDate,
    } = req.query as Record<string, string>;

    const user = req.user!;
    const isTestingOfficer = user.role === 'TESTING_OFFICER';

    // Build where clause
    const where: any = {};

    // RBAC: Testing Officers only see passports of instruments they worked on
    if (isTestingOfficer) {
      where.instrument = {
        OR: [
          { createdById: user.id },
          { evaluations: { some: { testingOfficerId: user.id } } },
        ],
      };
    }

    if (passportId) {
      where.passportId = { contains: passportId };
    }

    if (q) {
      where.OR = [
        { passportId: { contains: q } },
        { instrument: { serialNumber: { contains: q } } },
        { instrument: { manufacturer: { contains: q } } },
        { instrument: { model: { contains: q } } },
        { instrument: { instrumentType: { contains: q } } },
      ];
    }

    if (serialNumber) {
      where.instrument = { ...(where.instrument || {}), serialNumber: { contains: serialNumber } };
    }
    if (manufacturer) {
      where.instrument = { ...(where.instrument || {}), manufacturer: { contains: manufacturer } };
    }
    if (model) {
      where.instrument = { ...(where.instrument || {}), model: { contains: model } };
    }
    if (instrumentType) {
      where.instrument = { ...(where.instrument || {}), instrumentType: { contains: instrumentType } };
    }
    if (accuracyClass) {
      where.instrument = { ...(where.instrument || {}), accuracyClass };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const passports = await prisma.passport.findMany({
      where,
      include: {
        instrument: {
          include: {
            createdBy: { select: { id: true, name: true, designation: true } },
          },
        },
        evaluations: {
          include: {
            laboratory: { select: { name: true, code: true } },
            testingOfficer: { select: { name: true } },
            reviewingOfficer: { select: { name: true } },
            ruleConfig: { select: { version: true, name: true } },
            reports: { select: { id: true, reportId: true, status: true, version: true } },
          },
          orderBy: { evaluationDate: 'desc' },
        },
        events: {
          orderBy: { timestamp: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute dynamic compliance status & filter by complianceStatus/result if requested
    let formatted = passports.map((p) => {
      const completed = p.evaluations.filter((e) => e.state === 'Completed');
      const inProgress = p.evaluations.filter((e) => e.state === 'In Progress');
      const underReview = p.evaluations.filter((e) => e.state === 'Under Review');
      const allReports = p.evaluations.flatMap((e) => e.reports || []);

      let status = 'PENDING_EVALUATION';
      if (completed.length > 0) status = 'CONFORMING_OIML_R76';
      else if (underReview.length > 0) status = 'UNDER_REVIEW';
      else if (inProgress.length > 0) status = 'IN_EVALUATION';

      return {
        id: p.id,
        passportId: p.passportId,
        instrumentId: p.instrumentId,
        createdAt: p.createdAt,
        instrument: p.instrument,
        evaluationsCount: p.evaluations.length,
        completedEvaluationsCount: completed.length,
        reportsCount: allReports.length,
        latestEvaluation: p.evaluations[0] || null,
        complianceStatus: status,
        recentEvents: p.events,
      };
    });

    if (complianceStatus) {
      formatted = formatted.filter((p) => p.complianceStatus === complianceStatus);
    }

    if (result) {
      if (result.toUpperCase() === 'PASS') {
        formatted = formatted.filter((p) => p.complianceStatus === 'CONFORMING_OIML_R76');
      } else if (result.toUpperCase() === 'FAIL') {
        formatted = formatted.filter((p) => p.instrument.status === 'REJECTED');
      }
    }

    res.json({ passports: formatted, totalCount: formatted.length });
  } catch (error: any) {
    console.error('List passports error:', error);
    res.status(500).json({ error: 'Failed to retrieve instrument passports.' });
  }
});

// 2. Models Summary View: Grouped Approval History by Manufacturer & Model
router.get('/models/summary', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const isTestingOfficer = user.role === 'TESTING_OFFICER';

    const where: any = {};
    if (isTestingOfficer) {
      where.instrument = {
        OR: [
          { createdById: user.id },
          { evaluations: { some: { testingOfficerId: user.id } } },
        ],
      };
    }

    const passports = await prisma.passport.findMany({
      where,
      include: {
        instrument: true,
        evaluations: {
          include: {
            laboratory: true,
            ruleConfig: true,
            reports: true,
          },
          orderBy: { evaluationDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by manufacturer + model
    const groupMap: Record<string, any> = {};

    passports.forEach((p) => {
      const key = `${p.instrument.manufacturer}___${p.instrument.model}`.toLowerCase();
      if (!groupMap[key]) {
        groupMap[key] = {
          manufacturer: p.instrument.manufacturer,
          model: p.instrument.model,
          instrumentType: p.instrument.instrumentType,
          accuracyClass: p.instrument.accuracyClass,
          maxCapacity: p.instrument.maxCapacity,
          minCapacity: p.instrument.minCapacity,
          scaleIntervalE: p.instrument.scaleIntervalE,
          verificationUnits: p.instrument.verificationUnits,
          totalInstruments: 0,
          certifiedCount: 0,
          underReviewCount: 0,
          inEvaluationCount: 0,
          passports: [],
        };
      }

      const completed = p.evaluations.some((e) => e.state === 'Completed');
      const underReview = p.evaluations.some((e) => e.state === 'Under Review');
      const inEvaluation = p.evaluations.some((e) => e.state === 'In Progress');

      let status = 'PENDING';
      if (completed) {
        status = 'CERTIFIED';
        groupMap[key].certifiedCount++;
      } else if (underReview) {
        status = 'UNDER_REVIEW';
        groupMap[key].underReviewCount++;
      } else if (inEvaluation) {
        status = 'IN_EVALUATION';
        groupMap[key].inEvaluationCount++;
      }

      groupMap[key].totalInstruments++;
      groupMap[key].passports.push({
        id: p.id,
        passportId: p.passportId,
        serialNumber: p.instrument.serialNumber,
        status,
        latestEvaluationDate: p.evaluations[0]?.evaluationDate || null,
        latestEvaluationNumber: p.evaluations[0]?.evaluationNumber || null,
        laboratoryName: p.evaluations[0]?.laboratory?.name || null,
        ruleConfigVersion: p.evaluations[0]?.ruleConfig?.version || 'OIML R 76-1:2006',
      });
    });

    const modelsList = Object.values(groupMap);
    res.json({ models: modelsList, totalModels: modelsList.length });
  } catch (error: any) {
    console.error('Models summary error:', error);
    res.status(500).json({ error: 'Failed to generate models approval summary.' });
  }
});

// 3. Single Passport Detail View (Full dossier)
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const passportData = await PassportService.getPassportDetails(id);

    if (!passportData) {
      res.status(404).json({ error: 'Instrument Digital Passport not found.' });
      return;
    }

    // RBAC: Testing Officers can only view passports of instruments they worked on
    const user = req.user!;
    if (user.role === 'TESTING_OFFICER') {
      const workedOn =
        passportData.instrument.createdById === user.id ||
        passportData.evaluations.some((e: any) => e.testingOfficerId === user.id);

      if (!workedOn) {
        res.status(403).json({
          error: 'Access restricted: You may only view Digital Passports for instruments under your assigned jurisdiction or test bench.',
        });
        return;
      }
    }

    // Log passport access audit
    await logAudit({
      entityType: 'PASSPORT',
      entityId: passportData.id,
      action: 'VIEWED',
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      description: `Viewed Digital Passport dossier for ${passportData.passportId} (${passportData.instrument.manufacturer} ${passportData.instrument.model})`,
    });

    res.json({ passport: passportData });
  } catch (error: any) {
    console.error('Fetch passport detail error:', error);
    res.status(500).json({ error: 'Failed to retrieve Digital Passport record.' });
  }
});

// 4. Official Printable A4 Passport Summary (PDF in formal government report style)
router.get('/:id/print-summary', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const passportData = await PassportService.getPassportDetails(id);

    if (!passportData) {
      res.status(404).json({ error: 'Instrument Digital Passport not found.' });
      return;
    }

    const user = req.user!;
    if (user.role === 'TESTING_OFFICER') {
      const workedOn =
        passportData.instrument.createdById === user.id ||
        passportData.evaluations.some((e: any) => e.testingOfficerId === user.id);
      if (!workedOn) {
        res.status(403).json({ error: 'Access restricted.' });
        return;
      }
    }

    // Log print audit
    await logAudit({
      entityType: 'PASSPORT',
      entityId: passportData.id,
      action: 'PRINTED_SUMMARY',
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      description: `Generated printable official Passport Summary for ${passportData.passportId}`,
    });

    const inst = passportData.instrument;
    const MARGIN = 57; // 20mm
    const PAGE_W = 595.28;
    const CONTENT_W = PAGE_W - MARGIN * 2;

    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGIN,
      bufferPages: true,
      info: {
        Title: `Digital Passport Summary - ${passportData.passportId}`,
        Author: 'Department of Consumer Affairs, Legal Metrology Division',
        Subject: 'Instrument Digital Metrology Passport Dossier',
        Creator: 'Legal Metrology Division, Govt. of India',
        Producer: 'Government of India',
      },
    });

    doc.on('data', (c) => chunks.push(c));

    // Letterhead
    doc.font('Times-Bold').fontSize(10).fillColor('#000')
      .text('GOVERNMENT OF INDIA', MARGIN, MARGIN, { align: 'center', width: CONTENT_W });
    doc.font('Times-Roman').fontSize(9)
      .text('Ministry of Consumer Affairs, Food & Public Distribution', { align: 'center', width: CONTENT_W })
      .text('Department of Consumer Affairs, Legal Metrology Division', { align: 'center', width: CONTENT_W });
    doc.moveDown(0.3);
    doc.moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y).strokeColor('#000').lineWidth(1).stroke();
    doc.moveDown(0.4);

    doc.font('Times-Bold').fontSize(13).fillColor('#000')
      .text('INSTRUMENT DIGITAL METROLOGY PASSPORT SUMMARY', { align: 'center', width: CONTENT_W });
    doc.font('Times-Roman').fontSize(9)
      .text(`Passport Reference: ${passportData.passportId}  |  Status: ${passportData.summary.currentComplianceStatus}`, { align: 'center', width: CONTENT_W });
    doc.moveDown(0.3);
    doc.moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y).strokeColor('#000').lineWidth(0.5).stroke();
    doc.moveDown(0.5);

    // Section 1: Identification of Instrument
    doc.font('Times-Bold').fontSize(11).text('1. Identification of the Instrument');
    doc.moveTo(MARGIN, doc.y + 1).lineTo(PAGE_W - MARGIN, doc.y + 1).strokeColor('#333').lineWidth(0.4).stroke();
    doc.moveDown(0.3);

    const fRow = (l1: string, v1: string, l2: string, v2: string) => {
      const y = doc.y;
      doc.font('Times-Bold').fontSize(8.5).text(`${l1}: `, MARGIN, y, { continued: true })
        .font('Times-Roman').text(v1 || 'N/A', { width: 190 });
      doc.font('Times-Bold').text(`${l2}: `, 320, y, { continued: true })
        .font('Times-Roman').text(v2 || 'N/A', { width: 190 });
      doc.moveDown(0.2);
    };

    fRow('Passport ID', passportData.passportId, 'Serial Number', inst.serialNumber);
    fRow('Manufacturer', inst.manufacturer, 'Model', inst.model);
    fRow('Instrument Type', inst.instrumentType, 'Accuracy Class', inst.accuracyClass);
    fRow('Max Capacity', `${inst.maxCapacity} ${inst.verificationUnits}`, 'Min Capacity', `${inst.minCapacity} ${inst.verificationUnits}`);
    fRow('Scale Interval (e)', `${inst.scaleIntervalE} ${inst.verificationUnits}`, 'Actual Interval (d)', inst.scaleIntervalD ? `${inst.scaleIntervalD} ${inst.verificationUnits}` : 'N/A');
    fRow('Capacity Range', inst.capacityRangeType, 'Temperature Range', inst.temperatureRange || 'N/A');

    doc.moveDown(0.6);

    // Section 2: Statutory Evaluations & Certifications History
    doc.font('Times-Bold').fontSize(11).text('2. Evaluation Sessions & Pattern Approval History');
    doc.moveTo(MARGIN, doc.y + 1).lineTo(PAGE_W - MARGIN, doc.y + 1).strokeColor('#333').lineWidth(0.4).stroke();
    doc.moveDown(0.3);

    if (passportData.evaluations.length === 0) {
      doc.font('Times-Roman').fontSize(8.5).text('No evaluation sessions recorded.');
    } else {
      // Table header
      const thY = doc.y;
      doc.rect(MARGIN, thY, CONTENT_W, 14).fill('#f0ede4');
      doc.font('Times-Bold').fontSize(7.5).fillColor('#000');
      doc.text('Ref. No.', MARGIN + 4, thY + 3);
      doc.text('Date', MARGIN + 85, thY + 3);
      doc.text('Laboratory', MARGIN + 155, thY + 3);
      doc.text('Rule Standard', MARGIN + 310, thY + 3);
      doc.text('Status', MARGIN + 415, thY + 3);

      let curY = thY + 16;
      passportData.evaluations.forEach((ev: any) => {
        doc.font('Times-Roman').fontSize(7.5).fillColor('#000');
        doc.text(ev.evaluationNumber, MARGIN + 4, curY, { width: 75 });
        doc.text(new Date(ev.evaluationDate).toLocaleDateString('en-IN'), MARGIN + 85, curY);
        doc.text(ev.laboratory?.name || 'RRSL', MARGIN + 155, curY, { width: 145, ellipsis: true });
        doc.text(ev.ruleConfig?.version || ev.standardReference, MARGIN + 310, curY, { width: 95 });
        doc.font('Times-Bold').text(ev.state, MARGIN + 415, curY);
        curY += 14;
        doc.moveTo(MARGIN, curY - 2).lineTo(PAGE_W - MARGIN, curY - 2).strokeColor('#ccc').lineWidth(0.3).stroke();
      });
      doc.y = curY + 6;
    }

    doc.moveDown(0.6);

    // Section 3: Official Test Reports & Hashes
    doc.font('Times-Bold').fontSize(11).text('3. Official Test Reports & Cryptographic Signatures');
    doc.moveTo(MARGIN, doc.y + 1).lineTo(PAGE_W - MARGIN, doc.y + 1).strokeColor('#333').lineWidth(0.4).stroke();
    doc.moveDown(0.3);

    if (passportData.reports.length === 0) {
      doc.font('Times-Roman').fontSize(8.5).text('No finalized test reports issued.');
    } else {
      passportData.reports.forEach((r: any) => {
        const ry = doc.y;
        doc.font('Times-Bold').fontSize(8).text(`Report Ref: ${r.reportId} (Version ${r.version})`, MARGIN, ry);
        doc.font('Times-Roman').fontSize(7.5).text(`Status: ${r.status}  |  Issued: ${new Date(r.createdAt).toLocaleDateString('en-IN')}`, MARGIN, ry + 11);
        doc.font('Courier').fontSize(6.5).fillColor('#444')
          .text(`SHA-256 Digest: ${r.integrityHash || 'Pending finalization'}`, MARGIN, ry + 22);
        doc.moveDown(0.5);
      });
    }

    doc.moveDown(0.6);

    // Section 4: Recent Timeline Events
    doc.font('Times-Bold').fontSize(11).text('4. Recent Lifecycle Ledger Entries');
    doc.moveTo(MARGIN, doc.y + 1).lineTo(PAGE_W - MARGIN, doc.y + 1).strokeColor('#333').lineWidth(0.4).stroke();
    doc.moveDown(0.3);

    passportData.events.slice(0, 8).forEach((ev: any) => {
      const ey = doc.y;
      doc.font('Times-Bold').fontSize(7.5).fillColor('#000')
        .text(`[${new Date(ev.timestamp).toLocaleString('en-IN')}] ${ev.eventType}: `, MARGIN, ey, { continued: true })
        .font('Times-Roman').text(ev.summary);
      doc.moveDown(0.2);
    });

    // Verification Corner & QR
    const qrUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/passport/${passportData.passportId}`;
    let qrBuf: Buffer | null = null;
    try {
      qrBuf = await QRCode.toBuffer(qrUrl, { width: 75, margin: 0 });
    } catch (e) {}

    const vY = Math.max(doc.y + 15, 690);
    if (qrBuf) {
      doc.image(qrBuf, MARGIN, vY, { width: 50, height: 50 });
    }
    doc.font('Times-Bold').fontSize(8).fillColor('#000').text('Digital Passport Public Verification', MARGIN + 58, vY);
    doc.font('Times-Roman').fontSize(7.5).text(`Verify ledger dossier at: ${qrUrl}`, MARGIN + 58, vY + 12);
    doc.text(`Official Seal & Authority: Legal Metrology Division, Department of Consumer Affairs`, MARGIN + 58, vY + 24);

    // Running Header & Footer
    const pages = doc.bufferedPageRange();
    for (let i = pages.start; i < pages.start + pages.count; i++) {
      doc.switchToPage(i);
      doc.font('Times-Roman').fontSize(7.5).fillColor('#333')
        .text(`Digital Passport: ${passportData.passportId}`, MARGIN, 25, { width: 250, align: 'left' })
        .text(`Page ${i + 1} of ${pages.count}`, PAGE_W - MARGIN - 150, 25, { width: 150, align: 'right' });
      doc.moveTo(MARGIN, 36).lineTo(PAGE_W - MARGIN, 36).strokeColor('#888').lineWidth(0.3).stroke();

      doc.font('Times-Roman').fontSize(7).fillColor('#444')
        .text(
          `Document Control: LM-PASSPORT-SUM | Legal Metrology Division, Department of Consumer Affairs, Government of India`,
          MARGIN, 810, { align: 'center', width: CONTENT_W }
        );
    }

    doc.end();

    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${passportData.passportId}_Summary.pdf"`);
      res.send(pdfBuffer);
    });
  } catch (error: any) {
    console.error('Print summary error:', error);
    res.status(500).json({ error: 'Failed to generate printable Passport summary.' });
  }
});

// 5. Complete Passport Dossier Export (GET /api/passports/:id/export?format=pdf|json)
router.get('/:id/export', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const format = ((req.query.format as string) || 'pdf').toLowerCase();
    const passportData = await PassportService.getPassportDetails(id);

    if (!passportData) {
      res.status(404).json({ error: 'Instrument Digital Passport not found.' });
      return;
    }

    const user = req.user!;
    if (user.role === 'TESTING_OFFICER') {
      const workedOn =
        passportData.instrument.createdById === user.id ||
        passportData.evaluations.some((e: any) => e.testingOfficerId === user.id);
      if (!workedOn) {
        res.status(403).json({ error: 'Access restricted.' });
        return;
      }
    }

    if (format === 'json') {
      await logAudit({
        entityType: 'PASSPORT',
        entityId: passportData.id,
        action: 'EXPORTED_JSON',
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        description: `Exported JSON dossier for Passport ${passportData.passportId}`,
      });

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${passportData.passportId}_Dossier.json"`);
      res.json({
        exportDate: new Date().toISOString(),
        system: 'MarkSure National Legal Metrology Registry',
        authority: 'Department of Consumer Affairs, Legal Metrology Division',
        passport: passportData,
      });
      return;
    }

    // Default to PDF (format === 'pdf')
    await logAudit({
      entityType: 'PASSPORT',
      entityId: passportData.id,
      action: 'EXPORTED_PDF',
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      description: `Exported official PDF dossier for Passport ${passportData.passportId}`,
    });

    const inst = passportData.instrument;
    const MARGIN = 57; // 20mm
    const PAGE_W = 595.28;
    const CONTENT_W = PAGE_W - MARGIN * 2;

    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGIN,
      bufferPages: true,
      info: {
        Title: `National Legal Metrology Digital Passport - ${passportData.passportId}`,
        Author: 'Department of Consumer Affairs, Legal Metrology Division',
        Subject: 'Instrument Digital Metrology Passport Dossier',
        Creator: 'Legal Metrology Division, Govt. of India',
        Producer: 'Government of India',
      },
    });

    doc.on('data', (c) => chunks.push(c));

    // Letterhead
    doc.font('Times-Bold').fontSize(10).fillColor('#000')
      .text('GOVERNMENT OF INDIA', MARGIN, MARGIN, { align: 'center', width: CONTENT_W });
    doc.font('Times-Roman').fontSize(9)
      .text('Ministry of Consumer Affairs, Food & Public Distribution', { align: 'center', width: CONTENT_W })
      .text('Department of Consumer Affairs, Legal Metrology Division', { align: 'center', width: CONTENT_W });
    doc.moveDown(0.3);
    doc.moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y).strokeColor('#000').lineWidth(1).stroke();
    doc.moveDown(0.4);

    doc.font('Times-Bold').fontSize(13).fillColor('#000')
      .text('NATIONAL LEGAL METROLOGY DIGITAL PASSPORT', { align: 'center', width: CONTENT_W });
    doc.font('Times-Roman').fontSize(9)
      .text(`Passport Reference: ${passportData.passportId}  |  Status: ${passportData.summary?.currentComplianceStatus || 'REGISTERED'}`, { align: 'center', width: CONTENT_W });
    doc.moveDown(0.3);
    doc.moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y).strokeColor('#000').lineWidth(0.5).stroke();
    doc.moveDown(0.5);

    // Section 1: Identification of Instrument
    doc.font('Times-Bold').fontSize(11).text('1. Identification of the Instrument');
    doc.moveTo(MARGIN, doc.y + 1).lineTo(PAGE_W - MARGIN, doc.y + 1).strokeColor('#333').lineWidth(0.4).stroke();
    doc.moveDown(0.3);

    const fRow = (l1: string, v1: string, l2: string, v2: string) => {
      const y = doc.y;
      doc.font('Times-Bold').fontSize(8.5).text(`${l1}: `, MARGIN, y, { continued: true })
        .font('Times-Roman').text(v1 || 'N/A', { width: 190 });
      doc.font('Times-Bold').text(`${l2}: `, 320, y, { continued: true })
        .font('Times-Roman').text(v2 || 'N/A', { width: 190 });
      doc.moveDown(0.2);
    };

    fRow('Passport ID', passportData.passportId, 'Serial Number', inst.serialNumber);
    fRow('Manufacturer', inst.manufacturer, 'Model', inst.model);
    fRow('Instrument Type', inst.instrumentType, 'Accuracy Class', inst.accuracyClass);
    fRow('Max Capacity', `${inst.maxCapacity} ${inst.verificationUnits}`, 'Min Capacity', `${inst.minCapacity} ${inst.verificationUnits}`);
    fRow('Scale Interval (e)', `${inst.scaleIntervalE} ${inst.verificationUnits}`, 'Actual Interval (d)', inst.scaleIntervalD ? `${inst.scaleIntervalD} ${inst.verificationUnits}` : 'N/A');
    fRow('Capacity Range', inst.capacityRangeType, 'Temperature Range', inst.temperatureRange || 'N/A');

    doc.moveDown(0.6);

    // Section 2: Statutory Evaluations & Certifications History
    doc.font('Times-Bold').fontSize(11).text('2. Evaluation Sessions & Pattern Approval History');
    doc.moveTo(MARGIN, doc.y + 1).lineTo(PAGE_W - MARGIN, doc.y + 1).strokeColor('#333').lineWidth(0.4).stroke();
    doc.moveDown(0.3);

    if (passportData.evaluations.length === 0) {
      doc.font('Times-Roman').fontSize(8.5).text('No evaluation sessions recorded.');
    } else {
      const thY = doc.y;
      doc.rect(MARGIN, thY, CONTENT_W, 14).fill('#f0ede4');
      doc.font('Times-Bold').fontSize(7.5).fillColor('#000');
      doc.text('Ref. No.', MARGIN + 4, thY + 3);
      doc.text('Date', MARGIN + 85, thY + 3);
      doc.text('Laboratory', MARGIN + 155, thY + 3);
      doc.text('Rule Standard', MARGIN + 310, thY + 3);
      doc.text('Status', MARGIN + 415, thY + 3);

      let curY = thY + 16;
      passportData.evaluations.slice(0, 5).forEach((ev: any, idx: number) => {
        const bg = idx % 2 === 0 ? '#ffffff' : '#f9f8f5';
        doc.rect(MARGIN, curY - 2, CONTENT_W, 14).fill(bg);
        doc.font('Times-Roman').fontSize(7.5).fillColor('#000');
        doc.text(ev.evaluationNumber, MARGIN + 4, curY);
        doc.text(new Date(ev.evaluationDate).toLocaleDateString('en-IN'), MARGIN + 85, curY);
        doc.text(ev.laboratory?.name || 'Central Metrology Lab', MARGIN + 155, curY, { width: 145, ellipsis: true });
        doc.text(ev.ruleConfig?.version || 'OIML R 76-1:2006', MARGIN + 310, curY);
        doc.text(ev.state, MARGIN + 415, curY);
        curY += 14;
      });
      doc.y = curY;
    }

    doc.moveDown(0.6);

    // Section 3: Finalized Statutory Test Reports
    doc.font('Times-Bold').fontSize(11).text('3. Statutory Metrological Verification Reports');
    doc.moveTo(MARGIN, doc.y + 1).lineTo(PAGE_W - MARGIN, doc.y + 1).strokeColor('#333').lineWidth(0.4).stroke();
    doc.moveDown(0.3);

    if (passportData.reports.length === 0) {
      doc.font('Times-Roman').fontSize(8.5).text('No finalized test reports issued.');
    } else {
      passportData.reports.forEach((r: any) => {
        const ry = doc.y;
        doc.font('Times-Bold').fontSize(8).text(`Report Ref: ${r.reportId} (Version ${r.version})`, MARGIN, ry);
        doc.font('Times-Roman').fontSize(7.5).text(`Status: ${r.status}  |  Issued: ${new Date(r.createdAt).toLocaleDateString('en-IN')}`, MARGIN, ry + 11);
        doc.font('Courier').fontSize(6.5).fillColor('#444')
          .text(`SHA-256 Digest: ${r.integrityHash || 'Pending finalization'}`, MARGIN, ry + 22);
        doc.moveDown(0.5);
      });
    }

    doc.moveDown(0.6);

    // Section 4: Lifecycle Event Ledger
    doc.font('Times-Bold').fontSize(11).text('4. Immutable Event Ledger Entries (Audit Trail)');
    doc.moveTo(MARGIN, doc.y + 1).lineTo(PAGE_W - MARGIN, doc.y + 1).strokeColor('#333').lineWidth(0.4).stroke();
    doc.moveDown(0.3);

    passportData.events.slice(0, 10).forEach((ev: any) => {
      const ey = doc.y;
      doc.font('Times-Bold').fontSize(7.5).fillColor('#000')
        .text(`[${new Date(ev.timestamp).toLocaleString('en-IN')}] ${ev.eventType}: `, MARGIN, ey, { continued: true })
        .font('Times-Roman').text(ev.summary);
      doc.moveDown(0.2);
    });

    // Verification Corner & QR
    const qrUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/passport/${passportData.passportId}`;
    let qrBuf: Buffer | null = null;
    try {
      qrBuf = await QRCode.toBuffer(qrUrl, { width: 75, margin: 0 });
    } catch (e) {}

    const vY = Math.max(doc.y + 15, 690);
    if (qrBuf) {
      doc.image(qrBuf, MARGIN, vY, { width: 50, height: 50 });
    }
    doc.font('Times-Bold').fontSize(8).fillColor('#000').text('National Legal Metrology Digital Passport Verification', MARGIN + 58, vY);
    doc.font('Times-Roman').fontSize(7.5).text(`Verify permanent ledger record at: ${qrUrl}`, MARGIN + 58, vY + 12);
    doc.text(`Official Seal & Authority: Legal Metrology Division, Department of Consumer Affairs`, MARGIN + 58, vY + 24);

    // Running Header & Footer
    const pages = doc.bufferedPageRange();
    for (let i = pages.start; i < pages.start + pages.count; i++) {
      doc.switchToPage(i);
      doc.font('Times-Roman').fontSize(7.5).fillColor('#333')
        .text(`National Digital Passport: ${passportData.passportId}`, MARGIN, 25, { width: 250, align: 'left' })
        .text(`Page ${i + 1} of ${pages.count}`, PAGE_W - MARGIN - 150, 25, { width: 150, align: 'right' });
      doc.moveTo(MARGIN, 36).lineTo(PAGE_W - MARGIN, 36).strokeColor('#888').lineWidth(0.3).stroke();

      doc.font('Times-Roman').fontSize(7).fillColor('#444')
        .text(
          `Document Control: LM-DIGITAL-PASSPORT | Legal Metrology Division, Department of Consumer Affairs, Government of India`,
          MARGIN, 810, { align: 'center', width: CONTENT_W }
        );
    }

    doc.end();

    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${passportData.passportId}_Passport.pdf"`);
      res.send(pdfBuffer);
    });
  } catch (error: any) {
    console.error('Export passport dossier error:', error);
    res.status(500).json({ error: 'Failed to export Passport dossier.' });
  }
});

// 6. Append Recalibration Event
router.post('/:id/recalibration', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { calibrationDate, certificateNumber, laboratoryName, nextDueDate, remarks } = req.body;

    const passport = await prisma.passport.findFirst({
      where: { OR: [{ id }, { passportId: id }] },
      include: { instrument: true },
    });

    if (!passport) {
      res.status(404).json({ error: 'Instrument Digital Passport not found.' });
      return;
    }

    const event = await PassportService.recordEvent({
      passportId: passport.id,
      eventType: 'RECALIBRATION',
      refType: 'CALIBRATION',
      refId: certificateNumber || undefined,
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorDesignation: req.user!.designation || 'Legal Metrology Officer',
      summary: `Periodic recalibration completed at ${laboratoryName || 'Accredited Lab'}. Certificate No: ${certificateNumber || 'N/A'}. Next due: ${nextDueDate || 'Annual'}.`,
      metadata: {
        calibrationDate,
        certificateNumber,
        laboratoryName,
        nextDueDate,
        remarks,
      },
    });

    res.status(201).json({ event, message: 'Recalibration event recorded in Digital Passport ledger.' });
  } catch (error: any) {
    console.error('Recalibration event error:', error);
    res.status(500).json({ error: 'Failed to record recalibration event.' });
  }
});

export default router;
