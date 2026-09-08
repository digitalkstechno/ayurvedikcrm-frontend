"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "../../context/ToastContext";
import { Table, Column } from "../../components/common/Table";
import { Select } from "../../components/common/Select";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { Close, CalendarToday } from "@mui/icons-material";
import { FiEdit, FiTrash2, FiRefreshCcw, FiMessageSquare } from "react-icons/fi";
import { fetchProducts } from "../../services/productService";
import { fetchUsers } from "../../services/userService";
import { fetchOrders, createOrderApi, updateOrderApi, deleteOrderApi, exportOrders, StatusHistoryItem } from "../../services/orderService";
import { usePermission } from "../../utils/permissionUtils";
import { DeleteConfirmModal } from "../../components/common/DeleteConfirmModal";
import { getAuthenticatedUser } from "../../utils/authUtils";
import { fetchCouriers } from "../../services/courierService";
import { DateRangePicker } from "../../components/common/DateRangePicker";
import { formatDateTime } from "../../utils/dateUtils";
import { fetchReasonToCalls, ReasonToCall } from "../../services/reasonToCallService";

export interface DeliveryOrder {
  id: string;
  leadId: string;
  name: string;
  phone_number: string;
  product: string;
  amount: number;
  quantity: number;
  subtotal: number;
  grandTotal: number;
  date: string;
  paymentType: "COD" | "Prepaid";
  courier: string;
  assginTo: string;
  assginToId?: string;
  transactionId: string;
  delivery_no?: string;
  returnType?: string;
  repartOrderTotal?: number;
  status: string;
  statusReason?: string;
  statusHistory?: StatusHistoryItem[];
  _products?: any[];
  products?: any[];
}

interface SelectedProductRow {
  id: string;
  productId?: string;
  name: string;
  amount: number;
  quantity: number;
  subtotal?: number;
}

export default function DeliveryListPage() {
  const { hasPermission } = usePermission();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [filterProduct, setFilterProduct] = useState<string[]>(["all"]);
  const [filterAssignee, setFilterAssignee] = useState<string[]>(["all"]);
  const [filterCourier, setFilterCourier] = useState<string[]>(["all"]);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [reasonOptions, setReasonOptions] = useState<ReasonToCall[]>([]);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetOrderForStatus, setTargetOrderForStatus] = useState<DeliveryOrder | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string>("");
  const [statusReasonInput, setStatusReasonInput] = useState<string>("");
  const [selectedPredefinedReason, setSelectedPredefinedReason] = useState<string>("");
  const [reasonError, setReasonError] = useState<string>("");
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedOrderForHistory, setSelectedOrderForHistory] = useState<DeliveryOrder | null>(null);

  useEffect(() => {
    fetchReasonToCalls({ page: 1, limit: 100 })
      .then(res => setReasonOptions(res.data || []))
      .catch(() => {});
  }, []);

  const [orderStats, setOrderStats] = useState({
    delivered: 0,
    rto: 0,
    inTransit: 0
  });

  const getFirstDayOfMonthString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  };

  const getTodayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [startDate, setStartDate] = useState<string | null>(getFirstDayOfMonthString());
  const [endDate, setEndDate] = useState<string | null>(getTodayString());

  const loadOrdersData = async (overrideSearch?: string, overrideDates?: { start: string | null, end: string | null }, overrideAssignee?: string, overridePage?: number, overrideLimit?: number) => {
    try {
      setIsFetchingData(true);
      const assigneeFilter = overrideAssignee === 'all' ? undefined : (overrideAssignee || (filterAssignee.includes('all') ? undefined : filterAssignee.join(',')));
      const searchToUse = overrideSearch !== undefined ? overrideSearch : searchQuery;
      const startToUse = overrideDates !== undefined ? overrideDates.start : startDate;
      const endToUse = overrideDates !== undefined ? overrideDates.end : endDate;
      const pageToUse = overridePage !== undefined ? overridePage : currentPage;
      const limitToUse = overrideLimit !== undefined ? overrideLimit : rowsPerPage;
      
      const ordersRes = await fetchOrders({ 
        page: pageToUse, 
        limit: limitToUse,
        search: searchToUse || undefined,
        product: filterProduct.includes('all') ? undefined : filterProduct.join(','),
        assginTo: assigneeFilter,
        courier: filterCourier.includes('all') ? undefined : filterCourier.join(','),
        startDate: startToUse || undefined,
        endDate: endToUse || undefined
      });

      const mapped = ordersRes.data.map((o: any) => ({
        id: o._id || o.id,
        leadId: o.leadId?._id || o.leadId || "",
        name: o.name,
        phone_number: o.phone_number,
        product: o.product || (o.products?.map((p: any) => p.name).join(", ") || ""),
        amount: o.amount || 0,
        quantity: o.quantity || 1,
        subtotal: o.amount || 0,
        grandTotal: o.grandTotal || o.subtotal || (o.products?.length ? o.products.reduce((acc: number, p: any) => acc + (p.subtotal || (p.amount * (p.quantity || 1)) || 0), 0) : (o.amount || 0)),
        date: formatDateTime(o.createdAt || new Date()),
        paymentType: o.paymentType || "COD",
        courier: o.courier || "",
        assginTo: o.assginTo?.name || o.assginTo || "",
        assginToId: typeof o.assginTo === 'object' ? (o.assginTo?._id || o.assginTo?.id || "") : (o.assginTo || ""),
        transactionId: o.transactionId || "",
        delivery_no: o.delivery_no || "",
        status: o.status || "IN TRANSIT",
        statusReason: o.statusReason || "",
        statusHistory: (o.statusHistory && o.statusHistory.length > 0)
          ? o.statusHistory
          : (o.statusReason ? [{ oldStatus: 'IN TRANSIT', newStatus: o.status || 'IN TRANSIT', reason: o.statusReason, updatedBy: typeof o.assginTo === 'object' ? o.assginTo?.name : (o.assginTo || 'User'), createdAt: o.updatedAt || o.createdAt }] : []),
        _products: o.products || []
      }));
      setOrders(mapped);
      if (ordersRes.total !== undefined) {
        setTotalRecords(ordersRes.total);
      } else if (ordersRes.data) {
        setTotalRecords(ordersRes.data.length);
      }

      if (ordersRes.stats) {
        setOrderStats({
          delivered: ordersRes.stats.delivered || 0,
          rto: ordersRes.stats.rto || 0,
          inTransit: ordersRes.stats.inTransit || 0
        });
      } else {
        const del = mapped.filter(o => o.status?.toUpperCase() === 'DELIVERED').length;
        const rto = mapped.filter(o => o.status?.toUpperCase() === 'RTO').length;
        const trans = mapped.filter(o => ['IN TRANSIT', 'DISPATCHED', 'CONVERTED', 'PROCESSING'].includes(o.status?.toUpperCase())).length;
        setOrderStats({ delivered: del, rto: rto, inTransit: trans });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingData(false);
    }
  };

  const initFetchRef = React.useRef(false);

  React.useEffect(() => {
    if (initFetchRef.current) return;
    initFetchRef.current = true;

    const loadMasterData = async () => {
      try {
        const [usersRes, prodsRes, couriersRes] = await Promise.all([
          fetchUsers({ page: 1, limit: 100 }),
          fetchProducts({ page: 1, limit: 100 }),
          fetchCouriers({ page: 1, limit: 100 })
        ]);
        setUsers(usersRes.data);
        setProducts(prodsRes.data);
        if (couriersRes?.data) setCouriers(couriersRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    const user = getAuthenticatedUser();
    let initialAssigneeFilter = "all";
    if (user) {
      setCurrentUser(user);
      const admin = user?.roles?.some((r: string) => r.toLowerCase().includes('admin'));
      setIsAdmin(admin);
      if (!admin) {
        initialAssigneeFilter = user._id || user.id;
        setFilterAssignee([initialAssigneeFilter]);
      }
    }

    loadMasterData().then(() => {
      setInitialLoaded(true);
    });
    loadOrdersData(undefined, undefined, initialAssigneeFilter);
  }, []);

  React.useEffect(() => {
    if (initialLoaded) {
      setCurrentPage(1);
      loadOrdersData(undefined, undefined, undefined, 1);
    }
  }, [filterProduct, filterAssignee, filterCourier]);

  const toast = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<DeliveryOrder | null>(null);

  const [paymentType, setPaymentType] = useState<"COD" | "Prepaid">("COD");
  const [txnId, setTxnId] = useState("");
  const [deliveryNo, setDeliveryNo] = useState("");
  const [courier, setCourier] = useState("");
  const [modalProductSelect, setModalProductSelect] = useState("");
  const [modalSelectedProducts, setModalSelectedProducts] = useState<SelectedProductRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<DeliveryOrder | null>(null);

  const handleAddProduct = () => {
    if (!modalProductSelect) return;
    const prod = products.find((p) => p._id === modalProductSelect || p.id === modalProductSelect);
    if (!prod) return;

    const existingIdx = modalSelectedProducts.findIndex((p) => p.productId === prod._id || p.id === prod._id);
    if (existingIdx >= 0) {
      const updated = [...modalSelectedProducts];
      updated[existingIdx].quantity += 1;
      setModalSelectedProducts(updated);
      toast.success("Product quantity incremented!");
    } else {
      setModalSelectedProducts([
        ...modalSelectedProducts,
        {
          id: prod._id || prod.id,
          productId: prod._id || prod.id,
          name: prod.name,
          amount: prod.amount,
          quantity: 1,
          subtotal: prod.amount
        }
      ]);
      toast.success("Product added!");
    }
    setModalProductSelect("");
  };

  const handleRemoveProduct = (id: string) => {
    setModalSelectedProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleQtyChange = (id: string, qty: number) => {
    const safeQty = Math.max(1, qty);
    setModalSelectedProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, quantity: safeQty, subtotal: safeQty * p.amount } : p))
    );
  };

  const totalAmount = modalSelectedProducts.reduce(
    (sum, p) => sum + (p.amount || 0) * (p.quantity || 1),
    0
  );

  const openEdit = (order: DeliveryOrder) => {
    setActiveOrder(order);
    setPaymentType(order.paymentType || "COD");
    setTxnId(order.transactionId || "");
    setDeliveryNo(order.delivery_no || "");
    setCourier(order.courier || "");

    if (order._products && order._products.length > 0) {
      setModalSelectedProducts(order._products.map((p: any) => ({
        id: p.productId?._id || p.productId || p._id || Date.now().toString(),
        productId: p.productId?._id || p.productId || p._id,
        name: p.name,
        amount: p.productId?.amount || p.amount || 0,
        quantity: p.quantity || 1,
        subtotal: p.subtotal || ((p.productId?.amount || p.amount || 0) * (p.quantity || 1))
      })));
    } else {
      const existingProds = products.filter((p) => (order.product || "").includes(p.name));
      setModalSelectedProducts(existingProds.map((p) => ({
        id: p._id || p.id,
        productId: p._id || p.id,
        name: p.name,
        amount: p.amount,
        quantity: 1,
        subtotal: p.amount
      })));
    }

    setModalProductSelect("");
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;
    if (modalSelectedProducts.length === 0) {
      toast.warning("Please add at least one product!");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: activeOrder.name,
        phone_number: activeOrder.phone_number,
        products: modalSelectedProducts.map((p) => ({
          productId: p.productId || p.id,
          name: p.name,
          amount: p.amount,
          quantity: p.quantity,
          subtotal: (p.amount || 0) * (p.quantity || 1)
        })),
        product: modalSelectedProducts.map((p) => p.name).join(", "),
        amount: totalAmount,
        quantity: modalSelectedProducts.reduce((sum, p) => sum + (p.quantity || 0), 0),
        subtotal: totalAmount,
        grandTotal: totalAmount,
        paymentType,
        courier,
        transactionId: txnId,
        delivery_no: deliveryNo,
        status: activeOrder.status || "IN TRANSIT"
      };

      await updateOrderApi(activeOrder.id, payload);
      setOrders(prev => prev.map(o => o.id === activeOrder.id ? { ...o, ...payload, _products: payload.products } : o));
      toast.success("Delivery Order updated successfully!");
      setEditOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (order: DeliveryOrder) => {
    setOrderToDelete(order);
    setDeleteOpen(true);
  };

  const executeDelete = async () => {
    if (!orderToDelete) return;
    try {
      await deleteOrderApi(orderToDelete.id);
      setOrders(prev => prev.filter(o => o.id !== orderToDelete.id));
      toast.warning("Delivery Order deleted.");
      setDeleteOpen(false);
      setOrderToDelete(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete order");
    }
  };

  const handleExport = async () => {
    if (!hasPermission("Delivery-export")) {
      toast.error("You do not have permission to export.");
      return;
    }
    setIsExporting(true);
    try {
      const assigneeFilter = filterAssignee.includes('all') ? undefined : filterAssignee.join(',');
      const blob = await exportOrders({
        search: searchQuery || undefined,
        product: filterProduct.includes('all') ? undefined : filterProduct.join(','),
        assginTo: assigneeFilter,
        courier: filterCourier.includes('all') ? undefined : filterCourier.join(','),
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `delivery_orders_export_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success("Export successful!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to export delivery orders");
    } finally {
      setIsExporting(false);
    }
  };

  const promptStatusChange = (order: DeliveryOrder, newStatus: string) => {
    const normCurrent = (order.status || "IN TRANSIT").toUpperCase();
    const normNew = newStatus.toUpperCase();
    if (normCurrent === normNew) return;

    setTargetOrderForStatus(order);
    setPendingStatus(newStatus);
    setStatusReasonInput("");
    setReasonError("");
    setStatusModalOpen(true);
  };

  const confirmStatusChange = async () => {
    const finalReason = statusReasonInput.trim();
    if (!finalReason) {
      setReasonError("Reason is required when changing status.");
      return;
    }
    if (!targetOrderForStatus) return;

    try {
      setIsSavingStatus(true);
      const orderId = targetOrderForStatus.id;
      const oldStatus = targetOrderForStatus.status;
      const newStatus = pendingStatus;
      const newHistoryItem: StatusHistoryItem = {
        oldStatus: oldStatus || "IN TRANSIT",
        newStatus: newStatus,
        reason: finalReason,
        updatedBy: currentUser?.name || currentUser?.email || "User",
        createdAt: new Date().toISOString()
      };

      setOrders(prev => prev.map(o => {
        if (o.id === orderId) {
          const updatedHistory = [...(o.statusHistory || []), newHistoryItem];
          return { ...o, status: newStatus, statusReason: finalReason, statusHistory: updatedHistory };
        }
        return o;
      }));

      setOrderStats(prev => {
        const next = { ...prev };
        const oldNorm = (oldStatus || "IN TRANSIT").toUpperCase();
        const newNorm = newStatus.toUpperCase();

        if (oldNorm === "DELIVERED") next.delivered = Math.max(0, next.delivered - 1);
        else if (oldNorm === "RTO") next.rto = Math.max(0, next.rto - 1);
        else next.inTransit = Math.max(0, next.inTransit - 1);

        if (newNorm === "DELIVERED") next.delivered += 1;
        else if (newNorm === "RTO") next.rto += 1;
        else next.inTransit += 1;

        return next;
      });

      await updateOrderApi(orderId, { status: newStatus, statusReason: finalReason });
      toast.success(`Delivery status updated to ${newStatus}`);
      setStatusModalOpen(false);
      setTargetOrderForStatus(null);
      setStatusReasonInput("");
      setSelectedPredefinedReason("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update delivery status");
      loadOrdersData();
    } finally {
      setIsSavingStatus(false);
    }
  };

  const columns: Column<DeliveryOrder>[] = [
    { key: "id", header: "No", render: (_, __, i) => (currentPage - 1) * rowsPerPage + i + 1, sortable: false },
    { key: "name", header: "Lead Name", render: (val) => <span className="uppercase font-bold text-[12px] text-[#1f2f3e]">{val || "UNKNOWN"}</span> },
    { key: "product", header: "Product Name", render: (val) => val || "Product Name" },
    { key: "grandTotal", header: "Grand Total", render: (val) => (typeof val === "number" ? val.toFixed(2) : (val || "0.00")) },
    { key: "phone_number", header: "Phone Number" },
    { key: "date", header: "Date" },
    { key: "paymentType", header: "Payment Type", render: (val) => val || "COD" },
    {
      key: "status",
      header: "Delivery Status",
      sortable: false,
      render: (val, row) => {
        const rawStatus = (val || "IN TRANSIT").toUpperCase();
        const normStatus = rawStatus === "DISPATCHED" || rawStatus === "CONVERTED" || rawStatus === "PROCESSING"
          ? "IN TRANSIT"
          : rawStatus;

        const getPillColor = (st: string) => {
          if (st === "DELIVERED") return "bg-[#10B981] hover:bg-[#059669] text-white";
          if (st === "RTO") return "bg-[#EF4444] hover:bg-[#DC2626] text-white";
          return "bg-[#64748B] hover:bg-[#475569] text-white";
        };

        return (
          <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
            <select
              value={normStatus}
              onChange={(e) => promptStatusChange(row, e.target.value)}
              className={`appearance-none cursor-pointer px-4 py-1.5 pr-8 rounded-full text-xs font-bold shadow-xs transition-all outline-none border border-transparent ${getPillColor(normStatus)}`}
            >
              <option value="DELIVERED" className="bg-white text-emerald-800 font-semibold py-1">
                DELIVERED
              </option>
              <option value="RTO" className="bg-white text-rose-800 font-semibold py-1">
                RTO
              </option>
              <option value="IN TRANSIT" className="bg-white text-slate-800 font-semibold py-1">
                IN TRANSIT
              </option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white text-[10px] font-bold">
              ▼
            </span>
          </div>
        );
      }
    },
    {
      key: "assginTo",
      header: "Assign To",
      sortable: false,
      render: (val) => (
        <span className="font-semibold text-xs text-zinc-700">
          {val || "-"}
        </span>
      )
    },
    {
      key: "analytics",
      header: "Analytics",
      sortable: false,
      render: (_, row, i) => {
        const rawStatus = (row.status || "IN TRANSIT").toUpperCase();
        const normStatus = rawStatus === "DISPATCHED" || rawStatus === "CONVERTED" || rawStatus === "PROCESSING"
          ? "IN TRANSIT"
          : rawStatus;

        if (normStatus === "DELIVERED") {
          return (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#10B981] text-white text-xs font-bold rounded-lg shadow-xs">
              <span className="text-sm">✓</span> DELIVERED
            </span>
          );
        }
        if (normStatus === "RTO") {
          if (i === 3) {
            return (
              <div className="flex items-center gap-1.5">
                <button title="Analytics" className="p-1.5 bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-md text-xs">
                  📊
                </button>
                <button title="Tools" className="p-1.5 bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-md text-xs">
                  🔧
                </button>
                <button title="Repeat" className="p-1.5 bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-md text-xs">
                  🔄
                </button>
              </div>
            );
          }
          return (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#EF4444] text-white text-xs font-bold rounded-lg shadow-xs">
              <span className="text-sm">!</span> RTO
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#64748B] text-white text-xs font-bold rounded-lg shadow-xs">
            <span className="text-sm">🚚</span> IN TRANSIT
          </span>
        );
      }
    },
    {
      key: "actions",
      header: "Action",
      sortable: false,
      render: (_, row) => {
        const hasHistory = (row.statusHistory && row.statusHistory.length > 0) || !!row.statusReason;
        return (
          <div className="flex items-center gap-1">
            {hasHistory && (
              <button
                onClick={() => {
                  setSelectedOrderForHistory(row);
                  setHistoryModalOpen(true);
                }}
                className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-all"
                title="View Reason History"
              >
                <FiMessageSquare className="w-4 h-4" />
              </button>
            )}
            {(hasPermission("Delivery-list") || hasPermission("Delivery-edit")) && (
              <button
                onClick={() => openEdit(row)}
                className="p-1.5 text-text-secondary hover:text-primary-teal hover:bg-zinc-100 rounded-lg transition-all"
                title="Edit Delivery Order"
              >
                <FiEdit className="w-4 h-4" />
              </button>
            )}
            {(hasPermission("Delivery-list") || hasPermission("Delivery-delete")) && (
              <button
                onClick={() => handleDeleteClick(row)}
                className="p-1.5 text-text-secondary hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                title="Delete Delivery Order"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      }
    }
  ];

  const renderModalBody = () => (
    <div className="space-y-6 text-left">
      <div className="space-y-2">
        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Payment Type
        </label>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-zinc-650 cursor-pointer">
            <input
              type="radio"
              name="paymentType"
              value="COD"
              checked={paymentType === "COD"}
              onChange={() => setPaymentType("COD")}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            COD Discount
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-650 cursor-pointer">
            <input
              type="radio"
              name="paymentType"
              value="Prepaid"
              checked={paymentType === "Prepaid"}
              onChange={() => setPaymentType("Prepaid")}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            Prepaid Discount
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          label="Transaction ID"
          value={txnId}
          onChange={(e) => setTxnId(e.target.value)}
          placeholder="e.g. TXN12345"
          required={paymentType === 'Prepaid'}
        />
        <Input
          label="Delivery no"
          value={deliveryNo}
          onChange={(e) => setDeliveryNo(e.target.value)}
          placeholder="e.g. DEL12345"
        />
        <Select
          label="Select Courier"
          value={courier}
          onChange={(e) => setCourier(e.target.value)}
          options={[
            { value: "", label: "Select Courier" },
            ...couriers.map(c => ({ value: c.name, label: c.name }))
          ]}
        />
      </div>

      <div className="border-t border-zinc-150 pt-6 space-y-4">
        <h4 className="text-lg font-bold text-zinc-800">Choose Products to Add</h4>
        <div className="flex gap-4 items-end bg-zinc-50 p-4 rounded-xl border border-zinc-200">
          <div className="flex-1">
            <Select
              label="Search & Select Product"
              value={modalProductSelect}
              onChange={(e) => setModalProductSelect(e.target.value)}
              options={[
                { value: "", label: "Select a Product" },
                ...products.map(p => ({ value: p._id || p.id, label: `${p.name} (₹${p.amount})` }))
              ]}
            />
          </div>
          <Button
            type="button"
            variant="success"
            size="lg"
            onClick={handleAddProduct}
            className="mb-1"
          >
            Add Product
          </Button>
        </div>
      </div>

      <div className="space-y-4 text-left">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-bold text-zinc-800">
            Selected Products
          </h4>
        </div>

        <div className="border border-zinc-200 overflow-hidden rounded-xl shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-zinc-100/80 border-b border-zinc-200">
                <th className="p-3 text-xs font-semibold text-zinc-700 uppercase tracking-wide text-left">
                  Product Name
                </th>
                <th className="p-3 text-xs font-semibold text-zinc-700 uppercase tracking-wide text-left">
                  Amount
                </th>
                <th className="p-3 text-xs font-semibold text-zinc-700 uppercase tracking-wide text-left">
                  Quantity
                </th>
                <th className="p-3 text-xs font-semibold text-zinc-700 uppercase tracking-wide text-left">
                  Subtotal
                </th>
                <th className="p-3 text-xs font-semibold text-zinc-700 uppercase tracking-wide text-center">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-200">
              {modalSelectedProducts.length > 0 ? (
                modalSelectedProducts.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-zinc-50/80 transition-colors"
                  >
                    <td className="p-3 font-medium text-zinc-800 text-sm">
                      {row.name}
                    </td>

                    <td className="p-3 font-medium text-zinc-700 text-sm">
                      ₹{row.amount}
                    </td>

                    <td className="p-3 w-28">
                      <input
                        type="number"
                        min="1"
                        value={row.quantity}
                        onChange={(e) =>
                          handleQtyChange(row.id, Number(e.target.value))
                        }
                        className="w-20 px-2 py-1 text-sm font-medium bg-white border border-zinc-200 rounded-lg focus:ring-1 focus:ring-primary-teal/20 focus:border-primary-teal outline-none text-center shadow-sm"
                      />
                    </td>

                    <td className="p-3 font-bold text-zinc-900 text-sm">
                      ₹{row.amount * row.quantity}
                    </td>

                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(row.id)}
                        className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition-all duration-200"
                        title="Remove Product"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-sm text-zinc-400 font-medium"
                  >
                    No products selected
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-2xl font-bold text-[#1f2f3e]">
            Delivery List
          </h2>
          <div className="flex items-center gap-4">
            <DateRangePicker 
              startDate={startDate} 
              endDate={endDate} 
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
                loadOrdersData(undefined, { start, end });
              }} 
            />
          </div>
        </div>

        {/* Top Summary Live Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Total Delivered Orders */}
          <div className="bg-white border border-border-ui/80 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all">
            <div className="bg-[#1A3D37] text-white px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm font-bold tracking-wide">Total Delivered Orders</span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="text-3xl font-extrabold text-[#1f2f3e]">
                {orderStats.delivered}
              </span>
              <span className="bg-emerald-100/90 border border-emerald-300 text-emerald-800 font-bold px-3 py-1 rounded-full text-xs shadow-xs">
                +5% (Daily)
              </span>
            </div>
          </div>

          {/* Total RTO Orders */}
          <div className="bg-white border border-border-ui/80 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all">
            <div className="bg-[#D9534F] text-white px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm font-bold tracking-wide">Total RTO Orders</span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="text-3xl font-extrabold text-[#1f2f3e]">
                {orderStats.rto}
              </span>
              <span className="bg-rose-100/90 border border-rose-300 text-rose-800 font-bold px-3 py-1 rounded-full text-xs shadow-xs">
                11% (Weekly)
              </span>
            </div>
          </div>

          {/* Total In Transit Orders */}
          <div className="bg-white border border-border-ui/80 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all">
            <div className="bg-[#4A6B82] text-white px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm font-bold tracking-wide">Total In Transit Orders</span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="text-3xl font-extrabold text-[#1f2f3e]">
                {orderStats.inTransit}
              </span>
              <span className="bg-slate-100 border border-slate-300 text-slate-700 font-medium px-3.5 py-1 rounded-full text-xs shadow-xs">
                Processing
              </span>
            </div>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-3 pb-6">
          <div className="w-full sm:w-auto sm:flex-1 min-w-[160px]">
            <Select
              multiple={true}
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value as unknown as string[])}
              options={[
                { value: "all", label: "Select Product" },
                ...products.map(p => ({ value: p.name, label: p.name }))
              ]}
            />
          </div>
          <div className="w-full sm:w-auto sm:flex-1 min-w-[160px]">
            <Select
              multiple={true}
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value as unknown as string[])}
              disabled={!isAdmin}
              options={[
                { value: "all", label: "Select Assign" },
                ...(isAdmin
                  ? users
                  : users.filter(u => u._id === currentUser?._id || u.id === currentUser?._id)
                ).map(u => ({ value: u._id || u.id, label: u.name }))
              ]}
            />
          </div>
          <div className="w-full sm:w-auto sm:flex-1 min-w-[160px]">
            <Select
              multiple={true}
              value={filterCourier}
              onChange={(e) => setFilterCourier(e.target.value as unknown as string[])}
              options={[
                { value: "all", label: "Select Courier" },
                ...couriers.map(c => ({ value: c.name, label: c.name }))
              ]}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" className="rounded-lg bg-[#0D4738] hover:bg-[#0A382C] text-white border-0 shadow-xs px-5" onClick={() => loadOrdersData()}>
              Apply Filter
            </Button>
            <Button variant="outline" className="rounded-lg" onClick={() => {
              setFilterProduct(["all"]);
              setFilterCourier(["all"]);
              setSearchQuery("");
              setCurrentPage(1);
              if (isAdmin) {
                setFilterAssignee(["all"]);
              } else {
                setFilterAssignee([currentUser?._id || currentUser?.id]);
              }
            }}>
              Clear Filter
            </Button>
            {hasPermission("Delivery-export") && (
              <Button
                variant="outline"
                className="rounded-lg px-6"
                onClick={handleExport}
                isLoading={isExporting}
              >
                Export
              </Button>
            )}
          </div>
        </div>

        {/* Table database */}
        <Table 
           data={orders} 
           columns={columns} 
           selectable={false}
           isLoading={isFetchingData} 
           searchable={true}
           onSearchChange={(val) => {
             setSearchQuery(val);
             setCurrentPage(1);
             loadOrdersData(val, undefined, undefined, 1, rowsPerPage);
           }}
           serverSide={true}
           totalCount={totalRecords}
           currentPage={currentPage}
           rowsPerPage={rowsPerPage}
           onPageChange={(page, limit) => {
             setCurrentPage(page);
             setRowsPerPage(limit);
             loadOrdersData(undefined, undefined, undefined, page, limit);
           }}
        />
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit Delivery Order - ${activeOrder?.name || ''}`}
      >
        <div className="space-y-6">
          {renderModalBody()}
          <div className="flex justify-between items-center w-full pt-4 border-t border-zinc-200">
            <div className="text-left">
              <span className="text-xs font-semibold text-zinc-500 block uppercase tracking-wider">
                Total Amount
              </span>
              <span className="text-xl font-bold text-emerald-600">
                ₹{totalAmount}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="primary"
                onClick={handleEditSubmit}
                isLoading={isSubmitting}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Status Change Reason Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => {
          setStatusModalOpen(false);
          setTargetOrderForStatus(null);
        }}
        title="Reason for Delivery Status Change"
        sizeClass="max-w-md"
      >
        <div className="space-y-4 text-left py-1">
          <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="font-semibold text-zinc-500">Customer:</span>
              <span className="font-bold text-zinc-800 uppercase">{targetOrderForStatus?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-zinc-500">Assigned Agent:</span>
              <span className="font-bold text-teal-700">{targetOrderForStatus?.assginTo || "Unassigned"}</span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-zinc-200">
              <span className="font-semibold text-zinc-500">Changing Status To:</span>
              <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[11px] text-white ${
                pendingStatus === "DELIVERED" ? "bg-[#10B981]" : pendingStatus === "RTO" ? "bg-[#EF4444]" : "bg-[#64748B]"
              }`}>
                {pendingStatus}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wide">
              Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={statusReasonInput}
              onChange={(e) => {
                setStatusReasonInput(e.target.value);
                if (e.target.value.trim()) setReasonError("");
              }}
              placeholder="Type reason for changing delivery status..."
              rows={3}
              className="w-full p-2.5 text-xs border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent outline-none transition-all"
            />
            {reasonError && (
              <p className="text-[11px] font-semibold text-rose-500">{reasonError}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStatusModalOpen(false);
                setTargetOrderForStatus(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={confirmStatusChange}
              isLoading={isSavingStatus}
            >
              Save Reason
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reason History Modal */}
      <Modal
        isOpen={historyModalOpen}
        onClose={() => {
          setHistoryModalOpen(false);
          setSelectedOrderForHistory(null);
        }}
        title={`Status & Reason History - ${selectedOrderForHistory?.name || ''}`}
        sizeClass="max-w-lg"
      >
        <div className="space-y-4 text-left py-1">
          <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 text-xs flex justify-between items-center">
            <div>
              <span className="text-zinc-500 font-semibold block">Customer</span>
              <span className="font-bold text-zinc-800 uppercase text-sm">{selectedOrderForHistory?.name}</span>
            </div>
            <div className="text-right">
              <span className="text-zinc-500 font-semibold block">Assigned Agent</span>
              <span className="font-bold text-teal-700">{selectedOrderForHistory?.assginTo || "Unassigned"}</span>
            </div>
          </div>

          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {selectedOrderForHistory?.statusHistory && selectedOrderForHistory.statusHistory.length > 0 ? (
              selectedOrderForHistory.statusHistory.map((item, idx) => (
                <div key={idx} className="p-3 bg-white border border-zinc-200 rounded-lg shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded text-[11px]">
                        {item.oldStatus || "IN TRANSIT"}
                      </span>
                      <span className="text-zinc-400">➔</span>
                      <span className={`px-2 py-0.5 text-white rounded text-[11px] font-extrabold ${
                        (item.newStatus || "").toUpperCase() === "DELIVERED" ? "bg-emerald-600" :
                        (item.newStatus || "").toUpperCase() === "RTO" ? "bg-rose-600" : "bg-slate-600"
                      }`}>
                        {item.newStatus || "IN TRANSIT"}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400 font-medium">
                      {formatDateTime(item.createdAt || new Date())}
                    </span>
                  </div>

                  <div className="p-2 bg-amber-50/70 border border-amber-200/80 rounded text-xs text-amber-900 font-medium">
                    💬 {item.reason}
                  </div>

                  {item.updatedBy && (
                    <div className="text-[10px] text-zinc-400 text-right">
                      Updated by: <span className="font-semibold text-zinc-600">{item.updatedBy}</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-400 italic text-center py-4">No reason history found.</p>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setHistoryModalOpen(false);
                setSelectedOrderForHistory(null);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={executeDelete}
        title="Delete Delivery Order"
        itemName={orderToDelete?.name}
        itemType="delivery order"
      />
    </div>
  );
}
