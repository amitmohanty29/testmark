import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Universal search across instruments, evaluations, and reports
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      q, manufacturer, model, serialNumber, instrumentType, accuracyClass,
      evaluationId, reportId, dateFrom, dateTo, officer, result, status, entity
    } = req.query;

    const searchStr = q ? String(q) : '';

    // Build instrument filters
    const instrumentWhere: any = {};
    if (manufacturer) instrumentWhere.manufacturer = { contains: String(manufacturer) };
    if (model) instrumentWhere.model = { contains: String(model) };
    if (serialNumber) instrumentWhere.serialNumber = { contains: String(serialNumber) };
    if (instrumentType && instrumentType !== 'ALL') instrumentWhere.instrumentType = { contains: String(instrumentType) };
    if (accuracyClass && accuracyClass !== 'ALL') instrumentWhere.accuracyClass = String(accuracyClass);

    // Fetch instruments
    let instruments: any[] = [];
    if (!entity || entity === 'ALL' || entity === 'instruments') {
      const instWhere: any = { ...instrumentWhere };
      if (searchStr) {
        instWhere.OR = [
          { passportId: { contains: searchStr } },
          { manufacturer: { contains: searchStr } },
          { model: { contains: searchStr } },
          { serialNumber: { contains: searchStr } },
        ];
      }
      instruments = await prisma.instrument.findMany({
        where: instWhere,
        include: { evaluations: { select: { id: true, evaluationNumber: true, state: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    }

    // Fetch evaluations
    let evaluations: any[] = [];
    if (!entity || entity === 'ALL' || entity === 'evaluations') {
      const evalWhere: any = {};
      if (evaluationId) evalWhere.evaluationNumber = { contains: String(evaluationId) };
      if (status && status !== 'ALL') evalWhere.state = String(status);
      if (officer) {
        evalWhere.OR = [
          { testingOfficer: { name: { contains: String(officer) } } },
          { reviewingOfficer: { name: { contains: String(officer) } } },
        ];
      }
      if (dateFrom || dateTo) {
        evalWhere.evaluationDate = {};
        if (dateFrom) evalWhere.evaluationDate.gte = new Date(String(dateFrom));
        if (dateTo) evalWhere.evaluationDate.lte = new Date(String(dateTo));
      }
      if (Object.keys(instrumentWhere).length > 0) {
        evalWhere.instrument = instrumentWhere;
      }
      if (searchStr && !evaluationId) {
        evalWhere.OR = [
          ...(evalWhere.OR || []),
          { evaluationNumber: { contains: searchStr } },
          { instrument: { manufacturer: { contains: searchStr } } },
          { instrument: { serialNumber: { contains: searchStr } } },
          { instrument: { passportId: { contains: searchStr } } },
        ];
      }

      evaluations = await prisma.evaluation.findMany({
        where: evalWhere,
        include: {
          instrument: { select: { passportId: true, manufacturer: true, model: true, serialNumber: true, accuracyClass: true, instrumentType: true } },
          laboratory: { select: { name: true, code: true } },
          testingOfficer: { select: { name: true } },
          reviewingOfficer: { select: { name: true } },
        },
        orderBy: { evaluationDate: 'desc' },
        take: 50,
      });
    }

    // Fetch reports
    let reports: any[] = [];
    if (!entity || entity === 'ALL' || entity === 'reports') {
      const reportWhere: any = {};
      if (reportId) reportWhere.reportId = { contains: String(reportId) };
      if (result && result !== 'ALL') reportWhere.status = String(result);
      if (searchStr && !reportId) {
        reportWhere.OR = [
          { reportId: { contains: searchStr } },
          { evaluation: { evaluationNumber: { contains: searchStr } } },
          { evaluation: { instrument: { manufacturer: { contains: searchStr } } } },
          { evaluation: { instrument: { serialNumber: { contains: searchStr } } } },
        ];
      }

      reports = await prisma.report.findMany({
        where: reportWhere,
        include: {
          evaluation: {
            include: {
              instrument: { select: { passportId: true, manufacturer: true, model: true, accuracyClass: true } },
              laboratory: { select: { name: true } },
            },
          },
          ruleConfig: { select: { version: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    }

    res.json({ instruments, evaluations, reports });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed.' });
  }
});

export default router;
