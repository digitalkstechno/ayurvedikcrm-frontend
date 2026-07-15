import api, { apiGet, apiGetById, apiPost, apiPut, apiDelete, endPointApi } from './api';
import { jsonToCsvBlob } from '../utils/csvUtils';

export interface Lead {
  _id?: string;
  name: string;
  phone_number: string;
  age?: number | string;
  gender?: string;
  address?: string;
  product?: string;
  amount?: number;
  quantity?: number;
  subtotal?: number;
  products?: any[];
  assgin?: any;
  status?: any;
  reason_call?: any;
  note?: string;
  remark?: string;
  reminder?: string;
  orderStatus?: boolean;
  isRepeat?: boolean;
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

export interface FetchParams {
  page?: number;
  limit?: number;
  product?: string;
  assgin?: string;
  status?: string;
  reason_call?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  reminderStartDate?: string;
  reminderEndDate?: string;
  isRepeat?: boolean;
  isDeleted?: boolean;
}

// GET /api/leads
export const fetchLeads = async (params?: FetchParams): Promise<PaginatedResponse<Lead>> => {
  const { data } = await apiGet(endPointApi.leads, params);
  return data;
};

// GET /api/leads/:id
export const fetchLeadById = async (id: string): Promise<Lead> => {
  const { data } = await apiGetById(endPointApi.leads, id);
  return data;
};

// GET /api/leads/latest/:phone
export const fetchLatestLeadByPhone = async (phone: string): Promise<Lead> => {
  const { data } = await api.get(`${endPointApi.leads}/latest/${phone}`);
  return data;
};

// POST /api/leads
export const createLeadApi = async (payload: Lead): Promise<Lead> => {
  const { data } = await apiPost(endPointApi.leadCreate, payload);
  return data;
};

// PUT /api/leads/:id
export const updateLeadApi = async (id: string, payload: Partial<Lead>): Promise<Lead> => {
  const { data } = await apiPut(endPointApi.leadUpdate, id, payload);
  return data;
};

// DELETE /api/leads/:id  (soft delete)
export const deleteLeadApi = async (id: string): Promise<void> => {
  await apiDelete(endPointApi.leadDelete, id);
};

// GET /api/leads/export
export const exportLeads = async (params?: FetchParams): Promise<Blob> => {
  const { data } = await api.get(endPointApi.leadExport, { params });
  
  const formattedData = data.map((lead: any, index: number) => ({
    "No": index + 1,
    "Customer Name": lead.name || "-",
    "Phone Number": lead.phone_number || "-",
    "Product Name": lead.products?.length 
        ? lead.products.map((p: any) => p.name).join(", ") 
        : lead.product || "-",
    "Total": `₹${lead.subtotal || (lead.products?.length ? lead.products.reduce((acc: number, p: any) => acc + (p.subtotal || (p.amount * (p.quantity || 1)) || 0), 0) : (lead.amount || 0))}`,
    "Assign By": lead.assgin?.name || lead.assgin || "-",
    "Date": lead.createdAt ? (() => {
        const d = new Date(lead.createdAt);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
    })() : "-",
    "Status": lead.status?.name || lead.status || "-",
    "Reason Call": lead.reason_call?.name || lead.reason_call || "-",
    "Convert Order": lead.orderStatus ? "Yes" : "No",
    "Note": lead.note || "-",
  }));

  return jsonToCsvBlob(formattedData);
};

