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
import { FiEdit, FiPlus } from "react-icons/fi";

export default function KanbanListPage() {
  const { hasPermission } = usePermission();
  const [statuses, setStatuses] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [reasonsOptions, setReasonsOptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const mapLead = (l: any, usersList: any[]) => {
    const usersLookup: Record<string, { name: string; email: string }> = {};
    usersList.forEach((u: any) => {
      usersLookup[u._id || u.id] = { name: u.name || "", email: u.email || "" };
    });
    const assginId  = l.assgin?._id || (typeof l.assgin === "string" ? l.assgin : "") || "";
    const fromObj   = { name: l.assgin?.name || "", email: l.assgin?.email || "" };
    const fromLookup = assginId ? (usersLookup[assginId] || { name: "", email: "" }) : { name: "", email: "" };
    return {
      ...l,
      id: l._id || l.id,
      statusName:  l.status?.name || l.status || "Open",
      productName: l.product || (l.products?.map((p: any) => p.name).join(", ") || "No Product"),
      assginId,
      assginName:  fromObj.name  || fromLookup.name,
      assginEmail: fromObj.email || fromLookup.email,
    };
  };

  useEffect(() => {
    const loadData = async () => {
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

        const initialPages: Record<string, number> = {};
        const initialHasMore: Record<string, boolean> = {};
        const initialTotals: Record<string, number> = {};
        let allLeads: any[] = [];

        await Promise.all(statusesRes.data.map(async (stage: any) => {
          const stageId = stage._id || stage.id;
          const res = await fetchLeads({ page: 1, limit: 10, status: stageId });
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
    loadData();
  }, [leadFormModalOpen]);

  const loadMoreLeads = async (stageId: string) => {
    setIsFetchingColumn(prev => ({ ...prev, [stageId]: true }));
    try {
      const nextPage = (columnPages[stageId] || 1) + 1;
      const res = await fetchLeads({ page: nextPage, limit: 10, status: stageId });
      
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

      {/* Board Scrollable container */}
      <div className="flex gap-4 overflow-x-auto pb-4 items-start select-none">
        {statuses.map((stage) => {
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
                        handleDragStart(e, lead.id);
                      }}
                      className={`group relative p-4 bg-background/50 border border-border-ui/50 rounded-lg shadow-sm text-left transition-all ${
                        hasPermission("Kanban-update") 
                          ? "cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary-teal/30" 
                          : "cursor-default"
                      } ${draggedLeadId === lead.id ? 'opacity-50 border-dashed' : ''}`}
                    >
                      {/* Left side color border matching status column color */}
                      <div 
                        className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full" 
                        style={{ backgroundColor: stageColor }}
                      />

                      {/* Default Visible Content */}
                      <div className="pl-4 space-y-1">
                        <div className="flex justify-between items-start">
                          <h5 className="text-[14px] font-semibold text-[#1f2f3e] tracking-wide capitalize">
                            {lead.name || lead.assginName || "-"}
                          </h5>
                          {hasPermission("Lead-edit") && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setActiveLead(lead); setLeadFormModalOpen(true); }}
                              className="text-text-secondary hover:text-primary-teal p-1"
                            >
                              <FiEdit className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          {lead.assginName && (
                             <p className="text-[14px] font-semibold text-[#1f2f3e] tracking-wide capitalize">
                              Assigned: {lead.assginName}
                            </p>
                          )}
                          {lead.assginEmail && (
                            <p className="text-[14px] font-semibold text-[#1f2f3e] tracking-wide">
                              ✉ {lead.assginEmail}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Hover Expanded Content */}
                      <div className="hidden group-hover:block pt-3 mt-3 space-y-3 border-t border-border-ui animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] px-2 py-0.5 bg-primary-teal/10 text-primary-teal font-bold rounded-lg uppercase">
                            {lead.productName}
                          </span>
                          <span className="text-xs font-bold text-[#1f2f3e]">
                            ₹{lead.subtotal}
                          </span>
                        </div>

                        {lead.note && (
                          <p className="text-[11px] text-text-secondary line-clamp-3 bg-white p-2.5 rounded-lg border border-border-ui/30 italic">
                            {lead.note}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                          <span>Qty: {lead.quantity}</span>
                          <span>{lead.date}</span>
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
                    <div className="w-5 h-5 border-2 border-primary-teal border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}