"use client";

import React, { useState, useEffect } from "react";
import { apiGet, endPointApi } from "../../services/api";
import { Table, Column } from "../../components/common/Table";
import { Modal } from "../../components/common/Modal";
import { DateRangePicker } from "../../components/common/DateRangePicker";
import { getAuthenticatedUser } from "../../utils/authUtils";
import { useToast } from "../../context/ToastContext";
import { 
  exportDashboardLeadsApi, 
  exportDashboardOrdersApi, 
  downloadBlobFile 
} from "../../services/dashboardReportService";
import { RiFileExcel2Line } from "react-icons/ri";

// Icons (if needed, but user screenshots show clean numerical cards without huge icons, I will keep it simple)

export default function DashboardPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>({});
  const [productReport, setProductReport] = useState<any[]>([]);
  const [staffReport, setStaffReport] = useState<any[]>([]);

  // Admin access state
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDownloadingLeads, setIsDownloadingLeads] = useState(false);
  const [isDownloadingOrders, setIsDownloadingOrders] = useState(false);

  // Date filters
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState<string | null>(today);
  const [endDate, setEndDate] = useState<string | null>(today);

  // Modal State
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  useEffect(() => {
    const user = getAuthenticatedUser();
    if (user) {
      const adminCheck = (
        user.roles?.some((r: string) => typeof r === "string" && (r.toLowerCase() === "admin" || r.toLowerCase() === "superadmin")) ||
        user.email?.toLowerCase() === "superadmin@gmail.com"
      );
      setIsAdmin(!!adminCheck);
    }
  }, []);

  const handleDownloadLeadReport = async () => {
    if (isDownloadingLeads) return;
    setIsDownloadingLeads(true);
    try {
      const blob = await exportDashboardLeadsApi({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      const fileName = `Leads_Report_${startDate || "all"}_to_${endDate || "all"}.xlsx`;
      downloadBlobFile(blob, fileName);
      toast.success("Lead Excel report downloaded successfully!");
    } catch (err: any) {
      console.error("Export leads error", err);
      const msg = err.response?.data?.message || "Failed to download Lead report.";
      toast.error(msg);
    } finally {
      setIsDownloadingLeads(false);
    }
  };

  const handleDownloadOrderReport = async () => {
    if (isDownloadingOrders) return;
    setIsDownloadingOrders(true);
    try {
      const blob = await exportDashboardOrdersApi({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      const fileName = `Orders_Report_${startDate || "all"}_to_${endDate || "all"}.xlsx`;
      downloadBlobFile(blob, fileName);
      toast.success("Order Excel report downloaded successfully!");
    } catch (err: any) {
      console.error("Export orders error", err);
      const msg = err.response?.data?.message || "Failed to download Order report.";
      toast.error(msg);
    } finally {
      setIsDownloadingOrders(false);
    }
  };




  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data } = await apiGet(endPointApi.dashboardStats, { startDate, endDate });
      setMetrics(data.metrics || {});
      setProductReport(data.productReport || []);
      setStaffReport(data.staffReport || []);
    } catch (error) {
      console.error("Error fetching dashboard stats", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate]);

  const productColumns: Column<any>[] = [
    { key: "name", header: "Product Name" },
    { key: "sellingCount", header: "Selling Count" },
    {
      key: "amount",
      header: "Amount",
      render: (v) => Number(v || 0).toFixed(2)
    }
  ];

  const staffColumns: Column<any>[] = [
    { key: "staffName", header: "Staff Name" },
    { key: "staffTotalOrder", header: "Staff Total Order" },
    { key: "staffReturnOrder", header: "Staff Return Order" },
    { key: "staffOrder", header: "Staff Order" }
  ];

  const totalConvertedToOrders = staffReport.length > 0 
    ? staffReport.reduce((total, staff) => total + (staff.products?.reduce((acc: number, p: any) => acc + (p.orderQuantity || 0), 0) || staff.staffTotalOrder || 0), 0)
    : (metrics.convertedToOrders || 0);

  const totalReturnOrderQty = staffReport.length > 0
    ? staffReport.reduce((total, staff) => total + (staff.products?.reduce((acc: number, p: any) => acc + (p.returnQuantity || 0), 0) || staff.staffReturnOrder || 0), 0)
    : (metrics.totalReturnOrderCount || 0);

  return (
    <div className="space-y-6">
      {/* Top Header with Date Filter and Admin Report Download Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-3.5 border border-border-ui rounded-lg shadow-soft">
        <div>
          <h2 className="text-base font-bold text-text-primary">Dashboard Overview</h2>
          <p className="text-xs text-text-secondary">Key operational metrics and reports</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Admin Only: Direct Download Report Buttons */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadLeadReport}
                disabled={isDownloadingLeads}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-[#15803d] hover:bg-[#166534] rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Download Lead Excel report for ${startDate || "all"} to ${endDate || "all"}`}
              >
                {isDownloadingLeads ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <RiFileExcel2Line className="w-4 h-4" />
                )}
                {isDownloadingLeads ? "Downloading..." : "Download Lead Report"}
              </button>

              <button
                type="button"
                onClick={handleDownloadOrderReport}
                disabled={isDownloadingOrders}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Download Order Excel report for ${startDate || "all"} to ${endDate || "all"}`}
              >
                {isDownloadingOrders ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <RiFileExcel2Line className="w-4 h-4" />
                )}
                {isDownloadingOrders ? "Downloading..." : "Download Order Report"}
              </button>
            </div>
          )}


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


      {/* 6 Top Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Leads */}
        <div className="bg-white p-4 border border-border-ui rounded-lg text-center shadow-soft flex flex-col justify-center h-24">
          <h3 className="text-2xl font-bold text-[#3478e5]">{metrics.totalLeads || 0}</h3>
          <p className="text-xs text-text-secondary font-medium uppercase tracking-wider mt-1">Total Leads</p>
        </div>
        {/* Converted to Orders */}
        <div className="bg-white p-4 border border-border-ui rounded-lg text-center shadow-soft flex flex-col justify-center h-24">
          <h3 className="text-2xl font-bold text-text-primary">{totalConvertedToOrders}</h3>
          <p className="text-xs text-text-secondary font-medium uppercase tracking-wider mt-1">Converted to Orders</p>
        </div>
        {/* Total Sell */}
        <div className="bg-white p-4 border border-border-ui rounded-lg text-center shadow-soft flex flex-col justify-center h-24">
          <h3 className="text-2xl font-bold text-primary-teal">₹ {(metrics.totalSell || 0).toLocaleString('en-IN')}</h3>
          <p className="text-xs text-text-secondary font-medium uppercase tracking-wider mt-1">Total Sell</p>
        </div>
        {/* Total Return Order (Amount) */}
        <div className="bg-white p-4 border border-border-ui rounded-lg text-center shadow-soft flex flex-col justify-center h-24">
          <h3 className="text-2xl font-bold text-primary-teal">₹ {(metrics.totalReturnAmount || 0).toLocaleString('en-IN')}</h3>
          <p className="text-xs text-text-secondary font-medium uppercase tracking-wider mt-1">Total Return Order</p>
        </div>
        {/* Net Rate Amount */}
        <div className="bg-white p-4 border border-border-ui rounded-lg text-center shadow-soft flex flex-col justify-center h-24">
          <h3 className="text-2xl font-bold text-primary-teal">₹ {(metrics.netRateAmount || 0).toLocaleString('en-IN')}</h3>
          <p className="text-xs text-text-secondary font-medium uppercase tracking-wider mt-1">Net Rate Amount</p>
        </div>
        {/* Total Return Order (Count) */}
        <div className="bg-white p-4 border border-border-ui rounded-lg text-center shadow-soft flex flex-col justify-center h-24">
          <h3 className="text-2xl font-bold text-error">{totalReturnOrderQty}</h3>
          <p className="text-xs text-text-secondary font-medium uppercase tracking-wider mt-1">Total Return Order</p>
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left Side: Repart Order Product */}
        <div className="bg-white border border-border-ui rounded-lg shadow-soft p-4">
          <h4 className="text-lg font-bold text-[#1f2f3e] mb-4">Repart Order Product</h4>
          {loading ? (
            <div className="p-10 flex justify-center"><div className="w-6 h-6 border-2 border-primary-teal border-t-transparent rounded-full animate-spin"></div></div>
          ) : (
            <Table data={productReport} columns={productColumns} searchable={false} idField="name" />
          )}
        </div>

        {/* Right Side: Staff Vise Order Products */}
        <div className="bg-white border border-border-ui rounded-lg shadow-soft p-4">
          <h4 className="text-lg font-bold text-[#1f2f3e] mb-4">Staff Vise Order Products</h4>
          {loading ? (
            <div className="p-10 flex justify-center"><div className="w-6 h-6 border-2 border-primary-teal border-t-transparent rounded-full animate-spin"></div></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-ui/50">
                    <th className="px-4 py-3 text-xs font-semibold text-text-secondary">Staff Name</th>
                    <th className="px-4 py-3 text-xs font-semibold text-text-secondary">Staff Total Order</th>
                    <th className="px-4 py-3 text-xs font-semibold text-text-secondary">Staff Return Order</th>
                    <th className="px-4 py-3 text-xs font-semibold text-text-secondary">Staff Order</th>
                  </tr>
                </thead>
                <tbody>
                  {staffReport.map((staff, idx) => {
                    const totalOrder = staff.products?.reduce((acc: number, p: any) => acc + (p.orderQuantity || 0), 0) || staff.staffTotalOrder;
                    const returnOrder = staff.products?.reduce((acc: number, p: any) => acc + (p.returnQuantity || 0), 0) || staff.staffReturnOrder;
                    const netOrder = staff.products?.reduce((acc: number, p: any) => acc + (p.totalOrder || 0), 0) || staff.staffOrder;
                    return (
                      <tr
                        key={idx}
                        className="border-b border-border-ui/30 hover:bg-background cursor-pointer transition-colors"
                        onClick={() => setSelectedStaff(staff)}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-text-primary">{staff.staffName}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{totalOrder}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{returnOrder}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{netOrder}</td>
                      </tr>
                    );
                  })}
                  {staffReport.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-text-secondary">No data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Staff Modal */}
      <Modal isOpen={!!selectedStaff} onClose={() => setSelectedStaff(null)} title={`Order Details (${selectedStaff?.staffName})`} sizeClass="max-w-5xl">
        <div className="p-4 overflow-x-auto">
          <table className="w-full min-w-max text-left border-collapse border border-border-ui">
            <thead>
              <tr className="border-b border-border-ui">
                <th className="px-4 py-3 text-sm font-bold text-text-primary border-r border-border-ui">Product Name</th>
                <th className="px-4 py-3 text-sm font-bold text-text-primary border-r border-border-ui">Order Quantity</th>
                <th className="px-4 py-3 text-sm font-bold text-text-primary border-r border-border-ui">Order Return Quantity</th>
                <th className="px-4 py-3 text-sm font-bold text-text-primary border-r border-border-ui">Total Order</th>
                <th className="px-4 py-3 text-sm font-bold text-text-primary">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {selectedStaff?.products?.map((p: any, idx: number) => (
                <tr key={idx} className="border-b border-border-ui">
                  <td className="px-4 py-3 text-sm text-text-secondary border-r border-border-ui">{p.productName}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary border-r border-border-ui">{p.orderQuantity} ( ₹ {p.orderAmount} )</td>
                  <td className="px-4 py-3 text-sm text-text-secondary border-r border-border-ui">{p.returnQuantity} ( ₹ {p.returnAmount} )</td>
                  <td className="px-4 py-3 text-sm text-text-secondary border-r border-border-ui">{p.totalOrder}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">₹ {p.subtotal}</td>
                </tr>
              ))}

              {/* Total Row */}
              <tr className="bg-background border-t-2 border-border-ui font-bold">
                <td className="px-4 py-3 text-sm text-text-primary border-r border-border-ui">Total</td>
                <td className="px-4 py-3 text-sm text-text-primary border-r border-border-ui">
                  {selectedStaff?.products?.reduce((acc: number, p: any) => acc + p.orderQuantity, 0)} (₹ {selectedStaff?.products?.reduce((acc: number, p: any) => acc + p.orderAmount, 0)})
                </td>
                <td className="px-4 py-3 text-sm text-text-primary border-r border-border-ui">
                  {selectedStaff?.products?.reduce((acc: number, p: any) => acc + p.returnQuantity, 0)} (₹ {selectedStaff?.products?.reduce((acc: number, p: any) => acc + p.returnAmount, 0)})
                </td>
                <td className="px-4 py-3 text-sm text-text-primary border-r border-border-ui">
                  {selectedStaff?.products?.reduce((acc: number, p: any) => acc + p.totalOrder, 0)}
                </td>
                <td className="px-4 py-3 text-sm text-text-primary">
                  ₹ {selectedStaff?.products?.reduce((acc: number, p: any) => acc + p.subtotal, 0)}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="flex justify-end mt-4">
            <button
              onClick={() => setSelectedStaff(null)}
              className="bg-[#2c5f59] hover:bg-[#234d48] text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}


