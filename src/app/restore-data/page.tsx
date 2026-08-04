"use client";

import React, { useState, useEffect } from "react";
import { Table, Column } from "../../components/common/Table";
import { usePermission } from "../../utils/permissionUtils";
import { fetchLeads, Lead as BackendLead } from "../../services/leadService";
import { useToast } from "../../context/ToastContext";

export interface DeletedLead {
  id: string;
  name: string;
  phone_number: string;
  product: string;
  subtotal: number;
  date: string;
  status: string;
  reason_call: string;
  deleteDate: string;
}

export default function RestoreDataPage() {
  const { hasPermission } = usePermission();
  const toast = useToast();

  const [leads, setLeads] = useState<DeletedLead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetchLeads({
        isDeleted: true,
        page,
        limit,
        search
      });
      const mapped = res.data.map((l: any) => {
        const formatDateTime = (dateStr?: string) => {
          if (!dateStr) return "N/A";
          const d = new Date(dateStr);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          let hr = d.getHours();
          const ampm = hr >= 12 ? 'pm' : 'am';
          hr = hr % 12;
          hr = hr ? hr : 12;
          const min = String(d.getMinutes()).padStart(2, '0');
          return `${day}/${month}/${year} ${String(hr).padStart(2, '0')}:${min} ${ampm}`;
        };

        const prodName = l.products?.length
          ? l.products.map((p: any) => p.name || (p.productId?.name)).join(" , ")
          : l.product || "-";

        const totalAmount = l.products?.length
          ? l.products.reduce((acc: number, p: any) => acc + (p.subtotal || (p.amount * (p.quantity || 1)) || 0), 0)
          : l.subtotal || l.amount || 0;

        return {
          id: l._id || "",
          name: l.name || "",
          phone_number: l.phone_number || "",
          product: prodName,
          subtotal: totalAmount,
          date: formatDateTime(l.createdAt),
          status: l.status?.name || l.status || "Open",
          reason_call: l.reason_call?.name || l.reason_call || "",
          deleteDate: formatDateTime(l.deleteDate || l.updatedAt)
        };
      });
      setLeads(mapped);
      setTotal(res.total);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load deleted leads");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, limit, search]);

  const columns: Column<DeletedLead>[] = [
    { key: "name", header: "Customer Name", render: (val) => val || "-" },
    { key: "phone_number", header: "Phone Number" },
    { key: "product", header: "Product Name" },
    { key: "subtotal", header: "Total" },
    { key: "date", header: "Date" },
    { key: "status", header: "Status" },
    { key: "reason_call", header: "Reason Call", render: (val) => val || "-" },
    { key: "deleteDate", header: "Delete Date" }
  ];

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="space-y-1">
        <h2 className="text-xl font-black uppercase tracking-wider text-zinc-900 ">
          Restore Deleted Data
        </h2>
        <p className="text-xs text-zinc-500  font-semibold uppercase tracking-wider">
          Inspect soft-deleted leads
        </p>
      </div>

      <div>
        <Table
          data={leads}
          columns={columns}
          selectable={false}
          searchable={true}
          searchPlaceholder="Search..."
          isLoading={isLoading}
          serverSide={true}
          totalCount={total}
          currentPage={page}
          rowsPerPage={limit}
          onPageChange={(p, l) => { setPage(p); setLimit(l); }}
          onSearchChange={(s) => { setSearch(s); setPage(1); }}
          idField="id"
        />
      </div>
    </div>
  );
}
