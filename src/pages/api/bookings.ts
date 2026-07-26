// pages/api/bookings.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { BookingService } from '@/lib/bookingService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const booking = await BookingService.createBooking(req.body);
      res.status(201).json(booking);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  } else if (req.method === 'GET') {
    try {
      const { clientId } = req.query;
      if (clientId) {
        const bookings = await BookingService.getUserBookings(clientId as string);
        res.status(200).json(bookings);
      } else {
        // Admin endpoint - should be protected
        const { data } = await supabase
          .from('bookings')
          .select('*')
          .order('created_at', { ascending: false });
        res.status(200).json(data);
      }
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  } else if (req.method === 'PUT') {
    try {
      const { bookingId, status } = req.query;
      const result = await BookingService.updateBookingStatus(
        bookingId as string,
        status as string
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  } else {
    res.setHeader('Allow', ['POST', 'GET', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}