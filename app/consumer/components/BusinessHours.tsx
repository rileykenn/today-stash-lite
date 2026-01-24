import React from 'react';

type DaySchedule = {
    isOpen: boolean;
    open: string;
    close: string;
};

type WeeklyHours = {
    [key: string]: DaySchedule;
};

const DAYS_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export function BusinessHours({ hours }: { hours: WeeklyHours }) {
    if (!hours) return null;

    const getToday = () => {
        const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        return days[new Date().getDay()];
    };

    const today = getToday();

    return (
        <div className="space-y-2 text-sm">
            {DAYS_ORDER.map(day => {
                const sched = hours[day];
                const isToday = day === today;
                return (
                    <div key={day} className={`flex justify-between ${isToday ? "font-bold text-gray-900" : "text-gray-500"}`}>
                        <span className="capitalize w-24">{day}</span>
                        <span>
                            {sched?.isOpen
                                ? `${formatTime(sched.open)} - ${formatTime(sched.close)}`
                                : "Closed"}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function formatTime(time: string) {
    if (!time) return "";
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}
