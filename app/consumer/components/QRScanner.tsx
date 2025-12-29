// app/consumer/components/QRScanner.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

export function QRScanner({
  onDetected,
}: {
  onDetected: (value: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let animationId: number;
    let stream: MediaStream | null = null;
    let stopped = false;

    async function start() {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        stream = media;
        if (videoRef.current) {
          videoRef.current.srcObject = media;
          await videoRef.current.play();
          setActive(true);
          tick();
        }
      } catch (e) {
        console.error(e);
        setPermissionError("Camera access blocked. Enter the code instead.");
      }
    }

    function tick() {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        animationId = requestAnimationFrame(tick);
        return;
      }

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) {
        animationId = requestAnimationFrame(tick);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        animationId = requestAnimationFrame(tick);
        return;
      }

      const size = Math.min(w, h);
      const sx = (w - size) / 2;
      const sy = (h - size) / 2;

      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

      const imageData = ctx.getImageData(0, 0, size, size);
      const qr = jsQR(imageData.data, size, size);

      if (qr && qr.data) {
        onDetected(qr.data);
        stopped = true;
        setTimeout(() => {
          stopped = false;
          animationId = requestAnimationFrame(tick);
        }, 1500);
      } else {
        animationId = requestAnimationFrame(tick);
      }
    }

    if (typeof navigator !== "undefined" && navigator.mediaDevices) {
      start();
    } else {
      setPermissionError("Camera not available in this browser.");
    }

    return () => {
      stopped = true;
      if (animationId) cancelAnimationFrame(animationId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [onDetected]);

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <div className="relative w-64 h-64 max-w-full rounded-3xl overflow-hidden bg-black/60 ring-2 ring-emerald-400/60 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="absolute inset-0 opacity-0" />

        <div className="absolute inset-3 pointer-events-none">
          <div className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-emerald-400 rounded-tl-xl" />
          <div className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-emerald-400 rounded-tr-xl" />
          <div className="absolute left-0 bottom-0 h-6 w-6 border-l-2 border-b-2 border-emerald-400 rounded-bl-xl" />
          <div className="absolute right-0 bottom-0 h-6 w-6 border-r-2 border-b-2 border-emerald-400 rounded-br-xl" />
        </div>
      </div>

      {permissionError ? (
        <p className="text-[11px] text-red-300 text-center">{permissionError}</p>
      ) : (
        <p className="text-[11px] text-white/60 text-center">
          {active ? "Align the QR code inside the square." : "Starting camera…"}
        </p>
      )}
    </div>
  );
}
