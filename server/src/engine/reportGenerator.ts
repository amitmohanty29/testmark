import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

interface ReportInput {
  report: any;
  evaluation: any;
  instrument: any;
  laboratory: any;
  testRecords: any[];
  testingOfficer: any;
  reviewingOfficer: any;
  ruleConfig: any;
}

const safeParse = (str: string | null | undefined, def: any = null) => {
  if (!str) return def;
  try { return JSON.parse(str); } catch { return def; }
};

const MARGIN = 57; // 20mm
const PAGE_W = 595.28;
const CONTENT_W = PAGE_W - MARGIN * 2;
const LINE_COLOR = '#333333';
const HEADING_COLOR = '#000000';

export class ReportGenerator {

  static async generatePDF(input: ReportInput): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const { report, evaluation, instrument, laboratory, testRecords, testingOfficer, reviewingOfficer, ruleConfig } = input;
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({
          size: 'A4',
          margin: MARGIN,
          bufferPages: true,
          info: {
            Title: `Test Report No. ${report.reportId}`,
            Author: laboratory?.name || 'Regional Reference Standards Laboratory',
            Subject: 'Type Evaluation of NAWI as per OIML R 76',
            Creator: 'Department of Consumer Affairs, Government of India',
            Producer: 'Government of India, Legal Metrology Division',
          },
        });
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        let sectionNo = 0;
        const sectionHeading = (title: string) => {
          sectionNo++;
          doc.moveDown(0.6);
          doc.font('Times-Bold').fontSize(12).fillColor(HEADING_COLOR)
            .text(`${sectionNo}. ${title}`);
          doc.moveTo(MARGIN, doc.y + 2).lineTo(PAGE_W - MARGIN, doc.y + 2)
            .strokeColor(LINE_COLOR).lineWidth(0.5).stroke();
          doc.moveDown(0.4);
        };

        const fieldRow = (label: string, value: string) => {
          doc.font('Times-Bold').fontSize(9).fillColor('#000').text(`${label}: `, { continued: true })
            .font('Times-Roman').text(String(value || 'N/A'));
        };

        const drawTableRow = (cols: string[], colXs: number[], colWs: number[], y: number, bold = false, bg?: string) => {
          if (bg) {
            doc.rect(colXs[0] - 2, y - 1, colWs.reduce((a,b)=>a+b, 0) + 4, 14).fill(bg);
          }
          const fontName = bold ? 'Times-Bold' : 'Times-Roman';
          cols.forEach((c, i) => {
            doc.font(fontName).fontSize(7.5).fillColor('#000')
              .text(c, colXs[i], y, { width: colWs[i], lineBreak: false });
          });
          // Thin horizontal line below
          doc.moveTo(colXs[0] - 2, y + 13).lineTo(colXs[0] + colWs.reduce((a,b)=>a+b, 0) + 2, y + 13)
            .strokeColor('#999').lineWidth(0.3).stroke();
        };

        // ── Page 1: Title Block ──
        doc.font('Times-Bold').fontSize(10).fillColor('#000')
          .text('GOVERNMENT OF INDIA', MARGIN, MARGIN, { align: 'center', width: CONTENT_W });
        doc.font('Times-Roman').fontSize(9)
          .text('Ministry of Consumer Affairs, Food & Public Distribution', { align: 'center', width: CONTENT_W })
          .text('Department of Consumer Affairs, Legal Metrology Division', { align: 'center', width: CONTENT_W });
        doc.moveDown(0.3);
        doc.moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y)
          .strokeColor('#000').lineWidth(1).stroke();
        doc.moveDown(0.4);

        doc.font('Times-Bold').fontSize(14).fillColor('#000')
          .text('OIML R 76 TEST REPORT', { align: 'center', width: CONTENT_W });
        doc.font('Times-Roman').fontSize(9)
          .text('Non-Automatic Weighing Instruments', { align: 'center', width: CONTENT_W });
        doc.moveDown(0.3);

        doc.font('Times-Bold').fontSize(10)
          .text(`Report No.: ${report.reportId}`, { align: 'center', width: CONTENT_W });
        doc.font('Times-Roman').fontSize(9)
          .text(`Version: ${report.version}  |  Date: ${new Date(report.createdAt).toLocaleDateString('en-IN')}  |  Status: ${report.status}`, { align: 'center', width: CONTENT_W });
        doc.moveDown(0.2);
        doc.moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y)
          .strokeColor('#000').lineWidth(0.5).stroke();

        // ── 1. Report Information ──
        sectionHeading('Report Information');
        doc.font('Times-Roman').fontSize(9).fillColor('#000');
        fieldRow('Report ID', report.reportId);
        fieldRow('Status', report.status);
        fieldRow('Version', `${report.version}`);
        fieldRow('Date of Issue', new Date(report.createdAt).toLocaleDateString('en-IN'));
        fieldRow('Applicable Standard', ruleConfig?.version || evaluation.standardReference || 'OIML R 76-1:2006');
        fieldRow('SHA-256 Integrity Hash', report.integrityHash || 'Pending finalization');

        // ── 2. Evaluation Details ──
        sectionHeading('Evaluation Details');
        fieldRow('Evaluation No.', evaluation.evaluationNumber);
        fieldRow('Current State', evaluation.state);
        fieldRow('Date of Evaluation', new Date(evaluation.evaluationDate).toLocaleDateString('en-IN'));
        fieldRow('Standard Reference', evaluation.standardReference);
        fieldRow('Pattern Approval No.', evaluation.patternApprovalNo || 'N/A');
        fieldRow('Testing Officer', testingOfficer?.name || 'N/A');
        fieldRow('Reviewing Officer', reviewingOfficer?.name || 'N/A');

        // ── 3. Testing Laboratory ──
        sectionHeading('Testing Laboratory');
        fieldRow('Laboratory Name', laboratory.name);
        fieldRow('Laboratory Code', laboratory.code);
        fieldRow('Accreditation No.', laboratory.accreditationNumber);
        fieldRow('Address', laboratory.address);

        // ── 4. Instrument Under Test ──
        sectionHeading('Instrument Under Test');
        fieldRow('Passport ID', instrument.passportId);
        fieldRow('Manufacturer', instrument.manufacturer);
        fieldRow('Model Designation', instrument.model);
        fieldRow('Serial No.', instrument.serialNumber);
        fieldRow('Instrument Type', instrument.instrumentType);
        fieldRow('Accuracy Class', instrument.accuracyClass);
        fieldRow('Maximum Capacity (Max)', `${instrument.maxCapacity} ${instrument.verificationUnits}`);
        fieldRow('Minimum Capacity (Min)', `${instrument.minCapacity} ${instrument.verificationUnits}`);
        fieldRow('Verification Scale Interval (e)', `${instrument.scaleIntervalE} ${instrument.verificationUnits}`);

        // ── Test Results (each on own page) ──
        testRecords.forEach((record: any, recIdx: number) => {
          doc.addPage();
          const testSecNo = sectionNo + 1 + recIdx;

          doc.font('Times-Bold').fontSize(12).fillColor(HEADING_COLOR)
            .text(`${testSecNo}. Test Results: ${record.testType.replace(/_/g, ' ')}`);
          doc.moveTo(MARGIN, doc.y + 2).lineTo(PAGE_W - MARGIN, doc.y + 2)
            .strokeColor(LINE_COLOR).lineWidth(0.5).stroke();
          doc.moveDown(0.5);

          const compliance = safeParse(record.complianceDetails);
          const observations = safeParse(record.observations, []);
          const calcResults = safeParse(record.calculationResults);
          const envData = safeParse(record.environmentalData, {});

          const verdict = compliance?.verdict || record.status;
          doc.font('Times-Bold').fontSize(10).fillColor('#000')
            .text(`${testSecNo}.1 Conformity Verdict: ${verdict}`);
          doc.moveDown(0.3);

          // Environmental conditions sub-section
          if (Object.keys(envData).length > 0) {
            doc.font('Times-Bold').fontSize(10).fillColor('#000')
              .text(`${testSecNo}.2 Environmental Conditions During Test`);
            doc.moveDown(0.2);
            doc.font('Times-Roman').fontSize(9).fillColor('#000');
            if (envData.temperature) doc.text(`Ambient Temperature: ${envData.temperature} °C`);
            if (envData.humidity) doc.text(`Relative Humidity: ${envData.humidity} %RH`);
            if (envData.pressure) doc.text(`Barometric Pressure: ${envData.pressure} hPa`);
            doc.moveDown(0.4);
          }

          // Observations table
          if (observations.length > 0) {
            const subSec = Object.keys(envData).length > 0 ? 3 : 2;
            doc.font('Times-Bold').fontSize(10).fillColor('#000')
              .text(`${testSecNo}.${subSec} Test Observations`);
            doc.moveDown(0.3);

            if (record.testType === 'WEIGHING_PERFORMANCE') {
              const colXs = [MARGIN, MARGIN + 80, MARGIN + 160, MARGIN + 240, MARGIN + 320, MARGIN + 390];
              const colWs = [78, 78, 78, 78, 68, 90];
              drawTableRow(
                ['Load Point', 'Applied (m)', 'Indication (I)', 'Error (E)', 'MPE', 'Verdict'],
                colXs, colWs, doc.y, true, '#eeeeee'
              );
              doc.y += 16;
              doc.font('Times-Roman').fontSize(7.5);
              observations.forEach((obs: any) => {
                if (doc.y > 750) { doc.addPage(); }
                drawTableRow(
                  [
                    String(obs.loadLabel || obs.appliedLoad || ''),
                    String(obs.appliedLoad || ''),
                    String(obs.indication || ''),
                    String(obs.error || ''),
                    String(obs.mpe || ''),
                    String(obs.verdict || ''),
                  ],
                  colXs, colWs, doc.y
                );
                doc.y += 16;
              });
            }
            doc.moveDown(0.4);
          }

          // Calculation results
          if (calcResults) {
            doc.font('Times-Bold').fontSize(10).fillColor('#000')
              .text('Calculation Summary');
            doc.moveDown(0.2);
            doc.font('Times-Roman').fontSize(9).fillColor('#000');
            if (calcResults.maxError !== undefined) doc.text(`Maximum Observed Error: ${calcResults.maxError}`);
            if (calcResults.maxMPE !== undefined) doc.text(`MPE at Maximum Error Load: ${calcResults.maxMPE}`);
            if (calcResults.stdDev !== undefined) doc.text(`Standard Deviation: ${calcResults.stdDev}`);
            if (calcResults.range !== undefined) doc.text(`Range (Max - Min): ${calcResults.range}`);
          }

          // Compliance breakdown
          if (compliance?.whyBreakdown) {
            doc.moveDown(0.4);
            doc.font('Times-Bold').fontSize(10).fillColor('#000')
              .text('Compliance Assessment Detail');
            doc.moveDown(0.2);
            doc.font('Times-Roman').fontSize(9).fillColor('#000');
            const wb = compliance.whyBreakdown;
            if (Array.isArray(wb)) {
              wb.forEach((item: any) => {
                doc.text(`- ${item.description || item.message || JSON.stringify(item)}`);
              });
            } else if (typeof wb === 'string') {
              doc.text(wb);
            }
          }
        });
        sectionNo += testRecords.length;

        // ── Conclusion & Conformity Statement ──
        doc.addPage();
        sectionHeading('Conclusion and Conformity Statement');

        const overallPass = testRecords.every((r: any) => {
          const c = safeParse(r.complianceDetails);
          return (c?.verdict || r.status) === 'PASS';
        });
        doc.font('Times-Roman').fontSize(9.5).fillColor('#000');
        if (overallPass) {
          doc.text('On the basis of the tests conducted in accordance with OIML R 76-1:2006 and the Legal Metrology (General) Rules, 2011, the instrument described in this report is found to CONFORM to the applicable requirements for its declared accuracy class.');
        } else {
          doc.text('On the basis of the tests conducted in accordance with OIML R 76-1:2006 and the Legal Metrology (General) Rules, 2011, the instrument described in this report DOES NOT CONFORM to one or more applicable requirements. Refer to individual test sections above for details.');
        }
        doc.moveDown(0.6);

        if (evaluation.generalRemarks) {
          doc.font('Times-Bold').fontSize(9.5).text('Testing Officer Remarks:');
          doc.font('Times-Roman').fontSize(9).text(evaluation.generalRemarks);
          doc.moveDown(0.4);
        }
        if (evaluation.reviewRemarks) {
          doc.font('Times-Bold').fontSize(9.5).text('Reviewing Officer Remarks:');
          doc.font('Times-Roman').fontSize(9).text(evaluation.reviewRemarks);
          doc.moveDown(0.4);
        }

        // ── Signatures & Official Seal ──
        doc.moveDown(1.5);
        const sigY = doc.y + 15;
        doc.font('Times-Roman').fontSize(8.5).fillColor('#000');

        // Testing Officer block
        doc.text('___________________________________', MARGIN, sigY);
        doc.font('Times-Bold').text(testingOfficer?.name || 'Testing Officer', MARGIN, sigY + 12);
        doc.font('Times-Roman').text(testingOfficer?.designation || 'Legal Metrology Officer', MARGIN, sigY + 22);
        doc.text(`Date: ${new Date(evaluation.evaluationDate || report.createdAt).toLocaleDateString('en-IN')}`, MARGIN, sigY + 32);

        // Reviewing Officer block
        doc.text('___________________________________', 230, sigY);
        doc.font('Times-Bold').text(reviewingOfficer?.name || 'Reviewing Officer', 230, sigY + 12);
        doc.font('Times-Roman').text(reviewingOfficer?.designation || 'Senior Legal Metrology Officer', 230, sigY + 22);
        doc.text(`Date: ${new Date(report.createdAt).toLocaleDateString('en-IN')}`, 230, sigY + 32);

        // Official Seal box
        const sealX = 425;
        const sealY = sigY - 8;
        doc.rect(sealX, sealY, 95, 60).strokeColor('#333').lineWidth(0.5).stroke();
        doc.font('Times-Roman').fontSize(8).fillColor('#666')
          .text('Official Seal', sealX, sealY + 24, { width: 95, align: 'center' });

        // ── Verification Corner ──
        const verifyY = sigY + 68;
        const verifyUrl = `${process.env.APP_URL || 'http://localhost:5173'}/verify?reportId=${report.reportId}`;
        let qrBuffer: Buffer | null = null;
        try {
          qrBuffer = await QRCode.toBuffer(verifyUrl, { width: 80, margin: 0 });
        } catch (e) {
          console.error('QR code generation failed:', e);
        }

        if (qrBuffer) {
          doc.image(qrBuffer, MARGIN, verifyY, { width: 44, height: 44 });
        }

        const textLeft = MARGIN + 52;
        doc.font('Times-Bold').fontSize(8).fillColor('#000')
          .text(`Report ID: ${report.reportId}`, textLeft, verifyY);
        doc.font('Times-Roman').fontSize(7.5).fillColor('#000')
          .text(`Verify report at: ${verifyUrl}`, textLeft, verifyY + 11);
        doc.font('Courier').fontSize(6.5).fillColor('#333')
          .text(`SHA-256: ${report.integrityHash || 'Pending finalization'}`, textLeft, verifyY + 23, { width: CONTENT_W - 60 });

        // ── Running Header & Footer on all pages ──
        const pages = doc.bufferedPageRange();
        for (let i = pages.start; i < pages.start + pages.count; i++) {
          doc.switchToPage(i);
          // Running header on every page
          doc.font('Times-Roman').fontSize(7.5).fillColor('#333')
            .text(`Report No.: ${report.reportId}`, MARGIN, 25, { width: 250, align: 'left' })
            .text(`Page ${i + 1} of ${pages.count}`, PAGE_W - MARGIN - 150, 25, { width: 150, align: 'right' });
          doc.moveTo(MARGIN, 36).lineTo(PAGE_W - MARGIN, 36).strokeColor('#888').lineWidth(0.3).stroke();

          // Running footer on every page
          doc.font('Times-Roman').fontSize(7).fillColor('#444')
            .text(
              `Document Control: LM-OIML-R76-TR | Legal Metrology Division, Department of Consumer Affairs, Government of India`,
              MARGIN, 810, { align: 'center', width: CONTENT_W }
            );
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  static async generateDOCX(input: ReportInput): Promise<Buffer> {
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, BorderStyle, WidthType } = await import('docx');

    const { report, evaluation, instrument, laboratory, testRecords, testingOfficer, reviewingOfficer, ruleConfig } = input;

    let secNo = 0;
    const numberedHeading = (text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2) => {
      secNo++;
      return new Paragraph({ heading: level, spacing: { before: 240, after: 120 }, children: [new TextRun({ text: `${secNo}. ${text}`, bold: true, size: 24, font: 'Times New Roman' })] });
    };

    const field = (label: string, value: string) =>
      new Paragraph({ spacing: { after: 40 }, children: [
        new TextRun({ text: `${label}: `, bold: true, size: 20, font: 'Times New Roman' }),
        new TextRun({ text: value, size: 20, font: 'Times New Roman' }),
      ]});

    const sections: any[] = [];
    const children: any[] = [];

    // Title block
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: 'GOVERNMENT OF INDIA', bold: true, size: 22, font: 'Times New Roman' })],
    }));
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: 'Ministry of Consumer Affairs, Food & Public Distribution', size: 18, font: 'Times New Roman' })],
    }));
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: 'Department of Consumer Affairs, Legal Metrology Division', size: 18, font: 'Times New Roman' })],
    }));
    children.push(new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'OIML R 76 TEST REPORT', bold: true, size: 32, font: 'Times New Roman' })],
    }));
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: 'Non-Automatic Weighing Instruments', size: 20, font: 'Times New Roman' })],
    }));
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: `Report No.: ${report.reportId}  |  Version: ${report.version}  |  Date: ${new Date(report.createdAt).toLocaleDateString('en-IN')}`, size: 18, font: 'Times New Roman' })],
    }));

    // 1. Report Information
    children.push(numberedHeading('Report Information'));
    children.push(field('Report ID', report.reportId));
    children.push(field('Status', report.status));
    children.push(field('Version', `${report.version}`));
    children.push(field('Date of Issue', new Date(report.createdAt).toLocaleDateString('en-IN')));
    children.push(field('Applicable Standard', ruleConfig?.version || evaluation.standardReference || 'OIML R 76-1:2006'));
    children.push(field('SHA-256 Integrity Hash', report.integrityHash || 'Pending finalization'));

    // 2. Evaluation Details
    children.push(numberedHeading('Evaluation Details'));
    children.push(field('Evaluation No.', evaluation.evaluationNumber));
    children.push(field('Current State', evaluation.state));
    children.push(field('Date of Evaluation', new Date(evaluation.evaluationDate).toLocaleDateString('en-IN')));
    children.push(field('Standard Reference', evaluation.standardReference));
    children.push(field('Testing Officer', testingOfficer?.name || 'N/A'));
    children.push(field('Reviewing Officer', reviewingOfficer?.name || 'N/A'));

    // 3. Testing Laboratory
    children.push(numberedHeading('Testing Laboratory'));
    children.push(field('Laboratory Name', laboratory.name));
    children.push(field('Laboratory Code', laboratory.code));
    children.push(field('Accreditation No.', laboratory.accreditationNumber));
    children.push(field('Address', laboratory.address));

    // 4. Instrument Under Test
    children.push(numberedHeading('Instrument Under Test'));
    children.push(field('Passport ID', instrument.passportId));
    children.push(field('Manufacturer', instrument.manufacturer));
    children.push(field('Model Designation', instrument.model));
    children.push(field('Serial No.', instrument.serialNumber));
    children.push(field('Accuracy Class', instrument.accuracyClass));
    children.push(field('Maximum Capacity (Max)', `${instrument.maxCapacity} ${instrument.verificationUnits}`));
    children.push(field('Verification Scale Interval (e)', `${instrument.scaleIntervalE} ${instrument.verificationUnits}`));

    // Test Records
    testRecords.forEach((record: any, idx: number) => {
      const compliance = safeParse(record.complianceDetails);
      const verdict = compliance?.verdict || record.status;
      const testSecNo = secNo + 1 + idx;

      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 }, children: [
        new TextRun({ text: `${testSecNo}. Test Results: ${record.testType.replace(/_/g, ' ')}`, bold: true, size: 24, font: 'Times New Roman' }),
      ]}));
      children.push(field('Conformity Verdict', verdict));
      children.push(field('Tested By', record.testedByName || 'N/A'));

      if (compliance?.whyBreakdown) {
        children.push(new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: 'Compliance Assessment Detail:', bold: true, size: 20, font: 'Times New Roman' })] }));
        const wb = Array.isArray(compliance.whyBreakdown) ? compliance.whyBreakdown : [compliance.whyBreakdown];
        wb.forEach((item: any) => {
          children.push(new Paragraph({ spacing: { after: 20 }, children: [
            new TextRun({ text: `  - ${item.description || item.message || JSON.stringify(item)}`, size: 18, font: 'Times New Roman' }),
          ]}));
        });
      }
    });
    secNo += testRecords.length;

    // Conclusion
    children.push(numberedHeading('Conclusion and Conformity Statement'));
    const overallPass = testRecords.every((r: any) => {
      const c = safeParse(r.complianceDetails);
      return (c?.verdict || r.status) === 'PASS';
    });
    if (overallPass) {
      children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'On the basis of the tests conducted in accordance with OIML R 76-1:2006 and the Legal Metrology (General) Rules, 2011, the instrument described in this report is found to CONFORM to the applicable requirements for its declared accuracy class.', size: 20, font: 'Times New Roman' })] }));
    } else {
      children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'On the basis of the tests conducted in accordance with OIML R 76-1:2006 and the Legal Metrology (General) Rules, 2011, the instrument described in this report DOES NOT CONFORM to one or more applicable requirements. Refer to individual test sections for details.', size: 20, font: 'Times New Roman' })] }));
    }

    if (evaluation.generalRemarks) {
      children.push(field('Testing Officer Remarks', evaluation.generalRemarks));
    }
    if (evaluation.reviewRemarks) {
      children.push(field('Reviewing Officer Remarks', evaluation.reviewRemarks));
    }

    // Signatures and Official Seal
    const dateStr = new Date(evaluation.evaluationDate || report.createdAt).toLocaleDateString('en-IN');
    const reviewDateStr = new Date(report.createdAt).toLocaleDateString('en-IN');
    children.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
    children.push(new Paragraph({ children: [
      new TextRun({ text: '___________________________          ___________________________          [  OFFICIAL SEAL  ]', size: 18, font: 'Times New Roman' }),
    ]}));
    children.push(new Paragraph({ children: [
      new TextRun({ text: `${testingOfficer?.name || 'Testing Officer'}                    ${reviewingOfficer?.name || 'Reviewing Officer'}`, size: 18, bold: true, font: 'Times New Roman' }),
    ]}));
    children.push(new Paragraph({ children: [
      new TextRun({ text: `${testingOfficer?.designation || 'Legal Metrology Officer'}        ${reviewingOfficer?.designation || 'Senior Legal Metrology Officer'}`, size: 16, font: 'Times New Roman', color: '444444' }),
    ]}));
    children.push(new Paragraph({ spacing: { after: 300 }, children: [
      new TextRun({ text: `Date: ${dateStr}                           Date: ${reviewDateStr}`, size: 16, font: 'Times New Roman', color: '444444' }),
    ]}));

    // Document Integrity Block
    const docxVerifyUrl = `${process.env.APP_URL || 'http://localhost:5173'}/verify?reportId=${report.reportId}`;
    children.push(numberedHeading('Document Integrity Verification'));
    children.push(field('Report ID', report.reportId));
    children.push(field('Verification URL', docxVerifyUrl));
    children.push(field('SHA-256 Hash', report.integrityHash || 'Pending finalization'));

    sections.push({ properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } }, children });

    const docxDoc = new Document({ sections });
    return await Packer.toBuffer(docxDoc);
  }

  static async generateSimulationReportPDF(input: {
    simulation: any;
    results: any[];
    summary: any;
    filters?: any;
  }): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        const { simulation, results, summary, filters } = input;

        // ── TOP WARNING BANNER: SIMULATION ONLY ──
        doc.rect(0, 0, 595.28, 65).fill('#7f1d1d'); // deep red
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#ffffff')
          .text('SIMULATION ONLY: NOT A LEGAL RECORD', 40, 16, { align: 'center' });
        doc.fontSize(8).font('Helvetica')
          .text('Official Metrological Impact Assessment Sandbox | Non-Binding Regulatory Forecast', 40, 34, { align: 'center' })
          .text('Does not alter or invalidate any legal certificates issued under Legal Metrology Act, 2009', 40, 46, { align: 'center' });

        doc.fillColor('#1f2937').moveDown(2.5);

        // ── Title & Meta ──
        doc.font('Helvetica-Bold').fontSize(16).fillColor('#111827').text(simulation.name || 'OIML Rule Impact Simulation');
        doc.fontSize(9).font('Helvetica').fillColor('#4b5563')
          .text(simulation.description || 'Impact assessment of candidate tolerance tightening across historical evaluation records.');
        doc.moveDown(0.5);

        doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#d1d5db').lineWidth(1).stroke();
        doc.moveDown(0.6);

        // Meta details grid
        const metaY = doc.y;
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#374151');
        doc.text('Execution Timestamp: ', 40, metaY, { continued: true }).font('Helvetica').text(new Date(simulation.createdAt || Date.now()).toLocaleString('en-IN'));
        doc.font('Helvetica-Bold').text('Conducted By: ', 40, doc.y, { continued: true }).font('Helvetica').text(simulation.runByName || 'Regulatory Administrator');
        doc.font('Helvetica-Bold').text('Candidate Draft Rule: ', 40, doc.y, { continued: true }).font('Helvetica').text(simulation.simulatedRuleConfig?.version || simulation.simulatedRuleConfigId || 'Simulated Draft');

        const filterY = metaY;
        doc.font('Helvetica-Bold').text('Filter (Date Range): ', 320, filterY, { continued: true }).font('Helvetica').text(`${filters?.startDate || 'Earliest'} to ${filters?.endDate || 'Latest'}`);
        doc.font('Helvetica-Bold').text('Filter (Instrument): ', 320, doc.y, { continued: true }).font('Helvetica').text(filters?.instrumentType || 'All Instrument Categories');
        doc.font('Helvetica-Bold').text('Filter (Accuracy): ', 320, doc.y, { continued: true }).font('Helvetica').text(filters?.accuracyClass || 'All Accuracy Classes');

        doc.moveDown(1.2);

        // ── Summary Metrics KPI Cards ──
        const kpiY = doc.y;
        const boxWidth = 118;
        const boxHeight = 48;
        const boxes = [
          { label: 'EVALUATIONS', value: String(summary.totalEvaluations || results.length), color: '#f3f4f6', border: '#d1d5db', textColor: '#111827' },
          { label: 'VERDICTS SHIFTED', value: String(summary.flippedCount || 0), color: '#fee2e2', border: '#fca5a5', textColor: '#991b1b' },
          { label: 'PASS → FAIL', value: String(summary.passToFailCount || 0), color: '#fef2f2', border: '#f87171', textColor: '#b91c1c' },
          { label: 'PASS → REVIEW', value: String(summary.passToReviewCount || 0), color: '#fffbeb', border: '#fde68a', textColor: '#b45309' },
        ];

        boxes.forEach((b, idx) => {
          const x = 40 + idx * (boxWidth + 14);
          doc.rect(x, kpiY, boxWidth, boxHeight).fillAndStroke(b.color, b.border);
          doc.font('Helvetica-Bold').fontSize(14).fillColor(b.textColor).text(b.value, x, kpiY + 8, { width: boxWidth, align: 'center' });
          doc.font('Helvetica-Bold').fontSize(7).fillColor('#6b7280').text(b.label, x, kpiY + 28, { width: boxWidth, align: 'center' });
        });

        doc.y = kpiY + boxHeight + 15;

        // ── Comparison Table ──
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text('Evaluations Comparison & Impact Breakdown');
        doc.font('Helvetica').fontSize(8).fillColor('#6b7280').text('Each affected historical record with specific observations and calculations that would deviate under the draft standard.');
        doc.moveDown(0.5);

        // Table header
        const thY = doc.y;
        doc.rect(40, thY, 515, 20).fill('#e5e7eb');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1f2937');
        doc.text('EVALUATION', 46, thY + 6);
        doc.text('INSTRUMENT & CLASS', 140, thY + 6);
        doc.text('ORIGINAL', 290, thY + 6);
        doc.text('SIMULATED', 360, thY + 6);
        doc.text('OUTCOME DELTA', 440, thY + 6);

        doc.y = thY + 24;

        results.slice(0, 35).forEach((r: any) => {
          if (doc.y > 720) {
            doc.addPage();
            // Re-print top banner on subsequent pages
            doc.rect(0, 0, 595.28, 30).fill('#7f1d1d');
            doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff')
              .text('SIMULATION ONLY: NOT A LEGAL RECORD', 40, 10, { align: 'center' });
            doc.y = 45;
          }

          const rowY = doc.y;
          const isFlipped = r.flipped || r.verdictFlipped || r.originalOverallVerdict !== r.simulatedOverallVerdict;
          const bgColor = isFlipped ? '#fef2f2' : '#ffffff';

          doc.rect(40, rowY, 515, 26).fillAndStroke(bgColor, '#e5e7eb');
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#006c51')
            .text(r.evaluationNumber, 46, rowY + 5);
          doc.font('Helvetica').fontSize(6.5).fillColor('#6b7280')
            .text(r.instrumentPassportId || '', 46, rowY + 14);

          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1f2937')
            .text(`${r.instrumentManufacturer || ''} ${r.instrumentModel || ''}`.trim() || 'NAWI', 140, rowY + 5, { width: 140, ellipsis: true });
          doc.font('Helvetica').fontSize(6.5).fillColor('#6b7280')
            .text(r.accuracyClass || 'Class III', 140, rowY + 14);

          doc.font('Helvetica-Bold').fontSize(7.5).fillColor(r.originalOverallVerdict === 'PASS' ? '#065f46' : '#991b1b')
            .text(r.originalOverallVerdict || 'PASS', 290, rowY + 8);

          doc.font('Helvetica-Bold').fontSize(7.5).fillColor(r.simulatedOverallVerdict === 'PASS' ? '#065f46' : r.simulatedOverallVerdict === 'REVIEW' ? '#b45309' : '#991b1b')
            .text(r.simulatedOverallVerdict || 'PASS', 360, rowY + 8);

          doc.font('Helvetica-Bold').fontSize(7.5).fillColor(isFlipped ? '#b91c1c' : '#059669')
            .text(isFlipped ? `SHIFT: ${r.originalOverallVerdict} -> ${r.simulatedOverallVerdict}` : 'UNCHANGED (COMPLIANT)', 440, rowY + 8);

          doc.y = rowY + 28;

          // If there are changed observations or notes, print them
          const deltas = r.changedObservations || r.impactDeltas || [];
          if (deltas.length > 0) {
            deltas.slice(0, 2).forEach((d: any) => {
              doc.font('Helvetica-Oblique').fontSize(6.5).fillColor('#7f1d1d')
                .text(`   ↳ ${d.explanation || d.label || d}`, 55, doc.y);
              doc.moveDown(0.2);
            });
          }
        });

        // ── Footer on all pages ──
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(7).font('Helvetica-Bold').fillColor('#991b1b')
            .text(
              'SIMULATION ONLY: NOT A LEGAL RECORD | Ministry of Consumer Affairs, Food & Public Distribution | Directorate of Legal Metrology',
              40,
              800,
              { align: 'center', width: 515 }
            );
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
