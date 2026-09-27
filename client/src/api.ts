import { Instrument, Evaluation, Laboratory, User, PassportData, InstrumentDocument } from './types';

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
    const res = await fetch(`${API_BASE}/instruments/${id}/passport`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch Instrument Digital Passport');
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
};
