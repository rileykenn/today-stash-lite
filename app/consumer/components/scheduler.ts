export function getNextRecurringSlot(schedule: any[], now: Date): { start: Date, end: Date } | null {
    if (!schedule || !Array.isArray(schedule) || schedule.length === 0) return null;

    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

    // Try to find a slot in the next 7 days
    for (let i = 0; i <= 7; i++) {
        const checkDate = new Date(now);
        checkDate.setDate(now.getDate() + i);
        const dayName = days[checkDate.getDay()];

        const rule = schedule.find((s: any) => s.day?.toLowerCase() === dayName);

        if (rule && rule.start && rule.end) {
            const [sH, sM] = rule.start.split(':').map(Number);
            const [eH, eM] = rule.end.split(':').map(Number);

            const slotStart = new Date(checkDate);
            slotStart.setHours(sH, sM, 0, 0);

            const slotEnd = new Date(checkDate);
            slotEnd.setHours(eH, eM, 0, 0);

            // Handle overnight: if end time is before start time, it ends the next day
            if (slotEnd <= slotStart) {
                slotEnd.setDate(slotEnd.getDate() + 1);
            }

            // If looking at today (i=0), only return if start is in future
            if (slotStart > now) {
                return { start: slotStart, end: slotEnd };
            }
        }
    }

    return null;
}
