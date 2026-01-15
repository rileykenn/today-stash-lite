import { getMerchantName } from "./helpers";

type WeeklyHours = {
    [key: string]: {
        isOpen: boolean;
        open: string;
        close: string;
    };
};

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export type MerchantStatus = {
    isOpen: boolean;
    nextOpenText: string | null; // e.g., "Opens Wednesday at 9:00 am" or null if unknown
    closesAt: string | null;     // e.g., "5:00 pm" or "12:00 am"
    isManualClose: boolean;
};

export function getMerchantStatus(merchant: any): MerchantStatus {
    const now = new Date(); // Browser time
    const todayIdx = now.getDay();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    // Default closed
    let isOpen = false;
    let nextOpenText = null;
    let closesAt = null;
    let isManualClose = false;

    if (!merchant || !merchant.operating_hours) {
        return { isOpen: false, nextOpenText: "Hours not set", closesAt: null, isManualClose: false };
    }

    const hours = merchant.operating_hours as WeeklyHours;

    // Helper to find schedule case-insensitively
    const findSched = (dName: string) => {
        const keys = Object.keys(hours);
        const key = keys.find(k => k.toLowerCase() === dName.toLowerCase());
        return key ? hours[key] : null;
    };

    // A. Check Previous Day Spillover (Overnight)
    const prevOnlyIdx = (todayIdx + 6) % 7;
    const prevDayName = DAYS[prevOnlyIdx];
    const prevSched = findSched(prevDayName);

    if (prevSched && prevSched.isOpen && prevSched.open && prevSched.close) {
        const [ph, pm] = prevSched.open.split(':').map(Number);
        const [ch, cm] = prevSched.close.split(':').map(Number);
        const prevOpenMins = ph * 60 + pm;
        const prevCloseMins = ch * 60 + cm;

        // Check if yesterday was an overnight shift
        if (prevCloseMins < prevOpenMins) {
            // We are in the [00:00...Close] part of that shift relative to TODAY
            if (currentMins < prevCloseMins) {
                isOpen = true;
                closesAt = formatTime(prevSched.close);
            }
        }
    }

    // B. Check Today's Shift
    if (!isOpen) {
        const todayName = DAYS[todayIdx];
        const todaySched = findSched(todayName);

        if (todaySched && todaySched.isOpen && todaySched.open && todaySched.close) {
            const [th, tm] = todaySched.open.split(':').map(Number);
            const [tch, tcm] = todaySched.close.split(':').map(Number);
            const todayOpenMins = th * 60 + tm;
            const todayCloseMins = tch * 60 + tcm;

            if (todayCloseMins < todayOpenMins) {
                // Overnight shift starting today (e.g. 21:00 - 05:00)
                // Open if we are past the start time
                if (currentMins >= todayOpenMins) {
                    isOpen = true;
                    closesAt = formatTime(todaySched.close);
                }
            } else {
                // Standard shift (e.g. 09:00 - 17:00)
                if (currentMins >= todayOpenMins && currentMins < todayCloseMins) {
                    isOpen = true;
                    closesAt = formatTime(todaySched.close);
                }
            }
        }
    }

    if (isOpen) {
        return { isOpen: true, nextOpenText: null, closesAt, isManualClose: false };
    }

    // 2. Find NEXT OPEN TIME
    // Iterate 0..6 days ahead (including today if we are before start)
    for (let offset = 0; offset < 7; offset++) {
        const targetIdx = (todayIdx + offset) % 7;
        const targetDayName = DAYS[targetIdx];
        const sched = findSched(targetDayName);

        if (sched && sched.isOpen && sched.open) {
            const [oh, om] = sched.open.split(':').map(Number);
            const openMins = oh * 60 + om;

            // If checking Today, must be in future
            if (offset === 0) {
                if (currentMins < openMins) {
                    // Opens later today
                    nextOpenText = `Opens today at ${formatTime(sched.open)}`;
                    break;
                }
            } else {
                // Future day
                const dName = offset === 1 ? "tomorrow" : targetDayName; // "tomorrow" or "monday"
                nextOpenText = `Opens ${dName} at ${formatTime(sched.open)}`;
                break;
            }
        }
    }

    if (!nextOpenText) {
        nextOpenText = "Closed temporarily";
    }

    return { isOpen: false, nextOpenText, closesAt: null, isManualClose: false };
}

function formatTime(timeStr: string): string {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 || 12;
    return `${h12}${m > 0 ? `:${m.toString().padStart(2, '0')}` : ''} ${ampm}`;
}
