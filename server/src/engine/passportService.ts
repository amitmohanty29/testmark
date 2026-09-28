import prisma from '../prisma';

export type PassportEventType =
  | 'REGISTERED'
  | 'DOCUMENT_ADDED'
  | 'EVALUATION_CREATED'
  | 'TEST_RECORDED'
  | 'EVIDENCE_ATTACHED'
  | 'SUBMITTED_FOR_REVIEW'
  | 'REVIEW_APPROVED'
  | 'REVIEW_RETURNED'
  | 'REPORT_GENERATED'
  | 'REPORT_REVISED'
  | 'CERTIFICATE_EXPORTED'
  | 'INTEGRITY_VERIFIED'
  | 'RECALIBRATION';

export interface CreateEventInput {
  passportId: string;
  eventType: PassportEventType;
  refType?: string;
  refId?: string;
  actorId?: string;
  actorName?: string;
  actorDesignation?: string;
  summary: string;
  metadata?: any;
  timestamp?: Date;
}

export class PassportService {
  /**
   * Generates a unique human-readable Passport ID: "DOCA-NAWI-P-000123"
   */
  static async generatePassportId(tx: any = prisma): Promise<string> {
    const count = await tx.passport.count();
    const sequence = String(count + 1).padStart(6, '0');
    return `DOCA-NAWI-P-${sequence}`;
  }

  /**
   * Finds or creates a permanent Passport record for an instrument.
   * @param tx - Prisma client or transaction context
   * @param instrumentId - ID of the instrument
   * @param createdById - Optional user ID of the creator
   */
  static async getOrCreatePassportForInstrument(
    tx: any = prisma,
    instrumentId: string,
    createdById?: string
  ): Promise<any> {
    let passport = await tx.passport.findUnique({
      where: { instrumentId },
      include: { instrument: true },
    });

    if (!passport) {
      const instrument = await tx.instrument.findUnique({
        where: { id: instrumentId },
      });
      if (!instrument) {
        throw new Error(`Instrument ${instrumentId} not found.`);
      }

      // Use the instrument's passportId if available, or generate a fresh DOCA one
      let passportCode = instrument.passportId;
      if (!passportCode || !passportCode.startsWith('DOCA-NAWI-P-')) {
        // Check if an existing passport already has this code
        const existing = passportCode ? await tx.passport.findUnique({ where: { passportId: passportCode } }) : null;
        if (existing || !passportCode) {
          passportCode = await this.generatePassportId(tx);
        }
      }

      passport = await tx.passport.create({
        data: {
          passportId: passportCode,
          instrumentId: instrument.id,
          createdBy: createdById || instrument.createdById,
        },
        include: { instrument: true },
      });

      // Write REGISTERED event if none exists
      await tx.passportEvent.create({
        data: {
          passportId: passport.id,
          eventType: 'REGISTERED',
          refType: 'INSTRUMENT',
          refId: instrument.id,
          actorId: createdById || instrument.createdById,
          actorName: 'Testing Officer',
          actorDesignation: 'Legal Metrology Officer',
          summary: `Instrument ${instrument.manufacturer} ${instrument.model} (Serial No. ${instrument.serialNumber}) registered in National Registry. Permanent Passport ID ${passport.passportId} assigned.`,
          metadata: JSON.stringify({
            manufacturer: instrument.manufacturer,
            model: instrument.model,
            serialNumber: instrument.serialNumber,
            accuracyClass: instrument.accuracyClass,
            maxCapacity: instrument.maxCapacity,
            scaleIntervalE: instrument.scaleIntervalE,
            verificationUnits: instrument.verificationUnits,
          }),
          timestamp: instrument.createdAt,
        },
      });
    }

    return passport;
  }

  /**
   * Append-only event recorder. Can be called inside an ongoing transaction or standalone.
   * Accepts either positional args (tx, passportId, eventType, refType, refId, actorId, summary, metadata)
   * or legacy (CreateEventInput, tx) for backward compat.
   */
  static async recordEvent(
    txOrInput: any,
    passportIdOrTx?: any,
    eventType?: string,
    refType?: string,
    refId?: string,
    actorId?: string,
    summary?: string,
    metadata?: any
  ): Promise<any> {
    let tx: any;
    let data: any;

    if (typeof txOrInput === 'object' && txOrInput.passportId && txOrInput.eventType) {
      // Legacy: recordEvent(CreateEventInput, tx)
      const input = txOrInput as CreateEventInput;
      tx = passportIdOrTx || prisma;
      data = {
        passportId: input.passportId,
        eventType: input.eventType,
        refType: input.refType || null,
        refId: input.refId || null,
        actorId: input.actorId || null,
        actorName: input.actorName || 'Authorized Officer',
        actorDesignation: input.actorDesignation || 'Legal Metrology Officer',
        summary: input.summary,
        metadata: input.metadata ? (typeof input.metadata === 'string' ? input.metadata : JSON.stringify(input.metadata)) : null,
        timestamp: input.timestamp || new Date(),
      };
    } else {
      // Positional: recordEvent(tx, passportId, eventType, refType, refId, actorId, summary, metadata)
      tx = txOrInput || prisma;
      data = {
        passportId: passportIdOrTx,
        eventType: eventType || 'REGISTERED',
        refType: refType || null,
        refId: refId || null,
        actorId: actorId || null,
        actorName: 'Authorized Officer',
        actorDesignation: 'Legal Metrology Officer',
        summary: summary || '',
        metadata: metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null,
        timestamp: new Date(),
      };
    }

    if (data.actorId && (!data.actorName || data.actorName === 'Authorized Officer')) {
      try {
        const u = await tx.user.findUnique({
          where: { id: data.actorId },
          select: { name: true, designation: true },
        });
        if (u) {
          data.actorName = u.name;
          if (u.designation) data.actorDesignation = u.designation;
        }
      } catch (e) {}
    }

    return await tx.passportEvent.create({ data });
  }

  /**
   * Retrieves complete passport details with all linked evaluations, reports, evidence and timeline.
   */
  static async getPassportDetails(identifier: string): Promise<any> {
    // Lookup by passport.passportId, passport.id, instrument.id, or instrument.serialNumber
    const passport = await prisma.passport.findFirst({
      where: {
        OR: [
          { id: identifier },
          { passportId: identifier },
          { instrumentId: identifier },
          { instrument: { passportId: identifier } },
          { instrument: { serialNumber: identifier } },
        ],
      },
      include: {
        instrument: {
          include: {
            createdBy: { select: { id: true, name: true, designation: true } },
          },
        },
        documents: { orderBy: { uploadedAt: 'desc' } },
        evaluations: {
          include: {
            laboratory: true,
            testingOfficer: { select: { id: true, name: true, designation: true, department: true } },
            reviewingOfficer: { select: { id: true, name: true, designation: true, department: true } },
            ruleConfig: true,
            testRecords: {
              include: { attachments: true },
              orderBy: { createdAt: 'asc' },
            },
            reports: {
              include: { ruleConfig: true, versions: { orderBy: { version: 'asc' } } },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { evaluationDate: 'desc' },
        },
        events: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!passport) return null;

    // Collect all unique test attachments / evidence across evaluations
    const allEvidence: any[] = [];
    passport.evaluations.forEach((ev: any) => {
      ev.testRecords.forEach((tr: any) => {
        tr.attachments.forEach((att: any) => {
          allEvidence.push({
            ...att,
            evaluationNumber: ev.evaluationNumber,
            evaluationId: ev.id,
            testType: tr.testType,
          });
        });
      });
    });

    // Compute status and statistics
    const totalEvaluations = passport.evaluations.length;
    const completedEvaluations = passport.evaluations.filter((e: any) => e.state === 'Completed');
    const allReports = passport.evaluations.flatMap((e: any) => e.reports || []);
    const finalizedReports = allReports.filter((r: any) => r.status === 'FINALIZED');

    const lastEvaluation = passport.evaluations[0] || null;

    // Current compliance status from latest finalized evaluation or completed evaluation
    let currentComplianceStatus = 'PENDING_EVALUATION';
    if (completedEvaluations.length > 0) {
      currentComplianceStatus = 'CONFORMING_OIML_R76';
    } else if (passport.evaluations.some((e: any) => e.state === 'Under Review')) {
      currentComplianceStatus = 'UNDER_REVIEW';
    } else if (passport.evaluations.some((e: any) => e.state === 'In Progress')) {
      currentComplianceStatus = 'IN_EVALUATION';
    }

    if (passport.instrument?.status === 'REJECTED') {
      currentComplianceStatus = 'NON_CONFORMING';
    }

      // Fetch audit logs for this passport, instrument, evaluations and reports
      const evalIds = passport.evaluations.map((e: any) => e.id);
      const reportIds = allReports.map((r: any) => r.id);
      const targetEntityIds = [passport.id, passport.passportId, passport.instrumentId, ...evalIds, ...reportIds];

      const auditLogs = await prisma.auditLog.findMany({
        where: {
          OR: [
            { entityId: { in: targetEntityIds } },
            { evaluationId: { in: evalIds } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      return {
        ...passport,
        evidence: allEvidence,
        reports: allReports,
        auditLogs,
        summary: {
          totalEvaluations,
          totalCompletedEvaluations: completedEvaluations.length,
          totalReports: allReports.length,
          totalFinalizedReports: finalizedReports.length,
          lastEvaluationDate: lastEvaluation ? lastEvaluation.evaluationDate : null,
          lastEvaluationNumber: lastEvaluation ? lastEvaluation.evaluationNumber : null,
          currentComplianceStatus,
        },
      };
    }

  /**
   * One-time migration: Creates Passports for existing instruments and back-fills
   * events from existing evaluations, tests, evidence, reviews and reports.
   */
  static async backfillPassports(): Promise<{
    passportsCreated: number;
    eventsCreated: number;
    recordsLinked: number;
  }> {
    let passportsCreated = 0;
    let eventsCreated = 0;
    let recordsLinked = 0;

    const instruments = await prisma.instrument.findMany({
      include: {
        documents: true,
        evaluations: {
          include: {
            laboratory: true,
            testingOfficer: true,
            reviewingOfficer: true,
            ruleConfig: true,
            testRecords: {
              include: { attachments: true },
            },
            reports: {
              include: { versions: true },
            },
          },
        },
      },
    });

    for (const inst of instruments) {
      // 1. Get or create Passport
      let passport = await prisma.passport.findUnique({
        where: { instrumentId: inst.id },
      });

      if (!passport) {
        passport = await prisma.passport.create({
          data: {
            passportId: inst.passportId || (await this.generatePassportId()),
            instrumentId: inst.id,
            createdBy: inst.createdById,
            createdAt: inst.createdAt,
          },
        });
        passportsCreated++;

        // Add REGISTERED event
        await prisma.passportEvent.create({
          data: {
            passportId: passport.id,
            eventType: 'REGISTERED',
            refType: 'INSTRUMENT',
            refId: inst.id,
            actorId: inst.createdById,
            actorName: 'Testing Officer',
            actorDesignation: 'Legal Metrology Officer',
            summary: `Instrument ${inst.manufacturer} ${inst.model} (Serial No. ${inst.serialNumber}) registered in National Registry. Permanent Passport ID ${passport.passportId} assigned.`,
            metadata: JSON.stringify({
              manufacturer: inst.manufacturer,
              model: inst.model,
              serialNumber: inst.serialNumber,
              accuracyClass: inst.accuracyClass,
              maxCapacity: inst.maxCapacity,
              scaleIntervalE: inst.scaleIntervalE,
              verificationUnits: inst.verificationUnits,
            }),
            timestamp: inst.createdAt,
          },
        });
        eventsCreated++;
      }

      // 2. Link Documents
      for (const doc of inst.documents) {
        if (!doc.passportId) {
          await prisma.instrumentDocument.update({
            where: { id: doc.id },
            data: { passportId: passport.id },
          });
          recordsLinked++;

          const existingEvent = await prisma.passportEvent.findFirst({
            where: { passportId: passport.id, eventType: 'DOCUMENT_ADDED', refId: doc.id },
          });
          if (!existingEvent) {
            await prisma.passportEvent.create({
              data: {
                passportId: passport.id,
                eventType: 'DOCUMENT_ADDED',
                refType: 'DOCUMENT',
                refId: doc.id,
                actorName: 'Testing Officer',
                actorDesignation: 'Legal Metrology Officer',
                summary: `Document "${doc.title}" (${doc.fileName}) uploaded to passport dossier.`,
                metadata: JSON.stringify({ fileName: doc.fileName, fileUrl: doc.fileUrl, fileType: doc.fileType }),
                timestamp: doc.uploadedAt,
              },
            });
            eventsCreated++;
          }
        }
      }

      // 3. Link Evaluations, Test Records, Evidence, and Reports
      for (const ev of inst.evaluations) {
        if (!ev.passportId) {
          await prisma.evaluation.update({
            where: { id: ev.id },
            data: { passportId: passport.id },
          });
          recordsLinked++;
        }

        // Check EVALUATION_CREATED event
        const hasEvalCreated = await prisma.passportEvent.findFirst({
          where: { passportId: passport.id, eventType: 'EVALUATION_CREATED', refId: ev.id },
        });
        if (!hasEvalCreated) {
          await prisma.passportEvent.create({
            data: {
              passportId: passport.id,
              eventType: 'EVALUATION_CREATED',
              refType: 'EVALUATION',
              refId: ev.id,
              actorId: ev.testingOfficerId,
              actorName: ev.testingOfficer?.name || 'Testing Officer',
              actorDesignation: ev.testingOfficer?.designation || 'Legal Metrology Officer',
              summary: `Evaluation session ${ev.evaluationNumber} initiated at ${ev.laboratory?.name || 'Accredited Lab'}. Rule version: ${ev.ruleConfig?.version || ev.standardReference}.`,
              metadata: JSON.stringify({
                evaluationNumber: ev.evaluationNumber,
                laboratoryName: ev.laboratory?.name,
                ruleConfigVersion: ev.ruleConfig?.version || ev.standardReference,
              }),
              timestamp: ev.evaluationDate || ev.createdAt,
            },
          });
          eventsCreated++;
        }

        // Test Records
        for (const tr of ev.testRecords) {
          if (!tr.passportId) {
            await prisma.testRecord.update({
              where: { id: tr.id },
              data: { passportId: passport.id },
            });
            recordsLinked++;
          }

          const hasTestRecorded = await prisma.passportEvent.findFirst({
            where: { passportId: passport.id, eventType: 'TEST_RECORDED', refId: tr.id },
          });
          if (!hasTestRecorded) {
            await prisma.passportEvent.create({
              data: {
                passportId: passport.id,
                eventType: 'TEST_RECORDED',
                refType: 'TEST_RECORD',
                refId: tr.id,
                actorId: tr.testedById || ev.testingOfficerId,
                actorName: tr.testedByName || ev.testingOfficer?.name || 'Testing Officer',
                actorDesignation: 'Legal Metrology Officer',
                summary: `Module ${tr.testType.replace(/_/g, ' ')} recorded with verdict: ${tr.status}.`,
                metadata: JSON.stringify({ testType: tr.testType, verdict: tr.status, evaluationNumber: ev.evaluationNumber }),
                timestamp: tr.completedAt || tr.createdAt,
              },
            });
            eventsCreated++;
          }

          // Attachments / Evidence
          for (const att of tr.attachments) {
            if (!att.passportId) {
              await prisma.testAttachment.update({
                where: { id: att.id },
                data: { passportId: passport.id },
              });
              recordsLinked++;
            }

            const hasEvidence = await prisma.passportEvent.findFirst({
              where: { passportId: passport.id, eventType: 'EVIDENCE_ATTACHED', refId: att.id },
            });
            if (!hasEvidence) {
              await prisma.passportEvent.create({
                data: {
                  passportId: passport.id,
                  eventType: 'EVIDENCE_ATTACHED',
                  refType: 'TEST_ATTACHMENT',
                  refId: att.id,
                  actorName: tr.testedByName || ev.testingOfficer?.name || 'Testing Officer',
                  actorDesignation: 'Legal Metrology Officer',
                  summary: `Evidence attachment "${att.title}" added to test ${tr.testType.replace(/_/g, ' ')}.`,
                  metadata: JSON.stringify({
                    title: att.title,
                    fileName: att.fileName,
                    fileUrl: att.fileUrl,
                    fileType: att.fileType,
                    testType: tr.testType,
                  }),
                  timestamp: att.uploadedAt,
                },
              });
              eventsCreated++;
            }
          }
        }

        // Review state transitions
        if (ev.state === 'Under Review' || ev.state === 'Completed') {
          const hasSubmit = await prisma.passportEvent.findFirst({
            where: { passportId: passport.id, eventType: 'SUBMITTED_FOR_REVIEW', refId: ev.id },
          });
          if (!hasSubmit) {
            await prisma.passportEvent.create({
              data: {
                passportId: passport.id,
                eventType: 'SUBMITTED_FOR_REVIEW',
                refType: 'EVALUATION',
                refId: ev.id,
                actorId: ev.testingOfficerId,
                actorName: ev.testingOfficer?.name || 'Testing Officer',
                actorDesignation: ev.testingOfficer?.designation || 'Legal Metrology Officer',
                summary: `Evaluation ${ev.evaluationNumber} completed and submitted for Reviewing Officer endorsement.`,
                metadata: JSON.stringify({ evaluationNumber: ev.evaluationNumber }),
                timestamp: ev.updatedAt,
              },
            });
            eventsCreated++;
          }
        }

        if (ev.state === 'Completed') {
          const hasApproved = await prisma.passportEvent.findFirst({
            where: { passportId: passport.id, eventType: 'REVIEW_APPROVED', refId: ev.id },
          });
          if (!hasApproved) {
            await prisma.passportEvent.create({
              data: {
                passportId: passport.id,
                eventType: 'REVIEW_APPROVED',
                refType: 'EVALUATION',
                refId: ev.id,
                actorId: ev.reviewingOfficerId || undefined,
                actorName: ev.reviewingOfficer?.name || 'Reviewing Officer',
                actorDesignation: ev.reviewingOfficer?.designation || 'Senior Reviewing Officer',
                summary: `Evaluation ${ev.evaluationNumber} endorsed and approved by Reviewing Officer. OIML R-76 pattern conformity certified.`,
                metadata: JSON.stringify({ evaluationNumber: ev.evaluationNumber, remarks: ev.reviewRemarks }),
                timestamp: ev.completedAt || ev.updatedAt,
              },
            });
            eventsCreated++;
          }
        }

        // Reports
        for (const rpt of ev.reports) {
          if (!rpt.passportId) {
            await prisma.report.update({
              where: { id: rpt.id },
              data: { passportId: passport.id },
            });
            recordsLinked++;
          }

          const hasRptGen = await prisma.passportEvent.findFirst({
            where: { passportId: passport.id, eventType: 'REPORT_GENERATED', refId: rpt.id },
          });
          if (!hasRptGen) {
            await prisma.passportEvent.create({
              data: {
                passportId: passport.id,
                eventType: 'REPORT_GENERATED',
                refType: 'REPORT',
                refId: rpt.id,
                actorId: rpt.generatedById,
                actorName: rpt.generatedByName || 'Legal Metrology Officer',
                actorDesignation: 'Legal Metrology Officer',
                summary: `Official Test Report ${rpt.reportId} generated from evaluation ${ev.evaluationNumber}. SHA-256 seal: ${rpt.integrityHash ? rpt.integrityHash.substring(0, 16) + '...' : 'Pending'}.`,
                metadata: JSON.stringify({
                  reportId: rpt.reportId,
                  version: rpt.version,
                  integrityHash: rpt.integrityHash,
                  evaluationNumber: ev.evaluationNumber,
                }),
                timestamp: rpt.createdAt,
              },
            });
            eventsCreated++;
          }

          // Revisions
          for (const ver of rpt.versions) {
            if (ver.version > 1) {
              const hasRevision = await prisma.passportEvent.findFirst({
                where: { passportId: passport.id, eventType: 'REPORT_REVISED', refId: `${rpt.id}-v${ver.version}` },
              });
              if (!hasRevision) {
                await prisma.passportEvent.create({
                  data: {
                    passportId: passport.id,
                    eventType: 'REPORT_REVISED',
                    refType: 'REPORT',
                    refId: `${rpt.id}-v${ver.version}`,
                    actorId: ver.createdById,
                    actorName: ver.createdByName || 'Reviewing Officer',
                    actorDesignation: 'Reviewing Officer',
                    summary: `Report ${rpt.reportId} revised to Version ${ver.version}. Reason: ${ver.changeDescription || 'Administrative revision'}.`,
                    metadata: JSON.stringify({
                      reportId: rpt.reportId,
                      version: ver.version,
                      changeDescription: ver.changeDescription,
                      integrityHash: ver.integrityHash,
                    }),
                    timestamp: ver.createdAt,
                  },
                });
                eventsCreated++;
              }
            }
          }
        }
      }
    }

    return { passportsCreated, eventsCreated, recordsLinked };
  }
}
