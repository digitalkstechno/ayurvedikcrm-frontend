import api, { apiGet, apiGetById, apiPost, apiPut, apiDelete, endPointApi } from './api';
import { jsonToCsvBlob } from '../utils/csvUtils';

export const fetchReturnOrders = async (params = {}) => {
  return await apiGet('/return-orders', params);
};

export const fetchReturnOrderById = async (id: string) => {
  return await apiGetById('/return-orders', id);
};

export const fetchStaffReturnStats = async (params = {}) => {
  return await apiGet('/return-orders/stats/staff', params);
};

export const fetchReturnOrderSummaryStats = async (params = {}) => {
  return await apiGet('/return-orders/stats/summary', params);
};

export const createReturnOrderApi = async (data: any) => {
  return await apiPost('/return-orders', data);
};

export const updateReturnOrderApi = async (id: string, data: any) => {
  return await apiPut('/return-orders', id, data);
};

export const deleteReturnOrderApi = async (id: string) => {
  return await apiDelete('/return-orders', id);
};

export const exportReturnOrders = async (params: any = {}): Promise<Blob> => {
  const { data } = await api.get(endPointApi.returnOrderExport, { params });

  const formattedData = data.map((r: any, index: number) => {
    const formattedDate = r.createdAt ? (() => {
      const d = new Date(r.createdAt);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = String(d.getFullYear()).slice(-2);
      return `${day}/${month}/${year}`;
    })() : "-";
    const formattedOrderDate = (r.orderId && r.orderId.createdAt) ? (() => {
      const d = new Date(r.orderId.createdAt);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = String(d.getFullYear()).slice(-2);
      return `${day}/${month}/${year}`;
    })() : "-";

    return {
      "No": index + 1,
      "Mobile Number": r.phone_number || "-",
      "Assgin To": r.assginTo?.name || r.assginTo || "-",
      "Order Date": formattedOrderDate,
      "Product Name": r.products?.map((p: any) => p.name).join(", ") || "-",
      "Amount": r.amount || 0,
      "Return Order Date": formattedDate,
      "Customer Name": r.customerName || "-",
      "Type": r.type || "RTO",
    };
  });

  return jsonToCsvBlob(formattedData);
};

export const exportStaffReturnStatsApi = async (params: any = {}): Promise<Blob> => {
  const response = await api.get(endPointApi.staffReturnStatsExport, {
    params,
    responseType: 'blob'
  });
  return response.data;
};
