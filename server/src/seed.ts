import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding MarkSure Metrology Database...');

  // Clean existing data for clean seed
  await prisma.timelineEvent.deleteMany();
  await prisma.instrumentDocument.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.instrument.deleteMany();
  await prisma.laboratory.deleteMany();
  await prisma.user.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash('Pass@123', salt);

  // 1. Seed Users (Roles: Testing Officer, Reviewing Officer, Admin)
  const testingOfficer = await prisma.user.create({
    data: {
      email: 'officer.test@marksure.gov.in',
      name: 'Er. Rajesh V. Sharma',
      password: defaultPasswordHash,
      role: 'TESTING_OFFICER',
      designation: 'Senior Legal Metrology Testing Officer',
      department: 'Standards & Verification Wing, Legal Metrology Division',
    },
  });

  const reviewingOfficer = await prisma.user.create({
    data: {
      email: 'officer.review@marksure.gov.in',
      name: 'Dr. Sunita K. Nambiar',
      password: defaultPasswordHash,
      role: 'REVIEWING_OFFICER',
      designation: 'Joint Director / Chief Reviewing Officer',
      department: 'Pattern Approval Authority, Ministry of Consumer Affairs',
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@marksure.gov.in',
      name: 'Shri Amitabh Roy, IIS',
      password: defaultPasswordHash,
      role: 'ADMIN',
      designation: 'Director of Legal Metrology & System Administrator',
      department: 'Department of Consumer Affairs, Govt. of India',
    },
  });

  console.log('Officials seeded:');
  console.log(`- Testing Officer: ${testingOfficer.email} / Pass@123`);
  console.log(`- Reviewing Officer: ${reviewingOfficer.email} / Pass@123`);
  console.log(`- Admin: ${adminUser.email} / Pass@123`);

  // 2. Seed Accredited Legal Metrology Laboratories
  const labNPL = await prisma.laboratory.create({
    data: {
      code: 'NPL-DEL-01',
      name: 'CSIR - National Physical Laboratory (NPL) New Delhi',
      address: 'Dr. K.S. Krishnan Marg, Pusa, New Delhi - 110012',
      accreditationNumber: 'NABL-MET-0012/ISO-17025',
      contactEmail: 'metrology.npl@csir.res.in',
      contactPhone: '+91-11-45609212',
    },
  });

  const labRRSL = await prisma.laboratory.create({
    data: {
      code: 'RRSL-AHM-02',
      name: 'Regional Reference Standards Laboratory (RRSL) Ahmedabad',
      address: 'Near Gujarat High Court, Sola, Ahmedabad, Gujarat - 380060',
      accreditationNumber: 'NABL-MET-0034/OIML-R76',
      contactEmail: 'rrsl.ahm@gov.in',
      contactPhone: '+91-79-27663219',
    },
  });

  const labRRSLBng = await prisma.laboratory.create({
    data: {
      code: 'RRSL-BNG-03',
      name: 'Regional Reference Standards Laboratory (RRSL) Bengaluru',
      address: 'Survey No. 41, PB No. 2225, Yeshwanthpur, Bengaluru - 560022',
      accreditationNumber: 'NABL-MET-0056/OIML-R76',
      contactEmail: 'rrsl.bng@gov.in',
      contactPhone: '+91-80-23371890',
    },
  });

  // 3. Seed Sample Non-Automatic Weighing Instruments (NAWI)
  const inst1 = await prisma.instrument.create({
    data: {
      passportId: 'IN-NAWI-2026-0014',
      manufacturer: 'Eagle Metrology Systems Pvt. Ltd.',
      model: 'EMS-Precision Pro 3000',
      serialNumber: 'EMS-2026-NX-8821',
      instrumentType: 'Precision Laboratory Electronic Balance',
      accuracyClass: 'Class II',
      maxCapacity: 3200, // 3200g
      minCapacity: 0.5,  // 0.5g
      scaleIntervalE: 0.01, // e = 0.01g
      scaleIntervalD: 0.001, // d = 0.001g
      verificationUnits: 'g',
      capacityRangeType: 'Single-Interval',
      tareRange: '-100% Max (3200g)',
      temperatureRange: '+15°C to +35°C',
      powerSupply: '230V AC, 50Hz with 12V DC Adapter',
      technicalSpecs: JSON.stringify({
        display: 'High-contrast backlit LCD with 7-digit 20mm display',
        sensorTechnology: 'Electromagnetic Force Restoration (EMFR)',
        panSize: '160mm x 160mm Stainless Steel 304',
        warmUpTime: '30 minutes',
        levelIndicator: 'Illuminated spirit bubble with adjustable leveling feet',
      }),
      status: 'CERTIFIED',
      createdById: testingOfficer.id,
    },
  });

  const inst2 = await prisma.instrument.create({
    data: {
      passportId: 'IN-NAWI-2026-0048',
      manufacturer: 'Bharat Scale & Automation Corp',
      model: 'BSAC Retail-30X',
      serialNumber: 'BSAC-2026-RT-9041',
      instrumentType: 'Retail Price-Computing Counter Scale',
      accuracyClass: 'Class III',
      maxCapacity: 30, // 30 kg
      minCapacity: 0.1, // 0.1 kg (100g)
      scaleIntervalE: 0.005, // e = 5g (0.005 kg)
      scaleIntervalD: 0.005,
      verificationUnits: 'kg',
      capacityRangeType: 'Dual-Interval (Multi-Interval)',
      tareRange: '-50% Max (15kg)',
      temperatureRange: '-10°C to +40°C',
      powerSupply: '230V AC, 50Hz / 6V rechargeable lead-acid battery',
      technicalSpecs: JSON.stringify({
        display: 'Dual front and customer facing LED display (Weight, Unit Price, Total Price)',
        sensorTechnology: 'Strain gauge load cell (IP65 sealed)',
        platterSize: '300mm x 240mm SS pan',
        keypad: '20 membrane keys with 5 direct PLUs',
      }),
      status: 'IN_EVALUATION',
      createdById: testingOfficer.id,
    },
  });

  const inst3 = await prisma.instrument.create({
    data: {
      passportId: 'IN-NAWI-2026-0091',
      manufacturer: 'Apex Industrial Metrology Ltd.',
      model: 'Apex-Weigh-Heavy 50T',
      serialNumber: 'APX-2026-WB-1092',
      instrumentType: 'Electronic Road Vehicle Weighbridge',
      accuracyClass: 'Class III',
      maxCapacity: 50, // 50 Tonnes
      minCapacity: 0.4, // 0.4 Tonnes (400kg)
      scaleIntervalE: 0.02, // 20kg (0.02t)
      scaleIntervalD: 0.02,
      verificationUnits: 't',
      capacityRangeType: 'Single-Interval',
      tareRange: '-100% Max (Subtractive tare)',
      temperatureRange: '-10°C to +50°C',
      powerSupply: '230V AC, 50Hz, 3-wire surge-protected mains',
      technicalSpecs: JSON.stringify({
        platformDimensions: '12m x 3m fabricated steel deck',
        loadCells: '6 x 20t Stainless Steel hermetically sealed canister load cells (IP68)',
        indicator: 'Digital Weight Indicator with RS-232 / Modbus RTU interface',
        lightningProtection: 'Class I surge arrestors with dedicated 2-ohm metrology earth ground',
      }),
      status: 'ACTIVE',
      createdById: testingOfficer.id,
    },
  });

  // 4. Seed Documents for inst1 and inst2
  await prisma.instrumentDocument.create({
    data: {
      instrumentId: inst1.id,
      title: 'OIML R-76 Pattern Approval Test Dossier',
      fileName: 'EMS_Precision_Pro_Pattern_Approval_Dossier_2026.pdf',
      fileUrl: 'https://www.oiml.org/en/files/pdf_r/r076-1-e06.pdf',
      fileType: 'application/pdf',
      fileSize: 4520100,
    },
  });

  await prisma.instrumentDocument.create({
    data: {
      instrumentId: inst1.id,
      title: 'EMFR Load Sensor Calibration & Linearity Certificate',
      fileName: 'EMFR_Sensor_Linearity_Report_EMS.pdf',
      fileUrl: 'https://dfpd.gov.in/public/images/favicon/apple-touch-icon.png',
      fileType: 'application/pdf',
      fileSize: 1845000,
    },
  });

  await prisma.instrumentDocument.create({
    data: {
      instrumentId: inst2.id,
      title: 'Technical Schematics & Sealing Plan',
      fileName: 'BSAC_Retail30X_Physical_Sealing_Diagram.pdf',
      fileUrl: 'https://www.oiml.org/en/files/pdf_r/r076-1-e06.pdf',
      fileType: 'application/pdf',
      fileSize: 2210000,
    },
  });

  // 5. Seed Evaluations
  // Evaluation 1 for inst1: Completed
  const eval1 = await prisma.evaluation.create({
    data: {
      evaluationNumber: 'EV-2026-0012',
      instrumentId: inst1.id,
      laboratoryId: labNPL.id,
      evaluationDate: new Date('2026-02-10T10:00:00Z'),
      testingOfficerId: testingOfficer.id,
      reviewingOfficerId: reviewingOfficer.id,
      state: 'Completed',
      standardReference: 'OIML R 76-1:2006 (Non-automatic weighing instruments)',
      patternApprovalNo: 'IND/LM/03/2026/894',
      generalRemarks: 'Weighing performance, repeatability at Max/2 and Max, and eccentric loading tests comply fully with OIML R-76 MPE Class II limits.',
      reviewRemarks: 'Pattern verification verified and endorsed. Meets all Legal Metrology General Rules 2011 requirements. Final certificate issued.',
      completedAt: new Date('2026-02-18T16:30:00Z'),
    },
  });

  // Evaluation 2 for inst2: In Progress
  const eval2 = await prisma.evaluation.create({
    data: {
      evaluationNumber: 'EV-2026-0038',
      instrumentId: inst2.id,
      laboratoryId: labRRSL.id,
      evaluationDate: new Date('2026-03-01T09:30:00Z'),
      testingOfficerId: testingOfficer.id,
      reviewingOfficerId: reviewingOfficer.id,
      state: 'In Progress',
      standardReference: 'OIML R 76-1:2006 (Clause 3.5 & 3.6)',
      patternApprovalNo: 'PENDING_REVIEW',
      generalRemarks: 'Tare effect evaluation and zero-tracking tests currently in execution on test bench 03.',
      reviewRemarks: null,
    },
  });

  // 6. Seed Timeline Events for the Digital Passports
  // For inst1 (Certified)
  await prisma.timelineEvent.create({
    data: {
      instrumentId: inst1.id,
      eventType: 'PASSPORT_CREATED',
      title: 'Digital Metrology Passport Initialized',
      description: 'Instrument profile enrolled in MarkSure National Metrology Registry. Passport ID: IN-NAWI-2026-0014.',
      officerName: testingOfficer.name,
      officerRole: testingOfficer.role,
      createdAt: new Date('2026-02-05T08:30:00Z'),
    },
  });

  await prisma.timelineEvent.create({
    data: {
      instrumentId: inst1.id,
      evaluationId: eval1.id,
      eventType: 'EVALUATION_INITIATED',
      title: `Evaluation Session Initiated: ${eval1.evaluationNumber}`,
      description: `Testing commenced at ${labNPL.name}. Testing Officer assigned: ${testingOfficer.name}.`,
      officerName: testingOfficer.name,
      officerRole: testingOfficer.role,
      createdAt: new Date('2026-02-10T10:00:00Z'),
    },
  });

  await prisma.timelineEvent.create({
    data: {
      instrumentId: inst1.id,
      evaluationId: eval1.id,
      eventType: 'STATE_TRANSITION',
      title: 'OIML R-76 Laboratory Tests Passed',
      description: 'Repeatability, Eccentricity, and Temperature stability tests (+15°C to +35°C) within MPE limits. Submitted for official review.',
      officerName: testingOfficer.name,
      officerRole: testingOfficer.role,
      createdAt: new Date('2026-02-15T14:20:00Z'),
    },
  });

  await prisma.timelineEvent.create({
    data: {
      instrumentId: inst1.id,
      evaluationId: eval1.id,
      eventType: 'STATE_TRANSITION',
      title: 'Pattern Verification Approved & Certified',
      description: 'Dr. Sunita K. Nambiar (Reviewing Officer) formally reviewed and approved test report. Verification Certificate IND/LM/03/2026/894 issued.',
      officerName: reviewingOfficer.name,
      officerRole: reviewingOfficer.role,
      createdAt: new Date('2026-02-18T16:30:00Z'),
    },
  });

  // For inst2 (In Evaluation)
  await prisma.timelineEvent.create({
    data: {
      instrumentId: inst2.id,
      eventType: 'PASSPORT_CREATED',
      title: 'Digital Metrology Passport Initialized',
      description: 'Instrument profile enrolled in MarkSure National Registry. Passport ID: IN-NAWI-2026-0048.',
      officerName: testingOfficer.name,
      officerRole: testingOfficer.role,
      createdAt: new Date('2026-02-28T11:00:00Z'),
    },
  });

  await prisma.timelineEvent.create({
    data: {
      instrumentId: inst2.id,
      evaluationId: eval2.id,
      eventType: 'EVALUATION_INITIATED',
      title: `Evaluation Session Initiated: ${eval2.evaluationNumber}`,
      description: `Evaluation session started at ${labRRSL.name}. Primary testing of retail price computing logic.`,
      officerName: testingOfficer.name,
      officerRole: testingOfficer.role,
      createdAt: new Date('2026-03-01T09:30:00Z'),
    },
  });

  // For inst3 (Active - newly enrolled)
  await prisma.timelineEvent.create({
    data: {
      instrumentId: inst3.id,
      eventType: 'PASSPORT_CREATED',
      title: 'Digital Metrology Passport Initialized',
      description: 'Instrument profile enrolled in MarkSure National Metrology Registry. Passport ID: IN-NAWI-2026-0091. Awaiting evaluation scheduling.',
      officerName: testingOfficer.name,
      officerRole: testingOfficer.role,
      createdAt: new Date('2026-03-05T12:00:00Z'),
    },
  });

  // 7. Seed Rule Configurations
  await prisma.ruleConfiguration.deleteMany();
  const ruleV1 = await prisma.ruleConfiguration.create({
    data: {
      version: 'OIML-R76-2006-v1.0',
      name: 'OIML R 76-1:2006 — Production Release',
      description: 'Standard MPE tables and accuracy class definitions per OIML R 76-1 (Edition 2006). This is the default production rule set used for all legal metrology evaluations.',
      standardRef: 'OIML R 76-1 (Edition 2006)',
      configuration: JSON.stringify({
        classes: {
          'Class I':  { mpeBrackets: [{ minM: 0, maxM: 50000, mpeInE: 0.5 }, { minM: 50000, maxM: 200000, mpeInE: 1.0 }, { minM: 200000, maxM: Infinity, mpeInE: 1.5 }] },
          'Class II': { mpeBrackets: [{ minM: 0, maxM: 5000, mpeInE: 0.5 }, { minM: 5000, maxM: 20000, mpeInE: 1.0 }, { minM: 20000, maxM: 100000, mpeInE: 1.5 }] },
          'Class III':{ mpeBrackets: [{ minM: 0, maxM: 500, mpeInE: 0.5 }, { minM: 500, maxM: 2000, mpeInE: 1.0 }, { minM: 2000, maxM: 10000, mpeInE: 1.5 }] },
          'Class IV': { mpeBrackets: [{ minM: 0, maxM: 50, mpeInE: 0.5 }, { minM: 50, maxM: 200, mpeInE: 1.0 }, { minM: 200, maxM: 1000, mpeInE: 1.5 }] },
        },
        verificationMultipliers: { INITIAL: 1.0, IN_SERVICE: 2.0 },
      }),
      isActive: true,
      isDraft: false,
    },
  });

  await prisma.ruleConfiguration.create({
    data: {
      version: 'OIML-R76-2006-v1.1-DRAFT',
      name: 'OIML R 76 — Tightened MPE (Draft Proposal)',
      description: 'Proposed stricter tolerances: 20% tighter MPE for Class III instruments. For simulation purposes only — NON-BINDING.',
      standardRef: 'OIML R 76-1 (Edition 2006) — Amendment Proposal',
      configuration: JSON.stringify({
        classes: {
          'Class I':  { mpeBrackets: [{ minM: 0, maxM: 50000, mpeInE: 0.5 }, { minM: 50000, maxM: 200000, mpeInE: 1.0 }, { minM: 200000, maxM: Infinity, mpeInE: 1.5 }], mpeTighteningFactor: 1.0 },
          'Class II': { mpeBrackets: [{ minM: 0, maxM: 5000, mpeInE: 0.5 }, { minM: 5000, maxM: 20000, mpeInE: 1.0 }, { minM: 20000, maxM: 100000, mpeInE: 1.5 }], mpeTighteningFactor: 0.9 },
          'Class III':{ mpeBrackets: [{ minM: 0, maxM: 500, mpeInE: 0.4 }, { minM: 500, maxM: 2000, mpeInE: 0.8 }, { minM: 2000, maxM: 10000, mpeInE: 1.2 }], mpeTighteningFactor: 0.8 },
          'Class IV': { mpeBrackets: [{ minM: 0, maxM: 50, mpeInE: 0.5 }, { minM: 50, maxM: 200, mpeInE: 1.0 }, { minM: 200, maxM: 1000, mpeInE: 1.5 }], mpeTighteningFactor: 1.0 },
        },
        verificationMultipliers: { INITIAL: 1.0, IN_SERVICE: 2.0 },
      }),
      isActive: false,
      isDraft: true,
    },
  });

  // Link evaluations to rule config
  await prisma.evaluation.updateMany({
    data: { ruleConfigId: ruleV1.id },
  });

  // 8. Seed Reports and Audit Logs
  await prisma.reportVersion.deleteMany();
  await prisma.report.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.simulationRun.deleteMany();

  // Generate a sample report for the completed evaluation
  const { createHash } = await import('crypto');
  const sampleReportData = JSON.stringify({
    reportId: 'RPT-2026-0001',
    evaluation: { evaluationNumber: eval1.evaluationNumber, state: 'Completed' },
    instrument: { passportId: inst1.passportId, manufacturer: inst1.manufacturer, model: inst1.model, serialNumber: inst1.serialNumber, accuracyClass: inst1.accuracyClass },
    laboratory: { name: 'CSIR - National Physical Laboratory (NPL) New Delhi', code: 'NPL-DEL-01' },
    testingOfficer: { name: testingOfficer.name },
    reviewingOfficer: { name: reviewingOfficer.name },
    ruleConfig: { version: 'OIML-R76-2006-v1.0' },
    generatedAt: '2026-02-19T10:00:00Z',
  });
  const sampleHash = createHash('sha256').update(sampleReportData, 'utf8').digest('hex');

  const sampleReport = await prisma.report.create({
    data: {
      reportId: 'RPT-2026-0001',
      evaluationId: eval1.id,
      ruleConfigId: ruleV1.id,
      version: 1,
      status: 'FINALIZED',
      reportData: sampleReportData,
      integrityHash: sampleHash,
      finalizedAt: new Date('2026-02-19T10:30:00Z'),
      finalizedById: reviewingOfficer.id,
      generatedById: testingOfficer.id,
      generatedByName: testingOfficer.name,
    },
  });

  await prisma.reportVersion.create({
    data: {
      reportId: sampleReport.id,
      version: 1,
      reportData: sampleReportData,
      integrityHash: sampleHash,
      changeDescription: 'Initial report generation and finalization',
      createdById: testingOfficer.id,
      createdByName: testingOfficer.name,
    },
  });

  // Seed audit logs
  await prisma.auditLog.createMany({
    data: [
      { entityType: 'EVALUATION', entityId: eval1.id, action: 'CREATED', actorId: testingOfficer.id, actorName: testingOfficer.name, actorRole: 'TESTING_OFFICER', description: `Evaluation ${eval1.evaluationNumber} initiated`, evaluationId: eval1.id },
      { entityType: 'EVALUATION', entityId: eval1.id, action: 'STATE_CHANGE', actorId: testingOfficer.id, actorName: testingOfficer.name, actorRole: 'TESTING_OFFICER', description: 'State: Draft → In Progress', previousState: JSON.stringify({ state: 'Draft' }), newState: JSON.stringify({ state: 'In Progress' }), evaluationId: eval1.id },
      { entityType: 'EVALUATION', entityId: eval1.id, action: 'STATE_CHANGE', actorId: testingOfficer.id, actorName: testingOfficer.name, actorRole: 'TESTING_OFFICER', description: 'State: In Progress → Under Review', previousState: JSON.stringify({ state: 'In Progress' }), newState: JSON.stringify({ state: 'Under Review' }), evaluationId: eval1.id },
      { entityType: 'EVALUATION', entityId: eval1.id, action: 'STATE_CHANGE', actorId: reviewingOfficer.id, actorName: reviewingOfficer.name, actorRole: 'REVIEWING_OFFICER', description: 'State: Under Review → Completed (Approved)', previousState: JSON.stringify({ state: 'Under Review' }), newState: JSON.stringify({ state: 'Completed' }), evaluationId: eval1.id },
      { entityType: 'REPORT', entityId: sampleReport.id, action: 'CREATED', actorId: testingOfficer.id, actorName: testingOfficer.name, actorRole: 'TESTING_OFFICER', description: `Report RPT-2026-0001 generated`, evaluationId: eval1.id },
      { entityType: 'REPORT', entityId: sampleReport.id, action: 'FINALIZED', actorId: reviewingOfficer.id, actorName: reviewingOfficer.name, actorRole: 'REVIEWING_OFFICER', description: `Report RPT-2026-0001 finalized with SHA-256 hash`, evaluationId: eval1.id },
    ],
  });

  console.log(`- Rule Config: ${ruleV1.version} (active) + draft tightened version`);
  console.log(`- Sample Report: RPT-2026-0001 (finalized with SHA-256 hash)`);
  console.log('MarkSure seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

