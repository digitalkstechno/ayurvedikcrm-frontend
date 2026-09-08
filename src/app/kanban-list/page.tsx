"use client";

import React, { useState, useEffect } from "react";
import { fetchStatuses, reorderStatuses } from "../../services/statusService";
import { fetchLeads, updateLeadApi } from "../../services/leadService";
import { fetchUsers } from "../../services/userService";
import { usePermission } from "../../utils/permissionUtils";
import { LeadFormModal } from "../../components/leads/LeadFormModal";
import { fetchProducts } from "../../services/productService";
import { fetchReasonToCalls } from "../../services/reasonToCallService";
import { Button } from "../../components/common/Button";
import { FiEdit, FiPlus, FiMessageSquare, FiFileText, FiPhone, FiClock } from "react-icons/fi";
import { Select } from "../../components/common/Select";
import { DateRangePicker } from "../../components/common/DateRangePicker";
import { getAuthenticatedUser } from "../../utils/authUtils";
import { Loader } from "../../components/common/Loader";

export default function KanbanListPage() {
  const { hasPermission } = usePermission();
  const [statuses, setStatuses] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [reasonsOptions, setReasonsOptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getTodayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [startDate, setStartDate] = useState<string | null>(getTodayString());
  const [endDate, setEndDate] = useState<string | null>(getTodayString());
  
  const [filterProduct, setFilterProduct] = useState<string[]>(["all"]);
  const [filterAssignee, setFilterAssignee] = useState<string[]>(["all"]);
  const [filterStatus, setFilterStatus] = useState<string[]>(["all"]);
  const [filterReason, setFilterReason] = useState<string[]>(["all"]);
  const [filterAge, setFilterAge] = useState<string>("all");
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true);

  const [leadFormModalOpen, setLeadFormModalOpen] = useState(false);
  const [activeLead, setActiveLead] = useState<any>(null);
  const [defaultStatusId, setDefaultStatusId] = useState<string>("");

  const [columnPages, setColumnPages] = useState<Record<string, number>>({});
  const [hasMore, setHasMore] = useState<Record<string, boolean>>({});
  const [columnTotals, setColumnTotals] = useState<Record<string, number>>({});
  const [isFetchingColumn, setIsFetchingColumn] = useState<Record<string, boolean>>({});

  // Drag and Drop State for Columns
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  // Hovered lead state for dynamic overlay popup
  const [hoveredLeadInfo, setHoveredLeadInfo] = useState<{
    lead: any;
    stageColor: string;
    stageName: string;
    rect: DOMRect;
  } | null>(null);

  const handleCardMouseEnter = (e: React.MouseEvent<HTMLDivElement>, lead: any, stageColor: string, stageName: string) => {
    if (draggedLeadId || draggedColumnId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredLeadInfo({ lead, stageColor, stageName, rect });
  };

  const handleCardMouseLeave = () => {
    setHoveredLeadInfo(null);
  };

  const getPopupStyle = (): React.CSSProperties => {
    if (!hoveredLeadInfo) return {};
    const { rect } = hoveredLeadInfo;
    const popupWidth = 320;
    const popupMaxHeight = 360;
    const padding = 12;

    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;

    let left = rect.right + padding;
    if (left + popupWidth > viewportWidth - 10) {
      left = rect.left - popupWidth - padding;
    }
    if (left < 10) {
      left = Math.max(10, rect.left);
    }

    let top = rect.top;
    if (top + popupMaxHeight > viewportHeight - 10) {
      top = Math.max(10, viewportHeight - popupMaxHeight - 10);
    }

    return {
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      width: `${popupWidth}px`,
      zIndex: 9999,
      pointerEvents: 'none',
    };
  };

  const mapLead = (l: any, usersList: any[], reasonsList: any[] = []) => {
    const usersLookup: Record<string, { name: string; email: string }> = {};
    usersList.forEach((u: any) => {
      usersLookup[u._id || u.id] = { name: u.name || "", email: u.email || "" };
    });
    const assginId  = l.assgin?._id || (typeof l.assgin === "string" ? l.assgin : "") || "";
    const fromObj   = { name: l.assgin?.name || "", email: l.assgin?.email || "" };
    const fromLookup = assginId ? (usersLookup[assginId] || { name: "", email: "" }) : { name: "", email: "" };

    const reasonsToUse = reasonsList.length > 0 ? reasonsList : reasonsOptions;
    const reasonObj = l.reason_call;
    const reasonCallName = typeof reasonObj === 'object' && reasonObj !== null 
      ? reasonObj.name 
      : (reasonsToUse.find(r => (r._id || r.id) === reasonObj)?.name || "");

    const customerObj = l.customer;
    const customerPhone = l.phone_number || (typeof customerObj === 'object' ? customerObj?.phone_number : "") || "";
    const customerName = l.name || (typeof customerObj === 'object' ? customerObj?.name : "") || "";

    const calculatedSubtotal = l.subtotal !== undefined && l.subtotal !== null
      ? l.subtotal
      : (l.products && Array.isArray(l.products)
        ? l.products.reduce((sum: number, p: any) => sum + (p.subtotal || ((p.amount || 0) * (p.quantity || 1))), 0)
        : (l.amount || 0));

    const calculatedQuantity = l.quantity !== undefined && l.quantity !== null
      ? l.quantity
      : (l.products && Array.isArray(l.products)
        ? l.products.reduce((sum: number, p: any) => sum + (p.quantity || 1), 0)
        : 1);

    const formattedDate = l.createdAt 
      ? new Date(l.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : (l.date || "");

    const formattedTime = l.createdAt
      ? new Date(l.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
      : (l.time || "");

    return {
      ...l,
      id: l._id || l.id,
      name: customerName || l.name,
      customerPhone,
      statusName:  l.status?.name || l.status || "Open",
      productName: l.product || (l.products?.map((p: any) => p.name).join(", ") || "No Product"),
      assginId,
      assginName:  fromObj.name  || fromLookup.name,
      assginEmail: fromObj.email || fromLookup.email,
      remark: l.remark || l.note || "",
      note: l.note || "",
      reasonCallName,
      subtotal: calculatedSubtotal,
      quantity: calculatedQuantity,
      date: formattedDate,
      time: formattedTime,
      reminder: l.reminder || ""
    };
  };

  const initFetchRef = React.useRef(false);

  useEffect(() => {
    if (initFetchRef.current) return;
    initFetchRef.current = true;

    const loadMasterData = async () => {
      try {
        const [statusesRes, usersRes, productsRes, reasonsRes] = await Promise.all([
          fetchStatuses({ page: 1, limit: 100 }),
          fetchUsers({ page: 1, limit: 100 }),
          fetchProducts({ page: 1, limit: 100 }),
          fetchReasonToCalls({ page: 1, limit: 100 })
        ]);
        setUsers(usersRes.data);
        setProducts(productsRes.data);
        setReasonsOptions(reasonsRes.data);
        setStatuses(statusesRes.data);

        const user = getAuthenticatedUser();
        let initialAssigneeFilter = "all";
        if (user) {
          setCurrentUser(user);
          const admin = user?.roles?.some((r: string) => r.toLowerCase().includes('admin'));
          setIsAdmin(admin);
          if (!admin) {
            initialAssigneeFilter = user._id || user.id;
            setFilterAssignee([initialAssigneeFilter]);
          }
        }

        const initialPages: Record<string, number> = {};
        const initialHasMore: Record<string, boolean> = {};
        const initialTotals: Record<string, number> = {};
        let allLeads: any[] = [];

        await Promise.all(statusesRes.data.map(async (stage: any) => {
          const stageId = stage._id || stage.id;
          const res = await fetchLeads({ 
            page: 1, 
            limit: 10, 
            status: stageId,
            assgin: initialAssigneeFilter === 'all' ? undefined : initialAssigneeFilter,
            startDate: getTodayString(),
            endDate: getTodayString()
          });
          const mapped = res.data.map((l: any) => mapLead(l, usersRes.data));
          allLeads = [...allLeads, ...mapped];
          initialPages[stageId] = 1;
          initialHasMore[stageId] = res.data.length === 10;
          initialTotals[stageId] = res.total || 0;
        }));

        setLeads(allLeads);
        setColumnPages(initialPages);
        setHasMore(initialHasMore);
        setColumnTotals(initialTotals);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadMasterData().then(() => {
      setInitialLoaded(true);
    });
  }, []);

  const applyFilters = async (overrideAssignee?: string, overrideDates?: { start: string | null, end: string | null }) => {
    setIsLoading(true);
    try {
      const assigneeFilter = overrideAssignee === 'all' ? undefined : (overrideAssignee || (filterAssignee.includes('all') ? undefined : filterAssignee.join(',')));
      const startToUse = overrideDates !== undefined ? overrideDates.start : startDate;
      const endToUse = overrideDates !== undefined ? overrideDates.end : endDate;
      const productFilter = filterProduct.includes('all') ? undefined : filterProduct.join(',');
      const reasonFilter = filterReason.includes('all') ? undefined : filterReason.join(',');

      const ageFilter = filterAge !== 'all' ? filterAge : undefined;

      const initialPages: Record<string, number> = {};
      const initialHasMore: Record<string, boolean> = {};
      const initialTotals: Record<string, number> = {};
      let allLeads: any[] = [];

      await Promise.all(statuses.map(async (stage: any) => {
        const stageId = stage._id || stage.id;
        const res = await fetchLeads({ 
          page: 1, 
          limit: 10, 
          status: stageId,
          product: productFilter,
          assgin: assigneeFilter,
          reason_call: reasonFilter,
          startDate: startToUse || undefined,
          endDate: endToUse || undefined,
          age: ageFilter
        } as any);
        const mapped = res.data.map((l: any) => mapLead(l, users));
        allLeads = [...allLeads, ...mapped];
        initialPages[stageId] = 1;
        initialHasMore[stageId] = res.data.length === 10;
        initialTotals[stageId] = res.total || 0;
      }));

      setLeads(allLeads);
      setColumnPages(initialPages);
      setHasMore(initialHasMore);
      setColumnTotals(initialTotals);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialLoaded && !leadFormModalOpen) {
      applyFilters();
    }
  }, [leadFormModalOpen, filterProduct, filterAssignee, filterStatus, filterReason, filterAge]);

  const loadMoreLeads = async (stageId: string) => {
    setIsFetchingColumn(prev => ({ ...prev, [stageId]: true }));
    try {
      const assigneeFilter = filterAssignee.includes('all') ? undefined : filterAssignee.join(',');
      const productFilter = filterProduct.includes('all') ? undefined : filterProduct.join(',');
      const reasonFilter = filterReason.includes('all') ? undefined : filterReason.join(',');

      const nextPage = (columnPages[stageId] || 1) + 1;
      const res = await fetchLeads({ 
        page: nextPage, 
        limit: 10, 
        status: stageId,
        product: productFilter,
        assgin: assigneeFilter,
        reason_call: reasonFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        age: filterAge !== 'all' ? filterAge : undefined
      } as any);
      
      const mapped = res.data.map((l: any) => mapLead(l, users));

      setLeads(prev => {
        const existingIds = new Set(prev.map(l => l.id));
        const added = mapped.filter((l: any) => !existingIds.has(l.id));
        return [...prev, ...added];
      });

      setColumnPages(prev => ({ ...prev, [stageId]: nextPage }));
      setHasMore(prev => ({ ...prev, [stageId]: res.data.length === 10 }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingColumn(prev => ({ ...prev, [stageId]: false }));
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>, stageId: string) => {
    setHoveredLeadInfo(null);
    const bottom = Math.ceil(e.currentTarget.scrollHeight - e.currentTarget.scrollTop) <= e.currentTarget.clientHeight + 5;
    if (bottom && hasMore[stageId] && !isFetchingColumn[stageId]) {
      loadMoreLeads(stageId);
    }
  };

  const updateLeadLocally = (id: string, updated: Partial<any>) => {
    setLeads(prev => {
      const leadIndex = prev.findIndex(l => (l._id || l.id) === id);
      if (leadIndex === -1) return prev;
      
      const lead = { ...prev[leadIndex], ...updated };
      const rest = prev.filter((_, i) => i !== leadIndex);
      
      // Move to the top (first) of the entire leads array so it appears first in its new column
      return [lead, ...rest];
    });
  };

  const activeLeads = React.useMemo(() => leads.filter(l => !l.isDeleted), [leads]);

  // Drag and Drop State
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    setHoveredLeadInfo(null);
    setDraggedLeadId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, statusObj: any) => {
    e.preventDefault();
    if (!hasPermission("Kanban-update")) {
      setDraggedLeadId(null);
      return;
    }
    if (draggedLeadId) {
      const leadToMove = leads.find(l => l.id === draggedLeadId);
      const oldStatusName = leadToMove?.statusName;
      const oldStatusObj = statuses.find(s => s.name === oldStatusName);

      // Optimistic update locally
      updateLeadLocally(draggedLeadId, { statusName: statusObj.name });
      
      setColumnTotals(prev => {
        const next = { ...prev };
        if (oldStatusObj) {
           const oldId = oldStatusObj._id || oldStatusObj.id;
           next[oldId] = Math.max(0, (next[oldId] || 0) - 1);
        }
        const newId = statusObj._id || statusObj.id;
        next[newId] = (next[newId] || 0) + 1;
        return next;
      });
      
      try {
        await updateLeadApi(draggedLeadId, { status: statusObj._id || statusObj.id });
      } catch (err) {
        console.error("Failed to update status on backend:", err);
      }
    }
    setDraggedLeadId(null);
  };

  const handleColumnDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggedColumnId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/column", id);
  };

  const handleColumnDragOver = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedColumnId && draggedColumnId !== id) {
      setDragOverColumnId(id);
    }
  };

  const handleColumnDrop = async (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    setDragOverColumnId(null);
    if (!draggedColumnId || draggedColumnId === targetId) {
      setDraggedColumnId(null);
      return;
    }
    
    const draggedIdx = statuses.findIndex(s => (s._id || s.id) === draggedColumnId);
    const targetIdx = statuses.findIndex(s => (s._id || s.id) === targetId);
    
    if (draggedIdx !== -1 && targetIdx !== -1) {
      const newStatuses = [...statuses];
      const [draggedItem] = newStatuses.splice(draggedIdx, 1);
      newStatuses.splice(targetIdx, 0, draggedItem);
      setStatuses(newStatuses);
      
      const newOrderPayload = newStatuses.map((s, index) => ({
        id: s._id || s.id,
        order: index
      }));
      
      try {
        await reorderStatuses({ statuses: newOrderPayload });
      } catch (err) {
        console.error("Failed to persist column order to backend", err);
      }
    }
    setDraggedColumnId(null);
  };

  return (
    <div className="space-y-6">
      <LeadFormModal
        key={leadFormModalOpen ? (activeLead ? activeLead.id : 'new-lead') : 'closed'}
        isOpen={leadFormModalOpen}
        onClose={() => { setLeadFormModalOpen(false); setDefaultStatusId(""); }}
        onSuccess={() => { setLeadFormModalOpen(false); setDefaultStatusId(""); }}
        activeLead={activeLead}
        users={users}
        products={products}
        statusesOptions={statuses}
        reasonCallOptions={reasonsOptions}
        defaultStatus={defaultStatusId}
      />
      {/* Header Panel */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-[#1f2f3e]">
            Kanban Board
          </h2>
          <p className="text-sm text-text-secondary font-medium tracking-wide">
            Quickly advance leads across stages visually via drag & drop
          </p>
        </div>
        <div className="flex items-center gap-4">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
              applyFilters(undefined, { start, end });
            }}
          />
          {hasPermission("Lead-add") && (
            <Button
              onClick={() => { setActiveLead(null); setDefaultStatusId(""); setLeadFormModalOpen(true); }}
              variant="primary"
              className="rounded-lg px-6"
            >
              Add Lead
            </Button>
          )}
        </div>
      </div>

      {/* Filter Options */}
      <div className="flex flex-wrap items-center gap-3 pb-6">
        <div className="w-full sm:w-auto sm:flex-1 min-w-[160px]">
          <Select
            multiple={true}
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value as unknown as string[])}
            options={[
              { value: "all", label: "Select Product" },
              ...products.map(p => ({ value: p._id || p.id, label: p.name }))
            ]}
          />
        </div>
        <div className="w-full sm:w-auto sm:flex-1 min-w-[160px]">
          <Select
            multiple={true}
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value as unknown as string[])}
            disabled={!isAdmin}
            options={[
              { value: "all", label: "Select Assign" },
              ...(isAdmin
                ? users
                : users.filter(u => u._id === currentUser?._id || u.id === currentUser?._id)
              ).map(u => ({ value: u._id || u.id, label: u.name }))
            ]}
          />
        </div>
        <div className="w-full sm:w-auto sm:flex-1 min-w-[160px]">
          <Select
            multiple={true}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as unknown as string[])}
            options={[
              { value: "all", label: "Select Status" },
              ...statuses.map(s => ({ value: s._id || s.id, label: s.name }))
            ]}
          />
        </div>
        <div className="w-full sm:w-auto sm:flex-1 min-w-[160px]">
          <Select
            multiple={true}
            value={filterReason}
            onChange={(e) => setFilterReason(e.target.value as unknown as string[])}
            options={[
              { value: "all", label: "Reason Call" },
              ...reasonsOptions.map(r => ({ value: r._id || r.id, label: r.name }))
            ]}
          />
        </div>
        <div className="w-full sm:w-auto sm:flex-1 min-w-[160px]">
          <Select
            value={filterAge}
            onChange={(e) => setFilterAge(e.target.value as string)}
            options={[
              { value: "all", label: "Select Age" },
              { value: "0-18", label: "0-18 Years" },
              { value: "19-30", label: "19-30 Years" },
              { value: "31-45", label: "31-45 Years" },
              { value: "46-60", label: "46-60 Years" },
              { value: "61+", label: "61+ Years" }
              ]}
            />
          </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            className="rounded-lg"
            onClick={() => applyFilters()}
          >
            Apply Filter
          </Button>
          <Button
            variant="outline"
            className="rounded-lg"
            onClick={() => {
              setFilterProduct(["all"]);
              setFilterStatus(["all"]);
              setFilterReason(["all"]);
              setFilterAge("all");
              if (isAdmin) {
                setFilterAssignee(["all"]);
              } else {
                setFilterAssignee([currentUser?._id || currentUser?.id]);
              }
            }}
          >
            Clear Filter
          </Button>
        </div>
      </div>

      {/* Board Scrollable container */}
      {isLoading ? (
        <div className="flex justify-center items-center h-[50vh] w-full">
          <Loader size="lg" className="text-primary-teal" />
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 items-start select-none">
        {statuses.filter((stage) => {
          if (filterStatus.includes("all")) return true;
          return filterStatus.includes(stage._id || stage.id);
        }).map((stage) => {
          const stageLeads = activeLeads.filter(l => l.statusName === stage.name);
          const stageColor = stage.color || "#0F766E";
          
          return (
            <div
              key={stage.id || stage._id}
              draggable={true}
              onDragStart={(e) => handleColumnDragStart(e, stage._id || stage.id)}
              onDragOver={(e) => {
                if (draggedLeadId) {
                  handleDragOver(e);
                } else if (draggedColumnId) {
                  handleColumnDragOver(e, stage._id || stage.id);
                }
              }}
              onDragLeave={() => {
                if (draggedColumnId) setDragOverColumnId(null);
              }}
              onDrop={(e) => {
                if (draggedLeadId) {
                  handleDrop(e, stage);
                } else if (draggedColumnId) {
                  handleColumnDrop(e, stage._id || stage.id);
                }
              }}
              onDragEnd={() => {
                setDraggedColumnId(null);
                setDragOverColumnId(null);
              }}
              className={`w-80 shrink-0 bg-white border rounded-lg p-4 space-y-4 shadow-sm cursor-grab active:cursor-grabbing transition-all ${
                draggedColumnId === (stage._id || stage.id) ? 'opacity-50 border-dashed bg-background border-border-ui' : 'border-border-ui'
              } ${
                dragOverColumnId === (stage._id || stage.id) ? 'border-l-4 border-l-primary-teal scale-[1.02]' : ''
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border-ui pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: stageColor }} />
                  <h4 className="text-sm font-bold text-[#1f2f3e] uppercase tracking-wide">
                    {stage.name}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  {hasPermission("Lead-add") && (
                    <button
                      onClick={() => {
                        setDefaultStatusId(stage._id || stage.id);
                        setActiveLead(null);
                        setLeadFormModalOpen(true);
                      }}
                      className="p-1 hover:bg-background rounded text-text-secondary hover:text-primary-teal transition-colors"
                      title={`Add Lead to ${stage.name}`}
                    >
                      <FiPlus className="w-4 h-4" />
                    </button>
                  )}
                  <span className="text-xs font-bold px-2.5 py-1 bg-background text-[#1f2f3e] rounded-lg border border-border-ui">
                    {columnTotals[stage._id || stage.id] !== undefined ? columnTotals[stage._id || stage.id] : stageLeads.length}
                  </span>
                </div>
              </div>

              {/* Cards List */}
              <div 
                className="space-y-3 min-h-[150px] max-h-[70vh] overflow-y-auto pr-1"
                onScroll={(e) => handleScroll(e, stage.id || stage._id)}
              >
                {stageLeads.length > 0 ? (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable={hasPermission("Kanban-update")}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        setHoveredLeadInfo(null);
                        handleDragStart(e, lead.id);
                      }}
                      onMouseEnter={(e) => handleCardMouseEnter(e, lead, stageColor, stage.name)}
                      onMouseLeave={handleCardMouseLeave}
                      className={`group relative p-3.5 bg-white border border-border-ui/70 rounded-xl shadow-xs text-left transition-all duration-150 ${
                        hasPermission("Kanban-update") 
                          ? "cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary-teal/50" 
                          : "cursor-default"
                      } ${draggedLeadId === lead.id ? 'opacity-50 border-dashed' : ''}`}
                    >
                      {/* Left side color border matching status column color */}
                      <div 
                        className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full" 
                        style={{ backgroundColor: stageColor }}
                      />

                      {/* Card Content - Fixed Layout (Zero layout shift on hover) */}
                      <div className="pl-3.5 space-y-1.5">
                        <div className="flex justify-between items-start">
                          <h5 className="text-[14px] font-bold text-[#1f2f3e] tracking-wide capitalize truncate pr-1">
                            {lead.name || lead.assginName || "-"}
                          </h5>
                          {hasPermission("Lead-edit") && (
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setHoveredLeadInfo(null);
                                setActiveLead(lead); 
                                setLeadFormModalOpen(true); 
                              }}
                              className="text-text-secondary hover:text-primary-teal p-1 shrink-0 transition-colors"
                              title="Edit Lead"
                            >
                              <FiEdit className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="space-y-0.5">
                          {lead.assginName && (
                            <p className="text-[13px] font-semibold text-[#1f2f3e]/85 tracking-wide capitalize truncate">
                              Assigned: {lead.assginName}
                            </p>
                          )}
                          {lead.assginEmail && (
                            <p className="text-[12px] font-medium text-text-secondary tracking-wide truncate">
                              ✉ {lead.assginEmail}
                            </p>
                          )}
                        </div>

                        {/* Compact Footer Bar */}
                        <div className="flex items-center justify-between pt-2 mt-1 border-t border-border-ui/40 text-xs">
                          <span className="text-[11px] font-bold px-2 py-0.5 bg-primary-teal/10 text-primary-teal rounded-md uppercase truncate max-w-[130px]">
                            {lead.productName}
                          </span>
                          <span className="text-xs font-extrabold text-[#1f2f3e]">
                            ₹{lead.subtotal}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[120px] border-2 border-dashed border-border-ui rounded-lg bg-background/30 text-xs text-text-secondary font-bold uppercase tracking-widest">
                    Drop leads here
                  </div>
                )}
                {isFetchingColumn[stage.id || stage._id] && (
                  <div className="flex items-center justify-center p-2">
                    <Loader size="sm" className="text-primary-teal" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Dynamic Floating Remark Tooltip Popup */}
      {hoveredLeadInfo && !draggedLeadId && !draggedColumnId && (
        <div
          style={getPopupStyle()}
          className="bg-white/95 backdrop-blur-md border border-border-ui rounded-xl shadow-2xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-ui/60 pb-2">
            <div className="flex items-center gap-2 overflow-hidden pr-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: hoveredLeadInfo.stageColor }}
              />
              <h5 className="text-[14px] font-bold text-[#1f2f3e] truncate capitalize">
                {hoveredLeadInfo.lead.name || hoveredLeadInfo.lead.assginName || "Lead Details"}
              </h5>
            </div>
            <span
              className="text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider text-white shrink-0 shadow-xs"
              style={{ backgroundColor: hoveredLeadInfo.stageColor }}
            >
              {hoveredLeadInfo.stageName}
            </span>
          </div>

          {/* Phone */}
          {hoveredLeadInfo.lead.customerPhone && (
            <div className="flex items-center gap-1.5 text-xs text-text-secondary font-semibold">
              <FiPhone className="w-3.5 h-3.5 text-primary-teal shrink-0" />
              <span>{hoveredLeadInfo.lead.customerPhone}</span>
            </div>
          )}

          {/* Remark Section */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1f2f3e]">
              <FiMessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Remark:</span>
            </div>
            {hoveredLeadInfo.lead.remark ? (
              <div className="bg-emerald-50/90 border border-emerald-200/80 text-emerald-950 p-2.5 rounded-lg text-xs font-semibold leading-relaxed max-h-32 overflow-y-auto whitespace-pre-line shadow-xs">
                {hoveredLeadInfo.lead.remark}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 text-gray-400 p-2 rounded-lg text-xs italic">
                No remark recorded
              </div>
            )}
          </div>

          {/* Note Section */}
          {hoveredLeadInfo.lead.note && hoveredLeadInfo.lead.note !== hoveredLeadInfo.lead.remark && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1f2f3e]">
                <FiFileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Note:</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 text-slate-800 p-2 rounded-lg text-xs leading-relaxed max-h-24 overflow-y-auto whitespace-pre-line font-medium">
                {hoveredLeadInfo.lead.note}
              </div>
            </div>
          )}

          {/* Reason to Call */}
          {hoveredLeadInfo.lead.reasonCallName && (
            <div className="flex items-center justify-between text-xs bg-amber-50/80 border border-amber-200/70 text-amber-900 px-2.5 py-1.5 rounded-lg font-medium">
              <span className="text-[11px] text-amber-800 font-bold">Reason:</span>
              <span className="font-semibold">{hoveredLeadInfo.lead.reasonCallName}</span>
            </div>
          )}

          {/* Product & Price Info */}
          <div className="flex items-center justify-between pt-2 border-t border-border-ui/60 text-xs">
            <span className="px-2 py-0.5 bg-primary-teal/10 text-primary-teal font-bold rounded-md text-[11px] max-w-[170px] truncate">
              {hoveredLeadInfo.lead.productName}
            </span>
            <div className="text-right">
              <span className="text-xs font-extrabold text-[#1f2f3e]">
                ₹{hoveredLeadInfo.lead.subtotal}
              </span>
              <span className="text-[10px] text-text-secondary block font-semibold">
                Qty: {hoveredLeadInfo.lead.quantity}
              </span>
            </div>
          </div>

          {/* Footer Meta */}
          <div className="flex items-center justify-between pt-2 border-t border-border-ui/40 text-[10px] text-text-secondary font-bold uppercase tracking-wider">
            {hoveredLeadInfo.lead.assginName && (
              <span className="truncate max-w-[150px]">👤 {hoveredLeadInfo.lead.assginName}</span>
            )}
            {hoveredLeadInfo.lead.date && (
              <span>📅 {hoveredLeadInfo.lead.date}</span>
            )}
          </div>

          {/* Reminder */}
          {hoveredLeadInfo.lead.reminder && (
            <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded-md font-semibold flex items-center gap-1">
              <FiClock className="w-3 h-3 shrink-0" />
              <span className="truncate">Reminder: {hoveredLeadInfo.lead.reminder}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}