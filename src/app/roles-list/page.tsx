"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Table, Column } from "../../components/common/Table";
import { FiEdit, FiTrash2, FiUser, FiShield, FiUserCheck } from "react-icons/fi";
import {
  fetchRoles,
  createRole,
  updateRole,
  deleteRole,
  exportRoles,
  Role,
} from "../../services/roleService";
import { exportCopy, exportExcel, exportCSV, exportPDF } from "../../utils/exportUtils";
import { Modal } from "../../components/common/Modal";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { DeleteConfirmModal } from "../../components/common/DeleteConfirmModal";
import { useToast } from "../../context/ToastContext";
import { usePermission } from "../../utils/permissionUtils";
import { getAuthenticatedUser, setAuthData } from "../../utils/authUtils";

const MODULE_PERMISSIONS = [
  { module: "Dashboard", perms: ["Dashboard-view"] },
  { module: "Users List", perms: ["User-add", "User-list", "User-edit", "User-delete"] },
  { module: "Team List", perms: ["Team-add", "Team-list", "Team-edit", "Team-delete"] },
  { module: "Roles List", perms: ["Roles-add", "Roles-list", "Roles-edit", "Roles-delete", "Roles-export"] },
  { module: "Lead List", perms: ["Lead-add", "Lead-transfer", "Lead-list", "Lead-edit", "Lead-delete", "Lead-export"] },
  { module: "Restore Lead", perms: ["Restore-lead-list", "Restore-lead-action"] },
  { module: "Order List", perms: ["Order-edit", "Order-delete", "Order-export", "Repart-order"] },
  { module: "Delivery List", perms: ["Delivery-edit", "Delivery-delete", "Delivery-export", "Delivery-full-access"] },
  { module: "Activity-Log", perms: ["Activity-log"] },
  { module: "Lead-Try", perms: ["Lead-try"] },
  { module: "Reminder List", perms: ["Reminder-edit", "Reminder-list"] },
  { module: "Kanban", perms: ["Kanban-view", "Kanban-update"] },
  { module: "Return Order List", perms: ["Return-order-list", "Return-order-add"] },
  { module: "Return Order Report", perms: ["Return-order-report-view"] },
  { module: "Currier List", perms: ["Currier-add", "Currier-list", "Currier-edit", "Currier-delete"] },
  { module: "Status Master", perms: ["Status-add", "Status-list", "Status-edit", "Status-delete", "Status-export"] },
  { module: "Product Master", perms: ["Product-add", "Product-list", "Product-edit", "Product-delete", "Product-export"] },
  { module: "Return Order Type Master", perms: ["Return-order-type-add", "Return-order-type-list", "Return-order-type-edit", "Return-order-type-delete"] },
  { module: "Reason to Call Master", perms: ["Reason-to-call-add", "Reason-to-call-list", "Reason-to-call-edit", "Reason-to-call-delete", "Reason-to-call-export"] },
];

export default function RolesListPage() {
  const { hasPermission } = usePermission();
  const [roles, setRoles] = useState<Role[]>([]);
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
  const [activeRole, setActiveRole] = useState<Role | null>(null);

  // Delete Confirm Modal State
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  const [name, setName] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<Record<string, boolean>>({});
  const [formErrors, setFormErrors] = useState<{ name?: string }>({});

  const loadRoles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchRoles({ page, limit, search });
      setRoles(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load roles. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, toast]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const validate = () => {
    const errors: { name?: string } = {};
    if (!name.trim()) errors.name = "Role name is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await createRole({ name, permissions: selectedPerms });
      setModalOpen(false);
      clear();
      toast.success("Role created successfully.");
      loadRoles();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create role.");
    }
  };

  const openEdit = (role: Role) => {
    setActiveRole(role);
    setName(role.name);
    setSelectedPerms(role.permissions || {});
    setFormErrors({});
    setEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!activeRole) return;
    try {
      await updateRole(activeRole._id, { name, permissions: selectedPerms });
      setEditOpen(false);
      clear();
      toast.success("Role updated successfully.");

      const currentUser = getAuthenticatedUser();
      if (currentUser && currentUser.roles && currentUser.roles.includes(activeRole.name)) {
        currentUser.permissions = selectedPerms;
        setAuthData(currentUser);
        window.location.reload();
      } else {
        loadRoles();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update role.");
    }
  };

  const handleDelete = (role: Role) => {
    setRoleToDelete(role);
    setDeleteOpen(true);
  };

  const executeDelete = async () => {
    if (!roleToDelete) return;
    try {
      await deleteRole(roleToDelete._id);
      setDeleteOpen(false);
      setRoleToDelete(null);
      toast.success("Role deleted successfully.");
      loadRoles();
    } catch {
      toast.error("Failed to delete role.");
    }
  };

  const clear = () => {
    setName("");
    setSelectedPerms({});
    setActiveRole(null);
    setFormErrors({});
  };

  const togglePerm = (perm: string) => {
    setSelectedPerms(prev => ({
      ...prev,
      [perm]: !prev[perm]
    }));
  };

  const exportFields = [
    { key: 'name', header: 'Role Name' },
  ];

  const handleExport = async (type: 'copy' | 'excel' | 'csv' | 'pdf') => {
    if (!hasPermission("Roles-export")) {
      toast.error("You do not have permission to export.");
      return;
    }
    try {
      setExportLoading(true);
      const rows = await exportRoles(search);
      if (type === 'copy') {
        exportCopy(rows, exportFields);
        toast.success("Copied to clipboard!");
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
      else if (type === 'excel') {
        exportExcel(rows, exportFields, 'roles');
        toast.success("Excel exported successfully.");
      }
      else if (type === 'csv') {
        exportCSV(rows, exportFields, 'roles');
        toast.success("CSV exported successfully.");
      }
      else if (type === 'pdf') {
        exportPDF(rows, exportFields, 'Roles List');
        toast.success("PDF exported successfully.");
      }
    } catch {
      toast.error('Export failed. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  const columns: Column<Role>[] = [
    { key: "_id", header: "No", render: (_, __, i) => (page - 1) * limit + i + 1, sortable: false },
    {
      key: "name",
      header: "Role Name",
      render: (val) => (
        <div className="flex items-center gap-2">
          {val === "Superadmin" ? <FiShield className="text-primary-teal w-4 h-4" /> :
            val === "Manager" ? <FiUserCheck className="text-primary-teal w-4 h-4" /> :
              <FiUser className="text-primary-teal w-4 h-4" />}
          <span className="font-bold uppercase tracking-wide">{val}</span>
        </div>
      )
    },
    {
      key: "actions",
      header: "Action",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          {hasPermission("Roles-edit") && (
            <button
              onClick={() => openEdit(row)}
              className="p-1.5 bg-primary-teal hover:bg-primary-teal text-white rounded-lg transition-all shadow-sm"
              title="Edit Role"
            >
              <FiEdit className="w-3.5 h-3.5" />
            </button>
          )}
          {hasPermission("Roles-delete") && (
            <button
              onClick={() => handleDelete(row)}
              className="p-1.5 bg-rose-500 hover:bg-rose-400 text-white rounded-lg transition-all shadow-sm"
              title="Delete Role"
            >
              <FiTrash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )
    }
  ];

  const allPermsList = MODULE_PERMISSIONS.flatMap(m => m.perms);
  const isAllSelected = allPermsList.length > 0 && allPermsList.every(p => !!selectedPerms[p]);

  const toggleAllPermissions = () => {
    if (isAllSelected) {
      setSelectedPerms({});
    } else {
      const newPerms: Record<string, boolean> = {};
      allPermsList.forEach(p => {
        newPerms[p] = true;
      });
      setSelectedPerms(newPerms);
    }
  };

  const isModuleAllSelected = (mod: typeof MODULE_PERMISSIONS[0]) => {
    return mod.perms.every(p => !!selectedPerms[p]);
  };

  const toggleModulePermissions = (mod: typeof MODULE_PERMISSIONS[0]) => {
    const isModSelected = isModuleAllSelected(mod);
    setSelectedPerms(prev => {
      const updated = { ...prev };
      mod.perms.forEach(p => {
        if (isModSelected) {
          delete updated[p];
        } else {
          updated[p] = true;
        }
      });
      return updated;
    });
  };

  const renderPermissionsTable = () => (
    <div className="mt-6 border border-zinc-250 rounded-lg overflow-hidden bg-white">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-zinc-250 font-semibold text-text-secondary bg-background/50">
            <th className="p-4 w-[180px]">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleAllPermissions}
                  className="w-4 h-4 text-primary-teal border-zinc-300 rounded focus:ring-primary-teal cursor-pointer"
                />
                <span>Module</span>
              </div>
            </th>
            <th className="p-4">Permissions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {MODULE_PERMISSIONS.map((mod, i) => (
            <tr key={i} className="hover:bg-background/80">
              <td className="p-4 font-semibold text-text-primary align-top">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isModuleAllSelected(mod)}
                    onChange={() => toggleModulePermissions(mod)}
                    className="w-4 h-4 text-primary-teal border-zinc-300 rounded focus:ring-primary-teal cursor-pointer"
                  />
                  <span>{mod.module}</span>
                </div>
              </td>
              <td className="p-4">
                <div className="flex flex-wrap gap-x-4 gap-y-3">
                  {mod.perms.map(perm => (
                    <label key={perm} className="flex items-center gap-2 cursor-pointer font-medium text-text-secondary min-w-[120px]">
                      <input
                        type="checkbox"
                        checked={!!selectedPerms[perm]}
                        onChange={() => togglePerm(perm)}
                        className="w-4 h-4 text-primary-teal border-zinc-300 rounded focus:ring-primary-teal cursor-pointer"
                      />
                      <span className="text-xs uppercase tracking-tight">{perm}</span>
                    </label>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 border border-zinc-200 rounded-md shadow-sm space-y-6">

        {/* Header Block */}
        <div className="border-b border-zinc-100 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-800">
              Roles List
            </h2>
            {hasPermission("Roles-add") && (
              <Button
                onClick={() => {
                  clear();
                  setModalOpen(true);
                }}
                variant="primary"
              >
                Add Role
              </Button>
            )}
          </div>
          {/* Export Buttons */}
          {hasPermission("Roles-export") && (
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
          data={roles}
          columns={columns}
          searchable={true}
          searchPlaceholder="Search roles..."
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

      {/* Add Role Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Role" sizeClass="max-w-5xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Enter Name" />
          {formErrors.name && <p className="text-rose-500 text-[11px] mt-1">{formErrors.name}</p>}

          <div className="flex items-center justify-between pt-4">
            <h4 className="font-bold text-zinc-800">Assign Permissions to Roles</h4>
            <button
              type="button"
              onClick={toggleAllPermissions}
              className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-teal hover:bg-primary-teal/5 border border-primary-teal/20 rounded-lg transition-all"
            >
              {isAllSelected ? "Deselect All" : "Select All"}
            </button>
          </div>
          {renderPermissionsTable()}

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              variant="primary"
              className="px-8"
            >
              Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Role Modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Role" sizeClass="max-w-5xl">
        <form onSubmit={handleEdit} className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Enter Name" />
          {formErrors.name && <p className="text-rose-500 text-[11px] mt-1">{formErrors.name}</p>}

          <div className="flex items-center justify-between pt-4">
            <h4 className="font-bold text-zinc-800">Assidsgn Permissions to Roles</h4>
            <button
              type="button"
              onClick={toggleAllPermissions}
              className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-teal hover:bg-primary-teal/5 border border-primary-teal/20 rounded-lg transition-all"
            >
              {isAllSelected ? "Deselect All" : "Select All"}
            </button>
          </div>
          {renderPermissionsTable()}

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              variant="primary"
              className="px-8"
            >
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <DeleteConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={executeDelete}
        title="Delete Role"
        itemName={roleToDelete?.name}
        itemType="role"
      />
    </div>
  );
}
