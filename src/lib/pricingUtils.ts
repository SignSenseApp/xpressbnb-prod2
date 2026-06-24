import type { Property } from './database.types';

export interface BookingTotalBreakdown {
  baseTotal: number;
  fees: number;
  taxes: number;
  grandTotal: number;
  /** Itemised fee lines for sidebar display */
  cleaningFee: number;
  serviceFee: number;
}

/**
 * Authoritative booking total: accommodation subtotal plus cleaning,
 * service, and tax fees. `basePrice` is the calendar nightly sum (not per-night).
 */
export function calculateBookingTotal(
  basePrice: number,
  nights: number,
  _guests: number,
  _property: Property,
): BookingTotalBreakdown {
  if (basePrice <= 0 || nights <= 0) {
    return {
      baseTotal: 0,
      fees: 0,
      taxes: 0,
      grandTotal: 0,
      cleaningFee: 0,
      serviceFee: 0,
    };
  }

  const baseTotal = basePrice;
  const cleaningFee = 500;
  const serviceFee = Math.round(baseTotal * 0.1);
  const taxes = Math.round((baseTotal + cleaningFee + serviceFee) * 0.05);
  const fees = cleaningFee + serviceFee;
  const grandTotal = baseTotal + cleaningFee + serviceFee + taxes;

  return {
    baseTotal,
    fees,
    taxes,
    grandTotal,
    cleaningFee,
    serviceFee,
  };
}
