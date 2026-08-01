import { describe, expect, it } from "vitest";
import { buildBookingInsertPayload } from "./bookingService";

describe("buildBookingInsertPayload", () => {
  it("omits client_id when no client is available", () => {
    const payload = buildBookingInsertPayload({
      package_id: 12,
      first_name: "Jane",
      total_amount: 2500000,
      travelers_no: 2,
      payment_method: { method: "deposit", details: "First payment" },
      booking_date: "2026-08-01",
      email: "jane@example.com"
    });

    expect(payload).not.toHaveProperty("client_id");
    expect(payload).toMatchObject({
      package_id: 12,
      first_name: "Jane",
      travelers_no: 2,
      total_amount: 2500000,
      booking_status: "pending"
    });
  });

  it("includes client_id when one is provided", () => {
    const payload = buildBookingInsertPayload({
      client_id: "client-123",
      package_id: 7,
      first_name: "John",
      total_amount: 3000000
    });

    expect(payload.client_id).toBe("client-123");
  });
});
