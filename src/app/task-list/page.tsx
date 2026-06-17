"use client";

import React, { useState, useEffect } from "react";
import { Table, Column } from "../../components/common/Table";
import { FiTrash2 } from "react-icons/fi";
import { useToast } from "../../context/ToastContext";
import { DateRangePicker } from "../../components/common/DateRangePicker";
import { fetchLeads, deleteLeadApi, Lead } from "../../services/leadService";

export interface TaskRow {
  id: string;
  date: string;
  assginUser: string;
  lead: string;
  phone_number: string;
  addedBy: string;
  message: string;
}

export default function LeadTryPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");

  const getTodayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [startDate, setStartDate] = useState<string | null>(getTodayString());
  const [endDate, setEndDate] = useState<string | null>(getTodayString());
  const toast = useToast();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetchLeads({
        isRepeat: true,
        page,
        limit,
        search,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      const mapped = res.data.map(l => {
        let dateStr = "N/A";
        if (l.createdAt) {
          const d = new Date(l.createdAt);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          let hr = d.getHours();
          const ampm = hr >= 12 ? 'pm' : 'am';
          hr = hr % 12;
          hr = hr ? hr : 12;
          const min = String(d.getMinutes()).padStart(2, '0');
          dateStr = `${day}/${month}/${year} ${String(hr).padStart(2, '0')}:${min} ${ampm}`;
        }

        let leadName = "N/A";
        if (l.name) leadName = l.name;

        const assignUser = (l.assgin as any)?.name || l.assgin || "N/A";

        return {
          id: l._id || "",
          date: dateStr,
          assginUser: assignUser,
          lead: leadName,
          phone_number: l.phone_number || "N/A",
          addedBy: (l as any).addedByName || (l as any).addedBy?.name || "Admin", // Pull from backend map
          message: "This lead order has been successfully repeated"
        };
      });
      setTasks(mapped);
      setTotal(res.total);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load Lead Try data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, limit, search, startDate, endDate]);

  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    try {
      await deleteLeadApi(id);
      toast.warning("Record deleted successfully.");
      loadData();
    } catch (err) {
      toast.error("Failed to delete record");
    } finally {
      setIsDeleting(null);
    }
  };

  const columns: Column<TaskRow>[] = [
    { key: "date", header: "Date" },
    { key: "assginUser", header: "Assign User" },
    { key: "lead", header: "Lead", render: (val) => val || "N/A" },
    { key: "phone_number", header: "Phone Number" },
    { key: "addedBy", header: "Added By" },
    { key: "message", header: "Message" },
    {
      key: "actions",
      header: "Action",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleDelete(row.id)}
            disabled={isDeleting === row.id}
            className="p-1.5 bg-rose-500 hover:bg-rose-400 text-white rounded-lg transition-all shadow-sm disabled:opacity-50"
            title="Delete Record"
          >
            {isDeleting === row.id ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <FiTrash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {/* Date Range Top Right */}
        <div className="flex items-center justify-end pb-6">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
              setPage(1);
            }}
          />
        </div>

        {/* Table Element */}
        <div className="bg-card-bg p-8 ">
          <Table
            data={tasks}
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
    </div>
  );
}
