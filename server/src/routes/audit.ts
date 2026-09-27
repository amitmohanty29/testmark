import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const safeParse = (str: string | null | undefined, def: any = null) => {
  if (!str) return def;
  try { return JSON.parse(str); } catch { return def; }
};

// Get audit logs (filterable)
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { entityType, entityId, action, evaluationId, limit } = req.query;
    const where: any = {};
    if (entityType) where.entityType = String(entityType);
    if (entityId) where.entityId = String(entityId);
    if (action) where.action = String(action);
    if (evaluationId) where.evaluationId = String(evaluationId);

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(String(limit || '100')), 500),
    });

    const formatted = logs.map(log => ({
      ...log,
      previousState: safeParse(log.previousState),
      newState: safeParse(log.newState),
      metadata: safeParse(log.metadata),
    }));

    res.json({ logs: formatted });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

// Get audit trail for a specific evaluation
router.get('/evaluation/:evaluationId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const evaluationId = req.params.evaluationId as string;

    // Get evaluation-level audit logs
    const evalLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { evaluationId },
          { entityType: 'EVALUATION', entityId: evaluationId },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    // Also get timeline events for this evaluation
    const timelineEvents = await prisma.timelineEvent.findMany({
      where: { evaluationId },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = evalLogs.map(log => ({
      ...log,
      previousState: safeParse(log.previousState),
      newState: safeParse(log.newState),
      metadata: safeParse(log.metadata),
    }));

    res.json({ auditLogs: formatted, timelineEvents });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch evaluation audit trail.' });
  }
});

export default router;
