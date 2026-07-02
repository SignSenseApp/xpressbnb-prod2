import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isAvailable: boolean;
  price: number;
  isToday: boolean;
  isSelected: boolean;
  isInRange: boolean;
}

interface BookingCalendarProps {
  propertyId: string;
  basePrice: number;
  onDateRangeSelect?: (checkIn: Date | null, checkOut: Date | null, totalPrice: number) => void;
  /** ISO `yyyy-mm-dd` from URL search — seeds range once calendar data is ready */
  initialCheckIn?: string | null;
  initialCheckOut?: string | null;
}

export default function BookingCalendar({
  propertyId,
  basePrice,
  onDateRangeSelect,
  initialCheckIn,
  initialCheckOut,
}: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [checkInDate, setCheckInDate] = useState<Date | null>(null);
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);
  const seededFromUrl = useRef(false);
  const [calendarData, setCalendarData] = useState<Map<string, { isAvailable: boolean; price: number }>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNamesShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  useEffect(() => {
    seededFromUrl.current = false;
  }, [propertyId]);

  useEffect(() => {
    fetchCalendarData();
  }, [propertyId, currentMonth]);

  useEffect(() => {
    if (seededFromUrl.current || isLoading) return;
    if (!initialCheckIn || !initialCheckOut) return;
    const inD = new Date(`${initialCheckIn}T12:00:00`);
    const outD = new Date(`${initialCheckOut}T12:00:00`);
    if (!(outD > inD)) return;
    seededFromUrl.current = true;
    setCheckInDate(inD);
    setCheckOutDate(outD);
    setCurrentMonth(inD);
    let total = 0;
    const cursor = new Date(inD);
    while (cursor < outD) {
      const dateStr = cursor.toISOString().split('T')[0];
      const calData = calendarData.get(dateStr);
      total += calData?.price ?? basePrice;
      cursor.setDate(cursor.getDate() + 1);
    }
    onDateRangeSelect?.(inD, outD, total);
  }, [
    isLoading,
    calendarData,
    basePrice,
    initialCheckIn,
    initialCheckOut,
    onDateRangeSelect,
  ]);

  const fetchCalendarData = async () => {
    setIsLoading(true);
    try {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const startDate = new Date(startOfMonth);
      startDate.setDate(startDate.getDate() - 7);

      const endDate = new Date(endOfMonth);
      endDate.setDate(endDate.getDate() + 7);

      const { data, error } = await supabase
        .from('property_calendar')
        .select('date, is_available, price_override')
        .eq('property_id', propertyId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (error) throw error;

      const dataMap = new Map<string, { isAvailable: boolean; price: number }>();

      data?.forEach(entry => {
        dataMap.set(entry.date, {
          isAvailable: entry.is_available,
          price: entry.price_override || basePrice
        });
      });

      setCalendarData(dataMap);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCalendarDays = (): CalendarDay[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < startingDayOfWeek; i++) {
      const date = new Date(year, month, -startingDayOfWeek + i + 1);
      const dateStr = date.toISOString().split('T')[0];
      const calData = calendarData.get(dateStr);

      days.push({
        date,
        isCurrentMonth: false,
        isAvailable: calData?.isAvailable ?? true,
        price: calData?.price ?? basePrice,
        isToday: false,
        isSelected: false,
        isInRange: false
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const calData = calendarData.get(dateStr);
      const isToday = date.getTime() === today.getTime();
      const isPast = date < today;

      days.push({
        date,
        isCurrentMonth: true,
        isAvailable: !isPast && (calData?.isAvailable ?? true),
        price: calData?.price ?? basePrice,
        isToday,
        isSelected: isDateSelected(date),
        isInRange: isDateInRange(date)
      });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      const dateStr = date.toISOString().split('T')[0];
      const calData = calendarData.get(dateStr);

      days.push({
        date,
        isCurrentMonth: false,
        isAvailable: calData?.isAvailable ?? true,
        price: calData?.price ?? basePrice,
        isToday: false,
        isSelected: false,
        isInRange: false
      });
    }

    return days;
  };

  const isDateSelected = (date: Date): boolean => {
    if (!checkInDate && !checkOutDate) return false;

    const dateTime = date.getTime();
    if (checkInDate && dateTime === checkInDate.getTime()) return true;
    if (checkOutDate && dateTime === checkOutDate.getTime()) return true;

    return false;
  };

  const isDateInRange = (date: Date): boolean => {
    if (!checkInDate || !checkOutDate) return false;

    const dateTime = date.getTime();
    return dateTime > checkInDate.getTime() && dateTime < checkOutDate.getTime();
  };

  const handleDateClick = (day: CalendarDay) => {
    if (!day.isAvailable || !day.isCurrentMonth) return;

    const clickedDate = new Date(day.date);
    clickedDate.setHours(0, 0, 0, 0);

    if (!checkInDate || (checkInDate && checkOutDate)) {
      setCheckInDate(clickedDate);
      setCheckOutDate(null);
      if (onDateRangeSelect) {
        onDateRangeSelect(clickedDate, null, 0);
      }
    } else if (clickedDate > checkInDate) {
      setCheckOutDate(clickedDate);
      const total = calculateTotalPrice(checkInDate, clickedDate);
      if (onDateRangeSelect) {
        onDateRangeSelect(checkInDate, clickedDate, total);
      }
    } else {
      setCheckInDate(clickedDate);
      setCheckOutDate(null);
      if (onDateRangeSelect) {
        onDateRangeSelect(clickedDate, null, 0);
      }
    }
  };

  const calculateTotalPrice = (start: Date, end: Date): number => {
    let total = 0;
    const current = new Date(start);

    while (current < end) {
      const dateStr = current.toISOString().split('T')[0];
      const calData = calendarData.get(dateStr);
      total += calData?.price ?? basePrice;
      current.setDate(current.getDate() + 1);
    }

    return total;
  };

  const getTotalNights = (): number => {
    if (!checkInDate || !checkOutDate) return 0;
    const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getTotalPrice = (): number => {
    if (!checkInDate || !checkOutDate) return 0;
    return calculateTotalPrice(checkInDate, checkOutDate);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const calendarDays = getCalendarDays();

  return (
    <div className="xpx-concierge-calendar" aria-busy={isLoading}>
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="xpx-concierge-calendar-nav touch-manipulation"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.25} />
        </button>

        <h3 className="xpx-concierge-calendar-month">
          <span className="hidden sm:inline">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <span className="sm:hidden">
            {monthNames[currentMonth.getMonth()].slice(0, 3)} {currentMonth.getFullYear()}
          </span>
        </h3>

        <button
          type="button"
          onClick={goToNextMonth}
          className="xpx-concierge-calendar-nav touch-manipulation"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.25} />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-0">
        {dayNames.map((day, index) => (
          <div key={day} className="xpx-concierge-calendar-day-label py-2 text-center">
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{dayNamesShort[index]}</span>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-7 gap-0" aria-hidden>
          {Array.from({ length: 42 }).map((_, i) => (
            <div key={i} className="aspect-square xpx-concierge-calendar-placeholder" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-0">
          {calendarDays.map((day, index) => {
            const isDisabled = !day.isAvailable || !day.isCurrentMonth;
            const isSelected = day.isSelected;
            const isInRange = day.isInRange && !day.isSelected;
            const showPrice =
              day.isCurrentMonth &&
              day.isAvailable &&
              (isSelected || isInRange);

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleDateClick(day)}
                disabled={isDisabled}
                className={[
                  'xpx-concierge-calendar-cell touch-manipulation',
                  day.isToday && !isSelected ? 'xpx-concierge-calendar-cell--today' : '',
                  isSelected ? 'xpx-concierge-calendar-cell--selected' : '',
                  isInRange ? 'xpx-concierge-calendar-cell--range' : '',
                  !day.isCurrentMonth || !day.isAvailable ? 'opacity-35' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="flex h-full flex-col items-center justify-center gap-1">
                  <span className="text-[15px] font-normal leading-none">{day.date.getDate()}</span>
                  {showPrice && (
                    <span className="xpx-concierge-calendar-price-whisper">
                      ₹{day.price > 999 ? `${Math.round(day.price / 1000)}k` : day.price}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {(checkInDate || checkOutDate) && (
        <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--lux-divider)' }}>
          <dl className="xpx-concierge-folio space-y-2">
            {checkInDate && (
              <div className="xpx-concierge-folio-row">
                <dt>Arrival</dt>
                <dd className="tabular-nums" style={{ color: 'var(--lux-ink)' }}>
                  {checkInDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </dd>
              </div>
            )}
            {checkOutDate && (
              <div className="xpx-concierge-folio-row">
                <dt>Departure</dt>
                <dd className="tabular-nums" style={{ color: 'var(--lux-ink)' }}>
                  {checkOutDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </dd>
              </div>
            )}
            {checkInDate && checkOutDate && (
              <div className="xpx-concierge-folio-total">
                <dt>
                  {getTotalNights()} night{getTotalNights() > 1 ? 's' : ''}
                </dt>
                <dd>₹{getTotalPrice().toLocaleString()}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
