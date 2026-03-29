/** JSON payload for `scripts/venue_order_pdf.py` (stdin). */
export interface VenueReportPdfPayload {
  meta: {
    invoiceNo: string;
    issuedDateDisplay: string;
    preparedBy: string;
    status: string;
  };
  brand: {
    org: string;
    tagline: string;
    url: string;
  };
  event: {
    name: string;
    description: string;
    dateDisplay: string;
    location: string;
    priceCents: number;
    capacity: number;
    registeredCount: number;
    requiresTableSignup: boolean;
    requiresBusSignup: boolean;
    tableCount: number | null;
    seatsPerTable: number | null;
    busCount: number | null;
    busCapacity: number | null;
  };
  attendees: Array<{
    name: string;
    email: string;
    program: string | null;
    tableSeat: string | null;
    busSeat: string | null;
    registeredAt: string;
  }>;
}
