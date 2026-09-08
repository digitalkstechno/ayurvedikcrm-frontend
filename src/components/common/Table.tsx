"use client";

import React, { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, FirstPage, LastPage, KeyboardArrowLeft, KeyboardArrowRight, KeyboardArrowDown, Close } from "@mui/icons-material";

export interface Column<T> {
  key: string;
  header: string;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  sortable?: boolean;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchable?: boolean;
  searchFields?: (keyof T)[];
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  idField?: keyof T;
  rowsPerPageDefault?: number;
  isLoading?: boolean;

  // Server-side mode: if provided, Table delegates pagination/search to parent
  serverSide?: boolean;
  totalCount?: number;          // total records from server
  currentPage?: number;         // controlled page
  rowsPerPage?: number;         // controlled limit
  onPageChange?: (page: number, limit: number) => void;
  onSearchChange?: (search: string) => void;

}

// ---- Table Component ----
export function Table<T extends Record<string, any>>({
  data,
  columns,
  searchPlaceholder = "Search...",
  searchable = true,
  searchFields,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  idField = "id" as keyof T,
  rowsPerPageDefault = 10,
  isLoading = false,
  serverSide = false,
  totalCount,
  currentPage: controlledPage,
  rowsPerPage: controlledLimit,
  onPageChange,
  onSearchChange,
}: TableProps<T>) {
  // Internal state for client-side mode
  const [internalSearch, setInternalSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [internalPage, setInternalPage] = useState(1);
  const [internalLimit, setInternalLimit] = useState(rowsPerPageDefault);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Active values
  const activePage = serverSide ? (controlledPage ?? 1) : internalPage;
  const activeLimit = serverSide ? (controlledLimit ?? rowsPerPageDefault) : internalLimit;

  // 1. Client-side search filter
  const filteredData = React.useMemo(() => {
    if (serverSide) return data;
    if (!internalSearch || !searchable) return data;
    const query = internalSearch.toLowerCase();
    return data.filter(row => {
      const fields = searchFields || (Object.keys(row) as (keyof T)[]);
      return fields.some(f => {
        const val = row[f];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(query);
      });
    });
  }, [data, internalSearch, searchable, searchFields, serverSide]);

  // 2. Sorting (client-side only)
  const sortedData = React.useMemo(() => {
    if (serverSide || !sortKey) return filteredData;
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredData, sortKey, sortOrder, serverSide]);

  // 3. Pagination
  const total = serverSide ? (totalCount ?? data.length) : sortedData.length;
  const totalPages = Math.max(1, Math.ceil(total / activeLimit));

  const paginatedData = React.useMemo(() => {
    if (serverSide) return data;
    const start = (activePage - 1) * activeLimit;
    return sortedData.slice(start, start + activeLimit);
  }, [sortedData, activePage, activeLimit, serverSide, data]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortOrder === "asc") setSortOrder("desc");
      else setSortKey(null);
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
    if (!serverSide) setInternalPage(1);
  };

  const handleSearchChange = (value: string) => {
    setInternalSearch(value);
    if (onSearchChange) {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(() => {
        onSearchChange(value);
      }, 400);
    }
    
    if (!serverSide) {
      setInternalPage(1);
    }
  };

  const handlePageChange = (page: number) => {
    if (serverSide) onPageChange?.(page, activeLimit);
    else setInternalPage(page);
  };

  const handleLimitChange = (limit: number) => {
    if (serverSide) onPageChange?.(1, limit);
    else { setInternalLimit(limit); setInternalPage(1); }
  };

  // Selection
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectionChange) return;
    if (e.target.checked) onSelectionChange(filteredData.map(r => String(r[idField])));
    else onSelectionChange([]);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) onSelectionChange([...selectedIds, id]);
    else onSelectionChange(selectedIds.filter(item => item !== id));
  };

  const isAllSelected = filteredData.length > 0 && selectedIds.length === filteredData.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < filteredData.length;




  const startRecord = total === 0 ? 0 : (activePage - 1) * activeLimit + 1;
  const endRecord = Math.min(activePage * activeLimit, total);

  return (
    <div className="w-full flex flex-col overflow-hidden transition-all">
      {/* Search Header */}
      {searchable && (
        <div className="pb-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-xs flex items-center">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={internalSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-4 pr-10 py-2 text-sm bg-white border border-border-ui text-text-primary rounded-lg outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal/20"
            />
            {internalSearch && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-3 text-text-secondary hover:text-text-primary focus:outline-none transition-colors"
                type="button"
                title="Clear search"
              >
                <Close style={{ fontSize: 18 }} />
              </button>
            )}
          </div>
          <div className="text-sm text-text-secondary">
            Showing {paginatedData.length} of {filteredData.length} records
          </div>
        </div>
      )}

      {/* Table Element */}
      <div className="w-full overflow-x-auto bg-white border border-border-ui rounded-lg shadow-soft">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F0F4F8] border-b border-border-ui">
              {selectable && (
                <th className="p-3 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={el => { if (el) el.indeterminate = isSomeSelected; }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-primary-teal border-border-ui rounded-lg focus:ring-primary-teal"
                  />
                </th>
              )}
               {columns.map((col, colIdx) => (
                <th
                  key={`${col.key}-${colIdx}`}
                  className="p-3 text-sm font-bold tracking-wide text-[#1f2f3e] select-none"
                >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-ui/50 relative">
            {isLoading ? (
              Array.from({ length: Math.min(activeLimit, 5) }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`} className="animate-pulse bg-zinc-50/20 ">
                  {selectable && (
                    <td className="p-3 text-center">
                      <div className="w-4 h-4 bg-zinc-200  rounded-lg mx-auto"></div>
                    </td>
                  )}
                  {columns.map((col, colIdx) => (
                    <td key={`skel-col-${col.key}-${colIdx}`} className="p-3">
                      <div className="h-3 bg-zinc-200  rounded-lg w-3/4 max-w-[120px]"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => {
                const rowId = String(row[idField]);
                const isSelected = selectedIds.includes(rowId);
                return (
                  <tr
                    key={`${rowId}-${rowIndex}`}
                    className={`group transition-colors ${
                      isSelected ? "bg-primary-teal/5" : "hover:bg-background/80"
                    }`}
                  >
                    {selectable && (
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(rowId, e.target.checked)}
                          className="w-4 h-4 text-primary-teal border-border-ui rounded-lg focus:ring-primary-teal"
                        />
                      </td>
                    )}
                    {columns.map((col, colIdx) => (
                      <td key={`${rowId}-${col.key}-${colIdx}`} className="p-3 text-[14px] font-semibold text-[#1f2f3e] tracking-wide">
                        {col.render ? col.render(row[col.key], row, rowIndex) : String(row[col.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="p-12 text-center text-text-secondary">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="py-4 px-2 flex flex-col sm:flex-row gap-4 items-center justify-end">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <span>Page Size:</span>
            <div className="relative">
              <select
                value={activeLimit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="appearance-none bg-white border border-border-ui px-3 py-1.5 pr-8 rounded text-sm font-medium text-text-primary focus:outline-none focus:border-primary-teal transition-colors cursor-pointer"
              >
                {[5, 10, 20, 50].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
                <KeyboardArrowDown style={{ fontSize: 16 }} />
              </div>
            </div>
          </div>

          <div className="text-sm text-text-secondary font-medium">
            {startRecord} to {endRecord} of {total}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(1)}
              disabled={activePage === 1}
              className="p-1 text-text-secondary hover:text-primary-teal disabled:opacity-20 transition-colors"
              title="First Page"
            >
              <FirstPage style={{ fontSize: 20 }} />
            </button>
            <button
              onClick={() => handlePageChange(activePage - 1)}
              disabled={activePage === 1}
              className="p-1 text-text-secondary hover:text-primary-teal disabled:opacity-20 transition-colors"
              title="Previous Page"
            >
              <KeyboardArrowLeft style={{ fontSize: 20 }} />
            </button>

            <div className="px-3 text-[13px] font-semibold text-text-primary whitespace-nowrap">
              Page {activePage} of {totalPages || 1}
            </div>

            <button
              onClick={() => handlePageChange(activePage + 1)}
              disabled={activePage === totalPages || totalPages === 0}
              className="p-1 text-text-secondary hover:text-primary-teal disabled:opacity-20 transition-colors"
              title="Next Page"
            >
              <KeyboardArrowRight style={{ fontSize: 20 }} />
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={activePage === totalPages || totalPages === 0}
              className="p-1 text-text-secondary hover:text-primary-teal disabled:opacity-20 transition-colors"
              title="Last Page"
            >
              <LastPage style={{ fontSize: 20 }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
