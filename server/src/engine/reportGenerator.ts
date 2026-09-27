import PDFDocument from 'pdfkit';

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

const GREEN = '#006c51';
const DARK = '#1a365d';
const GOLD = '#c9a227';

export class ReportGenerator {

  static async generatePDF(input: ReportInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        const { report, evaluation, instrument, laboratory, testRecords, testingOfficer, reviewingOfficer, ruleConfig } = input;

        // ── Header ──
        doc.rect(0, 0, 595.28, 80).fill(GREEN);
        doc.font('Helvetica-Bold').fontSize(18).fillColor('white')
          .text('MarkSure — OIML R-76 Test Report', 50, 22, { align: 'center' });
        doc.fontSize(9).font('Helvetica')
          .text('Government of India | Department of Consumer Affairs | Legal Metrology Division', 50, 48, { align: 'center' });

        doc.fillColor('#333').moveDown(2);
        const y1 = doc.y;

        // ── Report Meta ──
        doc.font('Helvetica-Bold').fontSize(12).fillColor(DARK).text('Report Information');
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(GOLD).lineWidth(1.5).stroke();
        doc.moveDown(0.4);
        doc.font('Helvetica').fontSize(9).fillColor('#333');
        const meta = [
          ['Report ID', report.reportId],
          ['Status', report.status],
          ['Version', `v${report.version}`],
          ['Generated On', new Date(report.createdAt).toLocaleString('en-IN')],
          ['Rule Version', ruleConfig?.version || evaluation.standardReference || 'OIML R 76-1:2006 v1.0'],
          ['Integrity Hash', report.integrityHash || 'Not yet finalized'],
        ];
        meta.forEach(([k, v]) => {
          doc.font('Helvetica-Bold').text(`${k}: `, { continued: true }).font('Helvetica').text(String(v));
        });
        doc.moveDown(0.8);

        // ── Evaluation Details ──
        doc.font('Helvetica-Bold').fontSize(12).fillColor(DARK).text('Evaluation Session');
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(GOLD).lineWidth(1.5).stroke();
        doc.moveDown(0.4);
        doc.font('Helvetica').fontSize(9).fillColor('#333');
        const evalMeta = [
          ['Evaluation Number', evaluation.evaluationNumber],
          ['State', evaluation.state],
          ['Date', new Date(evaluation.evaluationDate).toLocaleDateString('en-IN')],
          ['Standard Reference', evaluation.standardReference],
          ['Pattern Approval No.', evaluation.patternApprovalNo || 'N/A'],
          ['Testing Officer', testingOfficer?.name || 'N/A'],
          ['Reviewing Officer', reviewingOfficer?.name || 'N/A'],
        ];
        evalMeta.forEach(([k, v]) => {
          doc.font('Helvetica-Bold').text(`${k}: `, { continued: true }).font('Helvetica').text(String(v));
        });
        doc.moveDown(0.8);

        // ── Laboratory ──
        doc.font('Helvetica-Bold').fontSize(12).fillColor(DARK).text('Accredited Testing Laboratory');
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(GOLD).lineWidth(1.5).stroke();
        doc.moveDown(0.4);
        doc.font('Helvetica').fontSize(9).fillColor('#333');
        [
          ['Laboratory', laboratory.name],
          ['Code', laboratory.code],
          ['Address', laboratory.address],
          ['Accreditation', laboratory.accreditationNumber],
        ].forEach(([k, v]) => {
          doc.font('Helvetica-Bold').text(`${k}: `, { continued: true }).font('Helvetica').text(String(v));
        });
        doc.moveDown(0.8);

        // ── Instrument ──
        doc.font('Helvetica-Bold').fontSize(12).fillColor(DARK).text('Instrument Under Test');
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(GOLD).lineWidth(1.5).stroke();
        doc.moveDown(0.4);
        doc.font('Helvetica').fontSize(9).fillColor('#333');
        [
          ['Passport ID', instrument.passportId],
          ['Manufacturer', instrument.manufacturer],
          ['Model', instrument.model],
          ['Serial Number', instrument.serialNumber],
          ['Type', instrument.instrumentType],
          ['Accuracy Class', instrument.accuracyClass],
          ['Max Capacity', `${instrument.maxCapacity} ${instrument.verificationUnits}`],
          ['Min Capacity', `${instrument.minCapacity} ${instrument.verificationUnits}`],
          ['Verification Interval (e)', `${instrument.scaleIntervalE} ${instrument.verificationUnits}`],
        ].forEach(([k, v]) => {
          doc.font('Helvetica-Bold').text(`${k}: `, { continued: true }).font('Helvetica').text(String(v));
        });

        // ── Test Results ──
        testRecords.forEach((record: any) => {
          doc.addPage();
          doc.rect(0, 0, 595.28, 40).fill(DARK);
          doc.font('Helvetica-Bold').fontSize(13).fillColor('white')
            .text(`Test: ${record.testType.replace(/_/g, ' ')}`, 50, 12);

          doc.fillColor('#333').moveDown(1.5);
          const compliance = safeParse(record.complianceDetails);
          const observations = safeParse(record.observations, []);
          const calcResults = safeParse(record.calculationResults);
          const envData = safeParse(record.environmentalData, {});

          // Status badge
          const verdict = compliance?.verdict || record.status;
          const badgeColor = verdict === 'PASS' ? '#16a34a' : verdict === 'FAIL' ? '#dc2626' : '#d97706';
          doc.font('Helvetica-Bold').fontSize(11).fillColor(badgeColor)
            .text(`Verdict: ${verdict}`, { align: 'right' });
          doc.moveDown(0.3);

          // Environmental data
          if (Object.keys(envData).length > 0) {
            doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK).text('Environmental Conditions');
            doc.moveDown(0.2);
            doc.font('Helvetica').fontSize(8).fillColor('#555');
            if (envData.temperature) doc.text(`Temperature: ${envData.temperature} °C`);
            if (envData.humidity) doc.text(`Humidity: ${envData.humidity} %RH`);
            if (envData.pressure) doc.text(`Barometric Pressure: ${envData.pressure} hPa`);
            doc.moveDown(0.5);
          }

          // Observations table
          if (observations.length > 0) {
            doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK).text('Test Observations');
            doc.moveDown(0.3);
            doc.font('Helvetica').fontSize(8).fillColor('#333');

            if (record.testType === 'WEIGHING_PERFORMANCE') {
              // Table header
              const colX = [50, 130, 210, 290, 370, 440];
              const colW = [80, 80, 80, 80, 70, 100];
              doc.font('Helvetica-Bold').fontSize(7);
              ['Load Point', 'Applied (m)', 'Indication (I)', 'Error (E)', 'MPE', 'Verdict'].forEach((h, i) => {
                doc.text(h, colX[i], doc.y, { width: colW[i] });
              });
              doc.moveDown(0.3);
              doc.font('Helvetica').fontSize(7);
              observations.forEach((obs: any) => {
                const rowY = doc.y;
                if (rowY > 750) { doc.addPage(); }
                doc.text(String(obs.loadLabel || obs.appliedLoad || ''), colX[0], doc.y, { width: colW[0], continued: false });
              });
            }
            doc.moveDown(0.5);
          }

          // Calculation results
          if (calcResults) {
            doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK).text('Calculation Summary');
            doc.moveDown(0.2);
            doc.font('Helvetica').fontSize(8).fillColor('#333');
            if (calcResults.maxError !== undefined) doc.text(`Maximum Observed Error: ${calcResults.maxError}`);
            if (calcResults.maxMPE !== undefined) doc.text(`MPE at Max Error Load: ±${calcResults.maxMPE}`);
            if (calcResults.stdDev !== undefined) doc.text(`Standard Deviation: ${calcResults.stdDev}`);
            if (calcResults.range !== undefined) doc.text(`Range (Max - Min): ${calcResults.range}`);
          }

          // Why breakdown
          if (compliance?.whyBreakdown) {
            doc.moveDown(0.5);
            doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK).text('Compliance Breakdown ("Show Me Why")');
            doc.moveDown(0.2);
            doc.font('Helvetica').fontSize(8).fillColor('#333');
            const wb = compliance.whyBreakdown;
            if (Array.isArray(wb)) {
              wb.forEach((item: any) => {
                doc.text(`• ${item.description || item.message || JSON.stringify(item)}`);
              });
            } else if (typeof wb === 'string') {
              doc.text(wb);
            }
          }
        });

        // ── Final Page: Remarks and Signatures ──
        doc.addPage();
        doc.font('Helvetica-Bold').fontSize(14).fillColor(DARK).text('Conclusion & Certification', { align: 'center' });
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(GOLD).lineWidth(2).stroke();
        doc.moveDown(0.8);

        if (evaluation.generalRemarks) {
          doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK).text('Testing Officer Remarks:');
          doc.font('Helvetica').fontSize(9).fillColor('#333').text(evaluation.generalRemarks);
          doc.moveDown(0.5);
        }
        if (evaluation.reviewRemarks) {
          doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK).text('Reviewing Officer Remarks:');
          doc.font('Helvetica').fontSize(9).fillColor('#333').text(evaluation.reviewRemarks);
          doc.moveDown(0.5);
        }

        // Integrity
        doc.moveDown(1);
        doc.rect(50, doc.y, 495, 45).fillAndStroke('#f0fdf4', GREEN);
        const hashY = doc.y + 8;
        doc.font('Helvetica-Bold').fontSize(9).fillColor(GREEN)
          .text('Zero-Trust Report Integrity (SHA-256):', 60, hashY);
        doc.font('Courier').fontSize(7).fillColor('#333')
          .text(report.integrityHash || 'Hash generated upon finalization', 60, hashY + 14, { width: 475 });

        // Signatures
        doc.moveDown(3);
        const sigY = doc.y + 20;
        doc.font('Helvetica').fontSize(8).fillColor('#666');
        doc.text('_________________________________', 50, sigY);
        doc.text(testingOfficer?.name || 'Testing Officer', 50, sigY + 12);
        doc.text(testingOfficer?.designation || '', 50, sigY + 22);
        doc.text('_________________________________', 340, sigY);
        doc.text(reviewingOfficer?.name || 'Reviewing Officer', 340, sigY + 12);
        doc.text(reviewingOfficer?.designation || '', 340, sigY + 22);

        // Footer on all pages
        const pages = doc.bufferedPageRange();
        for (let i = pages.start; i < pages.start + pages.count; i++) {
          doc.switchToPage(i);
          doc.font('Helvetica').fontSize(7).fillColor('#999')
            .text(
              `MarkSure | Report ${report.reportId} | Page ${i + 1} of ${pages.count} | Generated: ${new Date().toLocaleString('en-IN')}`,
              50, 800, { align: 'center', width: 495 }
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

    const heading = (text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2) =>
      new Paragraph({ heading: level, spacing: { before: 200, after: 100 }, children: [new TextRun({ text, bold: true, color: '006c51' })] });

    const field = (label: string, value: string) =>
      new Paragraph({ spacing: { after: 40 }, children: [
        new TextRun({ text: `${label}: `, bold: true, size: 20 }),
        new TextRun({ text: value, size: 20 }),
      ]});

    const sections: any[] = [];

    // ── Main Section ──
    const children: any[] = [];

    children.push(new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'MarkSure — OIML R-76 Test Report', bold: true, size: 32, color: '006c51' })],
    }));
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: 'Government of India | Legal Metrology Division', size: 18, color: '666666', italics: true })],
    }));

    // Report meta
    children.push(heading('Report Information'));
    children.push(field('Report ID', report.reportId));
    children.push(field('Status', report.status));
    children.push(field('Version', `v${report.version}`));
    children.push(field('Rule Version', ruleConfig?.version || evaluation.standardReference || 'OIML R 76-1:2006 v1.0'));
    children.push(field('Generated', new Date(report.createdAt).toLocaleString('en-IN')));
    children.push(field('Integrity Hash (SHA-256)', report.integrityHash || 'Pending finalization'));

    // Evaluation
    children.push(heading('Evaluation Session'));
    children.push(field('Evaluation Number', evaluation.evaluationNumber));
    children.push(field('State', evaluation.state));
    children.push(field('Date', new Date(evaluation.evaluationDate).toLocaleDateString('en-IN')));
    children.push(field('Testing Officer', testingOfficer?.name || 'N/A'));
    children.push(field('Reviewing Officer', reviewingOfficer?.name || 'N/A'));

    // Laboratory
    children.push(heading('Accredited Testing Laboratory'));
    children.push(field('Laboratory', laboratory.name));
    children.push(field('Code', laboratory.code));
    children.push(field('Accreditation', laboratory.accreditationNumber));
    children.push(field('Address', laboratory.address));

    // Instrument
    children.push(heading('Instrument Under Test'));
    children.push(field('Passport ID', instrument.passportId));
    children.push(field('Manufacturer', instrument.manufacturer));
    children.push(field('Model', instrument.model));
    children.push(field('Serial Number', instrument.serialNumber));
    children.push(field('Accuracy Class', instrument.accuracyClass));
    children.push(field('Max Capacity', `${instrument.maxCapacity} ${instrument.verificationUnits}`));
    children.push(field('Verification Interval (e)', `${instrument.scaleIntervalE} ${instrument.verificationUnits}`));

    // Test Records
    testRecords.forEach((record: any) => {
      const compliance = safeParse(record.complianceDetails);
      const verdict = compliance?.verdict || record.status;

      children.push(heading(`Test: ${record.testType.replace(/_/g, ' ')}`));
      children.push(field('Verdict', verdict));
      children.push(field('Tested By', record.testedByName || 'N/A'));

      if (compliance?.whyBreakdown) {
        children.push(new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: 'Compliance Breakdown:', bold: true, size: 20 })] }));
        const wb = Array.isArray(compliance.whyBreakdown) ? compliance.whyBreakdown : [compliance.whyBreakdown];
        wb.forEach((item: any) => {
          children.push(new Paragraph({ spacing: { after: 20 }, children: [
            new TextRun({ text: `  • ${item.description || item.message || JSON.stringify(item)}`, size: 18 }),
          ]}));
        });
      }
    });

    // Remarks
    children.push(heading('Conclusion & Certification'));
    if (evaluation.generalRemarks) {
      children.push(field('Testing Officer Remarks', evaluation.generalRemarks));
    }
    if (evaluation.reviewRemarks) {
      children.push(field('Reviewing Officer Remarks', evaluation.reviewRemarks));
    }

    // Signatures
    children.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
    children.push(new Paragraph({ children: [
      new TextRun({ text: '___________________________          ___________________________', size: 20 }),
    ]}));
    children.push(new Paragraph({ children: [
      new TextRun({ text: `${testingOfficer?.name || 'Testing Officer'}                    ${reviewingOfficer?.name || 'Reviewing Officer'}`, size: 18 }),
    ]}));

    sections.push({ properties: {}, children });

    const docxDoc = new Document({ sections });
    return await Packer.toBuffer(docxDoc);
  }
}
