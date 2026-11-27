"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  fetchLeadStatuses,
  createLeadStatus,
  updateLeadStatus,
  deleteLeadStatus,
  exportLeadStatuses,
  LeadStatus,
} from "../../services/leadStatusService";
import { exportCopy, exportExcel, exportCSV, exportPDF } from "../../utils/exportUtils";
import { Table, Column } from "../../components/common/Table";
import { FiEdit, FiTrash2, FiTag } from "react-icons/fi";
import { Modal } from "../../components/common/Modal";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { DeleteConfirmModal } from "../../components/common/DeleteConfirmModal";
import { useToast } from "../../context/ToastContext";
import { usePermission } from "../../utils/permissionUtils";

export default function LeadStatusPage() {
  const { hasPermission } = usePermission();
  const [leadStatuses, setLeadStatuses] = useState<LeadStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [exportLoading, setExportLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Server-side pagination + search
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activeLeadStatus, setActiveLeadStatus] = useState<LeadStatus | null>(null);

  // Delete Confirm Modal State
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [leadStatusToDelete, setLeadStatusToDelete] = useState<LeadStatus | null>(null);

  const [name, setName] = useState("");
  const [formErrors, setFormErrors] = useState<{ name?: string }>({});

  const loadLeadStatuses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchLeadStatuses({ page, limit, search });
      setLeadStatuses(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load lead statuses. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, toast]);

  useEffect(() => {
    loadLeadStatuses();
  }, [loadLeadStatuses]);

  const clear = () => {
    setName("");
    setActiveLeadStatus(null);
    setFormErrors({});
  };

  const validate = () => {
    const errors: { name?: string } = {};
    if (!name.trim()) errors.name = "Lead status name is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await createLeadStatus({ name: name.trim() });
      setModalOpen(false);
      clear();
      toast.success("Lead status created successfully.");
      loadLeadStatuses();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create lead status.");
    }
  };

  const openEdit = (leadStatus: LeadStatus) => {
    setActiveLeadStatus(leadStatus);
    setName(leadStatus.name);
    setFormErrors({});
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!activeLeadStatus) return;
    try {
      await updateLeadStatus(activeLeadStatus._id, { name: name.trim() });
      setEditOpen(false);
      clear();
      toast.success("Lead status updated successfully.");
      loadLeadStatuses();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update lead status.");
    }
  };

  const handleDeleteClick = (leadStatus: LeadStatus) => {
    setLeadStatusToDelete(leadStatus);
    setDeleteOpen(true);
  };

  const executeDelete = async () => {
    if (!leadStatusToDelete) return;
    try {
      await deleteLeadStatus(leadStatusToDelete._id);
      setDeleteOpen(false);
      setLeadStatusToDelete(null);
      toast.success("Lead status deleted successfully.");
      loadLeadStatuses();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete lead status.");
    }
  };

  const exportFields = [
    { key: "name", header: "Name" },
  ];

  const handleExport = async (type: "copy" | "excel" | "csv" | "pdf") => {
    if (!hasPermission("Lead-status-export")) {
      toast.error("You do not have permission to export.");
      return;
    }
    try {
      setExportLoading(true);
      const rows = await exportLeadStatuses(search);
      if (type === "copy") {
        exportCopy(rows, exportFields);
        toast.success("Copied to clipboard!");
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } else if (type === "excel") {
        exportExcel(rows, exportFields, "lead-statuses");
        toast.success("Excel exported successfully.");
      } else if (type === "csv") {
        exportCSV(rows, exportFields, "lead-statuses");
        toast.success("CSV exported successfully.");
      } else if (type === "pdf") {
        exportPDF(rows, exportFields, "Lead Status List");
        toast.success("PDF exported successfully.");
      }
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  const columns: Column<LeadStatus>[] = [
    { key: "_id", header: "No", render: (_, __, i) => (page - 1) * limit + i + 1, sortable: false },
    {
      key: "name",
      header: "Name",
      render: (val) => (
        <div className="flex items-center gap-2">
          <FiTag className="text-primary-teal w-4 h-4" />
          <span className="font-semibold">{val}</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Action",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          {hasPermission("Lead-status-edit") && (
            <button
              onClick={() => openEdit(row)}
              className="p-1.5 bg-primary-teal hover:bg-primary-teal text-white rounded-lg transition-all shadow-sm"
              title="Edit Lead Status"
            >
              <FiEdit className="w-3.5 h-3.5" />
            </button>
          )}
          {hasPermission("Lead-status-delete") && (
            <button
              onClick={() => handleDeleteClick(row)}
              className="p-1.5 bg-rose-500 hover:bg-rose-400 text-white rounded-lg transition-all shadow-sm"
              title="Delete Lead Status"
            >
              <FiTrash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-800">Lead Status List</h2>
            {hasPermission("Lead-status-add") && (
              <Button onClick={() => { clear(); setModalOpen(true); }} variant="primary">
                Add Lead Status
              </Button>
            )}
          </div>

          {/* Export Buttons */}
          {hasPermission("Lead-status-export") && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleExport("copy")}
                disabled={exportLoading}
                className={`px-3 py-1 text-[10px] font-semibold rounded-lg border transition-all disabled:opacity-50 ${
                  copySuccess
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {copySuccess ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={() => handleExport("excel")}
                disabled={exportLoading}
                className="px-3 py-1 text-[10px] font-semibold rounded-lg border bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-all disabled:opacity-50"
              >
                Excel
              </button>
              <button
                onClick={() => handleExport("csv")}
                disabled={exportLoading}
                className="px-3 py-1 text-[10px] font-semibold rounded-lg border bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-all disabled:opacity-50"
              >
                CSV
              </button>
              <button
                onClick={() => handleExport("pdf")}
                disabled={exportLoading}
                className="px-3 py-1 text-[10px] font-semibold rounded-lg border bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-all disabled:opacity-50"
              >
                PDF
              </button>
              {exportLoading && <span className="text-[10px] text-zinc-400 ml-1">Exporting...</span>}
            </div>
          )}
        </div>

        <Table
          data={leadStatuses}
          columns={columns}
          searchable={true}
          searchPlaceholder="Search lead statuses..."
          idField="_id"
          isLoading={loading}
          serverSide={true}
          totalCount={total}
          currentPage={page}
          rowsPerPage={limit}
          onPageChange={(p, l) => { setPage(p); setLimit(l); }}
          onSearchChange={(s) => { setSearch(s); setPage(1); }}
        />
      </div>

      {/* Add Lead Status Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); clear(); }} title="Add Lead Status">
        <form onSubmit={handleCreate} className="space-y-4" noValidate>
          <div>
            <Input
              label="Lead Status"
              placeholder="Enter lead status"
              value={name}
              onChange={(e) => { setName(e.target.value); setFormErrors(p => ({ ...p, name: undefined })); }}
            />
            {formErrors.name && <p className="text-rose-500 text-[11px] mt-1">{formErrors.name}</p>}
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" className="px-8">Save</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Lead Status Modal */}
      <Modal isOpen={editOpen} onClose={() => { setEditOpen(false); clear(); }} title="Edit Lead Status">
        <form onSubmit={handleEditSubmit} className="space-y-4" noValidate>
          <div>
            <Input
              label="Lead Status"
              placeholder="Enter lead status"
              value={name}
              onChange={(e) => { setName(e.target.value); setFormErrors(p => ({ ...p, name: undefined })); }}
            />
            {formErrors.name && <p className="text-rose-500 text-[11px] mt-1">{formErrors.name}</p>}
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" className="bg-teal-800 hover:bg-teal-700 px-8">Save</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteOpen}
        onClose={() => { setDeleteOpen(false); setLeadStatusToDelete(null); }}
        onConfirm={executeDelete}
        title="Delete Lead Status"
        itemName={leadStatusToDelete?.name}
        itemType="lead status"
      />
    </div>
  );
}
