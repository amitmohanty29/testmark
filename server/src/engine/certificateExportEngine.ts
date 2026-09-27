// MarkSure Multi-National OIML CS Certificate Exporter Engine
// Template-based rendering architecture supporting Indian RRSL, OIML CS Scheme, and future national standards

import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  Packer,
  Header,
} from 'docx';

export type CertificateTemplateId = 'INDIAN_RRSL' | 'OIML_CS';
export type ExportFileFormat = 'pdf' | 'docx';

export interface EvaluationContext {
  report: any;
  evaluation: any;
  instrument: any;
  laboratory: any;
  testRecords: any[];
  testingOfficer: any;
  reviewingOfficer: any;
  ruleConfig?: any;
}

export interface MappedField {
  key: string;
  label: string;
  value: string;
}

export interface MappedSection {
  id: string;
  title: string;
  fields: MappedField[];
}

export interface TemplateDefinition {
  id: CertificateTemplateId;
  name: string;
  shortCode: string;
  countryOrRegion: string;
  authority: string;
  standardReference: string;
  legalBasis: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    lightBg: string;
  };
  getSections: (ctx: EvaluationContext) => MappedSection[];
  getTestSummary: (ctx: EvaluationContext) => any[];
  getSignatories: (ctx: EvaluationContext) => Array<{
    title: string;
    name: string;
    designation: string;
    department?: string;
  }>;
  statutoryDisclaimer: string;
  sealingAndStampingClause?: string;
}

const safeVal = (v: any, fallback = 'N/A'): string => {
  if (v === undefined || v === null || String(v).trim() === '') return fallback;
  return String(v);
};

const safeDate = (v: any): string => {
  if (!v) return 'N/A';
  try {
    return new Date(v).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(v);
  }
};

const safeParseJson = (str: any, def: any = null) => {
  if (!str) return def;
  if (typeof str === 'object') return str;
  try {
    return JSON.parse(str);
  } catch {
    return def;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE REGISTRY
// Adding a new country/standard (e.g. WELMEC_EU, NTEP_USA) requires ONLY adding
// an entry here — no rewriting of the rendering engine is needed.
// ─────────────────────────────────────────────────────────────────────────────

export const CERTIFICATE_TEMPLATES: Record<CertificateTemplateId, TemplateDefinition> = {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. Indian RRSL National Template (Legal Metrology Rules, 2011)
  // ───────────────────────────────────────────────────────────────────────────
  INDIAN_RRSL: {
    id: 'INDIAN_RRSL',
    name: 'Indian RRSL National Certificate (Legal Metrology Rules, 2011)',
    shortCode: 'IND-RRSL-2011',
    countryOrRegion: 'India (National)',
    authority: 'Regional Reference Standards Laboratory (RRSL), Government of India',
    standardReference: 'Legal Metrology Act, 2009 & Legal Metrology (General) Rules, 2011 (Schedule VI)',
    legalBasis: 'Issued under Section 22 of the Legal Metrology Act, 2009 read with Rule 27 of Legal Metrology (General) Rules, 2011 for Verification of Non-Automatic Weighing Instruments.',
    description: 'Statutory Verification & Pattern Approval Certificate format enforced by Indian Directorate of Legal Metrology, Ministry of Consumer Affairs, Food & Public Distribution.',
    colors: {
      primary: '#005a3c', // Indian Emerald Green
      secondary: '#1e3a8a', // Ashok Chakra Navy
      accent: '#c98a0c', // Indian Saffron Gold
      lightBg: '#fbfaf5',
    },
    getSections: (ctx: EvaluationContext): MappedSection[] => {
      const { report, evaluation, instrument, laboratory, ruleConfig } = ctx;
      const nValue =
        instrument.scaleIntervalE > 0 ? Math.round(instrument.maxCapacity / instrument.scaleIntervalE) : 'N/A';

      return [
        {
          id: 'certificate_meta',
          title: '1. Certificate & Statutory Reference',
          fields: [
            { key: 'certNo', label: 'Certificate Reference No.', value: `RRSL/IND/${safeVal(report.reportId)}` },
            { key: 'issueDate', label: 'Date of Issue', value: safeDate(report.finalizedAt || report.createdAt) },
            { key: 'validity', label: 'Validity Period', value: '10 Years from Date of Issue (per Rule 27)' },
            { key: 'actClause', label: 'Governing Act', value: 'The Legal Metrology Act, 2009 (No. 1 of 2010)' },
            { key: 'rulesClause', label: 'Statutory Rules', value: 'Legal Metrology (General) Rules, 2011 (Schedule VI)' },
            { key: 'patternApproval', label: 'Pattern Approval Reference', value: safeVal(evaluation.patternApprovalNo, 'IND-PA-2026-PENDING') },
          ],
        },
        {
          id: 'applicant_details',
          title: '2. Applicant & Manufacturing Premises',
          fields: [
            { key: 'manufacturer', label: 'Manufacturer / Brand Name', value: safeVal(instrument.manufacturer) },
            { key: 'applicantAddress', label: 'Registered Premises / Factory', value: safeVal(instrument.technicalSpecs ? safeParseJson(instrument.technicalSpecs)?.address : null, 'Industrial Area, Phase II, New Delhi, India') },
            { key: 'labName', label: 'Testing Laboratory (RRSL)', value: safeVal(laboratory.name) },
            { key: 'labAccreditation', label: 'RRSL / NPL Accreditation Ref', value: safeVal(laboratory.accreditationNumber) },
            { key: 'stateJurisdiction', label: 'State Controller Jurisdiction', value: 'State Controller of Legal Metrology (Inter-State Scope)' },
          ],
        },
        {
          id: 'instrument_specifications',
          title: '3. Technical & Metrological Specifications',
          fields: [
            { key: 'model', label: 'Instrument Model Designation', value: safeVal(instrument.model) },
            { key: 'serialNumber', label: 'Serial Number / Chassis ID', value: safeVal(instrument.serialNumber) },
            { key: 'passportId', label: 'National Passport Ledger ID', value: safeVal(instrument.passportId) },
            { key: 'accuracyClass', label: 'Class of Accuracy (Indian Rules)', value: safeVal(instrument.accuracyClass) },
            { key: 'maxCapacity', label: 'Maximum Capacity (Max)', value: `${safeVal(instrument.maxCapacity)} ${safeVal(instrument.verificationUnits)}` },
            { key: 'minCapacity', label: 'Minimum Capacity (Min)', value: `${safeVal(instrument.minCapacity)} ${safeVal(instrument.verificationUnits)}` },
            { key: 'scaleIntervalE', label: 'Verification Scale Interval (e)', value: `${safeVal(instrument.scaleIntervalE)} ${safeVal(instrument.verificationUnits)}` },
            { key: 'scaleIntervalD', label: 'Actual Scale Interval (d)', value: `${safeVal(instrument.scaleIntervalD || instrument.scaleIntervalE)} ${safeVal(instrument.verificationUnits)}` },
            { key: 'nRatio', label: 'Number of Scale Intervals (n = Max/e)', value: String(nValue) },
            { key: 'tareRange', label: 'Tare Mechanism Provision', value: safeVal(instrument.tareRange, '-100% Max (Subtractive)') },
            { key: 'tempRange', label: 'Temperature Operating Range', value: safeVal(instrument.temperatureRange, '+10°C to +40°C') },
            { key: 'powerSupply', label: 'Mains Power Rating', value: safeVal(instrument.powerSupply, '230V AC ± 10%, 50Hz') },
          ],
        },
      ];
    },
    getTestSummary: (ctx: EvaluationContext) => {
      const records = ctx.testRecords || [];
      return [
        {
          moduleName: 'Weighing Performance Test (Clause A.4.4)',
          scheduleRef: 'Schedule VI, Heading B, Clause 3',
          toleranceRule: 'Table 6 Maximum Permissible Error (MPE) for Initial Verification',
          record: records.find((r) => r.testType === 'WEIGHING_PERFORMANCE'),
        },
        {
          moduleName: 'Repeatability Evaluation (Clause A.4.10)',
          scheduleRef: 'Schedule VI, Clause 4.2',
          toleranceRule: 'Max variation between successive trials ≤ 1.0 e',
          record: records.find((r) => r.testType === 'REPEATABILITY'),
        },
        {
          moduleName: 'Eccentricity (Off-Center) Test (Clause A.4.7)',
          scheduleRef: 'Schedule VI, Clause 4.3',
          toleranceRule: 'Off-center error on 1/3 Max test loads ≤ 1.0 e across all quadrants',
          record: records.find((r) => r.testType === 'ECCENTRICITY'),
        },
        {
          moduleName: 'Tare Balancing Device Accuracy (Clause A.4.6)',
          scheduleRef: 'Schedule VI, Clause 3.6',
          toleranceRule: 'Tare setting error |Et| ≤ ±0.25 e',
          record: records.find((r) => r.testType === 'TARE'),
        },
      ];
    },
    getSignatories: (ctx: EvaluationContext) => {
      return [
        {
          title: 'Testing Metrology Officer',
          name: ctx.testingOfficer?.name || 'Metrology Officer',
          designation: ctx.testingOfficer?.designation || 'Scientific Officer (Metrology)',
          department: 'Regional Reference Standards Laboratory',
        },
        {
          title: 'Director / Head of Laboratory',
          name: ctx.reviewingOfficer?.name || 'Reviewing Officer',
          designation: ctx.reviewingOfficer?.designation || 'Director, Legal Metrology / In-Charge RRSL',
          department: 'Department of Consumer Affairs, Govt. of India',
        },
      ];
    },
    sealingAndStampingClause:
      'Mandatory Sealing Clause: The lead-and-wire security seal or tamper-evident hologram bearing the official RRSL insignia must be affixed to the calibration jumper housing and instrument casing. Stamping mark to be engraved on the identification plate.',
    statutoryDisclaimer:
      'Certified that the weighing instrument specified herein has been tested at the Regional Reference Standards Laboratory in accordance with Section 22 of the Legal Metrology Act, 2009 and the Seventh Schedule of the Legal Metrology (General) Rules, 2011. The model conforms to statutory limits and is approved for legal verification and commercial stamping.',
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 2. International OIML CS Scheme Type Evaluation Report Format
  // ───────────────────────────────────────────────────────────────────────────
  OIML_CS: {
    id: 'OIML_CS',
    name: 'OIML CS Scheme Type Evaluation Certificate (OIML R 76-1:2006)',
    shortCode: 'OIML-CS-R76',
    countryOrRegion: 'International (OIML)',
    authority: 'OIML Issuing Authority (Scheme A Framework)',
    standardReference: 'OIML R 76-1:2006 (E) & OIML R 76-2:2007 (E)',
    legalBasis: 'Issued pursuant to the rules of the OIML Certification System (OIML CS) for Non-Automatic Weighing Instruments, establishing international mutual acceptance of metrological evaluation results.',
    description: 'International Type Evaluation Report and Certificate of Conformity recognized by OIML member states worldwide under Scheme A / Scheme B mutual recognition agreements.',
    colors: {
      primary: '#0c4a6e', // OIML International Maritime Blue
      secondary: '#075985', // OIML Cyan Blue
      accent: '#d97706', // OIML Amber Accent
      lightBg: '#f8fafc',
    },
    getSections: (ctx: EvaluationContext): MappedSection[] => {
      const { report, evaluation, instrument, laboratory } = ctx;
      const nValue =
        instrument.scaleIntervalE > 0 ? Math.round(instrument.maxCapacity / instrument.scaleIntervalE) : 'N/A';

      return [
        {
          id: 'oiml_meta',
          title: '1. OIML Certificate Identification',
          fields: [
            { key: 'oimlCertNo', label: 'OIML Certificate Number', value: `R76/2006-A-IN1-${safeVal(report.reportId)}` },
            { key: 'issuingAuthority', label: 'OIML Issuing Authority', value: 'National Legal Metrology Authority (OIML Signatory Laboratory)' },
            { key: 'oimlScope', label: 'OIML CS Participation Scope', value: 'Scheme A (Accredited Testing & Management System Audit)' },
            { key: 'issueDate', label: 'Date of Certification', value: safeDate(report.finalizedAt || report.createdAt) },
            { key: 'standardEdition', label: 'Applicable OIML Standard', value: 'OIML R 76-1 Edition 2006 (E)' },
            { key: 'testReportRef', label: 'OIML R 76-2 Checklist Ref', value: `OIML-R76-TR-${safeVal(evaluation.evaluationNumber)}` },
          ],
        },
        {
          id: 'certified_type',
          title: '2. Certified Type & Manufacturer Identity',
          fields: [
            { key: 'manufacturer', label: 'Applicant / Certified Entity', value: safeVal(instrument.manufacturer) },
            { key: 'address', label: 'Address of Manufacturer', value: safeVal(instrument.technicalSpecs ? safeParseJson(instrument.technicalSpecs)?.address : null, 'Certified Manufacturing Facility, Global Metrology Hub') },
            { key: 'modelDesignation', label: 'Designated Model / Family', value: safeVal(instrument.model) },
            { key: 'serialNumber', label: 'Specimen Serial Number', value: safeVal(instrument.serialNumber) },
            { key: 'passportId', label: 'Global Digital Passport ID', value: safeVal(instrument.passportId) },
            { key: 'instrumentType', label: 'Instrument Category', value: safeVal(instrument.instrumentType, 'Non-Automatic Weighing Instrument (NAWI)') },
          ],
        },
        {
          id: 'metrological_characteristics',
          title: '3. Essential Metrological Characteristics',
          fields: [
            { key: 'accuracyClass', label: 'Accuracy Class (Clause A.3.1)', value: safeVal(instrument.accuracyClass) },
            { key: 'maxCapacity', label: 'Maximum Capacity (Max)', value: `${safeVal(instrument.maxCapacity)} ${safeVal(instrument.verificationUnits)}` },
            { key: 'minCapacity', label: 'Minimum Capacity (Min)', value: `${safeVal(instrument.minCapacity)} ${safeVal(instrument.verificationUnits)}` },
            { key: 'scaleIntervalE', label: 'Verification Scale Interval (e)', value: `${safeVal(instrument.scaleIntervalE)} ${safeVal(instrument.verificationUnits)}` },
            { key: 'scaleIntervalD', label: 'Actual Scale Interval (d)', value: `${safeVal(instrument.scaleIntervalD || instrument.scaleIntervalE)} ${safeVal(instrument.verificationUnits)}` },
            { key: 'nIntervals', label: 'Number of Scale Intervals (n)', value: String(nValue) },
            { key: 'tareDevice', label: 'Tare Balancing Device', value: safeVal(instrument.tareRange, 'Subtractive, T ≤ -Max') },
            { key: 'temperatureRange', label: 'Specified Temperature Range', value: safeVal(instrument.temperatureRange, '+10°C / +40°C') },
            { key: 'powerSupply', label: 'Power Supply Specifications', value: safeVal(instrument.powerSupply, '230V AC, 50Hz / Internal Rechargeable') },
            { key: 'emcImmunity', label: 'Electromagnetic Environment', value: 'Class E1 (Commercial & Light Industrial)' },
          ],
        },
      ];
    },
    getTestSummary: (ctx: EvaluationContext) => {
      const records = ctx.testRecords || [];
      return [
        {
          moduleName: 'Clause A.4.4 — Weighing Test (Ascending & Descending)',
          scheduleRef: 'OIML R 76-1 Table 6',
          toleranceRule: 'Errors of indication must not exceed MPE at initial verification',
          record: records.find((r) => r.testType === 'WEIGHING_PERFORMANCE'),
        },
        {
          moduleName: 'Clause A.4.10 — Repeatability Series (10 Determinations)',
          scheduleRef: 'OIML R 76-1 3.6.1',
          toleranceRule: 'E_max - E_min ≤ 1.0 e at nominal load',
          record: records.find((r) => r.testType === 'REPEATABILITY'),
        },
        {
          moduleName: 'Clause A.4.7 — Eccentric Loading Test',
          scheduleRef: 'OIML R 76-1 3.6.2',
          toleranceRule: 'Error at 1/3 Max placed at platform quadrants ≤ MPE',
          record: records.find((r) => r.testType === 'ECCENTRICITY'),
        },
        {
          moduleName: 'Clause A.4.6 & 3.6 — Tare Balancing & Net Weighing',
          scheduleRef: 'OIML R 76-1 3.6.3',
          toleranceRule: 'Tare setting accuracy |Et| ≤ ±0.25 e',
          record: records.find((r) => r.testType === 'TARE'),
        },
      ];
    },
    getSignatories: (ctx: EvaluationContext) => {
      return [
        {
          title: 'Metrology Testing Specialist',
          name: ctx.testingOfficer?.name || 'Metrology Specialist',
          designation: ctx.testingOfficer?.designation || 'Lead Metrologist',
          department: 'OIML CS Accredited Testing Laboratory',
        },
        {
          title: 'The OIML Issuing Authority Officer',
          name: ctx.reviewingOfficer?.name || 'Reviewing Officer',
          designation: ctx.reviewingOfficer?.designation || 'Authorized Signatory, OIML Issuing Authority',
          department: 'National Metrology Institute / OIML CS Authority',
        },
      ];
    },
    sealingAndStampingClause:
      'Security Sealing Requirement: Hardware sealing shall prevent unauthorized metrological adjustments. Seal points are indicated in Annex B of this report.',
    statutoryDisclaimer:
      'This Certificate of Conformity attests the conformity of the above-mentioned instrument pattern (represented by the tested specimens) with the requirements of OIML Recommendation R 76-1 (Edition 2006). This Certificate is issued under Scheme A of the OIML Certification System (OIML CS) and is eligible for mutual acceptance across OIML member states.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// RENDERING ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export class CertificateExportEngine {
  /**
   * List available templates
   */
  public static getAvailableTemplates(): Array<{
    id: CertificateTemplateId;
    name: string;
    authority: string;
    standardReference: string;
    description: string;
  }> {
    return Object.values(CERTIFICATE_TEMPLATES).map((t) => ({
      id: t.id,
      name: t.name,
      authority: t.authority,
      standardReference: t.standardReference,
      description: t.description,
    }));
  }

  /**
   * Field-mapping layer: Maps context data into template structure
   * Missing fields are cleanly handled with fallback values ('N/A')
   */
  public static mapEvaluationToTemplate(templateId: CertificateTemplateId, ctx: EvaluationContext) {
    const template = CERTIFICATE_TEMPLATES[templateId];
    if (!template) {
      throw new Error(`Unsupported certificate template: ${templateId}`);
    }

    const sections = template.getSections(ctx);
    const testSummary = template.getTestSummary(ctx);
    const signatories = template.getSignatories(ctx);

    return {
      template,
      sections,
      testSummary,
      signatories,
    };
  }

  /**
   * Render Certificate as PDF (PDFKit)
   */
  public static async generatePDF(
    templateId: CertificateTemplateId,
    ctx: EvaluationContext
  ): Promise<Buffer> {
    const template = CERTIFICATE_TEMPLATES[templateId];
    if (!template) throw new Error(`Unknown certificate template: ${templateId}`);

    const { sections, testSummary, signatories } = this.mapEvaluationToTemplate(templateId, ctx);
    const { report, instrument, evaluation, laboratory } = ctx;

    // Generate Verification QR Code data
    const verifyPayload = JSON.stringify({
      reportId: report.reportId,
      template: template.shortCode,
      passportId: instrument.passportId,
      hash: report.integrityHash || 'PENDING',
      timestamp: report.finalizedAt || report.createdAt,
    });

    let qrBuffer: Buffer | null = null;
    try {
      qrBuffer = await QRCode.toBuffer(verifyPayload, { width: 100, margin: 1 });
    } catch (e) {
      console.warn('QR code generation failed for certificate:', e);
    }

    return new Promise((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });

        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        const PAGE_WIDTH = 595.28;
        const MARGIN = 40;
        const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

        // ── TOP HEADER BANNER ──
        doc.rect(0, 0, PAGE_WIDTH, 84).fill(template.colors.primary);

        // Header Title
        if (templateId === 'INDIAN_RRSL') {
          doc.font('Helvetica-Bold').fontSize(15).fillColor('#ffffff')
            .text('GOVERNMENT OF INDIA', MARGIN, 15, { align: 'center' });
          doc.font('Helvetica').fontSize(9).fillColor('#fef08a')
            .text('MINISTRY OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION • LEGAL METROLOGY DIVISION', MARGIN, 33, { align: 'center' });
          doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff')
            .text('REGIONAL REFERENCE STANDARDS LABORATORY (RRSL)', MARGIN, 47, { align: 'center' });
          doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#e2e8f0')
            .text('MODEL APPROVAL & VERIFICATION CERTIFICATE (LEGAL METROLOGY RULES, 2011)', MARGIN, 63, { align: 'center' });
        } else {
          doc.font('Helvetica-Bold').fontSize(15).fillColor('#ffffff')
            .text('OIML CERTIFICATION SYSTEM (OIML CS)', MARGIN, 15, { align: 'center' });
          doc.font('Helvetica').fontSize(9).fillColor('#bae6fd')
            .text('INTERNATIONAL TYPE EVALUATION REPORT & CERTIFICATE OF CONFORMITY', MARGIN, 33, { align: 'center' });
          doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff')
            .text('NON-AUTOMATIC WEIGHING INSTRUMENT (OIML R 76-1:2006)', MARGIN, 47, { align: 'center' });
          doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#e2e8f0')
            .text('OIML Scheme A Mutual Recognition Framework', MARGIN, 63, { align: 'center' });
        }

        doc.fillColor('#1e293b').moveDown(3);

        // ── STATUTORY LEGAL BASIS CALLOUT ──
        const legalBoxY = 94;
        doc.rect(MARGIN, legalBoxY, CONTENT_WIDTH, 36).fillAndStroke('#f8fafc', '#cbd5e1');
        doc.font('Helvetica-Bold').fontSize(8).fillColor(template.colors.secondary)
          .text('STATUTORY BASIS & STANDARD REFERENCE:', MARGIN + 10, legalBoxY + 6);
        doc.font('Helvetica').fontSize(7.5).fillColor('#334155')
          .text(`${template.standardReference} — ${template.legalBasis}`, MARGIN + 10, legalBoxY + 18, {
            width: CONTENT_WIDTH - 20,
          });

        doc.y = legalBoxY + 44;

        // ── SECTIONS & FIELDS (2-COLUMN GRID) ──
        sections.forEach((section) => {
          // Check page break
          if (doc.y > 680) doc.addPage();

          doc.moveDown(0.4);
          doc.font('Helvetica-Bold').fontSize(10).fillColor(template.colors.primary).text(section.title);
          doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_WIDTH, doc.y).strokeColor(template.colors.accent).lineWidth(1.2).stroke();
          doc.moveDown(0.4);

          const colWidth = (CONTENT_WIDTH - 15) / 2;
          let leftY = doc.y;
          let rightY = doc.y;

          section.fields.forEach((f, idx) => {
            const isLeft = idx % 2 === 0;
            const curX = isLeft ? MARGIN : MARGIN + colWidth + 15;
            const curY = isLeft ? leftY : rightY;

            doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#475569')
              .text(`${f.label}: `, curX, curY, { continued: true, width: colWidth });
            doc.font('Helvetica').fontSize(8).fillColor('#0f172a').text(f.value);

            if (isLeft) {
              leftY = doc.y;
            } else {
              rightY = doc.y;
            }
          });

          doc.y = Math.max(leftY, rightY);
        });

        // ── TEST SUMMARY MODULE TABLE ──
        if (doc.y > 620) doc.addPage();
        doc.moveDown(0.6);
        doc.font('Helvetica-Bold').fontSize(10).fillColor(template.colors.primary).text('4. Official Metrological Test Results & Conformity Verdicts');
        doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_WIDTH, doc.y).strokeColor(template.colors.accent).lineWidth(1.2).stroke();
        doc.moveDown(0.4);

        // Table Header
        const tableY = doc.y;
        doc.rect(MARGIN, tableY, CONTENT_WIDTH, 18).fill(template.colors.primary);
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff');
        doc.text('Test Module & Metrological Clause', MARGIN + 6, tableY + 5, { width: 220 });
        doc.text('Regulatory Standard / Clause', MARGIN + 230, tableY + 5, { width: 140 });
        doc.text('Verdict', MARGIN + 380, tableY + 5, { width: 60 });
        doc.text('Compliance Note', MARGIN + 445, tableY + 5, { width: 65 });

        let rowY = tableY + 18;
        testSummary.forEach((ts, idx) => {
          const isEven = idx % 2 === 0;
          const verdict = ts.record?.status || 'PASS';
          const verdictColor = verdict === 'PASS' ? '#047857' : verdict === 'FAIL' ? '#b91c1c' : '#b45309';

          doc.rect(MARGIN, rowY, CONTENT_WIDTH, 20).fill(isEven ? '#f8fafc' : '#ffffff');
          doc.rect(MARGIN, rowY, CONTENT_WIDTH, 20).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1e293b')
            .text(ts.moduleName, MARGIN + 6, rowY + 5, { width: 220 });
          doc.font('Helvetica').fontSize(7).fillColor('#475569')
            .text(ts.scheduleRef, MARGIN + 230, rowY + 5, { width: 140 });
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor(verdictColor)
            .text(verdict, MARGIN + 380, rowY + 5, { width: 60 });
          doc.font('Helvetica').fontSize(7).fillColor('#64748b')
            .text(verdict === 'PASS' ? 'Within MPE' : 'Non-Compliant', MARGIN + 445, rowY + 5, { width: 65 });

          rowY += 20;
        });

        doc.y = rowY + 6;

        // ── SEALING & STAMPING CLAUSE ──
        if (template.sealingAndStampingClause) {
          doc.rect(MARGIN, doc.y, CONTENT_WIDTH, 24).fillAndStroke('#fefce8', '#fef08a');
          doc.font('Helvetica-Bold').fontSize(7).fillColor('#854d0e')
            .text('SEALING & STAMPING MANDATE: ', MARGIN + 8, doc.y + 4, { continued: true });
          doc.font('Helvetica').fontSize(7).fillColor('#713f12')
            .text(template.sealingAndStampingClause, { width: CONTENT_WIDTH - 16 });
          doc.y += 28;
        }

        // ── STATUTORY DISCLAIMER BOX ──
        doc.rect(MARGIN, doc.y, CONTENT_WIDTH, 30).fillAndStroke('#f1f5f9', '#cbd5e1');
        doc.font('Helvetica-Oblique').fontSize(7).fillColor('#334155')
          .text(template.statutoryDisclaimer, MARGIN + 8, doc.y + 5, { width: CONTENT_WIDTH - 16 });
        doc.y += 34;

        // ── SIGNATURES & QR CODE ──
        if (doc.y > 660) doc.addPage();
        const bottomY = Math.max(doc.y + 10, 680);

        // QR Code box
        if (qrBuffer) {
          try {
            doc.image(qrBuffer, MARGIN, bottomY, { width: 55, height: 55 });
            doc.font('Helvetica').fontSize(6).fillColor('#64748b')
              .text('Digital Passport QR\nScan to Verify Ledger', MARGIN, bottomY + 57, { width: 65, align: 'center' });
          } catch (e) {
            console.warn('QR image draw error:', e);
          }
        }

        // Signatory lines
        const sigStartX = MARGIN + 90;
        const sigWidth = (CONTENT_WIDTH - 90) / signatories.length;

        signatories.forEach((sig, idx) => {
          const sigX = sigStartX + idx * sigWidth;
          doc.moveTo(sigX + 10, bottomY + 40).lineTo(sigX + sigWidth - 20, bottomY + 40).strokeColor('#94a3b8').lineWidth(1).stroke();
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a')
            .text(sig.name, sigX + 10, bottomY + 44, { width: sigWidth - 20 });
          doc.font('Helvetica').fontSize(7).fillColor('#475569')
            .text(sig.title, sigX + 10, bottomY + 54, { width: sigWidth - 20 });
          if (sig.department) {
            doc.font('Helvetica-Oblique').fontSize(6.5).fillColor('#64748b')
              .text(sig.department, sigX + 10, bottomY + 64, { width: sigWidth - 20 });
          }
        });

        // Official Seal Circle Watermark
        const sealX = MARGIN + CONTENT_WIDTH - 45;
        doc.circle(sealX, bottomY + 25, 20).strokeColor(template.colors.primary).lineWidth(1.5).stroke();
        doc.font('Helvetica-Bold').fontSize(5.5).fillColor(template.colors.primary)
          .text(templateId === 'INDIAN_RRSL' ? 'RRSL\nOFFICIAL\nSEAL' : 'OIML\nSEAL\nVALID', sealX - 18, bottomY + 16, { width: 36, align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Render Certificate as DOCX (.docx)
   */
  public static async generateDOCX(
    templateId: CertificateTemplateId,
    ctx: EvaluationContext
  ): Promise<Buffer> {
    const template = CERTIFICATE_TEMPLATES[templateId];
    if (!template) throw new Error(`Unknown certificate template: ${templateId}`);

    const { sections, testSummary, signatories } = this.mapEvaluationToTemplate(templateId, ctx);
    const { report, instrument } = ctx;

    const docChildren: any[] = [];

    // Header Title
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 80 },
        children: [
          new TextRun({
            text: template.name.toUpperCase(),
            bold: true,
            size: 26,
            color: template.colors.primary.replace('#', ''),
          }),
        ],
      })
    );

    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 140 },
        children: [
          new TextRun({
            text: `${template.authority} • ${template.standardReference}`,
            italics: true,
            size: 18,
            color: '555555',
          }),
        ],
      })
    );

    // Statutory Basis
    docChildren.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({ text: 'STATUTORY BASIS: ', bold: true, size: 18 }),
          new TextRun({ text: template.legalBasis, size: 18 }),
        ],
      })
    );

    // Sections
    sections.forEach((section) => {
      docChildren.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 160, after: 80 },
          children: [
            new TextRun({
              text: section.title,
              bold: true,
              size: 22,
              color: template.colors.primary.replace('#', ''),
            }),
          ],
        })
      );

      const rows: TableRow[] = section.fields.map(
        (f) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 4000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: f.label, bold: true, size: 18 })] })],
              }),
              new TableCell({
                width: { size: 5500, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: f.value, size: 18 })] })],
              }),
            ],
          })
      );

      docChildren.push(
        new Table({
          width: { size: 9500, type: WidthType.DXA },
          rows,
        })
      );
    });

    // Test Results Summary Table
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 80 },
        children: [
          new TextRun({
            text: '4. Metrological Performance & Conformity Evaluation',
            bold: true,
            size: 22,
            color: template.colors.primary.replace('#', ''),
          }),
        ],
      })
    );

    const testRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 4000, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun({ text: 'Test Module', bold: true, size: 18 })] })],
          }),
          new TableCell({
            width: { size: 3000, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun({ text: 'Standard Clause', bold: true, size: 18 })] })],
          }),
          new TableCell({
            width: { size: 2500, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun({ text: 'Result / Verdict', bold: true, size: 18 })] })],
          }),
        ],
      }),
    ];

    testSummary.forEach((ts) => {
      const verdict = ts.record?.status || 'PASS';
      testRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: ts.moduleName, size: 18 })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: ts.scheduleRef, size: 18 })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: verdict, bold: true, size: 18 })] })],
            }),
          ],
        })
      );
    });

    docChildren.push(
      new Table({
        width: { size: 9500, type: WidthType.DXA },
        rows: testRows,
      })
    );

    // Disclaimer
    docChildren.push(
      new Paragraph({
        spacing: { before: 200, after: 200 },
        children: [
          new TextRun({ text: 'Statutory Certification Note: ', bold: true, size: 18 }),
          new TextRun({ text: template.statutoryDisclaimer, italics: true, size: 18 }),
        ],
      })
    );

    // Signatories
    docChildren.push(new Paragraph({ spacing: { before: 300 }, children: [] }));
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '____________________________________              ____________________________________',
            size: 18,
          }),
        ],
      })
    );
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${signatories[0]?.name || 'Testing Officer'}                                      ${signatories[1]?.name || 'Reviewing Officer'}`,
            bold: true,
            size: 18,
          }),
        ],
      })
    );

    const docxDoc = new Document({
      sections: [
        {
          properties: {},
          children: docChildren,
        },
      ],
    });

    return await Packer.toBuffer(docxDoc);
  }
}
