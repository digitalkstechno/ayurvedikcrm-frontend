"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Table, Column } from "../../components/common/Table";
import { FiEdit, FiTrash2, FiUserCheck, FiBriefcase } from "react-icons/fi";
import { Modal } from "../../components/common/Modal";
import { Input } from "../../components/common/Input";
import { Select } from "../../components/common/Select";
import { Button } from "../../components/common/Button";
import { useRouter } from "next/navigation";
import { useToast } from "../../context/ToastContext";
import {
  fetchUsers,
  fetchUser,
  createUser,
  updateUser,
  deleteUser,
  uploadFile,
  User,
} from "../../services/userService";
import { fetchRoles, Role as BackendRole } from "../../services/roleService";
import { usePermission } from "../../utils/permissionUtils";
import { setAuthData } from "../../utils/authUtils";
import { ReassignLeadsModal } from "../../components/users/ReassignLeadsModal";

export default function UsersPage() {
  const router = useRouter();
  const toast = useToast();
  const { hasPermission } = usePermission();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Server-side pagination + search
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<User | null>(null);

  // Deletion Custom UI Confirm Modal States
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deletePhotoOpen, setDeletePhotoOpen] = useState(false);
  const [userToDeletePhoto, setUserToDeletePhoto] = useState<User | null>(null);

  const [reassignOpen, setReassignOpen] = useState(false);
  const [userToReassign, setUserToReassign] = useState<User | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [companyNo, setCompanyNo] = useState("");
  const [aadhar, setAadhar] = useState("");
  const [bankNo, setBankNo] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [backendRoles, setBackendRoles] = useState<BackendRole[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [checkPhoto, setCheckPhoto] = useState("");
  const [checkPhotoFile, setCheckPhotoFile] = useState<File | null>(null);
  const [checkPhotoFilename, setCheckPhotoFilename] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setCheckPhotoFile(file);
    setCheckPhotoFilename(file.name);
    setCheckPhoto(URL.createObjectURL(file));
  };

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchUsers({ page, limit, search });
      setUsers(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load users. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    const loadBackendRoles = async () => {
      try {
        const res = await fetchRoles({ page: 1, limit: 100 });
        setBackendRoles(res.data);
        if (res.data.length > 0) {
          setRole(res.data[0].name);
        }
      } catch (err) {
        console.error("Failed to load roles:", err);
      }
    };
    loadBackendRoles();
  }, []);

  const handleMobileChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "");
    if (cleaned.length <= 10) {
      setMobile(cleaned);
      setFormErrors(prev => ({ ...prev, mobile: "" }));
    }
  };

  const handleAadharChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "");
    if (cleaned.length <= 12) {
      setAadhar(cleaned);
      setFormErrors(prev => ({ ...prev, aadhar: "" }));
    }
  };

  const handleBankChange = (val: string) => {
    const cleaned = val.replace(/[^a-zA-Z0-9]/g, "");
    setBankNo(cleaned);
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Name is required";

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    if (mobile.trim() && mobile.length !== 10) {
      errors.mobile = "Mobile number must be exactly 10 digits";
    }

    if (aadhar.trim() && aadhar.length !== 12) {
      errors.aadhar = "Aadhar card must be exactly 12 digits";
    }

    if (modalOpen && !password) {
      errors.password = "Password is required";
    } else if (password && password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("password", password);
      formData.append("mobile_number", mobile);
      formData.append("company_number", companyNo);
      formData.append("aadhar_card", aadhar);
      formData.append("bank_number", bankNo);
      formData.append("roles", role);
      if (checkPhotoFile) {
        formData.append("check_photo", checkPhotoFile);
      } else {
        formData.append("check_photo", checkPhoto);
      }

      await createUser(formData);
      setModalOpen(false);
      clear();
      setPage(1);
      setSearch("");
      toast.success("User created successfully.");
      loadUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create user.");
    }
  };

  const openEdit = async (user: User) => {
    try {
      const fullUser = await fetchUser(user._id);
      setActiveUser(fullUser);
      setName(fullUser.name);
      setEmail(fullUser.email);
      setMobile(fullUser.mobile_number || "");
      setCompanyNo(fullUser.company_number || "");
      setAadhar(fullUser.aadhar_card || "");
      setBankNo(fullUser.bank_number || "");
      setCheckPhoto(fullUser.check_photo || "");
      setCheckPhotoFile(null);
      setCheckPhotoFilename("");
      setPassword(fullUser.password || "");
      setRole(fullUser.roles[0] || backendRoles[0]?.name || "");
      setFormErrors({});
      setEditOpen(true);
    } catch {
      toast.error("Failed to load user details.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!activeUser) return;
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      if (password) {
        formData.append("password", password);
      }
      formData.append("mobile_number", mobile);
      formData.append("company_number", companyNo);
      formData.append("aadhar_card", aadhar);
      formData.append("bank_number", bankNo);
      formData.append("roles", role);
      if (checkPhotoFile) {
        formData.append("check_photo", checkPhotoFile);
      } else {
        formData.append("check_photo", checkPhoto);
      }

      await updateUser(activeUser._id, formData);
      setEditOpen(false);
      clear();
      toast.success("User updated successfully.");
      loadUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update user.");
    }
  };

  const handleDelete = async (user: User) => {
    setUserToDelete(user);
    setDeleteOpen(true);
  };

  const executeDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteUser(userToDelete._id);
      setDeleteOpen(false);
      setUserToDelete(null);
      toast.success("User deleted successfully.");
      loadUsers();
    } catch {
      toast.error("Failed to delete user.");
    }
  };

  const handleLoginAs = async (user: User) => {
    try {
      const { loginAsUser } = await import("../../services/authService");
      const authData = await loginAsUser(user._id);

      localStorage.setItem("wrixty_authenticated", "true");
      localStorage.setItem("wrixty_token", authData.token);
      localStorage.setItem("wrixty_authenticated_user", JSON.stringify({
        _id: authData._id,
        id: authData._id,
        name: authData.name,
        email: authData.email,
        roles: authData.roles,
        permissions: authData.permissions
      }));

      toast.success(`Logged in as ${authData.name}`);
      window.open("/dashboard", "_blank");
    } catch (err) {
      console.error("Login-as failed:", err);
      toast.error("Failed to login as user.");
    }
  };

  const clear = () => {
    setName("");
    setEmail("");
    setMobile("");
    setCompanyNo("");
    setAadhar("");
    setBankNo("");
    setCheckPhoto("");
    setCheckPhotoFile(null);
    setCheckPhotoFilename("");
    setPassword("");
    setRole(backendRoles[0]?.name || "");
    setFormErrors({});
  };

  const columns: Column<User>[] = [
    { key: "_id", header: "No", render: (_, __, i) => (page - 1) * limit + i + 1, sortable: false },
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    { key: "company_number", header: "Company No" },
    { key: "roles", header: "Role", render: (val) => (val || []).join(", ") },
    { 
      key: "activeLeadCount", 
      header: "Active Leads", 
      render: (val) => (
        <span className="font-bold text-primary-teal bg-primary-teal/10 px-2 py-0.5 rounded-md">
          {val || 0}
        </span>
      ) 
    },
    {
      key: "check_photo",
      header: "Check Photo",
      sortable: false,
      render: (val, row) => {
        if (!val) return <span className="text-text-secondary/50 font-semibold italic text-[11px]">No Image</span>;
        return (
          <div className="flex items-center gap-2">
            <a href={val} target="_blank" rel="noreferrer" className="block relative group">
              <img
                src={val}
                alt="Check Photo"
                className="w-10 h-10 object-cover rounded-lg border border-border-ui shadow-sm transition-transform group-hover:scale-105 duration-200"
              />
            </a>
            <button
              onClick={() => {
                setUserToDeletePhoto(row);
                setDeletePhotoOpen(true);
              }}
              className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-all"
              title="Delete Image"
            >
              <FiTrash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      }
    },
    {
      key: "actions",
      header: "Action",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          {hasPermission("User-edit") && (
            <button
              onClick={() => {
                setUserToReassign(row);
                setReassignOpen(true);
              }}
              className="p-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all shadow-sm"
              title="Transfer Leads"
            >
              <FiBriefcase className="w-3.5 h-3.5" />
            </button>
          )}
          {hasPermission("User-edit") && (
            <button
              onClick={() => openEdit(row)}
              className="p-1.5 bg-primary-teal hover:bg-primary-teal text-white rounded-lg transition-all shadow-sm"
              title="Edit User"
            >
              <FiEdit className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => handleLoginAs(row)}
            className="p-1.5 bg-secondary-cyan hover:bg-secondary-cyan text-white rounded-lg transition-all shadow-sm"
            title="Login As This User"
          >
            <FiUserCheck className="w-3.5 h-3.5" />
          </button>
          {hasPermission("User-delete") && (
            <button
              onClick={() => {
                setUserToDelete(row);
                setDeleteOpen(true);
              }}
              className="p-1.5 bg-rose-500 hover:bg-rose-400 text-white rounded-lg transition-all shadow-sm"
              title="Delete User"
            >
              <FiTrash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card-bg p-8 border border-border-ui rounded-lg shadow-soft">
        <div className="space-y-1">
          <h2 className="text-2xl font-black uppercase tracking-wider text-text-primary">
            Users & Staff
          </h2>
          <p className="text-xs text-text-secondary font-semibold uppercase tracking-wider">
            Manage call agents, managers, and bank details
          </p>
        </div>
        {hasPermission("User-add") && (
          <Button
            onClick={() => {
              clear();
              setModalOpen(true);
            }}
            variant="primary"
            className="rounded-lg px-6"
          >
            Add User
          </Button>
        )}
      </div>

      <div className="bg-card-bg p-8 border border-border-ui rounded-lg shadow-soft">
        <Table
          data={users}
          columns={columns}
          searchable={true}
          searchPlaceholder="Search users..."
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

      {/* Add User Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add User" sizeClass="max-w-4xl" overflowVisible={true}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pb-24">
            {/* Left Column */}
            <div className="space-y-4">
              <Input label="Name" placeholder="Enter Name" value={name} onChange={(e) => setName(e.target.value)} required />
              {formErrors.name && <p className="text-rose-500 text-[11px] mt-0.5">{formErrors.name}</p>}
              <Input
                label="Mobile Number"
                type="text"
                isMobile
                placeholder="Enter 10-Digit Mobile Number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                error={formErrors.mobile}
              />
              <Input label="Aadhar Card" placeholder="Enter 12-Digit Aadhar Card" value={aadhar} onChange={(e) => handleAadharChange(e.target.value)} />
              {formErrors.aadhar && <p className="text-rose-500 text-[11px] mt-0.5">{formErrors.aadhar}</p>}
              <Input label="Bank Number" placeholder="Enter Bank Number" value={bankNo} onChange={(e) => handleBankChange(e.target.value)} />
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <Input label="Email" placeholder="Enter Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              {formErrors.email && <p className="text-rose-500 text-[11px] mt-0.5">{formErrors.email}</p>}
              <Input label="Company Number" placeholder="Enter Company Number" value={companyNo} onChange={(e) => setCompanyNo(e.target.value)} />

              {/* Check Photo File Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                  Check Photo
                </label>
                <div className="flex items-center">
                  <label className="flex items-center justify-center px-4 py-2 bg-white border border-zinc-200 rounded-l cursor-pointer hover:bg-zinc-50 transition-colors text-xs text-zinc-700 border-r-0">
                    {checkPhotoFile ? "Change File" : "Choose File"}
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                  <div className="flex-1 px-3 py-2 text-xs text-zinc-500 bg-white border border-zinc-200 rounded-r border-l-0 truncate">
                    {checkPhotoFile ? (
                      <span className="text-zinc-700 font-semibold">{checkPhotoFilename}</span>
                    ) : checkPhoto ? (
                      <a href={checkPhoto} target="_blank" rel="noreferrer" className="text-primary-teal font-semibold hover:underline">
                        View Uploaded Image ↗
                      </a>
                    ) : (
                      "No file chosen"
                    )}
                  </div>
                </div>
              </div>

              <Input label="Password" placeholder="Enter Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              {formErrors.password && <p className="text-rose-500 text-[11px] mt-0.5">{formErrors.password}</p>}
              <Select
                label="Role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                options={backendRoles.map(r => ({ value: r.name, label: r.name }))}
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              className="bg-teal-800 hover:bg-teal-700 focus:ring-teal-800 px-8"
            >
              Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit User Details" sizeClass="max-w-4xl" overflowVisible={true}>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pb-24">
            {/* Left Column */}
            <div className="space-y-4">
              <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
              {formErrors.name && <p className="text-rose-500 text-[11px] mt-0.5">{formErrors.name}</p>}
              <Input
                label="Mobile Number"
                type="text"
                isMobile
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                error={formErrors.mobile}
              />
              <Input label="Aadhar Card" value={aadhar} onChange={(e) => handleAadharChange(e.target.value)} />
              {formErrors.aadhar && <p className="text-rose-500 text-[11px] mt-0.5">{formErrors.aadhar}</p>}
              <Input label="Bank Number" value={bankNo} onChange={(e) => handleBankChange(e.target.value)} />
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              {formErrors.email && <p className="text-rose-500 text-[11px] mt-0.5">{formErrors.email}</p>}
              <Input label="Company Number" value={companyNo} onChange={(e) => setCompanyNo(e.target.value)} />

              {/* Check Photo File Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                  Check Photo
                </label>
                <div className="flex items-center">
                  <label className="flex items-center justify-center px-4 py-2 bg-white border border-zinc-200 rounded-l cursor-pointer hover:bg-zinc-50 transition-colors text-xs text-zinc-700 border-r-0">
                    {checkPhotoFile ? "Change File" : "Choose File"}
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                  <div className="flex-1 px-3 py-2 text-xs text-zinc-500 bg-white border border-zinc-200 rounded-r border-l-0 truncate">
                    {checkPhotoFile ? (
                      <span className="text-zinc-700 font-semibold">{checkPhotoFilename}</span>
                    ) : checkPhoto ? (
                      <a href={checkPhoto} target="_blank" rel="noreferrer" className="text-primary-teal font-semibold hover:underline">
                        View Uploaded Image ↗
                      </a>
                    ) : (
                      "No file chosen"
                    )}
                  </div>
                </div>
              </div>

              <Input label="Password" placeholder="Enter password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              {formErrors.password && <p className="text-rose-500 text-[11px] mt-0.5">{formErrors.password}</p>}
              <Select
                label="Assigned Role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                options={backendRoles.map(r => ({ value: r.name, label: r.name }))}
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              className="bg-teal-800 hover:bg-teal-700 focus:ring-teal-800 px-8"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete User Custom Confirm Modal */}
      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Confirm User Deletion"
        sizeClass="max-w-md"
      >
        <div className="space-y-6 text-center py-2">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <FiTrash2 className="w-8 h-8 text-rose-600" />
          </div>
          <div className="space-y-2">
            <h4 className="text-base font-bold text-text-primary uppercase tracking-wide">
              Delete "{userToDelete?.name}"?
            </h4>
            <p className="text-xs text-text-secondary">
              Are you absolutely sure you want to delete this user? This action is permanent and cannot be undone.
            </p>
          </div>
          <div className="flex items-center gap-3 justify-center pt-2">
            <Button
              onClick={() => setDeleteOpen(false)}
              variant="secondary"
              className="px-6 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={executeDelete}
              variant="primary"
              className="bg-rose-600 hover:bg-rose-500 text-white px-6 rounded-lg font-bold shadow-md hover:shadow-lg transition-all"
            >
              Delete User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Photo Custom Confirm Modal */}
      <Modal
        isOpen={deletePhotoOpen}
        onClose={() => setDeletePhotoOpen(false)}
        title="Confirm Image Deletion"
        sizeClass="max-w-md"
      >
        <div className="space-y-6 text-center py-2">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <FiTrash2 className="w-8 h-8 text-rose-600" />
          </div>
          <div className="space-y-2">
            <h4 className="text-base font-bold text-text-primary uppercase tracking-wide">
              Remove Check Photo?
            </h4>
            <p className="text-xs text-text-secondary">
              Are you sure you want to delete the check photo for "{userToDeletePhoto?.name}"?
            </p>
          </div>
          <div className="flex items-center gap-3 justify-center pt-2">
            <Button
              onClick={() => setDeletePhotoOpen(false)}
              variant="secondary"
              className="px-6 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!userToDeletePhoto) return;
                try {
                  await updateUser(userToDeletePhoto._id, { check_photo: "" });
                  setDeletePhotoOpen(false);
                  setUserToDeletePhoto(null);
                  loadUsers();
                } catch (err) {
                  console.error(err);
                }
              }}
              variant="primary"
              className="bg-rose-600 hover:bg-rose-500 text-white px-6 rounded-lg font-bold shadow-md hover:shadow-lg transition-all"
            >
              Delete Image
            </Button>
          </div>
        </div>
      </Modal>

      <ReassignLeadsModal
        isOpen={reassignOpen}
        onClose={() => {
          setReassignOpen(false);
          setUserToReassign(null);
        }}
        fromUser={userToReassign}
        users={users}
        onSuccess={() => {
          loadUsers();
        }}
      />
    </div>
  );
}
