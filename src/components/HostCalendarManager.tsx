import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Lock, Unlock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isAvailable: boolean;
  price: number;
  isToday: boolean;
  hasBooking: boolean;
  notes: string;
  calendarEntryId?: string;
}

interface HostCalendarManagerProps {
  propertyId: string;
  basePrice: number;
  onUpdateBasePrice?: (newPrice: number) => void;
}

export default function HostCalendarManager({ propertyId, basePrice }: HostCalendarManagerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<Map<string, { isAvailable: boolean; price: number; notes: string; id?: string }>>(new Map());
  const [bookings, setBookings] = useState<Map<string, boolean>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [showBulkEditor, setShowBulkEditor] = useState(false);
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkAvailable, setBulkAvailable] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    fetchCalendarData();
    fetchBookings();
  }, [propertyId, currentMonth]);

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
        .select('id, date, is_available, price_override, notes')
        .eq('property_id', propertyId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (error) throw error;

      const dataMap = new Map<string, { isAvailable: boolean; price: number; notes: string; id?: string }>();

      data?.forEach(entry => {
        dataMap.set(entry.date, {
          isAvailable: entry.is_available,
          price: entry.price_override || basePrice,
          notes: entry.notes || '',
          id: entry.id
        });
      });

      setCalendarData(dataMap);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const startDate = new Date(startOfMonth);
      startDate.setDate(startDate.getDate() - 7);

      const endDate = new Date(endOfMonth);
      endDate.setDate(endDate.getDate() + 7);

      const { data, error } = await supabase
        .from('bookings')
        .select('check_in_date, check_out_date, status')
        .eq('property_id', propertyId)
        .in('status', ['confirmed', 'completed'])
        .gte('check_in_date', startDate.toISOString().split('T')[0])
        .lte('check_out_date', endDate.toISOString().split('T')[0]);

      if (error) throw error;

      const bookingMap = new Map<string, boolean>();

      data?.forEach(booking => {
        // `check_out_date` is nullable in the schema (single-night/half-day
        // bookings don't always set it). Skip those: they only block their
        // check-in date, which the property_calendar entries already cover.
        if (!booking.check_out_date) return;

        const start = new Date(booking.check_in_date);
        const end = new Date(booking.check_out_date);
        const current = new Date(start);

        while (current < end) {
          bookingMap.set(current.toISOString().split('T')[0], true);
          current.setDate(current.getDate() + 1);
        }
      });

      setBookings(bookingMap);
    } catch (error) {
      console.error('Error fetching bookings:', error);
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
      const hasBooking = bookings.get(dateStr) || false;

      days.push({
        date,
        isCurrentMonth: false,
        isAvailable: calData?.isAvailable ?? true,
        price: calData?.price ?? basePrice,
        isToday: false,
        hasBooking,
        notes: calData?.notes || '',
        calendarEntryId: calData?.id
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const calData = calendarData.get(dateStr);
      const isToday = date.getTime() === today.getTime();
      const hasBooking = bookings.get(dateStr) || false;

      days.push({
        date,
        isCurrentMonth: true,
        isAvailable: calData?.isAvailable ?? true,
        price: calData?.price ?? basePrice,
        isToday,
        hasBooking,
        notes: calData?.notes || '',
        calendarEntryId: calData?.id
      });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      const dateStr = date.toISOString().split('T')[0];
      const calData = calendarData.get(dateStr);
      const hasBooking = bookings.get(dateStr) || false;

      days.push({
        date,
        isCurrentMonth: false,
        isAvailable: calData?.isAvailable ?? true,
        price: calData?.price ?? basePrice,
        isToday: false,
        hasBooking,
        notes: calData?.notes || '',
        calendarEntryId: calData?.id
      });
    }

    return days;
  };

  const handleDateClick = (day: CalendarDay) => {
    if (!day.isCurrentMonth || day.hasBooking) return;

    const dateStr = day.date.toISOString().split('T')[0];
    const newSelected = new Set(selectedDates);

    if (newSelected.has(dateStr)) {
      newSelected.delete(dateStr);
    } else {
      newSelected.add(dateStr);
    }

    setSelectedDates(newSelected);
  };

  const handleBulkUpdate = async () => {
    if (selectedDates.size === 0) return;

    setIsSaving(true);
    try {
      const updates = Array.from(selectedDates).map(dateStr => ({
        property_id: propertyId,
        date: dateStr,
        is_available: bulkAvailable,
        price_override: bulkPrice ? parseInt(bulkPrice) : null
      }));

      const { error } = await supabase
        .from('property_calendar')
        .upsert(updates, { onConflict: 'property_id,date' });

      if (error) throw error;

      setSelectedDates(new Set());
      setShowBulkEditor(false);
      setBulkPrice('');
      fetchCalendarData();
    } catch (error) {
      console.error('Error updating calendar:', error);
      alert('Failed to update calendar. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDateAvailability = async (day: CalendarDay) => {
    if (day.hasBooking) return;

    try {
      const dateStr = day.date.toISOString().split('T')[0];
      const newAvailability = !day.isAvailable;

      const { error } = await supabase
        .from('property_calendar')
        .upsert({
          property_id: propertyId,
          date: dateStr,
          is_available: newAvailability,
          price_override: day.price !== basePrice ? day.price : null
        }, { onConflict: 'property_id,date' });

      if (error) throw error;

      fetchCalendarData();
    } catch (error) {
      console.error('Error toggling availability:', error);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    setSelectedDates(new Set());
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    setSelectedDates(new Set());
  };

  const calendarDays = getCalendarDays();

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
    >
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-xpx-text"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-xpx-text">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>

        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-xpx-text"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {selectedDates.size > 0 && (
        <div
          className="mb-4 p-4 rounded-xl"
          style={{
            background:
              'linear-gradient(135deg, rgba(80,200,120,0.10) 0%, var(--xpx-surface-light) 100%)',
            border: '1px solid rgba(80,200,120,0.4)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-xpx-text">
              {selectedDates.size} date{selectedDates.size > 1 ? 's' : ''} selected
            </p>
            <button
              onClick={() => setSelectedDates(new Set())}
              className="text-sm hover:underline"
              style={{ color: 'var(--xpx-warm-dark)' }}
            >
              Clear selection
            </button>
          </div>

          {!showBulkEditor ? (
            <button
              onClick={() => setShowBulkEditor(true)}
              className="w-full py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{ background: 'var(--xpx-warm)', color: '#ffffff', boxShadow: '0 6px 18px rgba(80,200,120,0.3)' }}
            >
              Update Selected Dates
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs uppercase tracking-wide font-bold text-xpx-muted mb-2">
                  Availability
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBulkAvailable(true)}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold transition-colors"
                    style={
                      bulkAvailable
                        ? { background: 'rgba(80,200,120,0.14)', color: '#3dae68', border: '1px solid rgba(80,200,120,0.4)' }
                        : { background: '#FFFFFF', color: 'var(--xpx-muted)', border: '1px solid var(--xpx-border)' }
                    }
                  >
                    Available
                  </button>
                  <button
                    onClick={() => setBulkAvailable(false)}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold transition-colors"
                    style={
                      !bulkAvailable
                        ? { background: 'rgba(220,38,38,0.12)', color: '#B91C1C', border: '1px solid rgba(220,38,38,0.4)' }
                        : { background: '#FFFFFF', color: 'var(--xpx-muted)', border: '1px solid var(--xpx-border)' }
                    }
                  >
                    Blocked
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide font-bold text-xpx-muted mb-2">
                  Custom price (optional)
                </label>
                <input
                  type="number"
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value)}
                  placeholder={`Base price: ₹${basePrice}`}
                  className="xpx-input"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleBulkUpdate}
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                  style={{ background: 'var(--xpx-warm)', color: '#ffffff', boxShadow: '0 6px 18px rgba(80,200,120,0.3)' }}
                >
                  {isSaving ? 'Saving…' : 'Apply Changes'}
                </button>
                <button
                  onClick={() => setShowBulkEditor(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors text-xpx-text"
                  style={{ background: '#FFFFFF', border: '1px solid var(--xpx-border-strong)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-xpx-subtle py-2">
            {day}
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 42 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg" style={{ background: 'rgba(15,23,42,0.05)' }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const dateStr = day.date.toISOString().split('T')[0];
            const isSelected = selectedDates.has(dateStr);
            const isDisabled = !day.isCurrentMonth || day.hasBooking;
            const baseColor = day.isCurrentMonth ? 'text-xpx-text' : 'text-xpx-subtle';
            const todayRing = day.isToday ? 'ring-1 ring-[var(--xpx-warm)]' : '';
            const selectedBg = isSelected ? 'bg-[var(--xpx-warm)] text-white font-bold' : '';
            const bookedBg = day.hasBooking ? 'bg-amber-100 ring-1 ring-amber-400' : '';
            const blockedBg = !day.hasBooking && !day.isAvailable ? 'bg-red-50' : '';
            const hoverable =
              !isSelected && !day.hasBooking && day.isAvailable && day.isCurrentMonth
                ? 'hover:bg-slate-100'
                : '';
            const cursor = isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer';
            return (
              <div key={index} className="relative group">
                <button
                  onClick={() => handleDateClick(day)}
                  disabled={isDisabled}
                  className={`w-full aspect-square p-1 rounded-lg relative transition-all ${baseColor} ${todayRing} ${selectedBg} ${bookedBg} ${blockedBg} ${hoverable} ${cursor}`}
                >
                  <div className="flex flex-col items-center justify-center h-full gap-0.5">
                    <span className="text-sm font-medium">{day.date.getDate()}</span>
                    {day.isCurrentMonth && !day.hasBooking && (
                      <div className="flex items-center gap-0.5 text-xs">
                        {day.isAvailable ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                      </div>
                    )}
                    {day.isCurrentMonth && (
                      <span className={`text-[10px] ${isSelected ? 'text-white/90' : 'text-xpx-subtle'}`}>
                        ₹{day.price}
                      </span>
                    )}
                    {day.hasBooking && (
                      <span className="text-[10px] font-bold" style={{ color: '#B45309' }}>Booked</span>
                    )}
                  </div>
                </button>

                {day.isCurrentMonth && !day.hasBooking && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDateAvailability(day);
                    }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border-strong)', boxShadow: '0 2px 8px rgba(15,23,42,0.08)' }}
                    title={day.isAvailable ? 'Block date' : 'Unblock date'}
                  >
                    {day.isAvailable ? (
                      <Lock className="w-3 h-3" style={{ color: '#B91C1C' }} />
                    ) : (
                      <Unlock className="w-3 h-3" style={{ color: '#3dae68' }} />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 pt-6 xpx-divider">
        <div className="flex flex-wrap items-center gap-4 text-xs text-xpx-muted">
          <Legend color="var(--xpx-warm)" label="Selected" />
          <Legend color="rgba(251,191,36,0.5)" label="Booked" />
          <Legend color="rgba(220,38,38,0.18)" label="Blocked" />
          <Legend color="rgba(15,23,42,0.06)" label="Available" />
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}
