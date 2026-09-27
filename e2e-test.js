// MarkSure End-to-End API Test Suite (Corrected)
// Run: node e2e-test.js

const BASE = 'http://localhost:5001/api';

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, ok: res.ok, data };
}

function log(pass, label, detail) {
  const icon = pass ? '✅' : '❌';
  console.log(`${icon} ${label}`);
  if (detail && !pass) console.log(`   Detail: ${typeof detail === 'string' ? detail.slice(0,300) : JSON.stringify(detail).slice(0, 300)}`);
}

async function run() {
  const results = { passed: 0, failed: 0, errors: [] };

  function check(pass, label, detail) {
    log(pass, label, detail);
    if (pass) results.passed++; else { results.failed++; results.errors.push(label); }
  }

  console.log('\n════════════════════════════════════════');
  console.log(' MarkSure E2E API Test Suite');
  console.log('════════════════════════════════════════\n');

  // ====== 1. AUTH ======
  console.log('─── 1. AUTHENTICATION ───');

  let r = await request('POST', '/auth/login', { email: 'admin@marksure.gov.in', password: 'Pass@123' });
  check(r.ok && r.data.token, 'Login as Admin', r.data);
  const adminToken = r.data.token;

  r = await request('POST', '/auth/login', { email: 'officer.test@marksure.gov.in', password: 'Pass@123' });
  check(r.ok && r.data.token, 'Login as Testing Officer', r.data);
  const testToken = r.data.token;

  r = await request('POST', '/auth/login', { email: 'officer.review@marksure.gov.in', password: 'Pass@123' });
  check(r.ok && r.data.token, 'Login as Reviewing Officer', r.data);
  const reviewToken = r.data.token;

  r = await request('POST', '/auth/login', { email: 'bad@test.com', password: 'wrong' });
  check(!r.ok, 'Reject invalid credentials', r.data);

  // GET /auth/me returns { user: { email, ... } }
  r = await request('GET', '/auth/me', null, adminToken);
  check(r.ok && r.data.user && r.data.user.email === 'admin@marksure.gov.in', 'GET /auth/me returns admin user', r.data);

  // ====== 2. INSTRUMENTS ======
  console.log('\n─── 2. INSTRUMENTS ───');
  // Returns { instruments: [...] }
  r = await request('GET', '/instruments', null, adminToken);
  check(r.ok && r.data.instruments && Array.isArray(r.data.instruments), 'GET /instruments returns instruments array', r.data);
  const instruments = (r.ok && r.data.instruments) ? r.data.instruments : [];
  check(instruments.length > 0, `  Found ${instruments.length} instruments`);

  let instrumentId = null;
  if (instruments.length > 0) {
    instrumentId = instruments[0].id;
    r = await request('GET', `/instruments/${instrumentId}`, null, adminToken);
    check(r.ok && r.data.instrument, `GET /instruments/:id returns instrument detail`, r.data);

    if (r.ok && r.data.instrument) {
      const inst = r.data.instrument;
      check(!!inst.manufacturer, `  manufacturer: ${inst.manufacturer}`);
      check(!!inst.accuracyClass, `  accuracyClass: ${inst.accuracyClass}`);
      check(inst.maxCapacity != null, `  maxCapacity: ${inst.maxCapacity}`);
      check(!!inst.passportId, `  passportId: ${inst.passportId}`);
    }
  }

  // ====== 3. DIGITAL PASSPORT ======
  console.log('\n─── 3. DIGITAL PASSPORT ───');
  if (instrumentId) {
    // Returns { passport: { ...instrument, summary: {...} } }
    r = await request('GET', `/instruments/${instrumentId}/passport`, null);
    check(r.ok && r.data.passport, 'GET /instruments/:id/passport returns passport', r.data);
    if (r.ok && r.data.passport) {
      check(!!r.data.passport.summary, '  summary object present');
      check(typeof r.data.passport.summary.totalEvaluations === 'number', `  totalEvaluations: ${r.data.passport.summary.totalEvaluations}`);
      check(!!r.data.passport.summary.currentCertificationStatus, `  certStatus: ${r.data.passport.summary.currentCertificationStatus}`);
      check(Array.isArray(r.data.passport.evaluations), '  evaluations history present');
      check(Array.isArray(r.data.passport.timelineEvents), '  timeline events present');
    }
  }

  // ====== 4. LABORATORIES ======
  console.log('\n─── 4. LABORATORIES ───');
  r = await request('GET', '/laboratories', null, adminToken);
  check(r.ok && r.data.laboratories && Array.isArray(r.data.laboratories), 'GET /laboratories returns array', r.data);
  if (r.ok && r.data.laboratories && r.data.laboratories.length > 0) {
    check(!!r.data.laboratories[0].name, `  First lab: ${r.data.laboratories[0].name}`);
  }

  // ====== 5. EVALUATIONS ======
  console.log('\n─── 5. EVALUATIONS ───');
  // Returns { evaluations: [...] }
  r = await request('GET', '/evaluations', null, adminToken);
  check(r.ok && r.data.evaluations && Array.isArray(r.data.evaluations), 'GET /evaluations returns evaluations array', r.data);
  const evaluations = (r.ok && r.data.evaluations) ? r.data.evaluations : [];
  check(evaluations.length > 0, `  Found ${evaluations.length} evaluations`);

  let evalId = null;
  if (evaluations.length > 0) {
    evalId = evaluations[0].id;
    // Returns { evaluation: {...} }
    r = await request('GET', `/evaluations/${evalId}`, null, adminToken);
    check(r.ok && r.data.evaluation, 'GET /evaluations/:id returns evaluation detail', r.data?.evaluation?.state);

    if (r.ok && r.data.evaluation) {
      const ev = r.data.evaluation;
      check(!!ev.state, `  state: ${ev.state}`);
      check(!!ev.instrumentId, '  instrumentId present');
      check(!!ev.instrument, '  instrument data included');

      // Test records (observations, calculations, compliance) are in TestRecord children
      // Fetched via /evaluations/:id/tests
      const tr = await request('GET', `/evaluations/${evalId}/tests`, null, adminToken);
      check(tr.ok && tr.data.testRecords && Array.isArray(tr.data.testRecords), '  GET /evaluations/:id/tests returns testRecords', tr.data);
      if (tr.ok && tr.data.testRecords) {
        check(tr.data.testRecords.length > 0, `  Found ${tr.data.testRecords.length} test records`);
        const rec0 = tr.data.testRecords[0];
        if (rec0) {
          check(!!rec0.testType, `  testType: ${rec0.testType}`);
          check(rec0.observations != null, '  observations data present');
          check(rec0.calculationResults != null, '  calculationResults present');
          check(rec0.complianceDetails != null, '  complianceDetails present');
        }
      }
    }
  }

  // ====== 6. REPORTS ======
  console.log('\n─── 6. REPORTS ───');
  // Returns { reports: [...] }
  r = await request('GET', '/reports', null, adminToken);
  check(r.ok && r.data.reports && Array.isArray(r.data.reports), 'GET /reports returns reports array', r.data);
  const reports = (r.ok && r.data.reports) ? r.data.reports : [];
  check(reports.length > 0, `  Found ${reports.length} reports`);

  let reportId = null;
  let reportCode = null;
  let reportReportId = null;
  if (reports.length > 0) {
    reportId = reports[0].id;
    reportCode = reports[0].reportCode;
    reportReportId = reports[0].reportId;

    // Returns { report: {...} }
    r = await request('GET', `/reports/${reportId}`, null, adminToken);
    check(r.ok && r.data.report, 'GET /reports/:id returns report detail', r.data);

    if (r.ok && r.data.report) {
      const rpt = r.data.report;
      check(!!rpt.reportId || !!rpt.reportCode, `  reportId: ${rpt.reportId || rpt.reportCode}`);
      check(!!rpt.status, `  status: ${rpt.status}`);
      check(rpt.version >= 1, `  version: ${rpt.version}`);
    }
  }

  // ====== 7. REPORT FINALIZATION & REVISION (USP1 WORKFLOW) ======
  console.log('\n─── 7. USP1: REPORT FINALIZATION & REVISION ───');
  if (reportId) {
    // Get report detail to check current status
    r = await request('GET', `/reports/${reportId}`, null, adminToken);
    const report = r.ok ? r.data.report : null;

    if (report) {
      // Finalize if still DRAFT
      if (report.status === 'DRAFT') {
        r = await request('POST', `/reports/${reportId}/finalize`, null, adminToken);
        check(r.ok, `POST /reports/:id/finalize (${report.status} → FINALIZED)`, r.data);
      } else {
        check(true, `Report already finalized (status: ${report.status})`);
      }

      // Create a revision
      r = await request('POST', `/reports/${reportId}/revise`, {
        changeDescription: 'E2E Test: Correcting repeatability trial 2 observation from 5.2kg to 5.4kg',
      }, adminToken);
      check(r.ok, 'POST /reports/:id/revise creates new version', r.data);
      const newVersion = r.ok ? r.data.newVersion : null;

      if (r.ok && newVersion) {
        check(!!r.data.integrityHash, `  New integrity hash generated`);
        check(newVersion > 1, `  New version: ${newVersion}`);
      }

      // Get version history
      r = await request('GET', `/reports/${reportId}/versions`, null, adminToken);
      check(r.ok && r.data.versions && Array.isArray(r.data.versions), 'GET /reports/:id/versions returns version history', r.data);
      const versions = r.ok && r.data.versions ? r.data.versions : [];
      check(versions.length >= 2, `  Version count: ${versions.length}`);

      // Get "What Changed?" diff between v1 and latest
      if (versions.length >= 2) {
        const v1 = 1;
        const v2 = versions.length; // latest version number
        r = await request('GET', `/reports/${reportId}/diff/${v1}/${v2}`, null, adminToken);
        check(r.ok, `GET /reports/:id/diff/${v1}/${v2} returns metrology diff`, r.data);
        if (r.ok) {
          check(!!r.data.version1, '  version1 metadata present');
          check(!!r.data.version2, '  version2 metadata present');
          check(Array.isArray(r.data.diffs), `  diffs array: ${(r.data.diffs || []).length} changes`);
          if (r.data.summary) {
            check(typeof r.data.summary.totalChanges === 'number', `  summary.totalChanges: ${r.data.summary.totalChanges}`);
          }
        }
      }
    }
  }

  // ====== 8. REPORT INTEGRITY VERIFICATION ======
  console.log('\n─── 8. REPORT INTEGRITY VERIFICATION ───');
  if (reportId) {
    // Verify by POST /:id/verify
    r = await request('POST', `/reports/${reportId}/verify`, {}, adminToken);
    check(r.ok, 'POST /reports/:id/verify checks integrity', r.data);
    if (r.ok) {
      check(typeof r.data.verified === 'boolean', `  verified: ${r.data.verified}`);
      check(!!r.data.verdict, `  verdict: ${r.data.verdict}`);
    }

    // Verify by GET /verify/:reportId (public endpoint)
    if (reportReportId) {
      r = await request('GET', `/reports/verify/${reportReportId}`);
      check(r.ok, `GET /reports/verify/${reportReportId} (public)`, r.data);
      if (r.ok) {
        check(typeof r.data.verified === 'boolean', `  verified: ${r.data.verified}`);
      }
    }
  }

  // ====== 9. REPORT EXPORT (PDF/DOCX) ======
  console.log('\n─── 9. REPORT EXPORT ───');
  if (reportId) {
    const pdfRes = await fetch(`${BASE}/reports/${reportId}/export/pdf`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    check(pdfRes.status === 200, `GET /reports/:id/export/pdf → status ${pdfRes.status}`, pdfRes.status);

    const docxRes = await fetch(`${BASE}/reports/${reportId}/export/docx`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    check(docxRes.status === 200, `GET /reports/:id/export/docx → status ${docxRes.status}`, docxRes.status);
  }

  // ====== 10. USP2: RULE IMPACT SIMULATOR ======
  console.log('\n─── 10. USP2: RULE IMPACT SIMULATOR ───');

  // List existing rule configs → { ruleConfigs: [...] }
  r = await request('GET', '/rule-configs', null, adminToken);
  check(r.ok && r.data.ruleConfigs && Array.isArray(r.data.ruleConfigs), 'GET /rule-configs returns ruleConfigs array', r.data);

  // Create a draft rule config (requires `version`, `name`, `configuration`)
  const ruleVersion = `E2E-TEST-v${Date.now()}`;
  r = await request('POST', '/rule-configs', {
    version: ruleVersion,
    name: 'E2E Test Config - 15% Tighter MPE',
    description: 'Automated E2E test: Reduce MPE tolerances by 15%',
    isDraft: true,
    configuration: {
      toleranceMultiplier: 0.85,
      repeatabilityFactor: 0.9,
      eccentricityFactor: 0.95,
    }
  }, adminToken);
  check(r.ok && r.data.ruleConfig, 'POST /rule-configs creates draft config', r.data);
  const ruleConfigId = r.ok && r.data.ruleConfig ? r.data.ruleConfig.id : null;

  // List simulation runs → { runs: [...] }
  r = await request('GET', '/simulator/runs', null, adminToken);
  check(r.ok && r.data.runs && Array.isArray(r.data.runs), 'GET /simulator/runs returns runs array', r.data);

  // Run a simulation
  if (ruleConfigId) {
    r = await request('POST', '/simulator/run', {
      name: 'E2E Automated Simulation Run',
      description: 'Testing rule impact against historical evaluations',
      simulatedRuleConfigId: ruleConfigId,
      filters: {},
    }, adminToken);
    check(r.ok && r.data.simulation, 'POST /simulator/run executes simulation', r.data);
    if (r.ok && r.data.simulation) {
      const sim = r.data.simulation;
      check(typeof sim.totalEvaluations === 'number', `  totalEvaluations: ${sim.totalEvaluations}`);
      check(typeof sim.flippedCount === 'number', `  flippedCount: ${sim.flippedCount}`);
      check(typeof sim.passToFailCount === 'number', `  passToFailCount: ${sim.passToFailCount}`);
      check(typeof sim.unchangedCount === 'number', `  unchangedCount: ${sim.unchangedCount}`);
      check(typeof sim.affectedPercentage === 'number', `  affectedPercentage: ${sim.affectedPercentage}%`);
      check(!!sim.simulatedRuleConfig, `  simulatedRuleConfig: ${sim.simulatedRuleConfig?.name}`);

      // Get simulation detail
      if (sim.id) {
        r = await request('GET', `/simulator/runs/${sim.id}`, null, adminToken);
        check(r.ok, `GET /simulator/runs/:id detail`, r.data);
      }
    }
  }

  // ====== 11. AUDIT LOG ======
  console.log('\n─── 11. AUDIT LOG ───');
  // Path is /api/audit, returns { logs: [...] }
  r = await request('GET', '/audit', null, adminToken);
  check(r.ok && r.data.logs && Array.isArray(r.data.logs), 'GET /audit returns logs array', r.data);
  if (r.ok && r.data.logs) {
    check(r.data.logs.length > 0, `  Found ${r.data.logs.length} audit log entries`);
    if (r.data.logs.length > 0) {
      const log0 = r.data.logs[0];
      check(!!log0.action, `  Latest action: ${log0.action}`);
      check(!!log0.description, `  Description: ${(log0.description || '').slice(0, 80)}...`);
    }
  }

  // ====== 12. AUTHORIZATION & SECURITY ======
  console.log('\n─── 12. AUTHORIZATION & SECURITY ───');
  // Unauthenticated
  r = await request('GET', '/reports');
  check(!r.ok, 'Unauthenticated GET /reports → rejected', r.status);

  r = await request('GET', '/instruments');
  check(!r.ok, 'Unauthenticated GET /instruments → rejected', r.status);

  // Testing officer should NOT be able to create rule configs (Admin only)
  r = await request('POST', '/rule-configs', {
    version: 'UNAUTHORIZED-v1', name: 'Unauthorized', configuration: {}
  }, testToken);
  check(!r.ok, 'Testing Officer blocked from POST /rule-configs', r.status);

  // Testing officer should NOT run simulations (Admin only)
  r = await request('POST', '/simulator/run', {
    name: 'x', simulatedRuleConfigId: 'x'
  }, testToken);
  check(!r.ok, 'Testing Officer blocked from POST /simulator/run', r.status);

  // ====== 13. SEARCH ======
  console.log('\n─── 13. SEARCH ───');
  r = await request('GET', '/search?q=weighing', null, adminToken);
  check(r.ok, 'GET /search?q=weighing returns results', r.data);

  // ====== 14. HEALTH CHECK ======
  console.log('\n─── 14. HEALTH CHECK ───');
  r = await request('GET', '/health');
  check(r.ok && r.data.status === 'HEALTHY', 'GET /health returns HEALTHY', r.data);

  // ====== SUMMARY ======
  console.log('\n════════════════════════════════════════');
  console.log(` RESULTS: ${results.passed} passed, ${results.failed} failed`);
  console.log('════════════════════════════════════════');
  if (results.errors.length > 0) {
    console.log('\n❌ Failed tests:');
    results.errors.forEach(e => console.log(`  • ${e}`));
  } else {
    console.log('\n🎉 All tests passed!');
  }
  console.log('');
}

run().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
