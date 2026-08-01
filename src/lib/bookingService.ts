// lib/bookingService.ts
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Booking = Tables<'bookings'>;
type Notification = Tables<'notifications'>;

export interface CreateBookingData {
  client_id: string;
  package_id: number;
  first_name: string;
  second_name?: string | null;
  travelers_no?: number;
  total_amount: number;
  payment_method?: {
    method: string;
    details: string;
  };
  booking_date?: string;
}

export interface BookingWithDetails extends Booking {
  clients: {
    first_name: string;
    second_name: string | null;
    national_id: string | null;
    app_id: string | null;
    email?: string;
    phone?: string;
  } | null;
  packages: {
    name: string | null;
    price: number | null;
    type: string | null;
  } | null;
}

export class BookingService {
  static async createBooking(data: CreateBookingData) {
    try {
      // Validate booking data
      this.validateBookingData(data);

      // Check if client exists
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, first_name, second_name, app_id')
        .eq('id', data.client_id)
        .single();

      if (clientError || !client) {
        throw new Error('Client not found');
      }

      // Create booking
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          client_id: data.client_id,
          package_id: data.package_id,
          first_name: data.first_name || client.first_name,
          second_name: data.second_name || client.second_name,
          travelers_no: data.travelers_no || 1,
          total_amount: data.total_amount,
          payment_method: data.payment_method || { method: 'pending', details: '' },
          booking_status: 'pending',
          booking_date: data.booking_date || new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) throw error;

      // Send confirmation notification
      await this.createNotification({
        user_id: data.client_id,
        booking_id: booking.id,
        title: 'Booking Created',
        message: `Your booking for ${data.package_id} has been created and is pending confirmation.`,
        type: 'booking',
        metadata: {
          package_id: data.package_id,
          travelers: data.travelers_no,
          total: data.total_amount
        }
      });

      // Send admin notification (you can implement this via Supabase Edge Functions)
      await this.notifyAdmins('New booking received', booking);

      return booking;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  static async getBookingById(bookingId: string) {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        clients (
          first_name,
          second_name,
          national_id,
          app_id,
          email,
          phone
        ),
        packages (
          name,
          price,
          type
        )
      `)
      .eq('id', bookingId)
      .single();

    if (error) throw error;
    return data as BookingWithDetails;
  }

  static async getUserBookings(clientId: string) {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        packages (
          name,
          price,
          type
        )
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as BookingWithDetails[];
  }

  static async updateBookingStatus(bookingId: string, status: string) {
    // Validate status
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid booking status');
    }

    // Get current booking
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('client_id, booking_status, package_id')
      .eq('id', bookingId)
      .single();

    if (fetchError) throw fetchError;
    if (booking.booking_status === status) {
      return { message: 'Status is already set to this value' };
    }

    // Update status
    const { error } = await supabase
      .from('bookings')
      .update({ booking_status: status, updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    if (error) throw error;

    // Create notification for user
    await this.createNotification({
      user_id: booking.client_id,
      booking_id: bookingId,
      title: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your booking has been ${status}`,
      type: 'status_update',
      metadata: {
        previous_status: booking.booking_status,
        new_status: status
      }
    });

    return { success: true, status };
  }

  static async createNotification(data: {
    user_id: string;
    booking_id: string;
    title: string;
    message: string;
    type: 'booking' | 'payment' | 'status_update' | 'system';
    metadata?: any;
  }) {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: data.user_id,
        booking_id: data.booking_id,
        title: data.title,
        message: data.message,
        type: data.type,
        metadata: data.metadata || {}
      });

    if (error) {
      console.error('Error creating notification:', error);
      // Don't throw - notifications are non-critical
    }
  }

  static async notifyAdmins(title: string, bookingData: any) {
    try {
      // Call an Edge Function to handle admin notifications
      const { error } = await supabase.functions.invoke('notify-admin', {
        body: {
          title,
          message: `New booking from ${bookingData.first_name} ${bookingData.second_name || ''}`,
          booking_id: bookingData.id,
          data: bookingData
        }
      });

      if (error) console.error('Admin notification error:', error);
    } catch (error) {
      console.error('Failed to notify admins:', error);
    }
  }

  private static validateBookingData(data: CreateBookingData) {
    if (!data.package_id) throw new Error('Package ID is required');
    if (!data.first_name) throw new Error('First name is required');
    if (data.total_amount < 0) throw new Error('Total amount cannot be negative');
    if (data.travelers_no && data.travelers_no < 1) {
      throw new Error('At least one traveler is required');
    }
  }
}