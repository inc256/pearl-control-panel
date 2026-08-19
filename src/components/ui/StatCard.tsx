// components/ui/StatCard.tsx
import { useState, useEffect, useRef, ReactNode, useCallback } from "react";
import { Eye, X, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface StatCardProps<T = any> {
  title: string;
  value: string | number;
  icon: ReactNode;
  hint?: string;
  valueClass?: string;
  details?: T[];
  emptyText?: string;
  detailTitle?: string;
  renderDetail?: (item: T, index: number) => ReactNode;
  trend?: number;
  color?: "primary" | "green" | "amber" | "red" | "blue" | "purple" | "slate" | "rose" | "indigo";
  valuePrefix?: string;
  valueSuffix?: string;
  className?: string;
  compact?: boolean;
  showViewButton?: boolean;
  viewButtonText?: string;
  modalMaxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  onViewClick?: () => void;
  itemsPerPage?: number;
}

const StatCard = <T extends any>({
  title,
  value,
  icon,
  hint,
  valueClass = "",
  details,
  emptyText = "No items available",
  detailTitle,
  renderDetail,
  trend,
  color = "primary",
  valuePrefix = "",
  valueSuffix = "",
  className = "",
  compact = false,
  showViewButton = true,
  viewButtonText = "View Details",
  modalMaxWidth = "2xl",
  onViewClick,
  itemsPerPage = 50,
}: StatCardProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLElement | null>(null);

  const hasDetails = details && details.length > 0;
  const displayItems = hasDetails ? details.slice(0, itemsPerPage) : [];
  const hasMoreItems = hasDetails && details.length > itemsPerPage;

  // Handle modal open/close with animation
  const handleOpen = useCallback(() => {
    if (onViewClick) {
      onViewClick();
    }
    setIsOpen(true);
    setIsClosing(false);
    document.body.style.overflow = "hidden";
  }, [onViewClick]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    document.body.style.overflow = "";
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      if (triggerRef.current) {
        triggerRef.current.focus();
      }
    }, 200);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, handleClose]);

  // Focus management
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        (focusable[0] as HTMLElement).focus();
        firstFocusableRef.current = focusable[0] as HTMLElement;
      }
    }
  }, [isOpen]);

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const colorClasses = {
    primary: "bg-primary/10 text-primary border-primary/20",
    green: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
    amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
    red: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
    blue: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
    purple: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
    slate: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700",
    rose: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800",
  };

  const iconColors = {
    primary: "text-primary",
    green: "text-green-600 dark:text-green-400",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400",
    blue: "text-blue-600 dark:text-blue-400",
    purple: "text-purple-600 dark:text-purple-400",
    slate: "text-slate-600 dark:text-slate-400",
    rose: "text-rose-600 dark:text-rose-400",
    indigo: "text-indigo-600 dark:text-indigo-400",
  };

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
  };

  // Format the value display
  const formatDisplayValue = (val: string | number) => {
    if (typeof val === "number" && val >= 1000000) {
      return `${(val / 1000000).toFixed(1)}M`;
    }
    if (typeof val === "number" && val >= 1000) {
      return `${(val / 1000).toFixed(1)}K`;
    }
    return val;
  };

  return (
    <>
      {/* Main Stat Card */}
      <Card
        className={cn(
          "group relative overflow-hidden transition-all duration-300 hover:shadow-xl border-0 shadow-sm",
          compact ? "hover:-translate-y-0.5" : "hover:-translate-y-1",
          className
        )}
        role="region"
        aria-label={`${title} statistics card`}
      >
        {/* Gradient background overlay */}
        <div
          className={cn(
            "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300",
            `bg-gradient-to-br from-${color}-500 to-transparent`
          )}
        />

        {/* Subtle border glow on hover */}
        <div
          className={cn(
            "absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300",
            `ring-1 ring-${color}-200/50 dark:ring-${color}-800/30`
          )}
        />

        <CardContent className={cn("relative", compact ? "p-3 sm:p-4" : "p-4 sm:p-5")}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                  {title}
                </p>
                {trend !== undefined && trend !== 0 && (
                  <Badge
                    variant={trend > 0 ? "default" : "destructive"}
                    className="text-[10px] px-1.5 py-0 h-4"
                  >
                    {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
                  </Badge>
                )}
              </div>

              <div className="flex items-baseline gap-2 mt-1">
                <span
                  className={cn(
                    "font-bold truncate transition-colors duration-300",
                    compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl",
                    valueClass || `text-${color}-700 dark:text-${color}-400`
                  )}
                >
                  {valuePrefix}
                  {formatDisplayValue(value)}
                  {valueSuffix}
                </span>
              </div>

              {hint && (
                <p className="text-xs text-muted-foreground mt-1 truncate">{hint}</p>
              )}
            </div>

            <div
              className={cn(
                "flex items-center justify-center rounded-xl border shrink-0 transition-all duration-300 group-hover:scale-110",
                compact ? "h-8 w-8 sm:h-10 sm:w-10" : "h-10 w-10 sm:h-12 sm:w-12",
                colorClasses[color]
              )}
              aria-hidden="true"
            >
              <span
                className={cn(
                  "transition-transform duration-300 group-hover:scale-110",
                  compact ? "h-4 w-4 sm:h-5 sm:w-5" : "h-5 w-5 sm:h-6 sm:w-6",
                  iconColors[color]
                )}
              >
                {icon}
              </span>
            </div>
          </div>

          {/* View Details Button - Enhanced with background */}
          {hasDetails && showViewButton && (
            <button
              ref={triggerRef}
              onClick={handleOpen}
              className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-medium transition-all duration-200 hover:gap-3 active:scale-95 border border-primary/20"
              aria-label={`View ${detailTitle || title} details`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>
                {viewButtonText} ({details.length})
              </span>
              <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
            </button>
          )}
        </CardContent>
      </Card>

      {/* Floating Modal Overlay */}
      {isOpen && hasDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Backdrop with animation */}
          <div
            className={cn(
              "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200",
              isClosing ? "opacity-0" : "opacity-100"
            )}
          />

          {/* Modal Card with animation */}
          <Card
            ref={modalRef}
            className={cn(
              "relative w-full shadow-2xl transition-all duration-200",
              maxWidthClasses[modalMaxWidth],
              isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100",
              "animate-in fade-in zoom-in-95 duration-200"
            )}
            style={{
              maxHeight: "85vh",
            }}
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute right-3 top-3 rounded-full bg-gray-100 p-2 text-gray-600 transition-all duration-200 hover:bg-gray-200 hover:text-gray-900 hover:scale-110 active:scale-95 z-10 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              aria-label="Close details modal"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Modal Header */}
            <CardHeader className="border-b pr-14">
              <CardTitle id="modal-title" className="text-lg flex items-center gap-2">
                {detailTitle || title}
                <Badge variant="secondary" className="text-xs font-normal">
                  {details.length} item{details.length !== 1 ? "s" : ""}
                </Badge>
              </CardTitle>
              {hasMoreItems && (
                <p className="text-xs text-muted-foreground mt-1">
                  Showing first {itemsPerPage} items
                </p>
              )}
            </CardHeader>

            {/* Modal Content - Scrollable */}
            <CardContent 
              ref={scrollContainerRef}
              className="overflow-y-auto p-4"
              style={{ maxHeight: "calc(85vh - 130px)" }}
            >
              {details.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-muted-foreground">{emptyText}</p>
                </div>
              ) : (
                <div className="space-y-2" role="list">
                  {displayItems.map((item, index) => (
                    <div
                      key={item.id ?? index}
                      className="rounded-lg border bg-gray-50/80 p-3 hover:bg-gray-100 transition-all duration-200 hover:shadow-sm dark:bg-gray-800/50 dark:border-gray-700 dark:hover:bg-gray-800"
                      role="listitem"
                      style={{
                        animationDelay: `${index * 30}ms`,
                      }}
                    >
                      {renderDetail ? (
                        renderDetail(item, index)
                      ) : (
                        <span className="text-sm">{String(item)}</span>
                      )}
                    </div>
                  ))}
                  
                  {hasMoreItems && (
                    <div className="text-center text-sm text-muted-foreground py-2 border-t pt-4">
                      + {details.length - itemsPerPage} more items not shown
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default StatCard;