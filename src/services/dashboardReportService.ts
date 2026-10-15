import api, { endPointApi } from './api';

export interface DashboardReportParams {
  startDate?: string | null;
  endDate?: string | null;
  assgin?: string;
  assginTo?: string;
  status?: string;
  reason_call?: string;
  product?: string;
  orderStatus?: string;
  gender?: string;
  courier?: string;
  paymentType?: string;
  search?: string;
}

// Download helper
export const downloadBlobFile = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(new Blob([blob], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// GET /api/dashboard/export/leads
export const exportDashboardLeadsApi = async (params?: DashboardReportParams): Promise<Blob> => {
  const cleanParams: Record<string, any> = {};
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'all') {
        cleanParams[key] = value;
      }
    });
  }

  const response = await api.get(endPointApi.dashboardExportLeads, {
    params: cleanParams,
    responseType: 'blob'
  });
  return response.data;
};

// GET /api/dashboard/export/orders
export const exportDashboardOrdersApi = async (params?: DashboardReportParams): Promise<Blob> => {
  const cleanParams: Record<string, any> = {};
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'all') {
        cleanParams[key] = value;
      }
    });
  }

  const response = await api.get(endPointApi.dashboardExportOrders, {
    params: cleanParams,
    responseType: 'blob'
  });
  return response.data;
};
