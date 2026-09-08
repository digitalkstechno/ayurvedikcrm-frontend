"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Table, Column } from "../../components/common/Table";
import { fetchStaffReturnStats, fetchReturnOrderSummaryStats, exportStaffReturnStatsApi } from "../../services/returnOrderService";
import { DateRangePicker } from "../../components/common/DateRangePicker";
import { fetchUsers } from "../../services/userService";
import { fetchProducts } from "../../services/productService";
import { Button } from "../../components/common/Button";
import { useToast } from "../../context/ToastContext";
import { KeyboardArrowDown, Search, Close, AssignmentReturn, TrendingDown, Science, WaterDrop, FileDownload } from "@mui/icons-material";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface StaffStat {
  rank: number;
  id: string;
  name: string;
  date?: string;
  booked?: number;
  delivered?: number;
  returns: number;
  deliveryRate?: number;
  deliveryPercentage?: string;
  deliveryTrend?: string;
  serumStatus?: string;
  serumReturnsCount?: number;
  oilStatus?: string;
  oilReturnsCount?: number;
}

interface SummaryData {
  todaysReturns?: {
    title: string;
    count: number;
    percentage: number;
    formattedPercentage: string;
    trend: string;
    direction: string;
  };
  weeklyProgress?: {
    title: string;
    count: number;
    percentage: number;
    formattedPercentage: string;
    trend: string;
    direction: string;
  };
  productReturnRates?: Array<{
    productName: string;
    rawProductName: string;
    returnsCount: number;
    totalOrdersCount: number;
    rate: number;
    formattedRate: string;
    status: string;
  }>;
  performanceTrend?: Array<{
    period: string;
    deliveredRate: number;
    returnRate: number;
  }>;
  productDistribution?: {
    serumCount: number;
    serumPercentage: number;
    oilCount: number;
    oilPercentage: number;
  };
}

interface AsyncSelectProps {
  label: string;
  placeholder: string;
  allLabel: string;
  value: string[];
  onChange: (val: string[]) => void;
  fetchFn: (params: { page: number; limit: number; search?: string }) => Promise<any>;
  getLabel: (item: any) => string;
  getValue: (item: any) => string;
}

function AsyncSelect({ label, placeholder, allLabel, value, onChange, fetchFn, getLabel, getValue }: AsyncSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const labelMap = useRef<Record<string, string>>({});

  const loadData = useCallback(async (p: number, q: string, append: boolean) => {
    setLoading(true);
    try {
      const res = await fetchFn({ page: p, limit: 10, search: q || undefined });
      const list = res?.data || (Array.isArray(res) ? res : []);
      const newOpts = list.map((i: any) => {
        const val = getValue(i);
        const lbl = getLabel(i);
        labelMap.current[val] = lbl;
        return { value: val, label: lbl };
      });
      const totalPages = res?.totalPages ?? (res?.total ? Math.ceil(res.total / 10) : 1);
      setHasMore(p < totalPages && list.length === 10);
      setOptions(prev => append ? [...prev, ...newOpts.filter((o: { value: string; label: string }) => !prev.some(x => x.value === o.value))] : newOpts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, getLabel, getValue]);

  // Debounced API call for search input
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setPage(1);
      loadData(1, search, false);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, isOpen, loadData]);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 20 && hasMore && !loading) {
      const next = page + 1;
      setPage(next);
      loadData(next, search, true);
    }
  };

  const toggleVal = (val: string) => {
    if (val === "all") return onChange(["all"]);
    const next = value.filter(v => v !== "all");
    const updated = next.includes(val) ? next.filter(v => v !== val) : [...next, val];
    onChange(updated.length ? updated : ["all"]);
  };

  const displayText = useMemo(() => {
    if (value.includes("all") && value.length === 1) return allLabel;
    const selected = value.filter(v => v !== "all").map(v => labelMap.current[v] || v);
    if (!selected.length) return placeholder;
    return selected.length <= 2 ? selected.join(", ") : `${selected.length} Selected`;
  }, [value, allLabel, placeholder]);

  return (
    <div className="flex flex-col gap-1 w-48 relative text-left" ref={containerRef}>
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label} :</span>
      <button
        type="button"
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) setSearch(""); }}
        className="w-full flex items-center justify-between px-3 py-2 text-xs bg-white border border-border-ui rounded-lg hover:border-primary-teal/50 outline-none"
      >
        <span className="truncate font-medium text-text-primary">{displayText}</span>
        <KeyboardArrowDown className={`text-text-secondary transition-transform ${isOpen ? "rotate-180" : ""}`} style={{ fontSize: 18 }} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-60 z-[99999] bg-white border border-border-ui rounded-lg shadow-xl overflow-hidden animate-in fade-in duration-150">
          <div className="p-2 border-b border-border-ui/50 flex items-center gap-2 bg-zinc-50/50">
            <Search className="text-text-secondary w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-xs text-text-primary placeholder:text-text-secondary/50 py-0.5"
              autoFocus
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-text-secondary hover:text-text-primary">
                <Close style={{ fontSize: 14 }} />
              </button>
            )}
          </div>

          <div onScroll={handleScroll} className="max-h-48 overflow-y-auto py-1 scrollbar-thin">
            <button
              type="button"
              onClick={() => toggleVal("all")}
              className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 ${value.includes("all") ? "bg-primary-teal/10 text-primary-teal font-bold" : "hover:bg-zinc-50"}`}
            >
              <input type="checkbox" checked={value.includes("all")} readOnly className="rounded accent-teal-700 pointer-events-none" />
              {allLabel}
            </button>

            {options.map((opt) => {
              const checked = value.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleVal(opt.value)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 ${checked ? "bg-primary-teal/10 text-primary-teal font-bold" : "hover:bg-zinc-50"}`}
                >
                  <input type="checkbox" checked={checked} readOnly className="rounded accent-teal-700 pointer-events-none" />
                  {opt.label}
                </button>
              );
            })}

            {loading && <div className="p-2 text-center text-xs text-text-secondary">Loading...</div>}
            {!loading && !options.length && (
              <div className="px-3 py-4 text-center text-xs text-text-secondary italic">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StaffReturnOrderListPage() {
  const toast = useToast();
  const [staffStats, setStaffStats] = useState<StaffStat[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  const getTodayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [startDate, setStartDate] = useState<string | null>(getTodayString());
  const [endDate, setEndDate] = useState<string | null>(getTodayString());
  const [filterStaff, setFilterStaff] = useState<string[]>(["all"]);
  const [filterProduct, setFilterProduct] = useState<string[]>(["all"]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await exportStaffReturnStatsApi({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        assginTo: filterStaff.includes("all") ? undefined : filterStaff.join(','),
        product: filterProduct.includes("all") ? undefined : filterProduct.join(',')
      });
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `staff_return_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success("Excel report exported successfully!");
    } catch (err: any) {
      toast.error("Failed to export staff return report");
    } finally {
      setIsExporting(false);
    }
  };

  const loadSummaryData = useCallback(async (overrideDates?: { start?: string | null; end?: string | null; staff?: string[]; product?: string[] }) => {
    try {
      const startToUse = overrideDates?.start !== undefined ? overrideDates.start : startDate;
      const endToUse = overrideDates?.end !== undefined ? overrideDates.end : endDate;
      const staffToUse = overrideDates?.staff !== undefined ? overrideDates.staff : filterStaff;
      const productToUse = overrideDates?.product !== undefined ? overrideDates.product : filterProduct;

      const res = await fetchReturnOrderSummaryStats({
        startDate: startToUse || undefined,
        endDate: endToUse || undefined,
        assginTo: staffToUse.includes("all") ? undefined : staffToUse.join(','),
        product: productToUse.includes("all") ? undefined : productToUse.join(',')
      });
      const data = res?.data || res;
      setSummaryStats(data);
    } catch (err) {
      console.error("Failed to fetch summary stats", err);
    }
  }, [startDate, endDate, filterStaff, filterProduct]);

  const loadData = useCallback(async (
    overrideDates?: { start?: string | null; end?: string | null; search?: string; staff?: string[]; product?: string[] },
    overridePage?: number,
    overrideLimit?: number
  ) => {
    setIsLoading(true);
    try {
      const startToUse = overrideDates?.start !== undefined ? overrideDates.start : startDate;
      const endToUse = overrideDates?.end !== undefined ? overrideDates.end : endDate;
      const searchToUse = overrideDates?.search !== undefined ? overrideDates.search : "";
      const staffToUse = overrideDates?.staff !== undefined ? overrideDates.staff : filterStaff;
      const productToUse = overrideDates?.product !== undefined ? overrideDates.product : filterProduct;
      const pageToUse = overridePage !== undefined ? overridePage : currentPage;
      const limitToUse = overrideLimit !== undefined ? overrideLimit : rowsPerPage;

      const res = await fetchStaffReturnStats({
        startDate: startToUse || undefined,
        endDate: endToUse || undefined,
        search: searchToUse || undefined,
        assginTo: staffToUse.includes("all") ? undefined : staffToUse.join(','),
        product: productToUse.includes("all") ? undefined : productToUse.join(','),
        page: pageToUse,
        limit: limitToUse
      });

      const raw = res?.data;
      const stats = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
      const total = raw?.total ?? res?.total ?? stats.length;
      setStaffStats(stats);
      setTotalRecords(total);
      loadSummaryData(overrideDates);
    } catch (err) {
      console.error("Failed to fetch staff return order stats", err);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, filterStaff, filterProduct, currentPage, rowsPerPage, loadSummaryData]);

  const initFetchRef = useRef(false);

  useEffect(() => {
    if (initFetchRef.current) return;
    initFetchRef.current = true;
    loadData();
    loadSummaryData();
  }, [loadData, loadSummaryData]);

  const columns: Column<StaffStat>[] = [
    {
      key: "rank" as any,
      header: "Rank",
      render: (_, row) => (
        <span className={`inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-xs font-bold rounded ${row.rank <= 2 ? "bg-amber-100 text-amber-900 border border-amber-200" : "text-zinc-700 bg-zinc-100"}`}>
          {row.rank}
        </span>
      ),
      sortable: false
    },
    {
      key: "name",
      header: "Staff Name",
      render: (val) => <span className="font-semibold text-zinc-800 lowercase">{val}</span>
    },
    {
      key: "booked" as any,
      header: "Booked",
      render: (_, row) => <span className="font-medium text-zinc-700">{row.booked ?? 0}</span>
    },
    {
      key: "delivered" as any,
      header: "Delivered",
      render: (_, row) => <span className="font-medium text-zinc-700">{row.delivered ?? 0}</span>
    },
    {
      key: "returns",
      header: "Returns",
      render: (_, row) => {
        if (row.returns > 5) {
          return (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 inline-flex items-center gap-1">
              ↓ Downfall
            </span>
          );
        }
        return <span className="font-medium text-zinc-700">{row.returns ?? 0}</span>;
      }
    },
    {
      key: "deliveryPercentage" as any,
      header: "Delivery %",
      render: (_, row) => {
        if (row.deliveryTrend === "Progress") {
          return (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 inline-flex items-center gap-1">
              ↑ Progress
            </span>
          );
        }
        return (
          <span className="font-semibold text-zinc-700">
            {row.deliveryPercentage || "0%"}
          </span>
        );
      }
    },
    {
      key: "serumStatus" as any,
      header: "Serum Returns",
      render: (_, row) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${row.serumStatus === "high" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
          {row.serumStatus === "high" ? "↑ high" : "↓ low"}
        </span>
      )
    },
    {
      key: "oilStatus" as any,
      header: "Oil Returns",
      render: (_, row) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${row.oilStatus === "high" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
          {row.oilStatus === "high" ? "↑ high" : "↓ low"}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white space-y-6">
        {/* Header, Filters & Date Range */}
        <div className="flex flex-wrap items-center justify-between border-b border-zinc-100 pb-4 gap-4">
          <h2 className="text-xl font-bold text-zinc-800">
            Return Order Report List
          </h2>

          <div className="flex flex-wrap items-end gap-3">
            <Button
              variant="outline"
              className="inline-flex items-center justify-center font-bold rounded-lg transition-all outline-none focus:ring-2 focus:ring-offset-1"
              onClick={handleExport}
              isLoading={isExporting}
            >
              Export
            </Button>

            <AsyncSelect
              label="Staff"
              placeholder="Select Staff"
              allLabel="All Staff"
              value={filterStaff}
              onChange={(val) => {
                setFilterStaff(val);
                loadData({ staff: val });
              }}
              fetchFn={fetchUsers}
              getLabel={(u: any) => u.name}
              getValue={(u: any) => u._id || u.id}
            />

            <AsyncSelect
              label="Product"
              placeholder="Select Product"
              allLabel="All Products"
              value={filterProduct}
              onChange={(val) => {
                setFilterProduct(val);
                loadData({ product: val });
              }}
              fetchFn={fetchProducts}
              getLabel={(p: any) => p.name}
              getValue={(p: any) => p._id || p.id}
            />

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Return Order Date :</span>
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={(start, end) => {
                  setStartDate(start);
                  setEndDate(end);
                  loadData({ start, end });
                }}
              />
            </div>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Today's Returns */}
          <div className="bg-white border border-zinc-200/80 rounded-xl p-3.5 flex items-center gap-3.5 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <AssignmentReturn style={{ fontSize: 20 }} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-zinc-500 truncate">
                {summaryStats?.todaysReturns?.title || "Today's Returns"}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-bold text-zinc-900">
                  {summaryStats?.todaysReturns?.count ?? 0} orders
                </span>
                {/* <span className="text-xs font-bold text-zinc-300">|</span>
                <span className={`text-xs font-bold ${summaryStats?.todaysReturns?.percentage! >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {summaryStats?.todaysReturns?.formattedPercentage || "+0%"}
                </span> */}
              </div>
              {/* <div className="flex items-center gap-1 mt-0.5">
                <span className={`text-[11px] font-bold flex items-center ${summaryStats?.todaysReturns?.percentage! >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {summaryStats?.todaysReturns?.percentage! >= 0 ? "↑" : "↓"} {summaryStats?.todaysReturns?.trend || "Progress"}
                </span>
              </div> */}
            </div>
          </div>

          {/* Card 2: Weekly Progress */}
          <div className="bg-white border border-zinc-200/80 rounded-xl p-3.5 flex items-center gap-3.5 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <TrendingDown style={{ fontSize: 20 }} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-zinc-500 truncate">
                {summaryStats?.weeklyProgress?.title || "Weekly Progress"}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-bold text-zinc-900">
                  {summaryStats?.weeklyProgress?.count ?? 0} orders
                </span>
                {/* <span className="text-xs font-bold text-zinc-300">|</span>
                <span className={`text-xs font-bold ${summaryStats?.weeklyProgress?.percentage! >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {summaryStats?.weeklyProgress?.formattedPercentage || "0%"}
                </span> */}
              </div>
              {/* <div className="flex items-center gap-1 mt-0.5">
                <span className={`text-[11px] font-bold flex items-center ${summaryStats?.weeklyProgress?.percentage! >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {summaryStats?.weeklyProgress?.percentage! >= 0 ? "↑" : "↓"} {summaryStats?.weeklyProgress?.trend || "Downfall"}
                </span>
              </div> */}
            </div>
          </div>

          {/* Card 3: Serum Return Rate */}
          <div className="bg-white border border-zinc-200/80 rounded-xl p-3.5 flex items-center gap-3.5 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Science style={{ fontSize: 20 }} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-zinc-500 truncate">
                Serum Return Rate
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-bold text-zinc-900">
                  {summaryStats?.productReturnRates?.[0]?.formattedRate || "0%"}
                </span>
                {/* <span className="text-xs font-bold text-zinc-300">|</span>
                <span className={`text-xs font-bold ${summaryStats?.productReturnRates?.[0]?.status === "high" ? "text-rose-600" : "text-emerald-600"}`}>
                  {summaryStats?.productReturnRates?.[0]?.status || "low"}
                </span> */}
              </div>
            </div>
          </div>

          {/* Card 4: Oil Return Rate */}
          <div className="bg-white border border-zinc-200/80 rounded-xl p-3.5 flex items-center gap-3.5 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <WaterDrop style={{ fontSize: 20 }} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-zinc-500 truncate">
                Oil Return Rate
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-bold text-zinc-900">
                  {summaryStats?.productReturnRates?.[1]?.formattedRate || "0%"}
                </span>
                {/* <span className="text-xs font-bold text-zinc-300">|</span>
                <span className={`text-xs font-bold ${summaryStats?.productReturnRates?.[1]?.status === "high" ? "text-rose-600" : "text-emerald-600"}`}>
                  {summaryStats?.productReturnRates?.[1]?.status || "low"}
                </span> */}
              </div>
            </div>
          </div>
        </div>

        {/* 2 Chart Cards: Overall Performance Trend & Product Return Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card 1: Overall Performance Trend */}
          <div className="bg-white border border-zinc-200/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-zinc-800">
                Overall Performance Trend
              </h3>
            </div>

            <div className="h-56 w-full relative">

              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={summaryStats?.performanceTrend || []}
                  margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1e3a29" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#1e3a29" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#71717a' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#71717a' }} />
                  <RechartsTooltip formatter={(val: any, name: any) => [`${val}%`, name]} />
                  <Area type="monotone" dataKey="deliveredRate" stroke="#1e3a29" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDelivered)" name="Delivered %" />
                  <Line type="monotone" dataKey="returnRate" stroke="#be123c" strokeWidth={2.5} dot={false} name="Return %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-center gap-6 pt-2 border-t border-zinc-100 text-xs font-semibold text-zinc-600">
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-[#1e3a29] inline-block rounded-full"></span>
                <span>Delivered %</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-rose-600 inline-block rounded-full"></span>
                <span>Return %</span>
              </div>
            </div>
          </div>

          {/* Card 2: Product Return Distribution */}
          <div className="bg-white border border-zinc-200/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-zinc-800">
                Product Return Distribution (Serum vs. Oil)
              </h3>
            </div>

            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Serum", value: summaryStats?.productDistribution?.serumPercentage ?? 0 },
                      { name: "Oil", value: summaryStats?.productDistribution?.oilPercentage ?? 0 }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    <Cell key="serum" fill="#1e3a29" />
                    <Cell key="oil" fill="#d97706" />
                  </Pie>
                  <RechartsTooltip formatter={(val: any, name: any) => [`${val}%`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-center gap-6 pt-2 border-t border-zinc-100 text-xs font-semibold text-zinc-700">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-[#1e3a29] rounded-sm"></span>
                <span>Serum: {summaryStats?.productDistribution?.serumPercentage ?? 0}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-amber-600 rounded-sm"></span>
                <span>Oil: {summaryStats?.productDistribution?.oilPercentage ?? 0}%</span>
              </div>
            </div>
          </div>
        </div>

        <Table
          data={staffStats}
          columns={columns}
          selectable={false}
          isLoading={isLoading}
          searchable={true}
          serverSide={true}
          totalCount={totalRecords}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          searchPlaceholder="Search staff name..."
          onSearchChange={(val) => {
            setCurrentPage(1);
            loadData({ search: val, start: startDate, end: endDate }, 1, rowsPerPage);
          }}
          onPageChange={(page, limit) => {
            setCurrentPage(page);
            setRowsPerPage(limit);
            loadData(undefined, page, limit);
          }}
        />
      </div>
    </div>
  );
}
