import prisma from '../prisma';

interface AuditParams {
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  description: string;
  previousState?: any;
  newState?: any;
  evaluationId?: string;
  metadata?: any;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        actorId: params.actorId,
        actorName: params.actorName,
        actorRole: params.actorRole,
        description: params.description,
        previousState: params.previousState ? JSON.stringify(params.previousState) : null,
        newState: params.newState ? JSON.stringify(params.newState) : null,
        evaluationId: params.evaluationId || null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    console.error('Audit log write failed (non-blocking):', error);
  }
}
