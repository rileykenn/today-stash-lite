import React, { useState, useEffect } from 'react';

export function TimePicker({ value, onChange }: { value: string, onChange: (val: string) => void }) {
    // Parse 24h "HH:MM" -> 12h parts
    const parseTime = (v: string) => {
        if (!v) return { h: '', m: '', p: 'AM' };
        const [hStr, mStr] = v.split(':');
        let h = parseInt(hStr);
        const p = h >= 12 ? 'PM' : 'AM';
        if (h > 12) h -= 12;
        if (h === 0) h = 12;
        return { h: h.toString(), m: mStr, p };
    };

    const [parts, setParts] = useState(parseTime(value));

    // Update internal state when external value changes
    useEffect(() => {
        setParts(parseTime(value));
    }, [value]);

    const handleChange = (field: 'h' | 'm', val: string) => {
        // Numeric only
        if (!/^\d*$/.test(val)) return;

        // Limits
        let num = /*parseInt(val)*/ val; // keep string for typing

        // Update parts
        const newParts = { ...parts, [field]: val };
        setParts(newParts);

        // Calculate and emit 24h string
        emitChange(newParts);
    };

    const togglePeriod = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent form submission
        const newParts = { ...parts, p: parts.p === 'AM' ? 'PM' : 'AM' };
        setParts(newParts);
        emitChange(newParts);
    };

    const emitChange = (p: { h: string, m: string, p: string }) => {
        if (!p.h || !p.m) return; // Don't emit incomplete times? Or emit what we can?

        let h = parseInt(p.h);
        const m = parseInt(p.m || '0');

        if (isNaN(h)) return;

        // Convert to 24h
        if (p.p === 'PM' && h < 12) h += 12;
        if (p.p === 'AM' && h === 12) h = 0;

        const hStr = h.toString().padStart(2, '0');
        const mStr = m.toString().padStart(2, '0');

        onChange(`${hStr}:${mStr}`);
    };

    // Auto-formatting on blur (rounding minutes, clamping hours) to be nice
    const handleBlur = () => {
        let h = parseInt(parts.h || '12');
        let m = parseInt(parts.m || '00');

        if (h < 1) h = 1;
        if (h > 12) h = 12;
        if (m < 0) m = 0;
        if (m > 59) m = 59;

        const p = { ...parts, h: h.toString(), m: m.toString().padStart(2, '0') };
        setParts(p);
        emitChange(p);
    };

    return (
        <div className="flex items-center gap-1 bg-[#111821] border border-white/10 rounded-lg px-2 py-1.5 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all w-fit">
            <input
                type="text"
                value={parts.h}
                onChange={(e) => handleChange('h', e.target.value)}
                onBlur={handleBlur}
                className="w-7 bg-transparent text-center text-sm text-white focus:outline-none placeholder-white/20"
                placeholder="12"
                maxLength={2}
            />
            <span className="text-white/40 text-xs">:</span>
            <input
                type="text"
                value={parts.m}
                onChange={(e) => handleChange('m', e.target.value)}
                onBlur={handleBlur}
                className="w-7 bg-transparent text-center text-sm text-white focus:outline-none placeholder-white/20"
                placeholder="00"
                maxLength={2}
            />
            <button
                type="button"
                onClick={togglePeriod}
                className="ml-1 px-1.5 py-0.5 rounded hover:bg-white/10 text-[10px] font-bold text-emerald-400 uppercase tracking-widest transition-colors"
            >
                {parts.p}
            </button>
        </div>
    );
}
