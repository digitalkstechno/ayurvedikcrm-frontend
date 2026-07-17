"use client";

import React, { useState, useMemo, useRef, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { Loader } from "./Loader";
import { KeyboardArrowDown, Search, Close } from "@mui/icons-material";

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  options: Option[];
  value?: string | number | string[];
  multiple?: boolean;
  onChange?: (e: { target: { value: any; name?: string } }) => void;
  error?: string;
  helperText?: string;
  isLoading?: boolean;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  name?: string;
  required?: boolean;
  allowCustom?: boolean;
  menuPortalTarget?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  error,
  helperText,
  isLoading = false,
  className = "",
  disabled,
  placeholder = "Select option",
  name,
  required,
  allowCustom = false,
  multiple = false,
  menuPortalTarget = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);

  const isDisabled = disabled || isLoading;

  // Find the currently selected option to display its label
  const selectedOption = useMemo(() => {
    if (multiple && Array.isArray(value)) {
      return null;
    }
    return options.find((opt) => String(opt.value) === String(value));
  }, [options, value, multiple]);

  const displayValue = useMemo(() => {
    if (multiple && Array.isArray(value)) {
      if (value.length === 0) return placeholder;
      if (value.includes("all") && value.length === 1) {
        const allOpt = options.find(o => String(o.value) === "all");
        return allOpt ? allOpt.label : "All Selected";
      }
      
      const labels = value
        .filter(v => String(v) !== "all")
        .map(v => options.find(o => String(o.value) === String(v))?.label || v);
        
      if (labels.length <= 2) return labels.join(", ");
      return `${labels.length} Selected`;
    }
    return selectedOption ? selectedOption.label : (value || placeholder);
  }, [value, multiple, options, selectedOption, placeholder]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery]);

  // Handle click outside to close dropdown and check position
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check if dropdown should open upwards
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const updateRect = () => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setDropdownRect(rect);
          const spaceBelow = window.innerHeight - rect.bottom;
          if (spaceBelow < 250 && rect.top > 250) {
            setOpenUpwards(true);
          } else {
            setOpenUpwards(false);
          }
        }
      };
      
      updateRect();
      if (menuPortalTarget) {
        window.addEventListener("scroll", updateRect, true);
        window.addEventListener("resize", updateRect);
        return () => {
          window.removeEventListener("scroll", updateRect, true);
          window.removeEventListener("resize", updateRect);
        };
      }
    }
  }, [isOpen, menuPortalTarget]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    if (multiple) {
      let newValue: string[] = Array.isArray(value) ? [...value] : [];
      const valStr = String(optionValue);
      
      if (valStr === "all") {
        newValue = ["all"];
      } else {
        // Remove "all" if it was selected
        newValue = newValue.filter(v => String(v) !== "all");
        
        if (newValue.includes(valStr)) {
          newValue = newValue.filter(v => String(v) !== valStr);
        } else {
          newValue.push(valStr);
        }
        
        if (newValue.length === 0) {
          newValue = ["all"];
        }
      }
      
      if (onChange) onChange({ target: { value: newValue, name } });
    } else {
      if (onChange) {
        onChange({ target: { value: optionValue, name } });
      }
      setIsOpen(false);
    }
  };

  const toggleDropdown = () => {
    if (!isDisabled) {
      if (!isOpen && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDropdownRect(rect);
        const spaceBelow = window.innerHeight - rect.bottom;
        setOpenUpwards(spaceBelow < 250 && rect.top > 250);
      }
      setIsOpen(!isOpen);
    }
  };

  const dropdownMenu = isOpen && (
    <div 
      ref={dropdownRef}
      className={`absolute z-[99999] w-full bg-white border border-border-ui rounded-lg shadow-xl overflow-hidden animate-in fade-in duration-200 ${!menuPortalTarget ? (openUpwards ? "bottom-full mb-1.5 slide-in-from-bottom-2" : "top-full mt-1.5 slide-in-from-top-2") : ""}`}
      style={
        menuPortalTarget && dropdownRect
          ? {
              position: "fixed",
              top: openUpwards ? dropdownRect.top - 6 : dropdownRect.bottom + 6,
              left: dropdownRect.left,
              width: dropdownRect.width,
              bottom: "auto",
              transform: openUpwards ? "translateY(-100%)" : "none",
            }
          : undefined
      }
    >
      {/* Search Input */}
      <div className="p-2 border-b border-border-ui/50 flex items-center gap-2 bg-zinc-50/50">
        <Search className="text-text-secondary w-4 h-4" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent border-none outline-none text-xs text-text-primary placeholder:text-text-secondary/50 py-1"
          onClick={(e) => e.stopPropagation()}
        />
        {searchQuery && (
          <button 
            onClick={(e) => { e.stopPropagation(); setSearchQuery(""); }}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <Close style={{ fontSize: 14 }} />
          </button>
        )}
      </div>

      {/* Options List */}
      <div className="max-h-48 overflow-y-auto py-1 scrollbar-thin">
        {filteredOptions.length > 0 ? (
          filteredOptions.map((opt) => {
            const isSelected = multiple && Array.isArray(value) 
              ? value.includes(String(opt.value)) 
              : String(opt.value) === String(value);
              
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`
                  w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center gap-2
                  ${isSelected 
                    ? "bg-primary-teal/10 text-primary-teal font-bold" 
                    : "text-text-primary hover:bg-zinc-50"}
                `}
              >
                {multiple && (
                  <div className={`w-3.5 h-3.5 border rounded flex items-center justify-center ${isSelected ? 'bg-primary-teal border-primary-teal text-white' : 'border-border-ui bg-white'}`}>
                    {isSelected && <svg viewBox="0 0 14 14" fill="none" className="w-2.5 h-2.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2.5 7.5 5.5 10.5 11.5 3.5" /></svg>}
                  </div>
                )}
                {opt.label}
              </button>
            );
          })
        ) : (
          <div className="px-4 py-8 text-center text-xs text-text-secondary italic">
            No results found for "{searchQuery}"
          </div>
        )}
        {allowCustom && searchQuery && !options.some(o => o.label.toLowerCase() === searchQuery.toLowerCase()) && (
          <button
            type="button"
            onClick={() => handleSelect(searchQuery)}
            className="w-full text-left px-4 py-2.5 text-xs font-bold text-primary-teal hover:bg-primary-teal/10 transition-colors border-t border-border-ui/50"
          >
            + Add "{searchQuery}"
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className={`w-full flex flex-col gap-1.5 text-left ${className}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex gap-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        {/* Trigger Button */}
        <button
          type="button"
          onClick={toggleDropdown}
          disabled={isDisabled}
          className={`
            w-full flex items-center justify-between px-4 py-2.5 text-sm bg-white
            border border-border-ui text-text-primary rounded-lg transition-all duration-200
            outline-none text-left
            ${isOpen ? "border-primary-teal ring-1 ring-primary-teal/30" : "hover:border-primary-teal/50"}
            ${error ? "border-error focus:ring-error/20" : ""}
            ${isDisabled ? "bg-background text-text-secondary cursor-not-allowed opacity-70" : "cursor-pointer"}
          `}
        >
          <span className={`truncate ${(!selectedOption && !multiple && !value) || (multiple && Array.isArray(value) && value.length === 0) ? "text-text-secondary/60" : ""}`}>
            {displayValue}
          </span>
          
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader size="sm" className="text-primary-teal" />
            ) : (
              <KeyboardArrowDown 
                className={`text-text-secondary transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                style={{ fontSize: 20 }}
              />
            )}
          </div>
        </button>

        {/* Dropdown Panel */}
        {menuPortalTarget && typeof document !== "undefined"
          ? createPortal(dropdownMenu, document.body)
          : dropdownMenu}
      </div>

      {error && (
        <span className="text-xs font-medium text-error">{error}</span>
      )}
      {!error && helperText && (
        <span className="text-xs text-text-secondary">{helperText}</span>
      )}
    </div>
  );
};
