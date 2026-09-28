import { Instrument, Evaluation, Laboratory, User, PassportData, InstrumentDocument, Report, ReportVersion, RuleConfiguration, AuditLog, SimulationRun, IntegrityVerification, VersionDiff, DashboardStats } from './types';

const API_BASE = '/api';

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('marksure_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  // Authentication
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to login');
    return data;
  },

  async getMe(): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to get current official profile');
    return data;
  },

  async getOfficers(): Promise<{ officers: User[] }> {
    const res = await fetch(`${API_BASE}/auth/officers`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch officers');
    return data;
  },

  // Laboratories
  async getLaboratories(): Promise<{ laboratories: Laboratory[] }> {
    const res = await fetch(`${API_BASE}/laboratories`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch laboratories');
    return data;
  },

  // Instruments
  async getInstruments(params?: { search?: string; accuracyClass?: string; status?: string }): Promise<{ instruments: Instrument[] }> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.accuracyClass && params.accuracyClass !== 'ALL') query.append('accuracyClass', params.accuracyClass);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);

    const res = await fetch(`${API_BASE}/instruments?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch instruments');
    return data;
  },

  async getInstrument(id: string): Promise<{ instrument: Instrument }> {
    const res = await fetch(`${API_BASE}/instruments/${id}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch instrument profile');
    return data;
  },

  async getInstrumentPassport(id: string): Promise<{ passport: PassportData }> {
    try {
      const res = await fetch(`${API_BASE}/passports/${id}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {
      // Fall through to legacy endpoint
    }

    const res = await fetch(`${API_BASE}/instruments/${id}/passport`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch Instrument Digital Passport');
    return data;
  },

  async getPassports(params?: {
    q?: string;
    passportId?: string;
    serialNumber?: string;
    manufacturer?: string;
    model?: string;
    instrumentType?: string;
    accuracyClass?: string;
    complianceStatus?: string;
    result?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ passports: any[]; totalCount: number }> {
    const query = new URLSearchParams();
    if (params?.q) query.append('q', params.q);
    if (params?.passportId) query.append('passportId', params.passportId);
    if (params?.serialNumber) query.append('serialNumber', params.serialNumber);
    if (params?.manufacturer) query.append('manufacturer', params.manufacturer);
    if (params?.model) query.append('model', params.model);
    if (params?.instrumentType && params.instrumentType !== 'ALL') query.append('instrumentType', params.instrumentType);
    if (params?.accuracyClass && params.accuracyClass !== 'ALL') query.append('accuracyClass', params.accuracyClass);
    if (params?.complianceStatus && params.complianceStatus !== 'ALL') query.append('complianceStatus', params.complianceStatus);
    if (params?.result && params.result !== 'ALL') query.append('result', params.result);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);

    const res = await fetch(`${API_BASE}/passports?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch passports');
    return data;
  },

  async getPassportModelsSummary(): Promise<{ models: any[]; totalModels: number }> {
    const res = await fetch(`${API_BASE}/passports/models/summary`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch models approval summary');
    return data;
  },

  async getPassport(id: string): Promise<{ passport: any }> {
    const res = await fetch(`${API_BASE}/passports/${id}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch Digital Passport record');
    return data;
  },

  getPassportExportUrl(id: string, format: 'pdf' | 'json' = 'pdf'): string {
    const token = localStorage.getItem('marksure_token');
    return `${API_BASE}/passports/${id}/export?format=${format}&token=${token || ''}`;
  },

  getPassportSummaryUrl(id: string): string {
    const token = localStorage.getItem('marksure_token');
    return `${API_BASE}/passports/${id}/print-summary?token=${token || ''}`;
  },

  async recordPassportRecalibration(id: string, recalData: {
    calibrationDate: string;
    certificateNumber?: string;
    laboratoryName?: string;
    nextDueDate?: string;
    remarks?: string;
  }): Promise<{ event: any; message: string }> {
    const res = await fetch(`${API_BASE}/passports/${id}/recalibration`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(recalData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to record recalibration event');
    return data;
  },

  async createInstrument(formData: Partial<Instrument>): Promise<{ instrument: Instrument; message: string }> {
    const res = await fetch(`${API_BASE}/instruments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create instrument profile');
    return data;
  },

  async uploadInstrumentDocument(
    instrumentId: string,
    file?: File,
    title?: string,
    externalUrl?: string
  ): Promise<{ document: InstrumentDocument; message: string }> {
    const token = localStorage.getItem('marksure_token');
    
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      if (title) formData.append('title', title);

      const res = await fetch(`${API_BASE}/instruments/${instrumentId}/documents`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload document');
      return data;
    } else {
      const res = await fetch(`${API_BASE}/instruments/${instrumentId}/documents`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ externalUrl, title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to link document');
      return data;
    }
  },

  // Evaluations
  async getEvaluations(params?: { state?: string; search?: string; instrumentId?: string }): Promise<{ evaluations: Evaluation[] }> {
    const query = new URLSearchParams();
    if (params?.state && params.state !== 'ALL') query.append('state', params.state);
    if (params?.search) query.append('search', params.search);
    if (params?.instrumentId) query.append('instrumentId', params.instrumentId);

    const res = await fetch(`${API_BASE}/evaluations?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch evaluations');
    return data;
  },

  async getEvaluation(id: string): Promise<{ evaluation: Evaluation }> {
    const res = await fetch(`${API_BASE}/evaluations/${id}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch evaluation record');
    return data;
  },

  async createEvaluation(data: {
    instrumentId: string;
    laboratoryId: string;
    evaluationDate?: string;
    testingOfficerId?: string;
    reviewingOfficerId?: string;
    standardReference?: string;
    generalRemarks?: string;
    initialState?: string;
  }): Promise<{ evaluation: Evaluation; message: string }> {
    const res = await fetch(`${API_BASE}/evaluations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const respData = await res.json();
    if (!res.ok) throw new Error(respData.error || 'Failed to initialize evaluation session');
    return respData;
  },

  async updateEvaluationState(
    id: string,
    state: string,
    reviewRemarks?: string
  ): Promise<{ evaluation: Evaluation; message: string }> {
    const res = await fetch(`${API_BASE}/evaluations/${id}/state`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ state, reviewRemarks }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update evaluation state');
    return data;
  },

  // DIGITAL TEST WORKSPACE API
  async getEvaluationTests(evaluationId: string): Promise<{
    testRecords: any[];
    evaluationState: string;
    instrument: Instrument;
  }> {
    const res = await fetch(`${API_BASE}/evaluations/${evaluationId}/tests`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch test records');
    return data;
  },

  async calculateTest(
    evaluationId: string,
    testType: string,
    payload: any
  ): Promise<{ result: any }> {
    const res = await fetch(`${API_BASE}/evaluations/${evaluationId}/calculate/${testType}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Calculation preview failed');
    return data;
  },

  async saveTestRecord(
    evaluationId: string,
    testType: string,
    payload: any
  ): Promise<{ message: string; record: any; complianceResult?: any }> {
    const res = await fetch(`${API_BASE}/evaluations/${evaluationId}/tests/${testType}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.status === 409) {
      const err: any = new Error(data.message || 'Sync conflict detected');
      err.status = 409;
      err.conflict = true;
      err.serverRecord = data.serverRecord;
      throw err;
    }
    if (!res.ok) throw new Error(data.error || 'Failed to save test record');
    return data;
  },

  async uploadTestAttachment(
    evaluationId: string,
    testRecordId: string,
    formData: FormData
  ): Promise<{ attachment: any; message: string }> {
    const token = localStorage.getItem('marksure_token');
    const res = await fetch(`${API_BASE}/evaluations/${evaluationId}/tests/${testRecordId}/attachments`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to upload attachment');
    return data;
  },

  async deleteTestAttachment(
    evaluationId: string,
    testRecordId: string,
    attachmentId: string
  ): Promise<{ message: string }> {
    const res = await fetch(
      `${API_BASE}/evaluations/${evaluationId}/tests/${testRecordId}/attachments/${attachmentId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete attachment');
    return data;
  },

  async submitEvaluationForReview(
    evaluationId: string,
    notes?: string
  ): Promise<{ evaluation: Evaluation; message: string }> {
    const res = await fetch(`${API_BASE}/evaluations/${evaluationId}/workflow/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ notes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit evaluation for review');
    return data;
  },

  async reviewEvaluationAction(
    evaluationId: string,
    action: 'APPROVE' | 'RETURN',
    remarks: string
  ): Promise<{ evaluation: Evaluation; message: string }> {
    const res = await fetch(`${API_BASE}/evaluations/${evaluationId}/workflow/review`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action, remarks }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit review decision');
    return data;
  },

  // ═══ REPORTS ═══
  async generateReport(evaluationId: string): Promise<{ report: Report; message: string }> {
    const res = await fetch(`${API_BASE}/reports/generate/${evaluationId}`, {
      method: 'POST', headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate report');
    return data;
  },

  async getReports(params?: { search?: string; status?: string }): Promise<{ reports: Report[] }> {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.status && params.status !== 'ALL') q.append('status', params.status);
    const res = await fetch(`${API_BASE}/reports?${q}`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async getReport(id: string, version?: number): Promise<{ report: Report }> {
    const url = version ? `${API_BASE}/reports/${id}?version=${version}` : `${API_BASE}/reports/${id}`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async finalizeReport(id: string): Promise<{ report: Report; integrityHash: string; message: string }> {
    const res = await fetch(`${API_BASE}/reports/${id}/finalize`, {
      method: 'POST', headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async reviseReport(
    id: string,
    payload: { changeDescription: string; updatedObservations?: any[]; testTypeToUpdate?: string; customRemarks?: string } | string
  ): Promise<{ report: Report; newVersion: number; message: string }> {
    const body = typeof payload === 'string' ? { changeDescription: payload } : payload;
    const res = await fetch(`${API_BASE}/reports/${id}/revise`, {
      method: 'POST', headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async verifyReportIntegrity(id: string): Promise<IntegrityVerification> {
    const res = await fetch(`${API_BASE}/reports/${id}/verify`, {
      method: 'POST', headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async verifyReportByReportId(reportId: string): Promise<IntegrityVerification> {
    const res = await fetch(`${API_BASE}/reports/verify/${reportId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async verifyReportByPdfUpload(file: File): Promise<IntegrityVerification> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/reports/verify-upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to verify uploaded PDF');
    return data;
  },

  getReportExportUrl(id: string, format: 'pdf' | 'docx', version?: number): string {
    const token = localStorage.getItem('marksure_token');
    return `${API_BASE}/reports/${id}/export/${format}?token=${token}${version ? `&version=${version}` : ''}`;
  },

  getCertificateExportUrl(
    id: string,
    templateId: 'INDIAN_RRSL' | 'OIML_CS',
    format: 'pdf' | 'docx' = 'pdf',
    version?: number
  ): string {
    const token = localStorage.getItem('marksure_token');
    return `${API_BASE}/reports/${id}/export-certificate/${templateId}?format=${format}&token=${token}${
      version ? `&version=${version}` : ''
    }`;
  },

  async getAvailableCertificateTemplates(): Promise<{ templates: any[] }> {
    const res = await fetch(`${API_BASE}/reports/templates/available`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async getReportVersions(id: string): Promise<{ versions: ReportVersion[] }> {
    const res = await fetch(`${API_BASE}/reports/${id}/versions`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async getReportDiff(id: string, v1: number, v2: number): Promise<VersionDiff> {
    const res = await fetch(`${API_BASE}/reports/${id}/diff/${v1}/${v2}`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  // ═══ SEARCH ═══
  async search(params: Record<string, string>): Promise<{ instruments: any[]; evaluations: any[]; reports: any[] }> {
    const q = new URLSearchParams(params);
    const res = await fetch(`${API_BASE}/search?${q}`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  // ═══ AUDIT ═══
  async getAuditLogs(params?: Record<string, string>): Promise<{ logs: AuditLog[] }> {
    const q = new URLSearchParams(params || {});
    const res = await fetch(`${API_BASE}/audit?${q}`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async getEvaluationAuditTrail(evaluationId: string): Promise<{ auditLogs: AuditLog[]; timelineEvents: any[] }> {
    const res = await fetch(`${API_BASE}/audit/evaluation/${evaluationId}`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  // ═══ RULE CONFIGURATIONS ═══
  async getRuleConfigs(): Promise<{ ruleConfigs: RuleConfiguration[] }> {
    const res = await fetch(`${API_BASE}/rule-configs`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async createRuleConfig(config: Partial<RuleConfiguration>): Promise<{ ruleConfig: RuleConfiguration }> {
    const res = await fetch(`${API_BASE}/rule-configs`, {
      method: 'POST', headers: getAuthHeaders(),
      body: JSON.stringify(config),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async activateRuleConfig(id: string): Promise<{ ruleConfig: RuleConfiguration; message: string }> {
    const res = await fetch(`${API_BASE}/rule-configs/${id}/activate`, {
      method: 'POST', headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  // ═══ SIMULATOR ═══
  async runSimulation(params: {
    name: string;
    description?: string;
    baseRuleConfigId?: string;
    simulatedRuleConfigId: string;
    filters?: {
      startDate?: string;
      endDate?: string;
      instrumentType?: string;
      accuracyClass?: string;
    };
  }): Promise<{ simulation: SimulationRun; message: string }> {
    const res = await fetch(`${API_BASE}/simulator/run`, {
      method: 'POST', headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async getSimulationRuns(): Promise<{ runs: SimulationRun[] }> {
    const res = await fetch(`${API_BASE}/simulator/runs`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async getSimulationRun(id: string): Promise<{ run: SimulationRun }> {
    const res = await fetch(`${API_BASE}/simulator/runs/${id}`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  getSimulationExportUrl(id: string, format: 'pdf' | 'csv'): string {
    const token = localStorage.getItem('marksure_token');
    return `${API_BASE}/simulator/runs/${id}/export/${format}?token=${token}`;
  },

  // ═══ DASHBOARD ═══
  async getDashboardStats(): Promise<DashboardStats> {
    const [evalRes, instRes, reportRes, auditRes] = await Promise.all([
      fetch(`${API_BASE}/evaluations`, { headers: getAuthHeaders() }),
      fetch(`${API_BASE}/instruments`, { headers: getAuthHeaders() }),
      fetch(`${API_BASE}/reports`, { headers: getAuthHeaders() }),
      fetch(`${API_BASE}/audit?limit=10`, { headers: getAuthHeaders() }),
    ]);
    const evalData = await evalRes.json();
    const instData = await instRes.json();
    const rptData = await reportRes.json();
    const auditData = await auditRes.json();
    const evaluations = evalData.evaluations || [];
    const evaluationsByState: Record<string, number> = {};
    evaluations.forEach((e: any) => { evaluationsByState[e.state] = (evaluationsByState[e.state] || 0) + 1; });
    return {
      totalInstruments: (instData.instruments || []).length,
      totalEvaluations: evaluations.length,
      evaluationsByState,
      totalReports: (rptData.reports || []).length,
      recentReports: (rptData.reports || []).slice(0, 5),
      recentAuditLogs: (auditData.logs || []).slice(0, 10),
    };
  },
};

