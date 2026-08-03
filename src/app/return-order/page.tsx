"use client";

import React, { useEffect, useState } from "react";
import { Table, Column } from "../../components/common/Table";
import { FiEdit, FiTrash2, FiEye } from "react-icons/fi";
import { useToast } from "../../context/ToastContext";
import { Button } from "../../components/common/Button";
import { Select } from "../../components/common/Select";
import { Modal } from "../../components/common/Modal";
import { Input } from "../../components/common/Input";
import { usePermission } from "../../utils/permissionUtils";
import { fetchUsers } from "../../services/userService";
import { fetchProducts } from "../../services/productService";
import { fetchOrders } from "../../services/orderService";
import { fetchReturnOrders, createReturnOrderApi, deleteReturnOrderApi, fetchReturnOrderById, updateReturnOrderApi, exportReturnOrders } from "../../services/returnOrderService";
import { DateRangePicker } from "../../components/common/DateRangePicker";
import { Close } from "@mui/icons-material";
import { DeleteConfirmModal } from "../../components/common/DeleteConfirmModal";
import { formatDateTime } from "../../utils/dateUtils";

export interface ReturnOrder {
  id: string;
  customerName: string;
  phone_number: string;
  assginTo: string;
  orderDate: string;
  returnDate: string;
  product: string;
  amount: number;
  quantity: number;
  subtotal: number;
  type: string;
  _products?: any[];
  assginToId?: string;
}

export default function ReturnOrderPage() {
  const { hasPermission } = usePermission();
  const [returnOrders, setReturnOrders] = useState<ReturnOrder[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const toast = useToast();

  const [isFetchingData, setIsFetchingData] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [returnOrderToDelete, setReturnOrderToDelete] = useState<ReturnOrder | null>(null);

  const getTodayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [startDate, setStartDate] = useState<string | null>(getTodayString());
  const [endDate, setEndDate] = useState<string | null>(getTodayString());

  const [orderStartDate, setOrderStartDate] = useState<string | null>(getTodayString());
  const [orderEndDate, setOrderEndDate] = useState<string | null>(getTodayString());

  const [filterAssign, setFilterAssign] = useState<string[]>(["all"]);
  const [filterType, setFilterType] = useState<string[]>(["all"]);
  const [filterProduct, setFilterProduct] = useState<string[]>(["all"]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const loadReturnOrdersData = async (searchOverride?: string, overrideDates?: { start?: string | null, end?: string | null, orderStart?: string | null, orderEnd?: string | null }, overridePage?: number, overrideLimit?: number) => {
    try {
      setIsFetchingData(true);
      const searchToUse = searchOverride !== undefined ? searchOverride : searchQuery;
      const startToUse = overrideDates !== undefined ? overrideDates.start : startDate;
      const endToUse = overrideDates !== undefined ? overrideDates.end : endDate;
      const oStartToUse = overrideDates !== undefined ? overrideDates.orderStart : orderStartDate;
      const oEndToUse = overrideDates !== undefined ? overrideDates.orderEnd : orderEndDate;
      const pageToUse = overridePage !== undefined ? overridePage : currentPage;
      const limitToUse = overrideLimit !== undefined ? overrideLimit : rowsPerPage;

      const assigneeFilter = filterAssign.includes("all") ? undefined : filterAssign.join(',');
      const res = await fetchReturnOrders({
        page: pageToUse, limit: limitToUse,
        search: searchToUse || undefined,
        assginTo: assigneeFilter,
        product: filterProduct.includes("all") ? undefined : filterProduct.join(','),
        type: filterType.includes("all") ? undefined : filterType.join(','),
        startDate: startToUse || undefined,
        endDate: endToUse || undefined,
        orderStartDate: oStartToUse || undefined,
        orderEndDate: oEndToUse || undefined
      });
      // fetchReturnOrders returns raw axios response; backend returns { data: [...] } or array
      const rawData = res?.data?.data ?? res?.data ?? [];
      const list = Array.isArray(rawData) ? rawData : [];
      const mapped = list.map((r: any) => ({
        id: r._id || r.id,
        customerName: r.customerName,
        phone_number: r.phone_number,
        assginTo: r.assginTo?.name || r.assginTo || "",
        assginToId: r.assginTo?._id || r.assginTo?.id || r.assginTo || "",
        orderDate: r.orderId && r.orderId.createdAt ? formatDateTime(r.orderId.createdAt) : "-",
        returnDate: r.createdAt ? formatDateTime(r.createdAt) : "",
        product: r.products?.map((p: any) => p.name).join(", ") || "",
        amount: r.amount || 0,
        quantity: r.products?.reduce((acc: number, curr: any) => acc + curr.quantity, 0) || 0,
        subtotal: r.amount || 0,
        type: r.type || "RTO",
        _products: r.products || []
      }));
      setReturnOrders(mapped);
      if (res?.data?.total !== undefined) {
        setTotalRecords(res.data.total);
      } else if (res?.total !== undefined) {
        setTotalRecords(res.total);
      } else {
        setTotalRecords(list.length);
      }
    } catch (err) { console.error(err); }
    finally { setIsFetchingData(false); }
  }

  const initFetchRef = React.useRef(false);

  React.useEffect(() => {
    if (initFetchRef.current) return;
    initFetchRef.current = true;

    const loadMasterData = async () => {
      try {
        const [usersRes, prodsRes, ordersRes] = await Promise.all([
          fetchUsers({ page: 1, limit: 100 }),
          fetchProducts({ page: 1, limit: 100 }),
          fetchOrders({ page: 1, limit: 1000 })
        ]);
        setUsers(usersRes.data);
        setProducts(prodsRes.data);
        setOrders(ordersRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    loadMasterData();
  }, []);

  React.useEffect(() => {
    loadReturnOrdersData();
  }, [filterAssign, filterProduct, filterType]);

  const executeDelete = async () => {
    if (!returnOrderToDelete) return;
    try {
      await deleteReturnOrderApi(returnOrderToDelete.id);
      setReturnOrders(prev => prev.filter(r => r.id !== returnOrderToDelete!.id));
      toast.warning("Return Order deleted.");
      setDeleteOpen(false);
      setReturnOrderToDelete(null);
    } catch (err) { toast.error("Failed to delete return order"); }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const assigneeFilter = filterAssign.includes("all") ? undefined : filterAssign.join(',');
      const blob = await exportReturnOrders({
        search: searchQuery || undefined,
        assginTo: assigneeFilter,
        product: filterProduct.includes("all") ? undefined : filterProduct.join(','),
        type: filterType.includes("all") ? undefined : filterType.join(','),
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `return_orders_export_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success("Export successful!");
    } catch (err: any) {
      toast.error("Failed to export return orders");
    } finally {
      setIsExporting(false);
    }
  };

  // Modal States
  const [addOpen, setAddOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<ReturnOrder | null>(null);

  // Add Modal Form State
  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState("");
  const [type, setType] = useState("");
  const [assign, setAssign] = useState("");

  const [currentSelectedProductId, setCurrentSelectedProductId] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);

  useEffect(() => {
    if (addOpen && !activeOrder && phone && phone.length === 10) {
      const match = orders.find(o => o.phone_number === phone);
      if (match) {
        setCustomer(match.name || "");
        if (match.assginTo) {
          setAssign(typeof match.assginTo === 'object' ? (match.assginTo._id || match.assginTo.id) : match.assginTo);
        }

        if (match.products && match.products.length > 0) {
          setSelectedProducts(match.products.map((p: any) => ({
            productId: p.productId?._id || p.productId || p._id || p.id,
            name: p.name || p.productId?.name,
            amount: p.amount || 0,
            quantity: p.quantity || 1,
            subtotal: p.subtotal || ((p.amount || 0) * (p.quantity || 1))
          })));
        } else if (match.product) {
          // Fallback for old orders with string product
          const prodNames = match.product.split(", ");
          const matchedProds = products.filter(p => prodNames.includes(p.name));
          setSelectedProducts(matchedProds.map(p => ({
            productId: p._id || p.id,
            name: p.name,
            amount: p.amount || 0,
            quantity: 1,
            subtotal: p.amount || 0
          })));
        }
        toast.success("Order details auto-filled.");
      }
    } else if (addOpen && !activeOrder && phone && phone.length < 10 && customer) {
      // Optionally clear if phone is deleted? 
      // We'll leave it to allow manual editing.
    }
  }, [phone, addOpen, activeOrder, orders, products, toast]);

  const handleAddProduct = () => {
    if (!currentSelectedProductId) return;
    const prod = products.find(p => (p._id || p.id) === currentSelectedProductId);
    if (!prod) return;
    const existing = selectedProducts.find(p => p.productId === currentSelectedProductId);
    if (existing) {
      setSelectedProducts(prev => prev.map(p => p.productId === currentSelectedProductId ? { ...p, quantity: p.quantity + 1, subtotal: (p.quantity + 1) * p.amount } : p));
    } else {
      setSelectedProducts(prev => [...prev, { productId: currentSelectedProductId, name: prod.name, amount: prod.amount, quantity: 1, subtotal: prod.amount }]);
    }
    setCurrentSelectedProductId("");
  };

  const handleRemoveProduct = (id: string) => setSelectedProducts(prev => prev.filter(p => p.productId !== id));
  const handleQtyChange = (id: string, qty: number) => {
    const safeQty = Math.max(1, qty || 1);
    setSelectedProducts(prev => prev.map(p => p.productId === id ? { ...p, quantity: safeQty, subtotal: safeQty * p.amount } : p));
  };

  const convertTotalAmount = selectedProducts.reduce((sum, item) => sum + item.subtotal, 0);

  const handleSubmitReturnOrder = async () => {
    if (!customer || selectedProducts.length === 0) return toast.error("Please fill customer and add products");
    if (phone.length !== 10) return toast.error("Phone number must be exactly 10 digits!");
    try {
      const payload = {
        customerName: customer,
        phone_number: phone,
        type: type || "RTO",
        assginTo: assign || undefined,
        amount: convertTotalAmount,
        products: selectedProducts
      };

      if (activeOrder) {
        await updateReturnOrderApi(activeOrder.id, payload);
        toast.success("Return Order updated successfully");
      } else {
        await createReturnOrderApi(payload);
        toast.success("Return Order created successfully");
      }
      setAddOpen(false);
      loadReturnOrdersData();
      setCustomer(""); setPhone(""); setSelectedProducts([]);
      setActiveOrder(null);
    } catch (err: any) { toast.error(activeOrder ? "Failed to update return order" : "Failed to create return order"); }
  };

  const handleDeleteClick = (order: ReturnOrder) => {
    setReturnOrderToDelete(order);
    setDeleteOpen(true);
  };

  const handleOpenEdit = async (order: ReturnOrder) => {
    try {
      let payload: any = {};
      try {
        const res = await fetchReturnOrderById(order.id);
        payload = res?.data?.data || res?.data || {};
      } catch (err: any) {
        if (err.response?.status === 404) {
          // Fallback to row data if the backend GET route does not exist
          payload = {
            customerName: order.customerName,
            phone_number: order.phone_number,
            type: order.type,
            assginTo: order.assginToId,
            products: order._products || []
          };
        } else {
          throw err;
        }
      }

      setCustomer(payload.customerName || order.customerName || "");
      setPhone(payload.phone_number || order.phone_number || "");
      setType(payload.type || order.type || "RTO");
      setAssign(payload.assginTo?._id || payload.assginTo?.id || payload.assginTo || "");

      if (payload.products && Array.isArray(payload.products)) {
        setSelectedProducts(payload.products.map((p: any) => ({
          productId: p.productId?._id || p.productId || p._id || p.id,
          name: p.name || p.productId?.name,
          amount: p.amount,
          quantity: p.quantity,
          subtotal: p.subtotal || p.amount * p.quantity
        })));
      } else {
        setSelectedProducts([]);
      }

      setActiveOrder(order);
      setAddOpen(true);
    } catch (err) {
      toast.error("Failed to fetch order details");
    }
  };

  const openAddModal = () => {
    setActiveOrder(null);
    setCustomer("");
    setPhone("");
    setType("RTO");
    setAssign("");
    setSelectedProducts([]);
    setAddOpen(true);
  };

  const filteredOrders = returnOrders;

  const columns: Column<ReturnOrder>[] = [
    { key: "id", header: "No", render: (_, __, i) => i + 1, sortable: false },
    { key: "phone_number", header: "Mobile Number" },
    { key: "assginTo", header: "Assgin To" },
    { key: "orderDate", header: "Order Date", render: (val) => val === "2026-05-20" ? "01/01/1970" : val },
    { key: "product", header: "Product Name" },
    { key: "amount", header: "Amount" },
    { key: "returnDate", header: "Return Order Date" },
    { key: "customerName", header: "Customer Name" },
    { key: "type", header: "Type", render: () => "RTO" },
    {
      key: "actions",
      header: "Action",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setActiveOrder(row);
              setViewOpen(true);
            }}
            className="p-1.5 bg-blue-500 hover:bg-blue-400 text-white rounded-lg transition-all shadow-sm"
            title="View Details"
          >
            <FiEye className="w-3.5 h-3.5" />
          </button>

          {hasPermission("Return-order-delete") && (
            <button
              onClick={() => handleDeleteClick(row)}
              disabled={isDeleting === row.id}
              className={`p-1.5 bg-rose-500 hover:bg-rose-400 text-white rounded-lg transition-all shadow-sm ${isDeleting === row.id ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Delete Order"
            >
              <FiTrash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white space-y-6">

        {/* Top Header Row with Dates and Add Button */}
        <div className="flex flex-wrap items-center justify-between border-b border-zinc-100 pb-4 gap-4">
          <h2 className="text-xl font-bold text-zinc-800">
            Return Order List
          </h2>
          <div className="flex flex-wrap items-end gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Order Date :</span>
              <DateRangePicker
                startDate={orderStartDate}
                endDate={orderEndDate}
                onChange={(start, end) => {
                  setOrderStartDate(start);
                  setOrderEndDate(end);
                  loadReturnOrdersData(undefined, { start: startDate, end: endDate, orderStart: start, orderEnd: end });
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Return Order Date :</span>
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={(start, end) => {
                  setStartDate(start);
                  setEndDate(end);
                  loadReturnOrdersData(undefined, { start, end, orderStart: orderStartDate, orderEnd: orderEndDate });
                }}
              />
            </div>

            {hasPermission("Return-order-add") && (
              <Button
                variant="primary"
                className="bg-teal-800 hover:bg-teal-700 focus:ring-teal-800 whitespace-nowrap"
                onClick={openAddModal}
              >
                Add Return Order
              </Button>
            )}
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3 border-b border-zinc-100  pb-4">
          <div className="w-full sm:w-auto sm:flex-1 min-w-[160px]">
            <Select
              multiple={true}
              value={filterAssign}
              onChange={(e) => setFilterAssign(e.target.value as unknown as string[])}
              options={[
                { value: "all", label: "Select Assign" },
                ...users.map(u => ({ value: u._id || u.id, label: u.name }))
              ]}
            />
          </div>
          <div className="w-full sm:w-auto sm:flex-1 min-w-[160px]">
            <Select
              multiple={true}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as unknown as string[])}
              options={[
                { value: "all", label: "Select Type" },
                { value: "RTO", label: "RTO" },
                { value: "Damaged Item", label: "Damaged Item" },
                { value: "Customer Return", label: "Customer Return" }
              ]}
            />
          </div>
          <div className="w-full sm:w-auto sm:flex-1 min-w-[160px]">
            <Select
              multiple={true}
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value as unknown as string[])}
              options={[
                { value: "all", label: "Select Product" },
                ...products.map(p => ({ value: p._id || p.id, label: p.name }))
              ]}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" className="rounded-lg" onClick={() => loadReturnOrdersData()}>
              Apply Filter
            </Button>
            <Button variant="outline" className="rounded-lg" onClick={() => { setFilterAssign(["all"]); setFilterType(["all"]); setFilterProduct(["all"]); setSearchQuery(""); setCurrentPage(1); setTimeout(() => loadReturnOrdersData("", undefined, 1, rowsPerPage), 0); }}>
              Clear Filter
            </Button>
            <Button variant="outline" className="rounded-lg px-6" onClick={handleExport} isLoading={isExporting}>
              Export
            </Button>
          </div>
        </div>

        {/* Table Element */}
        <Table
          data={filteredOrders}
          columns={columns}
          selectable={false}
          isLoading={isFetchingData}
          searchable={true}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
            loadReturnOrdersData(val, undefined, 1, rowsPerPage);
          }}
          serverSide={true}
          totalCount={totalRecords}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          onPageChange={(page, limit) => {
            setCurrentPage(page);
            setRowsPerPage(limit);
            loadReturnOrdersData(undefined, undefined, page, limit);
          }}
        />
      </div>

      {/* Add/Edit Return Order Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title={activeOrder ? "Edit Return Order" : "Return Order"} sizeClass="max-w-5xl">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500">Customer Name</label>
              <Select
                options={[{ value: "", label: "Select Customer" }, ...Array.from(new Map(orders.map(o => [o.name, o])).values()).map((o: any) => ({ value: o.name, label: o.name }))]}
                value={customer}
                onChange={e => {
                  setCustomer(e.target.value);
                  const o = orders.find(ord => ord.name === e.target.value);
                  if (o) setPhone(o.phone_number);
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500">Phone Number</label>
              <Input placeholder="Enter Phone Number" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500">Type</label>
              <Select options={[{ value: "", label: "Select Type" }, { value: "RTO", label: "RTO" }]} value={type} onChange={e => setType(e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-1">
              <label className="text-[10px] font-bold text-zinc-500">Assgin to</label>
              <Select
                options={[{ value: "", label: "Select Assignee" }, ...users.map(u => ({ value: u._id || u.id, label: u.name }))]}
                value={assign}
                onChange={e => setAssign(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-zinc-700 ">Selected Products</h4>
            <div className="border border-zinc-200  rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white border-b border-zinc-200 text-zinc-600 uppercase">
                    <th className="p-3 font-semibold">Product Name</th>
                    <th className="p-3 font-semibold">Amount</th>
                    <th className="p-3 font-semibold w-24">Quantity</th>
                    <th className="p-3 font-semibold">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="bg-white ">
                  {selectedProducts.length > 0 ? selectedProducts.map(row => (
                    <tr key={row.productId} className="border-b border-zinc-100 ">
                      <td className="p-3">{row.name}</td>
                      <td className="p-3">{row.amount}</td>
                      <td className="p-3">{row.quantity}</td>
                      <td className="p-3">{row.subtotal}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-zinc-500 font-medium">No products selected</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 pt-4">
            <div className="text-sm font-semibold text-zinc-700 ">
              Grand Total: ₹{convertTotalAmount.toFixed(2)}
            </div>
            <Button
              variant="primary"
              className="bg-teal-800 hover:bg-teal-700 focus:ring-teal-800 px-6"
              onClick={handleSubmitReturnOrder}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Order Return Details Modal */}
      <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)} title="Order Return Details" sizeClass="max-w-2xl">
        <div className="space-y-4">
          <div className="border border-zinc-200  rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200  text-zinc-600  bg-white ">
                  <th className="p-3 font-semibold">Product Name</th>
                  <th className="p-3 font-semibold">Qty</th>
                  <th className="p-3 font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody className="bg-white ">
                <tr className="border-b border-zinc-100 ">
                  <td className="p-3 font-medium text-zinc-800 ">{activeOrder?.product}</td>
                  <td className="p-3 text-zinc-600 ">{activeOrder?.quantity}</td>
                  <td className="p-3 text-zinc-600 ">{activeOrder?.amount?.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-end gap-4 pt-4">
            <div className="text-xs font-semibold text-zinc-800  border border-zinc-200  rounded-lg px-3 py-1.5 flex gap-2">
              <span>Grand Total:</span>
              <span>{activeOrder?.amount}</span>
            </div>
            <Button
              variant="danger"
              className="bg-[#c2624c] hover:bg-[#b0523d] focus:ring-[#c2624c] px-6"
              onClick={() => setViewOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      <DeleteConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={executeDelete}
        title="Delete Return Order"
        itemName={returnOrderToDelete?.customerName}
        itemType="return order"
      />
    </div>
  );
}
