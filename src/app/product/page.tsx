"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  exportProducts,
  Product,
} from "../../services/productService";
import { exportCopy, exportExcel, exportCSV, exportPDF } from "../../utils/exportUtils";
  import { Table, Column } from "../../components/common/Table";
import { FiEdit, FiTrash2, FiPackage } from "react-icons/fi";
import { Modal } from "../../components/common/Modal";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { useToast } from "../../context/ToastContext";
import { DeleteConfirmModal } from "../../components/common/DeleteConfirmModal";
import { usePermission } from "../../utils/permissionUtils";

export default function ProductPage() {
  const { hasPermission } = usePermission();
  const [products, setProducts] = useState<Product[]>([]);
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
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);

  // Delete Confirm Modal State
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [codDiscount, setCodDiscount] = useState<number | "">(0);
  const [prepaidDiscount, setPrepaidDiscount] = useState<number | "">(0);

  // Validation errors
  const [formErrors, setFormErrors] = useState<{ name?: string; amount?: string }>({});

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchProducts({ page, limit, search });
      setProducts(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load products. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, toast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const validate = () => {
    const errors: { name?: string; amount?: string } = {};
    if (!name.trim()) errors.name = "Product name is required";
    if (amount === "" || amount === null || amount === undefined) errors.amount = "Amount is required";
    else if (Number(amount) < 0) errors.amount = "Amount must be a positive number";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await createProduct({ name, amount: Number(amount), cod_dicount: Number(codDiscount), prepad_disocount: Number(prepaidDiscount) });
      setModalOpen(false);
      clear();
      toast.success("Product created successfully.");
      loadProducts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create product.");
    }
  };

  const openEdit = (product: Product) => {
    setActiveProduct(product);
    setName(product.name);
    setAmount(product.amount);
    setCodDiscount(product.cod_dicount);
    setPrepaidDiscount(product.prepad_disocount);
    setFormErrors({});
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!activeProduct) return;
    try {
      await updateProduct(activeProduct._id, { name, amount: Number(amount), cod_dicount: Number(codDiscount), prepad_disocount: Number(prepaidDiscount) });
      setEditOpen(false);
      clear();
      toast.success("Product updated successfully.");
      loadProducts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update product.");
    }
  };

  const handleDelete = (product: Product) => {
    setProductToDelete(product);
    setDeleteOpen(true);
  };

  const executeDelete = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete._id);
      setDeleteOpen(false);
      setProductToDelete(null);
      toast.success("Product deleted successfully.");
      loadProducts();
    } catch {
      toast.error("Failed to delete product.");
    }
  };

  const clear = () => {
    setName("");
    setAmount("");
    setCodDiscount(0);
    setPrepaidDiscount(0);
    setActiveProduct(null);
    setFormErrors({});
  };

  // Export fields (exclude actions)
  const exportFields = [
    { key: 'name', header: 'Name' },
    { key: 'amount', header: 'Amount' },
    { key: 'cod_dicount', header: 'Cod Discount' },
    { key: 'prepad_disocount', header: 'Prepaid Discount' },
  ];

  const handleExport = async (type: 'copy' | 'excel' | 'csv' | 'pdf') => {
    if (!hasPermission("Product-export")) {
      toast.error("You do not have permission to export.");
      return;
    }
    try {
      setExportLoading(true);
      const rows = await exportProducts(search);
      if (type === 'copy') { 
        exportCopy(rows, exportFields); 
        toast.success("Copied to clipboard!");
        setCopySuccess(true); 
        setTimeout(() => setCopySuccess(false), 2000); 
      }
      else if (type === 'excel') {
        exportExcel(rows, exportFields, 'products');
        toast.success("Excel exported successfully.");
      }
      else if (type === 'csv') {
        exportCSV(rows, exportFields, 'products');
        toast.success("CSV exported successfully.");
      }
      else if (type === 'pdf') {
        exportPDF(rows, exportFields, 'Product List');
        toast.success("PDF exported successfully.");
      }
    } catch { toast.error('Export failed. Please try again.'); }
    finally { setExportLoading(false); }
  };

  const columns: Column<Product>[] = [
    { key: "_id", header: "No", render: (_, __, i) => (page - 1) * limit + i + 1, sortable: false },
    { 
      key: "name", 
      header: "Product Name",
      render: (val) => (
        <div className="flex items-center gap-2">
          <FiPackage className="text-primary-teal w-4 h-4" />
          <span className="font-semibold">{val}</span>
        </div>
      )
    },
    { key: "amount", header: "Amount", render: (val) => val?.toString() },
    { key: "cod_dicount", header: "Cod Discount", render: (val) => val?.toString() },
    { key: "prepad_disocount", header: "Prepaid Discount", render: (val) => val?.toString() },
    {
      key: "actions",
      header: "Action",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          {hasPermission("Product-edit") && (
            <button onClick={() => openEdit(row)} className="p-1.5 bg-primary-teal hover:bg-primary-teal text-white rounded-lg transition-all shadow-sm" title="Edit Product">
              <FiEdit className="w-3.5 h-3.5" />
            </button>
          )}
          {hasPermission("Product-delete") && (
            <button onClick={() => handleDelete(row)} className="p-1.5 bg-rose-500 hover:bg-rose-400 text-white rounded-lg transition-all shadow-sm" title="Delete Product">
              <FiTrash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-[#1f2f3e]">
          Product List
        </h2>
        <p className="text-sm text-text-secondary font-medium tracking-wide">
          Manage your inventory and product pricing
        </p>
      </div>

      <div className="bg-white p-6 border border-border-ui rounded-lg shadow-sm space-y-6">
        {/* Header Block */}
        <div className="pb-4 space-y-3 border-b border-border-ui">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-text-secondary">
              Inventory Overview
            </h2>
            {hasPermission("Product-add") && (
              <Button onClick={() => { clear(); setModalOpen(true); }} variant="primary">Add Product</Button>
            )}
          </div>
          {/* Export Buttons */}
          {hasPermission("Product-export") && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => handleExport('copy')} disabled={exportLoading}
                className={`px-3 py-1 text-[10px] font-semibold rounded-lg border transition-all disabled:opacity-50 ${
                  copySuccess ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white  border-zinc-200  text-zinc-600  hover:bg-zinc-50 '
                }`}>{copySuccess ? 'Copied!' : 'Copy'}</button>
              <button onClick={() => handleExport('excel')} disabled={exportLoading}
                className="px-3 py-1 text-[10px] font-semibold rounded-lg border bg-white  border-zinc-200  text-zinc-600  hover:bg-zinc-50  transition-all disabled:opacity-50">
                Excel
              </button>
              <button onClick={() => handleExport('csv')} disabled={exportLoading}
                className="px-3 py-1 text-[10px] font-semibold rounded-lg border bg-white  border-zinc-200  text-zinc-600  hover:bg-zinc-50  transition-all disabled:opacity-50">
                CSV
              </button>
              <button onClick={() => handleExport('pdf')} disabled={exportLoading}
                className="px-3 py-1 text-[10px] font-semibold rounded-lg border bg-white  border-zinc-200  text-zinc-600  hover:bg-zinc-50  transition-all disabled:opacity-50">
                PDF
              </button>
              {exportLoading && <span className="text-[10px] text-zinc-400 ml-1">Exporting...</span>}
            </div>
          )}
        </div>

        <Table
          data={products}
          columns={columns}
          searchable={true}
          searchPlaceholder="Search products..."
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

      {/* Add Product Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); clear(); }} title="Add Product">
        <form onSubmit={handleCreate} className="space-y-4" noValidate>
          <div>
            <Input label="Name" value={name} onChange={(e) => { setName(e.target.value); setFormErrors(p => ({ ...p, name: undefined })); }} />
            {formErrors.name && <p className="text-rose-500 text-[11px] mt-1">{formErrors.name}</p>}
          </div>
          <div>
            <Input label="Amount" type="number" value={amount} onChange={(e) => { setAmount(e.target.value === "" ? "" : Number(e.target.value)); setFormErrors(p => ({ ...p, amount: undefined })); }} />
            {formErrors.amount && <p className="text-rose-500 text-[11px] mt-1">{formErrors.amount}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Cod Discount" type="number" value={codDiscount} onChange={(e) => setCodDiscount(e.target.value === "" ? "" : Number(e.target.value))} />
            <Input label="Prepaid Discount" type="number" value={prepaidDiscount} onChange={(e) => setPrepaidDiscount(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" className="px-8">Save</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal isOpen={editOpen} onClose={() => { setEditOpen(false); clear(); }} title="Edit Product">
        <form onSubmit={handleEditSubmit} className="space-y-4" noValidate>
          <div>
            <Input label="Name" value={name} onChange={(e) => { setName(e.target.value); setFormErrors(p => ({ ...p, name: undefined })); }} />
            {formErrors.name && <p className="text-rose-500 text-[11px] mt-1">{formErrors.name}</p>}
          </div>
          <div>
            <Input label="Amount" type="number" value={amount} onChange={(e) => { setAmount(e.target.value === "" ? "" : Number(e.target.value)); setFormErrors(p => ({ ...p, amount: undefined })); }} />
            {formErrors.amount && <p className="text-rose-500 text-[11px] mt-1">{formErrors.amount}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Cod Discount" type="number" value={codDiscount} onChange={(e) => setCodDiscount(e.target.value === "" ? "" : Number(e.target.value))} />
            <Input label="Prepaid Discount" type="number" value={prepaidDiscount} onChange={(e) => setPrepaidDiscount(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" className="px-8">Save</Button>
          </div>
        </form>
      </Modal>

      <DeleteConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={executeDelete}
        title="Delete Product"
        itemName={productToDelete?.name}
        itemType="product"
      />
    </div>
  );
}
