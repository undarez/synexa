"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "./button";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  side?: "left" | "right" | "top" | "bottom";
}

export function Sheet({ open, onOpenChange, children, side = "left" }: SheetProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const sideClasses = {
    left: "left-0 top-0 h-full w-80",
    right: "right-0 top-0 h-full w-80",
    top: "left-0 top-0 w-full h-96",
    bottom: "left-0 bottom-0 w-full h-96",
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      {/* Sheet */}
      <div
        className={cn(
          "fixed z-50 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 shadow-lg",
          sideClasses[side]
        )}
      >
        {children}
      </div>
    </>
  );
}

interface SheetContentProps {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}

export function SheetContent({ children, className, onClose }: SheetContentProps) {
  return (
    <div className={cn("flex h-full flex-col", className)}>
      {onClose && (
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4">{children}</div>
    </div>
  );
}







