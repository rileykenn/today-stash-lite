"use client";

import React from "react";

interface CheckboxProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
}

/**
 * Custom emerald checkbox — replaces native browser checkboxes.
 * Uses a hidden input + styled span with SVG checkmark.
 */
export function Checkbox({ checked, onChange, disabled = false, className = "" }: CheckboxProps) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            className={`
        relative flex h-[18px] w-[18px] shrink-0 items-center justify-center
        rounded-[5px] border transition-all duration-150 cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0A0F13]
        ${checked
                    ? "bg-emerald-500 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.35)]"
                    : "bg-white/5 border-white/20 hover:border-white/40"
                }
        ${disabled ? "opacity-40 cursor-not-allowed" : ""}
        ${className}
      `}
        >
            {checked && (
                <svg
                    className="h-3 w-3 text-white"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M2.5 6L5 8.5L9.5 3.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )}
        </button>
    );
}
