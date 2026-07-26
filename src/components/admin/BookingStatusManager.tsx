// components/admin/BookingStatusManager.tsx
import { Button } from "@/components/ui/button";
import { BookingService } from "@/lib/bookingService";
import { useState } from "react";

interface BookingStatusManagerProps {
  bookingId: string;
  currentStatus: string;
  onStatusUpdate: () => void;
}

export function BookingStatusManager({ 
  bookingId, 
  currentStatus, 
  onStatusUpdate 
}: BookingStatusManagerProps) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setUpdating(true);
      setError(null);
      await BookingService.updateBookingStatus(bookingId, newStatus);
      onStatusUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusButton = (status: string, label: string, variant?: any) => {
    if (currentStatus === status) return null;
    return (
      <Button
        size="sm"
        variant={variant || "default"}
        onClick={() => handleStatusUpdate(status)}
        disabled={updating}
      >
        {label}
      </Button>
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {getStatusButton('confirmed', 'Approve')}
      {getStatusButton('pending', 'Pending', 'outline')}
      {getStatusButton('cancelled', 'Cancel', 'destructive')}
      {getStatusButton('completed', 'Complete', 'secondary')}
      {error && <p className="text-sm text-red-500 w-full">{error}</p>}
    </div>
  );
}