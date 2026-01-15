import React from "react";

interface LoadingProps {
    message?: string;
    size?: "sm" | "md" | "lg";
}

const sizeMap = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
};

export default function Loading({ message, size = "md" }: LoadingProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
                <img
                    src="/loader_60fps.webp"
                    alt="Loading..."
                    className={`${sizeMap[size]} object-contain`}
                />
                {message && (
                    <p className="text-white text-sm font-medium">{message}</p>
                )}
            </div>
        </div>
    );
}
