"use client";

import React, { useState } from "react";
import { CalendarToday } from "@mui/icons-material";
import { Table, Column } from "../../components/common/Table";
import { useToast } from "../../context/ToastContext";
import { Button } from "../../components/common/Button";
import { getAuthenticatedUser } from "../../utils/authUtils";
import { usePermission } from "../../utils/permissionUtils";
import { fetchLeads, deleteLeadApi } from "../../services/leadService";
import { fetchUsers } from "../../services/userService";
import { fetchProducts } from "../../services/productService";
import { fetchStatuses } from "../../services/statusService";
import { fetchReasonToCalls } from "../../services/reasonToCallService";
import { DateRangePicker } from "../../components/common/DateRangePicker";
import { LeadFormModal } from "../../components/leads/LeadFormModal";
import { DeleteConfirmModal } from "../../components/common/DeleteConfirmModal";
import { FiEdit, FiTrash2 } from "react-icons/fi";
import { formatDateTime } from "../../utils/dateUtils";


export interface Reminder {
  id: string;
  title: string;
  leadId: string;
  name: string;
  phone_number: string;
  reminderDate: string;
  product: string;
  amount: number;
  quantity: number;
  subtotal: number;
  // Full lead properties for Edit
  [key: string]: any;
}

export default function ReminderListPage() {
  const { hasPermission } = usePermission();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [reasonsOptions, setReasonsOptions] = useState<any[]>([]);

  const [leadFormModalOpen, setLeadFormModalOpen] = useState(false);
  const [activeLead, setActiveLead] = useState<any | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState<Reminder | null>(null);

  const getTodayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [startDate, setStartDate] = useState<string | null>(getTodayString());
  const [endDate, setEndDate] = useState<string | null>(getTodayString());

  const toast = useToast();

  const loadRemindersData = async (assigneeFilter?: string, searchOverride?: string, overrideDates?: { start: string | null, end: string | null }, overridePage?: number, overrideLimit?: number) => {
    setIsFetchingData(true);
    try {
      const searchToUse = searchOverride !== undefined ? searchOverride : searchQuery;
      const startToUse = overrideDates !== undefined ? overrideDates.start : startDate;
      const endToUse = overrideDates !== undefined ? overrideDates.end : endDate;
      const pageToUse = overridePage !== undefined ? overridePage : currentPage;
      const limitToUse = overrideLimit !== undefined ? overrideLimit : rowsPerPage;

      const res = await fetchLeads({
        page: pageToUse,
        limit: limitToUse,
        assgin: assigneeFilter,
        search: searchToUse || undefined,
        reminderStartDate: startToUse || undefined,
        reminderEndDate: endToUse || undefined
      });
      const data = res.data.filter((l: any) => l.reminder).map((l: any) => ({
        id: l._id || l.id,
        leadId: l._id || l.id,
        title: l.note || `Reminder for ${l.name}`,
        name: l.name,
        phone_number: l.phone_number,
        reminderDate: l.reminder ? formatDateTime(l.reminder) : "N/A",
        product: l.products?.map((p: any) => p.name).join(", ") || l.product || "Unknown Product",
        amount: l.amount || 0,
        quantity: l.quantity || 1,
        subtotal: l.subtotal || 0,
        assgin: l.assgin ? (typeof l.assgin === 'object' ? (l.assgin.name || "Unknown") : l.assgin) : "N/A",
        // Spreading full lead for editing
        ...l
      }));
      setReminders(data);
      if (res.total !== undefined) {
        setTotalRecords(res.total);
      } else if (res.data) {
        setTotalRecords(res.data.length);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingData(false);
    }
  };

  React.useEffect(() => {
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
    let initialAssigneeFilter = undefined;
    if (user) {
      setCurrentUser(user);
      const admin = user?.roles?.some((r: string) => r.toLowerCase().includes('admin'));
      setIsAdmin(admin);
      if (!admin) {
        initialAssigneeFilter = user._id || user.id;
      }
    }
    loadMasterData();
    loadRemindersData(initialAssigneeFilter);
  }, []);

  const openEditModal = (row: Reminder) => {
    setActiveLead(row);
    setLeadFormModalOpen(true);
  };

  const handleDeleteClick = (reminder: Reminder) => {
    setReminderToDelete(reminder);
    setDeleteOpen(true);
  };

  const executeDelete = async () => {
    if (!reminderToDelete) return;
    try {
      await deleteLeadApi(reminderToDelete.id);
      setReminders(prev => prev.filter(r => r.id !== reminderToDelete.id));
      toast.success("Reminder (Lead) deleted.");
      setDeleteOpen(false);
      setReminderToDelete(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete reminder");
    }
  };

  const columns: Column<Reminder>[] = [
    { key: "id", header: "No", render: (_, __, i) => i + 1, sortable: false },
    { key: "title", header: "Note / Title", render: (val) => val || "N/A" },
    { key: "name", header: "Customer Name", render: (val) => val || "N/A" },
    { key: "phone_number", header: "Phone Number" },
    { key: "assgin", header: "Assign To", render: (val) => typeof val === 'object' ? (val?.name || "Unknown") : String(val || "N/A") },
    { key: "reminderDate", header: "Reminder Date" },
    {
      key: "actions",
      header: "Action",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1">
          {hasPermission("Reminder-edit") && (
            <button
              onClick={() => openEditModal(row)}
              className="p-1.5 bg-primary-teal hover:bg-primary-teal text-white rounded-lg transition-all shadow-sm"
              title="Edit Lead"
            >
              <FiEdit className="w-3.5 h-3.5" />
            </button>
          )}
          {hasPermission("Reminder-delete") && (
            <button
              onClick={() => handleDeleteClick(row)}
              className="p-1.5 bg-rose-500 hover:bg-rose-400 text-white rounded-lg transition-all shadow-sm"
              title="Delete Reminder"
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
        isOpen={leadFormModalOpen}
        onClose={() => setLeadFormModalOpen(false)}
        onSuccess={() => loadRemindersData(isAdmin ? undefined : (currentUser?._id || currentUser?.id))}
        activeLead={activeLead}
        users={users}
        products={products}
        statusesOptions={statuses}
        reasonCallOptions={reasonsOptions}
      />

      <DeleteConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={executeDelete}
        title="Delete Reminder"
        itemName={reminderToDelete?.name}
        itemType="reminder"
      />

      <div className="bg-card-bg space-y-6">

        {/* Header and Date Range */}
        <div className="flex items-center justify-between  pb-6">
          <h2 className="text-2xl font-bold text-text-primary">
            Reminder List
          </h2>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
              loadRemindersData(isAdmin ? undefined : (currentUser?._id || currentUser?.id), undefined, { start, end });
            }}
          />
        </div>

        {/* Table Element */}
        <Table
          data={reminders}
          columns={columns}
          selectable={false}
          isLoading={isFetchingData}
          searchable={true}
          searchPlaceholder="Search reminders..."
          onSearchChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
            // Table already debounces 400ms, then calls this
            loadRemindersData(isAdmin ? undefined : (currentUser?._id || currentUser?.id), val, undefined, 1, rowsPerPage);
          }}
          serverSide={true}
          totalCount={totalRecords}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          onPageChange={(page, limit) => {
            setCurrentPage(page);
            setRowsPerPage(limit);
            loadRemindersData(isAdmin ? undefined : (currentUser?._id || currentUser?.id), undefined, undefined, page, limit);
          }}
        />
      </div>
    </div>
  );
}
