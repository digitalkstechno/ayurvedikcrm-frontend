"use client";

import React, { useState, useEffect } from "react";
import { fetchUsers } from "../../services/userService";
import { fetchActivityLogs, ActivityLog } from "../../services/activityLogService";
import { CalendarToday } from "@mui/icons-material";
import { Table, Column } from "../../components/common/Table";
import { Select } from "../../components/common/Select";
import { Button } from "../../components/common/Button";
import { DateRangePicker } from "../../components/common/DateRangePicker";
import { getAuthenticatedUser } from "../../utils/authUtils";

export default function ActivityLogPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [filterUser, setFilterUser] = useState("all");
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    const user = getAuthenticatedUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  const isAdmin = currentUser && (
    currentUser.roles?.some((r: string) => r.toLowerCase() === 'admin' || r.toLowerCase() === 'superadmin') ||
    currentUser.email?.toLowerCase() === 'superadmin@gmail.com'
  );

  // Load users (only needed for Admin to filter)
  useEffect(() => {
    if (isAdmin) {
      const loadUsers = async () => {
        try {
          const res = await fetchUsers({ page: 1, limit: 100 });
          setUsers(res.data);
        } catch (err) {
          console.error(err);
        }
      };
      loadUsers();
    }
  }, [isAdmin]);

  const loadLogs = async (overrideParams?: { start?: string | null, end?: string | null, user?: string, search?: string, page?: number, limit?: number }) => {
    setLoading(true);
    try {
      const startToUse = overrideParams?.start !== undefined ? overrideParams.start : startDate;
      const endToUse = overrideParams?.end !== undefined ? overrideParams.end : endDate;
      const userToUse = overrideParams?.user !== undefined ? overrideParams.user : filterUser;
      const searchToUse = overrideParams?.search !== undefined ? overrideParams.search : searchQuery;
      const pageToUse = overrideParams?.page !== undefined ? overrideParams.page : currentPage;
      const limitToUse = overrideParams?.limit !== undefined ? overrideParams.limit : rowsPerPage;

      const params: any = { page: pageToUse, limit: limitToUse };
      if (userToUse !== "all") {
        params.userId = userToUse;
      }
      if (startToUse) params.startDate = startToUse;
      if (endToUse) params.endDate = endToUse;
      if (searchToUse) params.search = searchToUse;
      const res = await fetchActivityLogs(params);
      setLogs(res.data);
      if (res.total !== undefined) {
        setTotalRecords(res.total);
      } else if (res.data) {
        setTotalRecords(res.data.length);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load logs on mount when currentUser is loaded
  useEffect(() => {
    if (currentUser) {
      loadLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const formattedLogs = React.useMemo(() => {
    return logs.map((log) => {
      const dateObj = new Date(log.createdAt);
      const formattedDate = isNaN(dateObj.getTime())
        ? "N/A"
        : dateObj.toLocaleDateString("en-IN") + " " + dateObj.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true });

      const leadObj = log.lead && typeof log.lead === 'object' ? log.lead as any : null;
      const leadName = leadObj ? (leadObj.name || (leadObj.customer?.name) || "N/A") : "N/A";
      const leadPhone = leadObj ? (leadObj.phone_number || (leadObj.customer?.phone_number) || "N/A") : "N/A";

      return {
        id: log._id,
        date: formattedDate,
        user: log.user?.name || "System",
        lead: leadName,
        phone: leadPhone,
        message: log.message
      };
    });
  }, [logs]);

  const columns: Column<typeof formattedLogs[0]>[] = [
    { key: "date", header: "Date" },
    { key: "user", header: "Changed By" },
    { key: "lead", header: "Lead Name" },
    { key: "phone", header: "Number" },
    { key: "message", header: "Change Details" }
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-[#1f2f3e]">
          Activity Log
        </h2>
        <p className="text-sm text-text-secondary font-medium tracking-wide">
          Track all lead and order activities across the system
        </p>
      </div>

      <div className="bg-white p-6  space-y-6">

        <div className="flex flex-wrap items-center justify-end gap-3 border-b border-border-ui pb-4">
          <div className="w-full sm:w-auto min-w-40">
            <Select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              options={[
                { value: "all", label: "Select Assign" },
                ...users.map(u => ({ value: u._id || u.id, label: u.name }))
              ]}
            />
          </div>

          <Button variant="primary" className="rounded-lg" onClick={() => loadLogs()}>
            Apply Filter
          </Button>
          <Button variant="outline" className="rounded-lg" onClick={() => {
            setFilterUser("all");
            setSearchQuery("");
            setCurrentPage(1);
            loadLogs({ user: "all", search: "", page: 1 });
          }}>
            Clear Filter
          </Button>

          <div className="flex items-center gap-3 ml-2">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
            />
          </div>
        </div>

        <Table
          data={formattedLogs}
          columns={columns}
          selectable={false}
          isLoading={loading}
          searchable={true}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
            loadLogs({ search: val, page: 1 });
          }}
          serverSide={true}
          totalCount={totalRecords}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          onPageChange={(page, limit) => {
            setCurrentPage(page);
            setRowsPerPage(limit);
            loadLogs({ page, limit });
          }}
        />
      </div>
    </div>
  );
}
