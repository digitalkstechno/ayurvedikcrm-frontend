import api, { apiGet, apiPost, apiPut, apiDelete, endPointApi } from './api';
import { StatusHistoryItem } from './orderService';

export interface DeliveryProduct {
  productId: string;
  name: string;
  amount: number;
  quantity: number;
}

export interface DeliveryItem {
  _id?: string;
  id?: string;
  orderId?: string;
  leadId?: string;
  name: string;
  phone_number: string;
  products?: DeliveryProduct[];
  product?: string;
  amount?: number;
  quantity?: number;
  grandTotal?: number;
  paymentType: 'COD' | 'Prepaid';
  courier?: string;
  assginTo?: any;
  transactionId?: string;
  delivery_no?: string;
  status?: string;
  statusReason?: string;
  statusDate?: string;
  returnType?: string;
  statusHistory?: StatusHistoryItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedDeliveryResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats?: {
    delivered: number;
    rto: number;
    inTransit: number;
    deliveredGrowth?: string;
    rtoGrowth?: string;
  };
}

export interface FetchDeliveryParams {
  page?: number;
  limit?: number;
  product?: string;
  assginTo?: string;
  status?: string;
  courier?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export const fetchDeliveries = async (params: FetchDeliveryParams = {}): Promise<PaginatedDeliveryResponse<any>> => {
  const { data } = await apiGet(endPointApi.deliveries, params);
  return data;
};

export const fetchDeliveryById = async (id: string): Promise<DeliveryItem> => {
  const { data } = await apiGet(`${endPointApi.deliveries}/${id}`);
  return data;
};

export const createDeliveryApi = async (deliveryData: Partial<DeliveryItem>): Promise<DeliveryItem> => {
  const { data } = await apiPost(endPointApi.deliveryCreate, deliveryData);
  return data;
};

export const updateDeliveryApi = async (id: string, deliveryData: Partial<DeliveryItem>): Promise<DeliveryItem> => {
  const { data } = await apiPut(endPointApi.deliveryUpdate, id, deliveryData);
  return data;
};

export const deleteDeliveryApi = async (id: string): Promise<{ message: string; id: string }> => {
  const { data } = await apiDelete(endPointApi.deliveryDelete, id);
  return data;
};

export const exportDeliveries = async (params: FetchDeliveryParams = {}): Promise<Blob> => {
  const response = await api.get(endPointApi.deliveryExport, {
    params,
    responseType: 'blob'
  });
  return response.data;
};
