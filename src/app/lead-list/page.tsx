"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchUsers } from "../../services/userService";
import { fetchProducts } from "../../services/productService";
import { fetchStatuses } from "../../services/statusService";
import { fetchLeads, updateLeadApi, deleteLeadApi, exportLeads } from "../../services/leadService";
import { createOrderApi } from "../../services/orderService";
import { fetchReasonToCalls } from "../../services/reasonToCallService";
import { fetchCouriers } from "../../services/courierService";
import { formatDateTime } from "../../utils/dateUtils";

export interface Lead {
  id: string;
  name: string;
  phone_number: string;
  product: string;
  remark: string;
  amount: number;
  quantity: number;
  subtotal: number;
  assgin: string;
  date: string;
  time?: string;
  status: string;
  status_two?: string;
  reason_call?: string;
  note: string;
  isDeleted?: boolean;
  deleteDate?: string;
  reminderDate?: string;
  orderStatus?: boolean;
}

import { useToast } from "../../context/ToastContext";
import { getAuthenticatedUser } from "../../utils/authUtils";
import { Table, Column } from "../../components/common/Table";
import { usePermission } from "../../utils/permissionUtils";
import { Modal } from "../../components/common/Modal";
import { DeleteConfirmModal } from "../../components/common/DeleteConfirmModal";
import { Input } from "../../components/common/Input";
import { Select } from "../../components/common/Select";
import { Button } from "../../components/common/Button";
import { Add, SwapHoriz, Assignment, ViewKanban, CalendarToday } from "@mui/icons-material";
import { FiEdit, FiTrash2, FiFileText } from "react-icons/fi";
import { LeadFormModal } from "../../components/leads/LeadFormModal";
import { DateRangePicker } from "../../components/common/DateRangePicker";

interface SelectedProductRow {
  id?: string;
  productId: string;
  name: string;
  amount: number;
  quantity: number;
  subtotal: number;
}

export default function LeadListPage() {
  const { hasPermission } = usePermission();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [reasonsOptions, setReasonsOptions] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  const getTodayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [startDate, setStartDate] = useState<string | null>(getTodayString());
  const [endDate, setEndDate] = useState<string | null>(getTodayString());

  const loadLeadsData = async (overrideAssignee?: string, overrideSearch?: string, overrideDates?: { start: string | null, end: string | null }, overridePage?: number, overrideLimit?: number) => {
    setIsFetchingData(true);
    try {
      const assigneeFilter = overrideAssignee === 'all' ? undefined : (overrideAssignee || (filterAssignee.includes('all') ? undefined : filterAssignee.join(',')));
      const searchToUse = overrideSearch !== undefined ? overrideSearch : searchQuery;
      const startToUse = overrideDates !== undefined ? overrideDates.start : startDate;
      const endToUse = overrideDates !== undefined ? overrideDates.end : endDate;
      const pageToUse = overridePage !== undefined ? overridePage : currentPage;
      const limitToUse = overrideLimit !== undefined ? overrideLimit : rowsPerPage;

      const leadsRes = await fetchLeads({
        page: pageToUse,
        limit: limitToUse,
        search: searchToUse || undefined,
        product: filterProduct.includes('all') ? undefined : filterProduct.join(','),
        assgin: assigneeFilter,
        status: filterStatus.includes('all') ? undefined : filterStatus.join(','),
        reason_call: filterReason.includes('all') ? undefined : filterReason.join(','),
        startDate: startToUse || undefined,
        endDate: endToUse || undefined
      });
      const mappedLeads = leadsRes.data.map((l: any) => ({
        ...l,
        id: l._id || l.id,
        name: l.name,
        phone_number: l.phone_number,
        product: l.product || (l.products?.map((p: any) => p.name).join(", ") || ""),
        amount: l.amount || 0,
        quantity: l.quantity || 1,
        subtotal: l.subtotal || (l.products?.length ? l.products.reduce((acc: number, p: any) => acc + (p.subtotal || (p.amount * (p.quantity || 1)) || 0), 0) : (l.amount || 0)),
        assgin: l.assgin?.name || l.assgin || "",
        assginId: l.assgin?._id || l.assgin || "",
        date: formatDateTime(l.createdAt || new Date()),
        time: l.createdAt ? new Date(l.createdAt).toTimeString().split(' ')[0].substring(0, 5) : "",
        status: l.status?.name || l.status || "Open",
        statusId: l.status?._id || l.status || "",
        reason_call: l.reason_call?.name || l.reason_call || "",
        reasonCallId: l.reason_call?._id || l.reason_call || "",
        note: l.note || "",
        remark: l.remark || "",
        reminderDate: l.reminder || "",
        products: l.products || []
      }));
      setLeads(mappedLeads);
      if (leadsRes.total !== undefined) {
        setTotalRecords(leadsRes.total);
      } else if (leadsRes.data) {
        // Fallback in case total isn't returned
        setTotalRecords(leadsRes.data.length);
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
        const [usersRes, prodsRes, statusRes, reasonRes] = await Promise.all([
          fetchUsers({ page: 1, limit: 100 }),
          fetchProducts({ page: 1, limit: 100 }),
          fetchStatuses({ page: 1, limit: 100 }),
          fetchReasonToCalls({ page: 1, limit: 100 })
        ]);
        setUsers(usersRes.data);
        setProducts(prodsRes.data);
        setStatuses(statusRes.data);
        setReasonsOptions(reasonRes.data);
      } catch (err) {
        console.error("Error loading master data", err);
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

    loadMasterData();
    loadLeadsData(initialAssigneeFilter);
  }, []);


  const updateLead = async (id: string, updated: Partial<Lead>) => {
    setLeads(prev => prev.map(l => {
      if (l.id === id) {
        const merged = { ...l, ...updated };
        if (updated.amount !== undefined || updated.quantity !== undefined) {
          merged.subtotal = merged.amount * merged.quantity;
        }
        return merged;
      }
      return l;
    }));
    try {
      const { statusId, reasonCallId, ...apiPayload } = updated as any;
      await updateLeadApi(id, apiPayload);
      toast.success("Lead updated successfully!");
    } catch (err: any) {
      loadLeadsData();
      toast.error(err.response?.data?.message || "Failed to update lead");
    }
  };

  const executeDelete = async () => {
    if (!leadToDelete) return;
    try {
      await deleteLeadApi(leadToDelete.id);
      setLeads(prev => prev.filter(l => l.id !== leadToDelete.id));
      toast.success("Lead deleted successfully!");
      setDeleteOpen(false);
      setLeadToDelete(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete lead");
    }
  };

  const deleteLead = async (id: string) => {
    try {
      await deleteLeadApi(id);
      setLeads(prev => prev.filter(l => l.id !== id));
      toast.success("Lead deleted successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete lead");
    }
  };

  const toast = useToast();
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [leadFormModalOpen, setLeadFormModalOpen] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);

  React.useEffect(() => {
    if (convertModalOpen && couriers.length === 0) {
      fetchCouriers({ page: 1, limit: 100 }).then(res => {
        if (res?.data) setCouriers(res.data);
      }).catch(err => console.error("Error loading couriers", err));
    }
  }, [convertModalOpen, couriers.length]);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const [isFetchingData, setIsFetchingData] = useState(false);
  const [isConvertingLead, setIsConvertingLead] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeletingLead, setIsDeletingLead] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const [noteText, setNoteText] = useState("");
  const [convertSelectedProducts, setConvertSelectedProducts] = useState<SelectedProductRow[]>([]);
  const [currentSelectedProductId, setCurrentSelectedProductId] = useState("");

  const [paymentType, setPaymentType] = useState<"COD" | "Prepaid">("COD");
  const [selectedCourier, setSelectedCourier] = useState("Delhivery");
  const [transactionId, setTransactionId] = useState("");

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignToUserId, setAssignToUserId] = useState("");
  const [isAssigningLead, setIsAssigningLead] = useState(false);

  const [filterProduct, setFilterProduct] = useState<string[]>(["all"]);
  const [filterAssignee, setFilterAssignee] = useState<string[]>(["all"]);
  const [filterStatus, setFilterStatus] = useState<string[]>(["all"]);
  const [filterReason, setFilterReason] = useState<string[]>(["all"]);

  const filteredLeads = React.useMemo(() => {
    return leads.filter(l => !l.isDeleted);
  }, [leads]);

  const openNoteModal = (lead: Lead) => {
    setActiveLead(lead);
    setNoteText(lead.note || "");
    setNoteModalOpen(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLead) return;
    updateLead(activeLead.id, { note: noteText });
    toast.success("Inquiry Source saved successfully!");
    setNoteModalOpen(false);
  };

  const handleDeleteClick = (lead: Lead) => {
    setLeadToDelete(lead);
    setDeleteOpen(true);
  };

  const handleBulkAssign = async () => {
    if (!assignToUserId) {
      toast.warning("Please select a user to assign!");
      return;
    }
    setIsAssigningLead(true);
    try {
      await Promise.all(selectedIds.map(id => updateLeadApi(id, { assgin: assignToUserId })));
      const assignedUser = users.find((u: any) => (u._id || u.id) === assignToUserId);
      setLeads(prev => prev.map(l =>
        selectedIds.includes(l.id)
          ? { ...l, assgin: assignedUser?.name || assignToUserId, assginId: assignToUserId }
          : l
      ));
      toast.success(`${selectedIds.length} lead(s) assigned to ${assignedUser?.name || "user"} successfully!`);
      setSelectedIds([]);
      setAssignModalOpen(false);
      setAssignToUserId("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Bulk assign failed");
    } finally {
      setIsAssigningLead(false);
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedIds.length === 0) {
      toast.warning("Please select at least one lead to delete!");
      return;
    }
    setBulkDeleteOpen(true);
  };

  const executeBulkDelete = async () => {
    setIsDeletingLead(true);
    try {
      await Promise.all(selectedIds.map(id => deleteLeadApi(id)));
      setLeads(prev => prev.filter(l => !selectedIds.includes(l.id)));
      toast.success(`${selectedIds.length} leads deleted successfully!`);
      setSelectedIds([]);
      setBulkDeleteOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Bulk delete failed");
    } finally {
      setIsDeletingLead(false);
    }
  };

  const openEditModal = (lead: Lead) => {
    setActiveLead(lead);
    setLeadFormModalOpen(true);
  };

  const openConvertModal = (lead: Lead) => {
    setActiveLead(lead);
    setPaymentType("COD");
    setSelectedCourier(couriers[0]?.name || "Delhivery");
    setTransactionId("");

    if ((lead as any).products && Array.isArray((lead as any).products)) {
      setConvertSelectedProducts((lead as any).products.map((p: any) => ({
        productId: p.productId || p._id,
        name: p.name,
        amount: p.amount,
        quantity: p.quantity,
        subtotal: p.subtotal || (p.amount * p.quantity)
      })));
    } else {
      setConvertSelectedProducts([]);
    }
    setConvertModalOpen(true);
  };

  const handleConvertAddProduct = () => {
    if (!currentSelectedProductId) return;
    const prod = products.find(p => (p._id || p.id) === currentSelectedProductId);
    if (!prod) return;

    const existingIndex = convertSelectedProducts.findIndex(p => p.productId === currentSelectedProductId);
    if (existingIndex >= 0) {
      const updated = [...convertSelectedProducts];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].subtotal = updated[existingIndex].amount * updated[existingIndex].quantity;
      setConvertSelectedProducts(updated);
      toast.success("Product quantity incremented!");
    } else {
      setConvertSelectedProducts([
        ...convertSelectedProducts,
        {
          productId: prod._id || prod.id,
          name: prod.name,
          amount: prod.amount,
          quantity: 1,
          subtotal: prod.amount
        }
      ]);
      toast.success("Product added!");
    }
  };

  const handleConvertRemoveProduct = (productId: string) => {
    setConvertSelectedProducts(convertSelectedProducts.filter(p => p.productId !== productId));
  };

  const handleConvertQtyChange = (productId: string, qty: number) => {
    const safeQty = Math.max(1, qty);
    setConvertSelectedProducts(
      convertSelectedProducts.map(p => p.productId === productId ? { ...p, quantity: safeQty, subtotal: safeQty * p.amount } : p)
    );
  };

  const convertTotalAmount = convertSelectedProducts.reduce((sum, p) => sum + p.subtotal, 0);

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLead) return;
    if (convertSelectedProducts.length === 0) {
      toast.warning("Please add at least one product to convert to order!");
      return;
    }

    setIsConvertingLead(true);
    try {
      await createOrderApi({
        leadId: activeLead.id,
        name: activeLead.name || "Unknown",
        phone_number: activeLead.phone_number,
        products: convertSelectedProducts,
        amount: convertTotalAmount,
        quantity: convertSelectedProducts.reduce((sum, p) => sum + p.quantity, 0),
        grandTotal: convertTotalAmount,
        paymentType,
        courier: selectedCourier,
        assginTo: (activeLead as any).assginId || activeLead.assgin,
        transactionId,
        status: "Dispatched"
      } as any);
        const orderDoneStatus = statuses.find(s => s.name?.trim().toLowerCase() === "order done");
        await updateLeadApi(activeLead.id, { 
          orderStatus: true,
          ...(orderDoneStatus ? { status: orderDoneStatus._id || orderDoneStatus.id } : {})
        });
      toast.success(`Successfully converted ${activeLead.name || "Unknown"} to order!`);
      setConvertModalOpen(false);
      loadLeadsData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to convert to order");
    } finally {
      setIsConvertingLead(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const assigneeFilter = filterAssignee.includes('all') ? undefined : filterAssignee.join(',');
      const blob = await exportLeads({
        search: searchQuery || undefined,
        product: filterProduct.includes('all') ? undefined : filterProduct.join(','),
        assgin: assigneeFilter,
        status: filterStatus.includes('all') ? undefined : filterStatus.join(','),
        reason_call: filterReason.includes('all') ? undefined : filterReason.join(','),
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leads_export_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success("Export successful!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to export leads");
    } finally {
      setIsExporting(false);
    }
  };

  const columns: Column<Lead>[] = [
    { key: "id", header: "No", render: (_, __, i) => i + 1, sortable: false },
    { key: "name", header: "Customer Name", render: (val) => <span className="uppercase">{val || "-"}</span> },
    { key: "phone_number", header: "Phone Number" },
    { 
      key: "remark", 
      header: "Remark", 
      render: (_, row) => (
        <div 
          className="max-w-[150px] truncate cursor-pointer text-text-secondary hover:text-primary-teal hover:bg-primary-teal/5 p-1.5 rounded-lg transition-all" 
          title={row.remark || "No remark"}
        >
          {row.remark || "-"}
        </div>
      )
    },
    { key: "subtotal", header: "Total", render: (val) => `₹${val}` },
    { key: "assgin", header: "Assign By", render: (val) => <span className="uppercase">{val}</span> },
    { key: "date", header: "Date" },
    {
      key: "status",
      header: "Status",
      render: (val, row) => {
        const isSuccess = val === "Inprogress" || val === "In-Progress";
        const isError = val === "Close" || val === "Closed";

        return (
          <div className="w-[130px]">
            <Select
              value={(row as any).statusId || val || ""}
              onChange={(e) => updateLead(row.id, { status: e.target.value as string, statusId: e.target.value as string } as any)}
              options={statuses.map(s => ({ value: s._id || s.id, label: s.name }))}
              placeholder="Status"
              menuPortalTarget={true}
            />
          </div>
        );
      }
    },
    {
      key: "reason_call",
      header: "Reason Call",
      render: (val, row) => (
        <div className="w-[160px]">
          <Select
            value={(row as any).reasonCallId || val || ""}
            onChange={(e) => updateLead(row.id, { reason_call: e.target.value as string, reasonCallId: e.target.value as string } as any)}
            options={reasonsOptions.map(r => ({ value: r._id || r.id, label: r.name }))}
            placeholder="Select Reason"
            menuPortalTarget={true}
          />
        </div>
      )
    },
    {
      key: "convert",
      header: "Convert Order",
      sortable: false,
      render: (_, row) => (
        <>
          {hasPermission("Lead-transfer") && (
            <Button
              onClick={() => openConvertModal(row)}
              variant="primary"
              size="sm"
              className="text-[11px] whitespace-nowrap px-4"
              disabled={row.orderStatus}
            >
              {row.orderStatus ? "Converted" : "Convert To Order"}
            </Button>
          )}
        </>
      )
    },
    {
      key: "note",
      header: "Inquiry Source",
      sortable: false,
      render: (_, row) => (
        <div 
          className="max-w-[150px] truncate cursor-pointer text-text-secondary hover:text-primary-teal hover:bg-primary-teal/5 p-1.5 rounded-lg transition-all" 
          title={row.note || "No inquiry source"}
          onClick={() => openNoteModal(row)}
        >
          {row.note || "-"}
        </div>
      )
    },
    {
      key: "actions",
      header: "Action",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1">
          {hasPermission("Lead-edit") && (
            <button
              onClick={() => openEditModal(row)}
              className="p-1.5 bg-primary-teal hover:bg-primary-teal text-white rounded-lg transition-all shadow-sm"
              title="Edit Lead"
            >
              <FiEdit className="w-3.5 h-3.5" />
            </button>
          )}
          {hasPermission("Lead-delete") && (
            <button
              onClick={() => handleDeleteClick(row)}
              className="p-1.5 bg-rose-500 hover:bg-rose-400 text-white rounded-lg transition-all shadow-sm"
              title="Delete Lead"
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
      <LeadFormModal
        key={leadFormModalOpen ? (activeLead ? activeLead.id : 'new-lead') : 'closed'}
        isOpen={leadFormModalOpen}
        onClose={() => setLeadFormModalOpen(false)}
        onSuccess={loadLeadsData}
        activeLead={activeLead}
        users={users}
        products={products}
        statusesOptions={statuses}
        reasonCallOptions={reasonsOptions}
      />

      <div className="space-y-6">
        <div className="flex items-center justify-between pb-6">
          <h2 className="text-2xl font-bold text-text-primary">
            Lead List
          </h2>
          <div className="flex items-center gap-4">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
                loadLeadsData(undefined, undefined, { start, end });
              }}
            />

            {hasPermission("Lead-add") && (
              <Button
                onClick={() => { setActiveLead(null); setLeadFormModalOpen(true); }}
                variant="primary"
                className="rounded-lg px-6"
              >
                Add Lead
              </Button>
            )}
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
                ...products.map(p => ({ value: p._id || p.id, label: p.name }))
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
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as unknown as string[])}
              options={[
                { value: "all", label: "Select Status" },
                ...statuses.map(s => ({ value: s._id || s.id, label: s.name }))
              ]}
            />
          </div>
          <div className="w-full sm:w-auto sm:flex-1 min-w-[160px]">
            <Select
              multiple={true}
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value as unknown as string[])}
              options={[
                { value: "all", label: "Reason Call" },
                ...reasonsOptions.map(r => ({ value: r._id || r.id, label: r.name }))
              ]}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              className="rounded-lg"
              onClick={() => loadLeadsData()}
            >
              Apply Filter
            </Button>
            <Button
              variant="outline"
              className="rounded-lg"
              onClick={() => {
                setFilterProduct(["all"]);
                if (isAdmin) setFilterAssignee(["all"]);
                setFilterStatus(["all"]);
                setFilterReason(["all"]);
                setTimeout(() => loadLeadsData(isAdmin ? "all" : (currentUser?._id || currentUser?.id)), 0);
              }}
            >
              Clear Filter
            </Button>
            {hasPermission("Lead-transfer") && (
              <Button
                variant="primary"
                className="rounded-lg bg-teal-700 hover:bg-teal-600"
                onClick={() => {
                  if (selectedIds.length === 0) {
                    toast.warning("Please select at least one lead to assign!");
                    return;
                  }
                  setAssignToUserId("");
                  setAssignModalOpen(true);
                }}
              >
                Assign Lead
              </Button>
            )}
            <Button
              variant="outline"
              className="rounded-lg"
              onClick={handleExport}
              isLoading={isExporting}
            >
              Export
            </Button>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-gradient-subtle border border-primary-teal/20 rounded-lg animate-fade-in">
            <span className="text-sm font-bold text-primary-teal">
              {selectedIds.length} leads selected
            </span>
            <div className="flex items-center gap-3">
              {hasPermission("Lead-transfer") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-card-bg border-primary-teal/20 text-primary-teal rounded-lg"
                  onClick={() => { setAssignToUserId(""); setAssignModalOpen(true); }}
                >
                  <SwapHoriz className="w-4 h-4 mr-2" /> Bulk Assign
                </Button>
              )}
              {hasPermission("Lead-delete") && (
                <Button
                  variant="danger"
                  className="text-xs bg-rose-500 hover:bg-rose-400"
                  onClick={handleBulkDeleteClick}
                >
                  <FiTrash2 className="w-4 h-4 mr-2" /> Bulk Delete ({selectedIds.length})
                </Button>
              )}
            </div>
          </div>
        )}

        <Table
          data={filteredLeads}
          columns={columns}
          selectable={true}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          isLoading={isFetchingData}
          searchable={true}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
            // Table component already debounces 400ms before calling this
            loadLeadsData(undefined, val, undefined, 1, rowsPerPage);
          }}
          serverSide={true}
          totalCount={totalRecords}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          onPageChange={(page, limit) => {
            setCurrentPage(page);
            setRowsPerPage(limit);
            loadLeadsData(undefined, undefined, undefined, page, limit);
          }}
        />
      </div>

      {/* Assign Leads Modal */}
      <Modal isOpen={assignModalOpen} onClose={() => setAssignModalOpen(false)} title="Assign Leads" overflowVisible={true}>
        <div className="space-y-5">
          {/* Selection count badge */}
          <div className="flex items-center gap-2 p-3 bg-primary-teal/5 border border-primary-teal/20 rounded-lg">
            <SwapHoriz className="w-4 h-4 text-primary-teal" />
            <span className="text-sm font-semibold text-primary-teal">
              {selectedIds.length} lead{selectedIds.length !== 1 ? "s" : ""} selected
            </span>
          </div>

          {/* Assign To dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Assign To
            </label>
            <Select
              value={assignToUserId}
              onChange={(e) => setAssignToUserId(e.target.value)}
              options={[
                { value: "", label: "Select a user..." },
                ...users.map((u: any) => ({ value: u._id || u.id, label: u.name }))
              ]}
            />
            {assignToUserId && (() => {
              const u = users.find((u: any) => (u._id || u.id) === assignToUserId);
              return u?.email ? (
                <p className="text-[11px] text-text-secondary mt-1">✉ {u.email}</p>
              ) : null;
            })()}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="primary"
              className="flex-1 bg-teal-700 hover:bg-teal-600"
              onClick={handleBulkAssign}
              isLoading={isAssigningLead}
              disabled={!assignToUserId}
            >
              Assign
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setAssignModalOpen(false)}
              disabled={isAssigningLead}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={convertModalOpen} onClose={() => setConvertModalOpen(false)} title="Lead Convert To Order" sizeClass="max-w-4xl" isLoading={isConvertingLead} >
        <form onSubmit={handleConvertSubmit} className="space-y-4">

          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Payment Type</label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-zinc-650 cursor-pointer">
                <input type="radio" name="paymentType" value="COD" checked={paymentType === 'COD'} onChange={() => setPaymentType('COD')} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                COD Discount
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-650 cursor-pointer">
                <input type="radio" name="paymentType" value="Prepaid" checked={paymentType === 'Prepaid'} onChange={() => setPaymentType('Prepaid')} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                Prepaid Discount
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Transaction ID"
              value={transactionId || ""}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="e.g. TXN12345"
              required={paymentType === 'Prepaid'}
            />
            <Select
              label="Select Courier"
              value={selectedCourier}
              onChange={(e) => setSelectedCourier(e.target.value)}
              options={[{ value: "", label: "Select Courier" }, ...couriers.map(c => ({ value: c.name, label: c.name }))]}
            />
          </div>

          <div className="border-t border-zinc-150 pt-6 space-y-4">
            <h4 className="text-lg font-bold text-zinc-800">Choose Products to Add</h4>
            <div className="flex gap-4 items-end bg-zinc-50 p-4 rounded-xl border border-zinc-200">
              <div className="flex-1">
                <Select
                  label="Search & Select Product"
                  value={currentSelectedProductId}
                  onChange={(e) => setCurrentSelectedProductId(e.target.value)}
                  options={[
                    { value: "", label: "Select a Product" },
                    ...products.map(p => ({ value: p._id || p.id, label: `${p.name} (₹${p.amount})` }))
                  ]}
                />
              </div>
              <Button type="button" variant="success" size="lg" onClick={handleConvertAddProduct} className="mb-1">
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
                  {convertSelectedProducts.length > 0 ? (
                    convertSelectedProducts.map((row) => (
                      <tr
                        key={row.productId}
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
                              handleConvertQtyChange(row.productId, Number(e.target.value))
                            }
                            className="w-20 px-2 py-1 text-sm font-medium bg-white border border-zinc-200 rounded-lg focus:ring-1 focus:ring-primary-teal/20 focus:border-primary-teal outline-none text-center shadow-sm"
                          />
                        </td>

                        <td className="p-3 font-bold text-zinc-900 text-sm">
                          ₹{row.subtotal}
                        </td>

                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleConvertRemoveProduct(row.productId)}
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

          <div className="flex items-center justify-between border-t border-zinc-150 pt-4 mt-2">
            <span className="text-sm font-bold text-zinc-800 bg-zinc-100 px-4 py-2 rounded-lg border border-zinc-200 shadow-sm mr-auto">
              Total Amount: <span className="text-primary-teal ml-1">₹{convertTotalAmount.toLocaleString()}</span>
            </span>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConvertModalOpen(false)}
                disabled={isConvertingLead}
              >
                Close
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isConvertingLead}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal isOpen={noteModalOpen} onClose={() => setNoteModalOpen(false)} title="Inquiry Source">
        <form onSubmit={handleSaveNote} className="space-y-4">
          <div className="w-full flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
              Add Inquiry Source
            </label>
            <textarea
              className="w-full px-4 py-2.5 text-sm bg-card-bg border border-border-ui text-text-primary rounded-lg transition-all duration-200 outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal/30 placeholder:text-text-secondary/50 min-h-[100px] resize-y"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter your inquiry source here..."
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            fullWidth
          >
            Save Inquiry Source
          </Button>
          {activeLead?.note && (
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg mt-4">
              <div className="flex justify-between items-center text-xs text-zinc-500 mb-2">
                <span>{activeLead.date}</span>
                <button type="button" onClick={() => { updateLead(activeLead.id, { note: "" }); setNoteText(""); }} className="p-1.5 hover:bg-zinc-200 rounded-md text-red-500 hover:text-red-600"><FiTrash2 className="w-4 h-4" /></button>
              </div>
              <p className="text-sm text-zinc-800 whitespace-pre-wrap">{activeLead.note}</p>
            </div>
          )}
        </form>
      </Modal>

      <DeleteConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={executeDelete}
        title="Delete Lead"
        itemName={leadToDelete?.name}
        itemType="lead"
      />

      <DeleteConfirmModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={executeBulkDelete}
        title="Delete Leads"
        itemName={`${selectedIds.length} selected leads`}
        itemType="leads"
      />
    </div>
  );
}
