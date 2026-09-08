"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  fetchReasonToCalls,
  createReasonToCall,
  updateReasonToCall,
  deleteReasonToCall,
  exportReasonToCalls,
  ReasonToCall,
} from "../../services/reasonToCallService";
import { exportCopy, exportExcel, exportCSV, exportPDF } from "../../utils/exportUtils";
import { Table, Column } from "../../components/common/Table";
import { FiEdit, FiTrash2 } from "react-icons/fi";
import { Modal } from "../../components/common/Modal";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { useToast } from "../../context/ToastContext";
import { DeleteConfirmModal } from "../../components/common/DeleteConfirmModal";
import { usePermission } from "../../utils/permissionUtils";

export default function ReasonToCallPage() {
  const { hasPermission } = usePermission();
  const [reasons, setReasons] = useState<ReasonToCall[]>([]);
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
  const [activeReason, setActiveReason] = useState<ReasonToCall | null>(null);

  // Delete Confirm Modal State
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reasonToDelete, setReasonToDelete] = useState<ReasonToCall | null>(null);

  const [name, setName] = useState("");
  const [formErrors, setFormErrors] = useState<{ name?: string }>({});

  const loadReasons = useCallback(async () => {
    try {
      setLoading(true);
      
      const res = await fetchReasonToCalls({ page, limit, search });
      setReasons(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load reasons to call. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    loadReasons();
  }, [loadReasons]);

  const validate = () => {
    const errors: { name?: string } = {};
    if (!name.trim()) errors.name = "Reason to call name is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await createReasonToCall({ name });
      setModalOpen(false);
      clear();
      toast.success("Reason to call created successfully.");
      loadReasons();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create reason to call.");
    }
  };

  const openEdit = (reason: ReasonToCall) => {
    setActiveReason(reason);
    setName(reason.name);
    setFormErrors({});
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!activeReason) return;
    try {
      await updateReasonToCall(activeReason._id, { name });
      setEditOpen(false);
      clear();
      toast.success("Reason to call updated successfully.");
      loadReasons();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update reason to call.");
    }
  };

  const handleDelete = (reason: ReasonToCall) => {
    setReasonToDelete(reason);
    setDeleteOpen(true);
  };

  const executeDelete = async () => {
    if (!reasonToDelete) return;
    try {
      await deleteReasonToCall(reasonToDelete._id);
      setDeleteOpen(false);
      setReasonToDelete(null);
      toast.success("Reason to call deleted successfully.");
      loadReasons();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete reason to call.");
    }
  };

  const clear = () => {
    setName("");
    setActiveReason(null);
    setFormErrors({});
  };

  const exportFields = [
    { key: 'name', header: 'Reason to Call' },
  ];

  const handleExport = async (type: 'copy' | 'excel' | 'csv' | 'pdf') => {
    if (!hasPermission("Reason-to-call-export")) {
      toast.error("You do not have permission to export.");
      return;
    }
    try {
      setExportLoading(true);
      const rows = await exportReasonToCalls(search);
      if (type === 'copy') {
        exportCopy(rows, exportFields);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
      else if (type === 'excel') exportExcel(rows, exportFields, 'reasons_to_call');
      else if (type === 'csv') exportCSV(rows, exportFields, 'reasons_to_call');
      else if (type === 'pdf') exportPDF(rows, exportFields, 'Reason to Call List');
    } catch {
      toast.error('Export failed. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  const columns: Column<ReasonToCall>[] = [
    { key: "_id", header: "No", render: (_, __, i) => (page - 1) * limit + i + 1, sortable: false },
    { key: "name", header: "Reason to Call Name" },
    {
      key: "actions",
      header: "Action",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          {hasPermission("Reason-to-call-edit") && (
            <button onClick={() => openEdit(row)} className="p-1.5 bg-primary-teal hover:bg-primary-teal text-white rounded-lg transition-all shadow-sm" title="Edit Reason">
              <FiEdit className="w-3.5 h-3.5" />
            </button>
          )}
          {hasPermission("Reason-to-call-delete") && (
            <button onClick={() => handleDelete(row)} className="p-1.5 bg-rose-500 hover:bg-rose-400 text-white rounded-lg transition-all shadow-sm" title="Delete Reason">
              <FiTrash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 border border-zinc-200 rounded-md shadow-sm space-y-6">

        {/* Header Block */}
        <div className="border-b border-zinc-100 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-800">Reason to Call List</h2>
            {hasPermission("Reason-to-call-add") && (
              <Button onClick={() => { clear(); setModalOpen(true); }} variant="primary">Add Reason to Call</Button>
            )}
          </div>
          {/* Export Buttons */}
          {hasPermission("Reason-to-call-export") && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => handleExport('copy')} disabled={exportLoading}
                className={`px-3 py-1 text-[10px] font-semibold rounded border transition-all disabled:opacity-50 ${copySuccess ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                  }`}>{copySuccess ? 'Copied!' : 'Copy'}</button>
              <button onClick={() => handleExport('excel')} disabled={exportLoading}
                className="px-3 py-1 text-[10px] font-semibold rounded border bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-all disabled:opacity-50">Excel</button>
              <button onClick={() => handleExport('csv')} disabled={exportLoading}
                className="px-3 py-1 text-[10px] font-semibold rounded border bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-all disabled:opacity-50">CSV</button>
              <button onClick={() => handleExport('pdf')} disabled={exportLoading}
                className="px-3 py-1 text-[10px] font-semibold rounded border bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-all disabled:opacity-50">PDF</button>
              {exportLoading && <span className="text-[10px] text-zinc-400 ml-1">Exporting...</span>}
            </div>
          )}
        </div>

        

        <Table
          data={reasons}
          columns={columns}
          searchable={true}
          searchPlaceholder="Search reasons..."
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

      {/* Add Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); clear(); }} title="Add Reason to Call">
        <form onSubmit={handleCreate} className="space-y-4" noValidate>
          <div>
            <Input label="Reason Name" value={name} onChange={(e) => { setName(e.target.value); setFormErrors(p => ({ ...p, name: undefined })); }} />
            {formErrors.name && <p className="text-rose-500 text-[11px] mt-1">{formErrors.name}</p>}
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" className="px-8">Save</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={editOpen} onClose={() => { setEditOpen(false); clear(); }} title="Edit Reason to Call">
        <form onSubmit={handleEditSubmit} className="space-y-4" noValidate>
          <div>
            <Input label="Reason Name" value={name} onChange={(e) => { setName(e.target.value); setFormErrors(p => ({ ...p, name: undefined })); }} />
            {formErrors.name && <p className="text-rose-500 text-[11px] mt-1">{formErrors.name}</p>}
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" className="bg-indigo-600 hover:bg-indigo-500 px-8">Save</Button>
          </div>
        </form>
      </Modal>

      <DeleteConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={executeDelete}
        title="Delete Reason to Call"
        itemName={reasonToDelete?.name}
        itemType="reason to call"
      />
    </div>
  );
}
