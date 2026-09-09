"use client";

import React, { useState } from "react";
import { useToast } from "../../context/ToastContext";
import { Table, Column } from "../../components/common/Table";
import { Select } from "../../components/common/Select";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { Close, CalendarToday } from "@mui/icons-material";
import { FiEdit, FiTrash2, FiRefreshCcw } from "react-icons/fi";
import { fetchProducts } from "../../services/productService";
import { fetchUsers } from "../../services/userService";
import { fetchOrders, createOrderApi, updateOrderApi, deleteOrderApi, exportOrders } from "../../services/orderService";
import { usePermission } from "../../utils/permissionUtils";
import { DeleteConfirmModal } from "../../components/common/DeleteConfirmModal";
import { getAuthenticatedUser } from "../../utils/authUtils";
import { fetchCouriers } from "../../services/courierService";
import { DateRangePicker } from "../../components/common/DateRangePicker";
import { formatDateTime } from "../../utils/dateUtils";

export interface Order {
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
  status: string; // Converted, Dispatched, Delivered, Returned
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

export default function OrderListPage() {
  const { hasPermission } = usePermission();
  const [orders, setOrders] = useState<Order[]>([]);
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

  const [orderStats, setOrderStats] = useState({
    delivered: 0,
    rto: 0,
    inTransit: 0,
    deliveredGrowth: "+0% (Daily)",
    rtoGrowth: "0% (Weekly)"
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
      // Map backend orders to frontend format
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
        status: o.status || "Dispatched",
        // Store raw products array for edit modal
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
          inTransit: ordersRes.stats.inTransit || 0,
          deliveredGrowth: ordersRes.stats.deliveredGrowth || "+0% (Daily)",
          rtoGrowth: ordersRes.stats.rtoGrowth || "0% (Weekly)"
        });
      } else {
        const del = mapped.filter(o => o.status?.toUpperCase() === 'DELIVERED').length;
        const rto = mapped.filter(o => o.status?.toUpperCase() === 'RTO').length;
        const trans = mapped.filter(o => ['IN TRANSIT', 'DISPATCHED', 'CONVERTED', 'PROCESSING'].includes(o.status?.toUpperCase())).length;
        setOrderStats({ delivered: del, rto: rto, inTransit: trans, deliveredGrowth: "+0% (Daily)", rtoGrowth: "0% (Weekly)" });
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

  const updateOrder = async (id: string, updated: Partial<Order>) => {
    try {
      await updateOrderApi(id, updated as any);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updated } : o));
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update order");
    }
  };

  const addOrder = async (o: Omit<Order, "id">) => {
    try {
      const created = await createOrderApi(o as any);
      const createdId = (created as any)._id || Date.now().toString();

      setOrders(prev => {
        const existingIdx = prev.findIndex(p => p.id === createdId);
        if (existingIdx >= 0) {
          // If the backend merged this order into an existing one, update the existing row
          const updated = [...prev];
          // We map the returned backend object to the frontend format to get accurate totals
          const oData = created as any;
          updated[existingIdx] = {
            ...updated[existingIdx],
            product: oData.product || (oData.products?.map((p: any) => p.name).join(", ") || ""),
            amount: oData.amount || 0,
            quantity: oData.quantity || 1,
            subtotal: oData.amount || 0,
            grandTotal: oData.grandTotal || oData.subtotal || (oData.products?.length ? oData.products.reduce((acc: number, p: any) => acc + (p.subtotal || (p.amount * (p.quantity || 1)) || 0), 0) : (oData.amount || 0)),
            _products: oData.products || []
          };
          return updated;
        }
        // Otherwise, append as a new order
        return [...prev, { ...o, id: createdId }];
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create order");
      throw err;
    }
  };

  const toast = useToast();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);



  const [isFetchingData, setIsFetchingData] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  const [paymentType, setPaymentType] = useState<"COD" | "Prepaid">("COD");
  const [txnId, setTxnId] = useState("");
  const [courier, setCourier] = useState("");
  const [deliveryNo, setDeliveryNo] = useState("");

  const [modalSelectedProducts, setModalSelectedProducts] = useState<SelectedProductRow[]>([]);
  const [modalProductSelect, setModalProductSelect] = useState("");

  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [isRepeatingOrder, setIsRepeatingOrder] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  const filteredOrders = React.useMemo(() => {
    return orders;
  }, [orders]);

  const handleAddProduct = () => {
    if (!modalProductSelect) return;
    const prod = products.find(p => (p._id || p.id) === modalProductSelect);
    if (!prod) return;

    const existingIdx = modalSelectedProducts.findIndex(p => p.id === (prod._id || prod.id));
    if (existingIdx >= 0) {
      const updated = [...modalSelectedProducts];
      updated[existingIdx].quantity += 1;
      updated[existingIdx].subtotal = updated[existingIdx].amount * updated[existingIdx].quantity;
      setModalSelectedProducts(updated);
      toast.success("Product quantity incremented!");
      return;
    }

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
    setModalProductSelect("");
  };

  const handleQtyChange = (id: string, qty: number) => {
    setModalSelectedProducts(prev => prev.map(p => p.id === id ? { ...p, quantity: Math.max(1, qty), subtotal: p.amount * Math.max(1, qty) } : p));
  };

  const handleRemoveProduct = (id: string) => {
    setModalSelectedProducts(prev => prev.filter(p => p.id !== id));
  };

  const totalAmount = modalSelectedProducts.reduce((sum, p) => sum + p.amount * p.quantity, 0);

  const openEdit = (order: any) => {
    setActiveOrder(order);
    setPaymentType(order.paymentType === "Prepaid" ? "Prepaid" : "COD");
    setTxnId(order.transactionId || "");
    setCourier(order.courier || "");
    setDeliveryNo(order.delivery_no || "");

    const rawProducts: any[] = order._products || [];
    if (rawProducts.length > 0) {
      setModalSelectedProducts(rawProducts.map((p: any) => ({
        id: p.productId?._id || p.productId || p._id || p.id || Math.random().toString(),
        productId: p.productId?._id || p.productId || p._id || p.id,
        name: p.productId?.name || p.name || "",
        amount: p.productId?.amount || p.amount || 0,
        quantity: p.quantity || 1,
        subtotal: p.subtotal || ((p.productId?.amount || p.amount || 0) * (p.quantity || 1))
      })));
    } else {
      const existingProds = products.filter(p => order.product.includes(p.name));
      setModalSelectedProducts(existingProds.map(p => ({
        id: p._id || p.id,
        productId: p._id || p.id,
        name: p.name,
        amount: p.amount,
        quantity: 1,
        subtotal: p.amount
      })));
    }

    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;
    if (modalSelectedProducts.length === 0) {
      toast.warning("At least one product is required!");
      return;
    }

    setIsUpdatingOrder(true);
    try {
      await updateOrder(activeOrder.id, {
        paymentType,
        transactionId: txnId,
        delivery_no: deliveryNo,
        courier,
        product: modalSelectedProducts.map(p => p.name).join(", "),
        products: modalSelectedProducts.map((p) => ({
          productId: p.productId || p.id,
          name: p.name,
          amount: p.amount,
          quantity: p.quantity,
          subtotal: p.subtotal
        })),
        _products: modalSelectedProducts.map((p) => ({
          productId: p.productId || p.id,
          name: p.name,
          amount: p.amount,
          quantity: p.quantity,
          subtotal: p.subtotal
        })),
        grandTotal: totalAmount
      });
      toast.success(`Order details updated successfully.`);
      setEditOpen(false);
    } catch (_) {
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  const openRepeat = (order: Order) => {
    setActiveOrder(order);
    setPaymentType(order.paymentType === "Prepaid" ? "Prepaid" : "COD");
    setTxnId(order.transactionId || "");
    setCourier(order.courier || couriers[0]?.name || "");
    setDeliveryNo(order.delivery_no || "");

    const rawProducts: any[] = (order as any)._products || [];
    if (rawProducts.length > 0) {
      setModalSelectedProducts(rawProducts.map((p: any) => ({
        id: p.productId?._id || p.productId || p._id || p.id || Math.random().toString(),
        productId: p.productId?._id || p.productId || p._id || p.id,
        name: p.productId?.name || p.name || "",
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
    setRepeatOpen(true);
  };

  const handleRepeatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;
    if (modalSelectedProducts.length === 0) {
      toast.warning("Please add products for the repeat order!");
      return;
    }

    setIsRepeatingOrder(true);
    try {
      const resolvedAssigneeId =
        (activeOrder as any).assginToId ||
        (typeof (activeOrder as any).assginTo === 'object'
          ? ((activeOrder as any).assginTo?._id || (activeOrder as any).assginTo?.id)
          : null) ||
        users.find((u) => u.name === activeOrder.assginTo || u._id === activeOrder.assginTo || u.id === activeOrder.assginTo)?._id ||
        users.find((u) => u.name === activeOrder.assginTo || u._id === activeOrder.assginTo || u.id === activeOrder.assginTo)?.id ||
        activeOrder.assginTo;

      await addOrder({
        leadId: activeOrder.leadId,
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
        amount: modalSelectedProducts.reduce((sum, p) => sum + (p.amount || 0), 0),
        quantity: modalSelectedProducts.reduce((sum, p) => sum + (p.quantity || 0), 0),
        subtotal: totalAmount,
        grandTotal: totalAmount,
        date: new Date().toISOString().split("T")[0],
        paymentType,
        courier,
        assginTo: resolvedAssigneeId,
        transactionId: txnId,
        delivery_no: deliveryNo,
        status: "Dispatched"
      });
      toast.success(`Repeat Order created for ${activeOrder.name}!`);
      setRepeatOpen(false);
    } catch (_) {
    } finally {
      setIsRepeatingOrder(false);
    }
  };

  const handleDeleteClick = (order: Order) => {
    setOrderToDelete(order);
    setDeleteOpen(true);
  };

  const executeDelete = async () => {
    if (!orderToDelete) return;
    try {
      await deleteOrderApi(orderToDelete.id);
      setOrders(prev => prev.filter(o => o.id !== orderToDelete.id));
      toast.warning("Order deleted.");
      setDeleteOpen(false);
      setOrderToDelete(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete order");
    }
  };

  const handleExport = async () => {
    if (!hasPermission("Order-export")) {
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
      link.setAttribute('download', `orders_export_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success("Export successful!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to export orders");
    } finally {
      setIsExporting(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const oldOrder = orders.find(o => o.id === orderId);
    const oldStatus = oldOrder?.status || "IN TRANSIT";

    // Optimistic update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

    // Update live stats
    setOrderStats(prev => {
      const next = { ...prev };
      const oldNorm = oldStatus.toUpperCase();
      const newNorm = newStatus.toUpperCase();

      if (oldNorm === "DELIVERED") next.delivered = Math.max(0, next.delivered - 1);
      else if (oldNorm === "RTO") next.rto = Math.max(0, next.rto - 1);
      else next.inTransit = Math.max(0, next.inTransit - 1);

      if (newNorm === "DELIVERED") next.delivered += 1;
      else if (newNorm === "RTO") next.rto += 1;
      else next.inTransit += 1;

      return next;
    });

    try {
      await updateOrderApi(orderId, { status: newStatus });
      toast.success(`Order status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update order status");
      // Rollback on error
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: oldStatus } : o));
    }
  };

  const columns: Column<Order>[] = [
    { key: "id", header: "No", render: (_, __, i) => i + 1, sortable: false },
    { key: "name", header: "Lead Name", render: (val) => <span className="uppercase font-bold text-[12px] text-[#1f2f3e]">{val || "Unknown"}</span> },
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
              onChange={(e) => handleStatusChange(row.id, e.target.value)}
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
      render: (_, row) => (
        <div className="flex items-center gap-1">
          {hasPermission("Order-edit") && (
            <button
              onClick={() => openEdit(row)}
              className="p-1.5 text-text-secondary hover:text-primary-teal hover:bg-zinc-100 rounded-lg transition-all"
              title="Edit Order"
            >
              <FiEdit className="w-4 h-4" />
            </button>
          )}
          {hasPermission("Order-delete") && (
            <button
              onClick={() => handleDeleteClick(row)}
              className="p-1.5 text-text-secondary hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
              title="Delete Order"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )
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
            Order List
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
              <span className={`font-bold px-3 py-1 rounded-full text-xs shadow-xs ${(orderStats.deliveredGrowth || "").includes("-")
                  ? "bg-rose-100/90 border border-rose-300 text-rose-800"
                  : "bg-emerald-100/90 border border-emerald-300 text-emerald-800"
                }`}>
                {orderStats.deliveredGrowth || "+0% (Daily)"}
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
              <span className={`font-bold px-3 py-1 rounded-full text-xs shadow-xs ${(orderStats.rtoGrowth || "").includes("-")
                  ? "bg-emerald-100/90 border border-emerald-300 text-emerald-800"
                  : "bg-rose-100/90 border border-rose-300 text-rose-800"
                }`}>
                {orderStats.rtoGrowth || "0% (Weekly)"}
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
            {hasPermission("Order-export") && (
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
          data={filteredOrders}
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

      {/* Edit Order Modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Order" sizeClass="max-w-4xl" isLoading={isUpdatingOrder}>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {renderModalBody()}
          <div className="flex items-center justify-between border-t border-zinc-150 pt-4 mt-2">
            <span className="text-sm font-bold text-zinc-800 bg-zinc-100 px-4 py-2 rounded-lg border border-zinc-200 shadow-sm mr-auto">
              Total Amount: <span className="text-primary-teal ml-1">₹{totalAmount.toLocaleString()}</span>
            </span>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={isUpdatingOrder}
              >
                Close
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isUpdatingOrder}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Repeat Order Modal */}
      <Modal isOpen={repeatOpen} onClose={() => setRepeatOpen(false)} title={`Repeat Order(${activeOrder?.name || "Customer"})`} sizeClass="max-w-4xl" isLoading={isRepeatingOrder}>
        <form onSubmit={handleRepeatSubmit} className="space-y-4">
          {renderModalBody()}
          <div className="flex items-center justify-between border-t border-zinc-150 pt-4 mt-2">
            <span className="text-sm font-bold text-zinc-800 bg-zinc-100 px-4 py-2 rounded-lg border border-zinc-200 shadow-sm mr-auto">
              Total Amount: <span className="text-primary-teal ml-1">₹{totalAmount.toLocaleString()}</span>
            </span>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRepeatOpen(false)}
                disabled={isRepeatingOrder}
              >
                Close
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isRepeatingOrder}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <DeleteConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={executeDelete}
        title="Delete Order"
        itemName={orderToDelete?.name}
        itemType="order"
      />
    </div>
  );
}
