import { PromoCode } from "@/lib/db/models";

/**
 * Calculate dynamic pricing for a room based on various factors
 * @param {Object} params - Pricing parameters
 * @param {Object} params.room - Room object with pricing details
 * @param {Date} params.checkInDate - Check-in date
 * @param {Date} params.checkOutDate - Check-out date
 * @param {number} params.guests - Number of adult guests
 * @param {number} params.children - Number of children
 * @param {number} params.infants - Number of infants
 * @param {number} params.nights - Number of nights
 * @param {string} params.promoCode - Optional promo code
 * @returns {Object} - Detailed pricing breakdown
 */
export async function calculateDynamicPricing({
  room,
  checkInDate,
  checkOutDate,
  guests,
  children,
  infants,
  nights,
  promoCode
}) {
  const pricing = room.pricing;
  let baseRate = pricing.base;
  let totalTaxes = pricing.tax;
  let serviceFee = pricing.serviceFee;
  let cleaningFee = pricing.cleaningFee || 0;
  let deposit = pricing.depositRequired || 0;

  // Calculate seasonal pricing
  let seasonalMultiplier = 1;
  let seasonalInfo = null;

  if (pricing.discount.seasonalPricing && pricing.discount.seasonalPricing.length > 0) {
    const applicableSeason = pricing.discount.seasonalPricing.find(season => {
      return checkInDate >= season.startDate && checkOutDate <= season.endDate;
    });

    if (applicableSeason) {
      seasonalMultiplier = applicableSeason.priceMultiplier;
      seasonalInfo = {
        season: applicableSeason.season,
        multiplier: seasonalMultiplier,
        startDate: applicableSeason.startDate,
        endDate: applicableSeason.endDate
      };
    }
  }

  // Apply seasonal multiplier to base rate
  baseRate *= seasonalMultiplier;

  // Calculate weekend surcharge
  let weekendSurcharge = 0;
  let weekendNights = 0;

  if (pricing.weekendSurcharge > 0) {
    weekendNights = countWeekendNights(checkInDate, checkOutDate);
    weekendSurcharge = weekendNights * pricing.weekendSurcharge;
  }

  // Calculate last minute discount
  let lastMinuteDiscount = 0;
  let lastMinuteInfo = null;

  if (pricing.discount.lastMinutePricing?.enabled) {
    const hoursUntilCheckIn = (checkInDate - new Date()) / (1000 * 60 * 60);
    
    if (hoursUntilCheckIn <= pricing.discount.lastMinutePricing.hoursBeforeCheckIn) {
      lastMinuteDiscount = baseRate * (pricing.discount.lastMinutePricing.discountPercentage / 100);
      lastMinuteInfo = {
        hoursUntilCheckIn,
        discountPercentage: pricing.discount.lastMinutePricing.discountPercentage,
        discountAmount: lastMinuteDiscount
      };
    }
  }

  // Calculate standard discount
  let standardDiscount = 0;
  let discountInfo = null;

  if (pricing.discount.amount > 0) {
    const today = new Date();
    const isValidDiscountPeriod = !pricing.discount.validUntil || today <= pricing.discount.validUntil;
    
    if (isValidDiscountPeriod) {
      if (pricing.discount.type === "percentage") {
        standardDiscount = baseRate * (pricing.discount.amount / 100);
        discountInfo = {
          type: "percentage",
          amount: pricing.discount.amount,
          discountAmount: standardDiscount
        };
      } else {
        standardDiscount = pricing.discount.amount;
        discountInfo = {
          type: "fixed",
          amount: pricing.discount.amount,
          discountAmount: standardDiscount
        };
      }
    }
  }

  // Calculate extra person fees
  let extraPersonFees = 0;
  const totalGuests = guests + children;
  const maxIncludedGuests = Math.min(room.capacity.maxAdults, 2); // Assume 2 guests included by default

  if (totalGuests > maxIncludedGuests) {
    const extraGuests = totalGuests - maxIncludedGuests;
    extraPersonFees = extraGuests * pricing.extraPersonFee * nights;
  }

  // Calculate child fees
  let childFees = 0;
  if (children > 0 && pricing.childFee > 0) {
    childFees = children * pricing.childFee * nights;
  }

  // Calculate subtotal before taxes
  const subtotal = (baseRate * nights) + weekendSurcharge + extraPersonFees + childFees + cleaningFee;
  
  // Apply discounts
  const totalDiscount = lastMinuteDiscount + standardDiscount;
  const discountedSubtotal = Math.max(0, subtotal - totalDiscount);

  // Calculate taxes (apply to discounted subtotal)
  const taxes = discountedSubtotal * (totalTaxes / 100);

  // Calculate service fee
  const calculatedServiceFee = discountedSubtotal * (serviceFee / 100);

  // Calculate total
  const total = discountedSubtotal + taxes + calculatedServiceFee;

  // Apply promo code if provided
  let promoDiscount = 0;
  let promoInfo = null;

  if (promoCode) {
    const promoResult = await applyPromoCode(promoCode, total, room._id);
    if (promoResult.valid) {
      promoDiscount = promoResult.discountAmount;
      promoInfo = {
        code: promoCode,
        type: promoResult.type,
        discountAmount: promoDiscount,
        description: promoResult.description
      };
    }
  }

  // Final total after promo code
  const finalTotal = Math.max(0, total - promoDiscount);

  return {
    // Base calculations
    baseRate,
    nights,
    seasonalMultiplier,
    seasonalInfo,
    
    // Surcharges
    weekendSurcharge,
    weekendNights,
    extraPersonFees,
    childFees,
    cleaningFee,
    
    // Discounts
    standardDiscount,
    discountInfo,
    lastMinuteDiscount,
    lastMinuteInfo,
    promoDiscount,
    promoInfo,
    
    // Fees and taxes
    serviceFee: calculatedServiceFee,
    taxes,
    
    // Totals
    subtotal,
    totalDiscount: totalDiscount + promoDiscount,
    total: finalTotal,
    deposit,
    depositRequired: deposit > 0,
    
    // Per night breakdown
    perNight: {
      baseRate,
      weekendSurchargePerNight: weekendSurcharge / nights,
      extraPersonFeesPerNight: extraPersonFees / nights,
      childFeesPerNight: childFees / nights,
      cleaningFeePerNight: cleaningFee / nights,
      serviceFeePerNight: calculatedServiceFee / nights,
      taxesPerNight: taxes / nights,
      totalPerNight: finalTotal / nights
    },
    
    // Guest breakdown
    guestBreakdown: {
      adults: guests,
      children,
      infants,
      totalGuests,
      maxCapacity: room.capacity.maxGuests
    }
  };
}

/**
 * Count weekend nights between two dates
 * Weekend = Friday and Saturday nights
 */
function countWeekendNights(checkInDate, checkOutDate) {
  let weekendNights = 0;
  const currentDate = new Date(checkInDate);
  
  while (currentDate < checkOutDate) {
    const dayOfWeek = currentDate.getDay();
    // Friday (5) or Saturday (6) nights count as weekend
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      weekendNights++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return weekendNights;
}

/**
 * Apply promo code discount
 */
async function applyPromoCode(promoCode, bookingTotal, roomId) {
  try {
    const promo = await PromoCode.findOne({
      code: promoCode.toUpperCase(),
      isActive: true
    });

    if (!promo) {
      return { valid: false, message: "Invalid promo code" };
    }

    // Check if promo is still valid
    const now = new Date();
    if (promo.validFrom && now < promo.validFrom) {
      return { valid: false, message: "Promo code not yet active" };
    }

    if (promo.validUntil && now > promo.validUntil) {
      return { valid: false, message: "Promo code has expired" };
    }

    // Check usage limits
    if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
      return { valid: false, message: "Promo code usage limit reached" };
    }

    // Check minimum booking amount
    if (promo.minBookingAmount && bookingTotal < promo.minBookingAmount) {
      return { 
        valid: false, 
        message: `Minimum booking amount of ${promo.minBookingAmount} required` 
      };
    }

    // Check if applicable to rooms
    if (promo.applicableTo?.rooms && !promo.applicableTo.rooms.includes(roomId)) {
      return { valid: false, message: "Promo code not applicable to this room" };
    }

    // Calculate discount
    let discountAmount = 0;
    let type = "";

    if (promo.discountType === "percentage") {
      discountAmount = bookingTotal * (promo.discountValue / 100);
      type = `${promo.discountValue}% off`;
    } else if (promo.discountType === "fixed") {
      discountAmount = Math.min(promo.discountValue, bookingTotal);
      type = `$${promo.discountValue} off`;
    }

    return {
      valid: true,
      type,
      discountAmount,
      description: promo.description || "Promo code discount",
      promoId: promo._id
    };

  } catch (error) {
    console.error("Error applying promo code:", error);
    return { valid: false, message: "Error applying promo code" };
  }
}

/**
 * Get room pricing calendar for a month
 */
export async function getRoomPricingCalendar(roomId, year, month) {
  try {
    const { EnhancedHotelRoom } = await import("@/lib/db/models");
    
    const room = await EnhancedHotelRoom.findById(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    const calendar = [];
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const currentDate = new Date(year, month - 1, day);
      const nextDay = new Date(year, month - 1, day + 1);
      
      const pricing = await calculateDynamicPricing({
        room,
        checkInDate: currentDate,
        checkOutDate: nextDay,
        guests: 2, // Default to 2 guests for calendar
        children: 0,
        infants: 0,
        nights: 1
      });

      calendar.push({
        date: currentDate,
        price: pricing.total,
        baseRate: pricing.baseRate,
        seasonalMultiplier: pricing.seasonalMultiplier,
        hasDiscount: pricing.totalDiscount > 0,
        isWeekend: [5, 6].includes(currentDate.getDay()), // Friday, Saturday
        isAvailable: true // This would need availability checking
      });
    }

    return calendar;

  } catch (error) {
    console.error("Error generating pricing calendar:", error);
    throw error;
  }
}