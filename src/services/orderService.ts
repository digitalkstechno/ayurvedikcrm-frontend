import api, { apiGet, apiPost, apiPut, apiDelete, endPointApi } from './api';
import { jsonToCsvBlob } from '../utils/csvUtils';

export interface OrderProduct {
  productId: string;
  name: string;
  amount: number;
  quantity: number;
}

export interface Order {
  _id?: string;
  leadId?: string;
  name: string;
  phone_number: string;
  products?: OrderProduct[];
  product?: string;
  amount?: number;
  quantity?: number;
  grandTotal?: number;
  paymentType: 'COD' | 'Prepaid';
  courier?: string;
  assginTo?: string;
  transactionId?: string;
  delivery_no?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats?: {
    delivered: number;
    rto: number;
    inTransit: number;
  };
}

export interface FetchParams {
  page?: number;
  limit?: number;
  product?: string;
  assginTo?: string;
  courier?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

// GET /api/orders
export const fetchOrders = async (params?: FetchParams): Promise<PaginatedResponse<Order>> => {
  const { data } = await apiGet(endPointApi.orders, params);
  return data;
};

// POST /api/orders
export const createOrderApi = async (payload: Order): Promise<Order> => {
  const { data } = await apiPost(endPointApi.orderCreate, payload);
  return data;
};

// PUT /api/orders/:id
export const updateOrderApi = async (id: string, payload: Partial<Order>): Promise<Order> => {
  const { data } = await apiPut(endPointApi.orderUpdate, id, payload);
  return data;
};

// DELETE /api/orders/:id
export const deleteOrderApi = async (id: string): Promise<void> => {
  await apiDelete(endPointApi.orderDelete, id);
};

// GET /api/orders/export
export const exportOrders = async (params?: FetchParams): Promise<Blob> => {
  const { data } = await api.get(endPointApi.orderExport, { params });
  
  const formattedData = data.map((order: any, index: number) => ({
    "No": index + 1,
    "Lead Name": order.name || "-",
    "Product Name": order.product || (order.products?.map((p: any) => p.name).join(", ") || "-"),
    "Grand Total": order.grandTotal || order.amount || 0,
    "Phone Number": order.phone_number || "-",
    "Date": order.createdAt ? (() => {
        const d = new Date(order.createdAt);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
    })() : "-",
    "Payment Type": order.paymentType || "COD",
    "Courier": order.courier || "-",
    "Assign To": order.assginTo?.name || order.assginTo || "-",
    "Transaction ID": order.transactionId || "-",
    "Return Type": order.status === "Returned" ? "Returned" : "-",
    "Repart Order Total": index + 1
  }));

  return jsonToCsvBlob(formattedData);
};
