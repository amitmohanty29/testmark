// Automated Integration Test for Instrument Digital Passport (Central Record)
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
  console.log('MarkSure Instrument Digital Passport Integration Test');
  console.log('====================================================\n');

  // 1. Authentication
  console.log('1. Authentication...');
  const adminLogin = await request('POST', '/auth/login', {
    email: 'admin@marksure.gov.in',
    password: 'Pass@123',
  });
  assert(adminLogin.ok, 'Admin login succeeded');
  const adminToken = adminLogin.data.token;

  const officerLogin = await request('POST', '/auth/login', {
    email: 'officer.test@marksure.gov.in',
    password: 'Pass@123',
  });
  assert(officerLogin.ok, 'Testing Officer login succeeded');
  const officerToken = officerLogin.data.token;

  // 2. Register a new instrument and verify automatic Passport creation + REGISTERED event
  console.log('\n2. Testing Instrument Registration & Automatic Passport Creation...');
  const uniqueSerial = `PASSPORT-TEST-SN-${Date.now()}`;
  const createInstRes = await request('POST', '/instruments', {
    manufacturer: 'Test Metrology India Pvt Ltd',
    model: 'TM-Precision-100X',
    serialNumber: uniqueSerial,
    instrumentType: 'Electronic Non-Automatic Weighing Instrument (NAWI)',
    accuracyClass: 'Class II',
    maxCapacity: 1500,
    minCapacity: 0.1,
    scaleIntervalE: 0.01,
    scaleIntervalD: 0.001,
    verificationUnits: 'g',
  }, officerToken);

  assert(createInstRes.ok, `Instrument registered successfully (HTTP ${createInstRes.status})`);
  const inst = createInstRes.data.instrument;
  const passport = createInstRes.data.passport;
  assert(!!passport && !!passport.id, `Passport record created with ID: ${passport?.id}`);
  assert(passport.passportId.startsWith('DOCA-NAWI-P-'), `Human-readable Passport ID generated: ${passport?.passportId}`);

  // 3. Verify REGISTERED PassportEvent
  console.log('\n3. Verifying REGISTERED Event on Passport Timeline...');
  const passportDetailRes = await request('GET', `/passports/${passport.passportId}`, null, officerToken);
  assert(passportDetailRes.ok, `Retrieved passport detail for ${passport.passportId}`);
  const passportData = passportDetailRes.data.passport;
  const regEvent = passportData.events.find(e => e.eventType === 'REGISTERED');
  assert(!!regEvent, 'Found REGISTERED event in Passport timeline');
  assert(regEvent.refType === 'INSTRUMENT' && regEvent.refId === inst.id, 'REGISTERED event links to instrument');

  // 4. Create an Evaluation and verify EVALUATION_CREATED event + passportId link
  console.log('\n4. Creating Evaluation & Verifying Passport Linkage...');
  const labsRes = await request('GET', '/laboratories', null, officerToken);
  const labId = labsRes.data.laboratories[0].id;
  const createEvalRes = await request('POST', '/evaluations', {
    instrumentId: inst.id,
    laboratoryId: labId,
    initialState: 'In Progress',
    generalRemarks: 'Initial pattern evaluation for digital passport test',
  }, officerToken);

  assert(createEvalRes.ok, `Evaluation created successfully: ${createEvalRes.data.evaluation.evaluationNumber}`);
  const evalRec = createEvalRes.data.evaluation;
  assert(evalRec.passportId === passport.id, 'Evaluation references instrument Passport ID');

  const afterEvalRes = await request('GET', `/passports/${passport.passportId}`, null, officerToken);
  const evalCreatedEvent = afterEvalRes.data.passport.events.find(e => e.eventType === 'EVALUATION_CREATED');
  assert(!!evalCreatedEvent, 'Found EVALUATION_CREATED event in Passport timeline');

  // 5. Record Periodic Recalibration Event
  console.log('\n5. Recording Periodic Recalibration Event...');
  const recalRes = await request('POST', `/passports/${passport.passportId}/recalibration`, {
    calibrationDate: '2026-09-28',
    certificateNumber: 'RECAL-2026-TEST-001',
    laboratoryName: 'NPL Legal Metrology Centre',
    nextDueDate: '2027-09-28',
    remarks: 'Annual re-verification conforming to in-service MPE.',
  }, officerToken);

  assert(recalRes.ok, `Recalibration recorded (HTTP ${recalRes.status})`);
  assert(recalRes.data.event.eventType === 'RECALIBRATION', 'Event type is RECALIBRATION');

  // 6. Verify Printable Summary & Audit Logging
  console.log('\n6. Testing Printable A4 Passport Summary & Audit Trail...');
  const summaryRes = await request('GET', `/passports/${passport.passportId}/print-summary`, null, officerToken);
  assert(summaryRes.ok, `Print summary generated (HTTP ${summaryRes.status})`);
  assert(summaryRes.headers.get('content-type') === 'application/pdf', 'Print summary is PDF format');
  assert(summaryRes.buffer.slice(0, 4).toString() === '%PDF', 'Buffer starts with valid %PDF header');

  // Check audit log for VIEWED and PRINTED_SUMMARY
  const updatedPassport = (await request('GET', `/passports/${passport.passportId}`, null, officerToken)).data.passport;
  const hasViewAudit = updatedPassport.auditLogs.some(l => l.action === 'VIEWED');
  const hasPrintAudit = updatedPassport.auditLogs.some(l => l.action === 'PRINTED_SUMMARY');
  assert(hasViewAudit, 'Audit log recorded VIEWED action for Passport');
  assert(hasPrintAudit, 'Audit log recorded PRINTED_SUMMARY action for Passport');

  // 7. Verify Model Approval Summary
  console.log('\n7. Testing Models Approval History Summary View...');
  const modelsRes = await request('GET', '/passports/models/summary', null, officerToken);
  assert(modelsRes.ok, `Models summary endpoint returned HTTP 200`);
  assert(modelsRes.data.models.length > 0, `Returned ${modelsRes.data.models.length} model approval records`);
  const createdModel = modelsRes.data.models.find(m => m.manufacturer === 'Test Metrology India Pvt Ltd');
  assert(!!createdModel, 'Newly registered model appears in Model Approval History view');

  console.log('\n====================================================');
  console.log(`Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Unhandled test exception:', err);
  process.exit(1);
});
