import { apiGet, apiGetById, apiPost, apiPut, apiDelete, endPointApi } from './api';

export interface LeadStatus {
  _id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type CreateLeadStatusPayload = Omit<LeadStatus, '_id' | 'createdAt' | 'updatedAt'>;
export type UpdateLeadStatusPayload = Partial<CreateLeadStatusPayload>;

export interface FetchParams {
  page?: number;
  limit?: number;
  search?: string;
}

// GET /api/lead-statuses?page=&limit=&search=
export const fetchLeadStatuses = async (params?: FetchParams): Promise<PaginatedResponse<LeadStatus>> => {
  const { data } = await apiGet(endPointApi.leadStatuses, params);
  return data;
};

// GET /api/lead-statuses/:id
export const fetchLeadStatus = async (id: string): Promise<LeadStatus> => {
  const { data } = await apiGetById(endPointApi.leadStatuses, id);
  return data;
};

// POST /api/lead-statuses
export const createLeadStatus = async (payload: CreateLeadStatusPayload): Promise<LeadStatus> => {
  const { data } = await apiPost(endPointApi.leadStatusCreate, payload);
  return data;
};

// PUT /api/lead-statuses/:id
export const updateLeadStatus = async (id: string, payload: UpdateLeadStatusPayload): Promise<LeadStatus> => {
  const { data } = await apiPut(endPointApi.leadStatusUpdate, id, payload);
  return data;
};

// DELETE /api/lead-statuses/:id
export const deleteLeadStatus = async (id: string): Promise<void> => {
  await apiDelete(endPointApi.leadStatusDelete, id);
};

// GET /api/lead-statuses/export?search=
export const exportLeadStatuses = async (search?: string): Promise<LeadStatus[]> => {
  const { data } = await apiGet(endPointApi.leadStatusExport, search ? { search } : undefined);
  return data;
};
