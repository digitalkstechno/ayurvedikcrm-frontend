"use client";

import React, { useEffect } from "react";
import { Close } from "@mui/icons-material";
import { Loader } from "./Loader";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  sizeClass?: string;
  isLoading?: boolean;
  overflowVisible?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  sizeClass = "max-w-lg",
  isLoading = false,
  overflowVisible = false
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm animate-fade-in mb-0">
      <div
        className={`relative w-full ${sizeClass} bg-card-bg border border-border-ui rounded-lg shadow-soft flex flex-col max-h-[90vh] animate-modal-in`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-ui/50">
          {title ? (
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">
              {title}
            </h3>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 hover:bg-background text-text-secondary hover:text-text-primary rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Close className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className={`relative p-6 flex-1 text-left text-sm text-text-primary ${overflowVisible ? 'overflow-visible' : 'overflow-y-auto'}`}>
          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card-bg/60 backdrop-blur-[2px]">
              <Loader size="lg" className="text-primary-teal mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary-teal animate-pulse">Processing...</p>
            </div>
          )}
          <div className={isLoading ? "opacity-30 pointer-events-none transition-opacity" : "transition-opacity"}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
