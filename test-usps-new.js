// Test Script for USP 1 & USP 2
// Run: node test-usps-new.js

const http = require('http');

const BASE_URL = 'http://localhost:5001/api';

async function request(method, path, body = null, token = null) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json();
    return { ok: res.ok, status: res.status, data, headers: res.headers };
  } else {
    const buffer = Buffer.from(await res.arrayBuffer());
    return { ok: res.ok, status: res.status, buffer, headers: res.headers };
  }
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function run() {
  console.log('====================================================');
  console.log('MarkSure USP 1 & USP 2 Automated Integration Test');
  console.log('====================================================\n');

  // 1. Authenticate as Admin & Testing Officer
  console.log('1. Authentication...');
  const loginRes = await request('POST', '/auth/login', {
    email: 'admin@marksure.gov.in',
    password: 'Pass@123',
  });
  assert(loginRes.ok, 'Admin login succeeded');
  const token = loginRes.data.token;

  // 2. Fetch or create a test evaluation that is in Draft or In Progress
  console.log('\n2. Fetching test evaluation...');
  const evalListRes = await request('GET', '/evaluations', null, token);
  assert(evalListRes.ok && evalListRes.data.evaluations.length > 0, 'Found existing evaluations');
  
  let evaluation = evalListRes.data.evaluations.find(
    (e) => e.state === 'Draft' || e.state === 'In Progress'
  );

  if (!evaluation) {
    console.log('   Creating new Draft evaluation for tests...');
    const instRes = await request('GET', '/instruments', null, token);
    const instrument = instRes.data.instruments[0];
    const labRes = await request('GET', '/laboratories', null, token);
    const lab = labRes.data.laboratories[0];

    const createEvalRes = await request('POST', '/evaluations', {
      instrumentId: instrument.id,
      laboratoryId: lab.id,
      standardReference: 'OIML R 76-1:2006',
    }, token);

    evaluation = createEvalRes.data.evaluation;
  }

  const evalId = evaluation.id;
  const instrumentId = evaluation.instrumentId;
  console.log(`   Evaluation ID: ${evalId} (State: ${evaluation.state}), Instrument ID: ${instrumentId}`);

  // ─────────────────────────────────────────────────────────────
  // USP 1 TESTS: Self-Healing Form State, Auto-Sync & Conflict
  // ─────────────────────────────────────────────────────────────
  console.log('\n3. Testing USP 1: Auto-Sync & Conflict Detection...');

  // 3a. Save a draft with isAutoSync = true
  const autoSyncPayload = {
    observations: [
      { step: 1, direction: 'ASCENDING', appliedLoad: 0, indication: 0, deltaL: 0 },
      { step: 2, direction: 'ASCENDING', appliedLoad: 10, indication: 10.001, deltaL: 0 },
    ],
    environmentalData: { temperatureCelsius: 21.5, relativeHumidity: 52, atmosphericPressureHpa: 1012 },
    testInputs: { verificationType: 'INITIAL' },
    notes: 'Draft auto-saved by IndexedDB engine test',
    status: 'DRAFT',
    isAutoSync: true,
  };

  const draftRes = await request('PUT', `/evaluations/${evalId}/tests/WEIGHING_PERFORMANCE`, autoSyncPayload, token);
  assert(draftRes.ok, 'PUT draft with isAutoSync: true succeeded');
  assert(draftRes.data.record.status === 'DRAFT', 'Draft saved with status DRAFT');
  const savedUpdatedAt = draftRes.data.record.updatedAt;

  // 3b. Verify conflict detection: send stale expectedServerUpdatedAt
  console.log('   Simulating concurrent conflicting edit with stale timestamp...');
  const staleTime = new Date(new Date(savedUpdatedAt).getTime() - 60000).toISOString();
  const conflictPayload = {
    observations: [{ step: 1, direction: 'ASCENDING', appliedLoad: 0, indication: 0.05, deltaL: 0 }],
    status: 'DRAFT',
    expectedServerUpdatedAt: staleTime,
    forceConflictResolution: false,
  };

  const conflictRes = await request('PUT', `/evaluations/${evalId}/tests/WEIGHING_PERFORMANCE`, conflictPayload, token);
  assert(conflictRes.status === 409, 'Server returned 409 Conflict when expectedServerUpdatedAt is older than server record');
  assert(conflictRes.data.conflict === true, 'Response contains conflict: true');
  assert(conflictRes.data.serverRecord !== undefined, 'Response includes serverRecord for technician resolution');

  // 3c. Force conflict resolution
  console.log('   Resolving conflict with forceConflictResolution: true...');
  const resolvePayload = {
    ...conflictPayload,
    forceConflictResolution: true,
  };
  const resolveRes = await request('PUT', `/evaluations/${evalId}/tests/WEIGHING_PERFORMANCE`, resolvePayload, token);
  assert(resolveRes.ok, 'Conflict successfully resolved with forceConflictResolution: true');

  // ─────────────────────────────────────────────────────────────
  // USP 2 TESTS: Multi-National OIML CS Certificate Exporter
  // ─────────────────────────────────────────────────────────────
  console.log('\n4. Testing USP 2: Multi-National Certificate Exporter...');

  // 4a. Check available certificate templates endpoint
  const templatesRes = await request('GET', '/reports/templates/available');
  assert(templatesRes.ok, 'GET /reports/templates/available succeeded');
  const templates = templatesRes.data.templates || [];
  const hasRRSL = templates.some((t) => t.id === 'INDIAN_RRSL');
  const hasOIML = templates.some((t) => t.id === 'OIML_CS');
  assert(hasRRSL, 'Template INDIAN_RRSL is available in registry');
  assert(hasOIML, 'Template OIML_CS is available in registry');

  // 4b. Find or generate a report
  const reportsListRes = await request('GET', '/reports', null, token);
  assert(reportsListRes.ok, 'GET /reports succeeded');
  let reportId = null;
  let targetInstrumentId = instrumentId;
  if (reportsListRes.data.reports.length > 0) {
    reportId = reportsListRes.data.reports[0].id;
    const rptDetail = await request('GET', `/reports/${reportId}`, null, token);
    targetInstrumentId = rptDetail.data.report.evaluation?.instrumentId || instrumentId;
  } else {
    // Generate one
    const genRes = await request('POST', `/reports/generate/${evalId}`, null, token);
    reportId = genRes.data.report.id;
    targetInstrumentId = instrumentId;
  }
  console.log(`   Target Report ID: ${reportId}, Target Instrument ID: ${targetInstrumentId}`);

  // 4c. Export Indian RRSL Certificate as PDF
  console.log('   Exporting Indian RRSL Certificate (PDF)...');
  const rrslPdfRes = await request('GET', `/reports/${reportId}/export-certificate/INDIAN_RRSL?format=pdf`, null, token);
  assert(rrslPdfRes.ok, 'Export Indian RRSL Certificate as PDF succeeded (HTTP 200)');
  assert(rrslPdfRes.headers.get('content-type') === 'application/pdf', 'Content-Type is application/pdf');
  const isPdfHeader1 = rrslPdfRes.buffer && rrslPdfRes.buffer.toString('utf8', 0, 5) === '%PDF-';
  assert(isPdfHeader1, 'Generated file has valid %PDF- header');
  console.log(`   Indian RRSL PDF size: ${rrslPdfRes.buffer.length} bytes`);

  // 4d. Export Indian RRSL Certificate as DOCX
  console.log('   Exporting Indian RRSL Certificate (DOCX)...');
  const rrslDocxRes = await request('GET', `/reports/${reportId}/export-certificate/INDIAN_RRSL?format=docx`, null, token);
  assert(rrslDocxRes.ok, 'Export Indian RRSL Certificate as DOCX succeeded (HTTP 200)');
  assert(rrslDocxRes.buffer && rrslDocxRes.buffer.length > 1000, 'Generated DOCX buffer has content');
  console.log(`   Indian RRSL DOCX size: ${rrslDocxRes.buffer.length} bytes`);

  // 4e. Export International OIML CS Scheme Certificate as PDF
  console.log('   Exporting OIML CS Scheme Certificate (PDF)...');
  const oimlPdfRes = await request('GET', `/reports/${reportId}/export-certificate/OIML_CS?format=pdf`, null, token);
  assert(oimlPdfRes.ok, 'Export OIML CS Scheme Certificate as PDF succeeded (HTTP 200)');
  assert(oimlPdfRes.headers.get('content-type') === 'application/pdf', 'Content-Type is application/pdf');
  const isPdfHeader2 = oimlPdfRes.buffer && oimlPdfRes.buffer.toString('utf8', 0, 5) === '%PDF-';
  assert(isPdfHeader2, 'Generated file has valid %PDF- header');
  console.log(`   OIML CS PDF size: ${oimlPdfRes.buffer.length} bytes`);

  // 4f. Export International OIML CS Scheme Certificate as DOCX
  console.log('   Exporting OIML CS Scheme Certificate (DOCX)...');
  const oimlDocxRes = await request('GET', `/reports/${reportId}/export-certificate/OIML_CS?format=docx`, null, token);
  assert(oimlDocxRes.ok, 'Export OIML CS Scheme Certificate as DOCX succeeded (HTTP 200)');
  assert(oimlDocxRes.buffer && oimlDocxRes.buffer.length > 1000, 'Generated DOCX buffer has content');
  console.log(`   OIML CS DOCX size: ${oimlDocxRes.buffer.length} bytes`);

  // 4g. Check Digital Passport Timeline for CERTIFICATE_GENERATED events
  console.log('\n5. Verifying Digital Passport Timeline recording...');
  const passportRes = await request('GET', `/instruments/${targetInstrumentId}/passport`, null, token);
  assert(passportRes.ok, 'GET /instruments/:id/passport succeeded');
  const timelineEvents = passportRes.data.passport.timelineEvents || [];
  const certEvents = timelineEvents.filter((e) => e.eventType === 'CERTIFICATE_GENERATED');
  assert(certEvents.length > 0, `Recorded ${certEvents.length} CERTIFICATE_GENERATED event(s) in Passport timeline`);
  if (certEvents.length > 0) {
    console.log(`   Latest Passport Timeline Event: "${certEvents[certEvents.length - 1].title}"`);
    console.log(`   Description: "${certEvents[certEvents.length - 1].description}"`);
  }

  // 4h. Check Audit Ledger for CERTIFICATE_EXPORTED action
  const auditRes = await request('GET', '/audit?limit=10', null, token);
  assert(auditRes.ok, 'GET /audit succeeded');
  const certAudits = (auditRes.data.logs || []).filter((l) => l.action === 'CERTIFICATE_EXPORTED');
  assert(certAudits.length > 0, `Found ${certAudits.length} CERTIFICATE_EXPORTED audit log entries`);

  console.log('\n====================================================');
  console.log(`Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
