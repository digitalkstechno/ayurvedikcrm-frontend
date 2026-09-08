"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  fetchStatuses,
  createStatus,
  updateStatus,
  deleteStatus,
  exportStatuses,
  Status,
} from "../../services/statusService";
import { exportCopy, exportExcel, exportCSV, exportPDF } from "../../utils/exportUtils";
import { Table, Column } from "../../components/common/Table";
import { FiEdit, FiTrash2, FiTag } from "react-icons/fi";
import { Modal } from "../../components/common/Modal";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { useToast } from "../../context/ToastContext";
import { usePermission } from "../../utils/permissionUtils";

export default function StatusPage() {
  const { hasPermission } = usePermission();
  const [statuses, setStatuses] = useState<Status[]>([]);
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
  const [activeStatus, setActiveStatus] = useState<Status | null>(null);

  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [formErrors, setFormErrors] = useState<{ name?: string }>({});

  const loadStatuses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchStatuses({ page, limit, search });
      setStatuses(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load statuses. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, toast]);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  const validate = () => {
    const errors: { name?: string } = {};
    if (!name.trim()) errors.name = "Status name is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await createStatus({ name, color });
      setModalOpen(false);
      clear();
      toast.success("Status created successfully.");
      loadStatuses();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create status.");
    }
  };

  const openEdit = (status: Status) => {
    setActiveStatus(status);
    setName(status.name);
    setColor(status.color);
    setFormErrors({});
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!activeStatus) return;
    try {
      await updateStatus(activeStatus._id, { name, color });
      setEditOpen(false);
      clear();
      toast.success("Status updated successfully.");
      loadStatuses();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update status.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteStatus(id);
      toast.success("Status deleted successfully.");
      loadStatuses();
    } catch {
      toast.error("Failed to delete status.");
    }
  };

  const clear = () => {
    setName("");
    setColor("#3b82f6");
    setActiveStatus(null);
    setFormErrors({});
  };

  const exportFields = [
    { key: 'name', header: 'Name' },
    { key: 'color', header: 'Color' },
  ];

  const handleExport = async (type: 'copy' | 'excel' | 'csv' | 'pdf') => {
    if (!hasPermission("Status-export")) {
      toast.error("You do not have permission to export.");
      return;
    }
    try {
      setExportLoading(true);
      const rows = await exportStatuses(search);
      if (type === 'copy') { 
        exportCopy(rows, exportFields); 
        toast.success("Copied to clipboard!");
        setCopySuccess(true); 
        setTimeout(() => setCopySuccess(false), 2000); 
      }
      else if (type === 'excel') {
        exportExcel(rows, exportFields, 'statuses');
        toast.success("Excel exported successfully.");
      }
      else if (type === 'csv') {
        exportCSV(rows, exportFields, 'statuses');
        toast.success("CSV exported successfully.");
      }
      else if (type === 'pdf') {
        exportPDF(rows, exportFields, 'Status List');
        toast.success("PDF exported successfully.");
      }
    } catch { toast.error('Export failed. Please try again.'); }
    finally { setExportLoading(false); }
  };

  const columns: Column<Status>[] = [
    { key: "_id", header: "No", render: (_, __, i) => (page - 1) * limit + i + 1, sortable: false },
    { 
      key: "name", 
      header: "Name",
      render: (val) => (
        <div className="flex items-center gap-2">
          <FiTag className="text-primary-teal w-4 h-4" />
          <span className="font-semibold">{val}</span>
        </div>
      )
    },
    {
      key: "color",
      header: "Color",
      render: (val) => (
        <span className="inline-block w-8 h-5 rounded-lg shadow-sm" style={{ backgroundColor: val }} />
      )
    },
    {
      key: "actions",
      header: "Action",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          {hasPermission("Status-edit") && (
            <button onClick={() => openEdit(row)} className="p-1.5 bg-primary-teal hover:bg-primary-teal text-white rounded-lg transition-all shadow-sm" title="Edit Status">
              <FiEdit className="w-3.5 h-3.5" />
            </button>
          )}
          {hasPermission("Status-delete") && (
            <button onClick={() => handleDelete(row._id)} className="p-1.5 bg-rose-500 hover:bg-rose-400 text-white rounded-lg transition-all shadow-sm" title="Delete Status">
              <FiTrash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-6">

        {/* Header */}
        <div className="pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-800 ">Status List</h2>
            {hasPermission("Status-add") && (
              <Button onClick={() => { clear(); setModalOpen(true); }} variant="primary">Add Status</Button>
            )}
          </div>
          {/* Export Buttons */}
          {hasPermission("Status-export") && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => handleExport('copy')} disabled={exportLoading}
                className={`px-3 py-1 text-[10px] font-semibold rounded-lg border transition-all disabled:opacity-50 ${
                  copySuccess ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white  border-zinc-200  text-zinc-600  hover:bg-zinc-50 '
                }`}>{copySuccess ? 'Copied!' : 'Copy'}</button>
              <button onClick={() => handleExport('excel')} disabled={exportLoading}
                className="px-3 py-1 text-[10px] font-semibold rounded-lg border bg-white  border-zinc-200  text-zinc-600  hover:bg-zinc-50  transition-all disabled:opacity-50">Excel</button>
              <button onClick={() => handleExport('csv')} disabled={exportLoading}
                className="px-3 py-1 text-[10px] font-semibold rounded-lg border bg-white  border-zinc-200  text-zinc-600  hover:bg-zinc-50  transition-all disabled:opacity-50">CSV</button>
              <button onClick={() => handleExport('pdf')} disabled={exportLoading}
                className="px-3 py-1 text-[10px] font-semibold rounded-lg border bg-white  border-zinc-200  text-zinc-600  hover:bg-zinc-50  transition-all disabled:opacity-50">PDF</button>
              {exportLoading && <span className="text-[10px] text-zinc-400 ml-1">Exporting...</span>}
            </div>
          )}
        </div>

        <Table
          data={statuses}
          columns={columns}
          searchable={true}
          searchPlaceholder="Search statuses..."
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

      {/* Add Status Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); clear(); }} title="Add Status">
        <form onSubmit={handleCreate} className="space-y-4" noValidate>
          <div>
            <Input label="Name" value={name} onChange={(e) => { setName(e.target.value); setFormErrors(p => ({ ...p, name: undefined })); }} />
            {formErrors.name && <p className="text-rose-500 text-[11px] mt-1">{formErrors.name}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Color</span>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-10 border border-zinc-250 rounded-lg cursor-pointer bg-white" />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" className="px-8">Save</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Status Modal */}
      <Modal isOpen={editOpen} onClose={() => { setEditOpen(false); clear(); }} title="Edit Status">
        <form onSubmit={handleEditSubmit} className="space-y-4" noValidate>
          <div>
            <Input label="Name" value={name} onChange={(e) => { setName(e.target.value); setFormErrors(p => ({ ...p, name: undefined })); }} />
            {formErrors.name && <p className="text-rose-500 text-[11px] mt-1">{formErrors.name}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Color</span>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-10 border border-zinc-250 rounded-lg cursor-pointer bg-white" />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" className="bg-teal-800 hover:bg-teal-700 px-8">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
