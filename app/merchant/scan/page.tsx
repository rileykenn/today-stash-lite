/* app/merchant/scan/page.tsx */
/* eslint-disable @next/next/no-img-element */
'use client';

import React from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';

const supabase = getSupabaseClient();

type ScanState =
  | { kind: 'ready' }
  | { kind: 'opening' }
  | { kind: 'scanning' }
  | { kind: 'detected'; raw: string }
  | { kind: 'redeeming'; raw: string }
  | { kind: 'success'; message: string; details?: { offer_title?: string; manual_code?: string } }
  | { kind: 'error'; message: string; detail?: string; raw?: string };

export default function MerchantScanPage() {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const rafRef = React.useRef<number>(0);

  const [supported, setSupported] = React.useState<boolean | null>(null);
  const [state, setState] = React.useState<ScanState>({ kind: 'ready' });
  const [manual, setManual] = React.useState('');

  const stopStream = React.useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }
  }, []);
  React.useEffect(() => () => stopStream(), [stopStream]);

  async function openCamera() {
    try {
      if (!('mediaDevices' in navigator) || !navigator.mediaDevices?.getUserMedia) {
        setState({
          kind: 'error',
          message: 'Camera API not available',
          detail: 'No mediaDevices.getUserMedia detected — use Safari or Chrome on a secure site (https).',
        });
        return;
      }
      if (!window.isSecureContext) {
        setState({
          kind: 'error',
          message: 'Insecure context',
          detail: 'Camera access requires HTTPS or localhost.',
        });
        return;
      }

      setState({ kind: 'opening' });

      let hasDetector = false;
      try {
        // @ts-ignore
        hasDetector = 'BarcodeDetector' in window && (await (window as any).BarcodeDetector.getSupportedFormats?.())?.includes('qr_code');
      } catch {
        hasDetector = false;
      }
      setSupported(hasDetector);

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (err) {
        console.warn('Camera fallback triggered:', err);
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      if (!stream) {
        setState({
          kind: 'error',
          message: 'Camera unavailable',
          detail: 'Could not start camera — ensure you granted permission.',
        });
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        const v = videoRef.current;
        v.srcObject = stream;
        v.setAttribute('playsinline', 'true');
        v.setAttribute('muted', 'true');
        await v.play();
      }

      if (hasDetector) {
        // @ts-ignore
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        setState({ kind: 'scanning' });

        const tick = async () => {
          try {
            if (!videoRef.current) return;
            const codes = await detector.detect(videoRef.current);
            const raw = codes?.[0]?.rawValue;
            if (raw) {
              setState({ kind: 'detected', raw });
              return;
            }
            rafRef.current = requestAnimationFrame(tick);
          } catch {
            rafRef.current = requestAnimationFrame(tick);
          }
        };
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setState({ kind: 'scanning' });
      }
    } catch (e: any) {
      setState({
        kind: 'error',
        message: 'Camera unavailable',
        detail: e?.message || 'Unknown',
      });
    }
  }

  async function redeem(raw: string) {
    try {
      setState({ kind: 'redeeming', raw });

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id ?? null;
      let merchantId: string | null = null;

      // ✅ FIXED: check profiles table instead of merchant_staff
      if (uid) {
        const { data: profile, error: profErr } = await supabase
          .from('profiles')
          .select('merchant_id')
          .eq('user_id', uid)
          .maybeSingle();
        if (profErr) throw profErr;
        merchantId = profile?.merchant_id ?? null;
      }

      if (!merchantId) {
        setState({
          kind: 'error',
          message: 'No merchant link',
          detail: 'Your account is not linked to a merchant. Contact admin.',
        });
        return;
      }

      const candidate = raw.trim();
      const maybeCode = candidate.toUpperCase();
      const isManualCode = /^[A-Z0-9]{5}$/.test(maybeCode);

      let args: any;
      if (isManualCode) {
        args = { p_code: maybeCode, p_token: null, p_merchant_id: merchantId };
      } else {
        let token = candidate;
        try {
          const parsed = JSON.parse(candidate);
          token = parsed?.token ?? candidate;
        } catch {}
        args = { p_token: token, p_code: null, p_merchant_id: merchantId };
      }

      const { data, error } = await supabase.rpc('redeem_qr', args);
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      stopStream();
      setState({
        kind: 'success',
        message: row?.message ?? 'Redemption successful',
        details: { offer_title: row?.offer_title, manual_code: row?.manual_code },
      });
    } catch (e: any) {
      setState({
        kind: 'error',
        message: 'Redeem failed',
        detail: e?.message || 'Unknown error',
        raw,
      });
    }
  }

  return (
    <main className="relative min-h-[100dvh] bg-[#0A0F13] text-white pb-24">
      <section className="mx-auto max-w-md px-4 py-6 space-y-4">
        <h1 className="text-xl font-bold">Scan customer QR</h1>
        <p className="text-sm text-white/70">
          Tap “Start camera” and point at the QR. Or enter the customer’s 5-letter manual code.
        </p>

        <div className="rounded-2xl overflow-hidden ring-1 ring-white/10 bg-black">
          <video
            ref={videoRef}
            className="block w-full h-[320px] object-cover bg-black"
            playsInline
            muted
            autoPlay
          />
        </div>

        {state.kind === 'ready' ? (
          <button
            onClick={openCamera}
            className="h-12 w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 font-semibold"
          >
            Start camera
          </button>
        ) : state.kind === 'opening' ? (
          <p className="text-white/70">Opening camera…</p>
        ) : state.kind === 'scanning' && supported === false ? (
          <p className="text-amber-300">
            Live QR detection not supported on this browser. Use the manual code below.
          </p>
        ) : null}

        {state.kind === 'detected' && (
          <div className="space-y-2">
            <p className="text-emerald-400 font-medium">QR detected</p>
            <button
              onClick={() => redeem(state.raw)}
              className="h-11 w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 font-semibold"
            >
              Redeem
            </button>
            <p className="text-xs text-white/50 break-all">{state.raw}</p>
          </div>
        )}

        {state.kind === 'success' && (
          <div className="rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30 p-3 space-y-1">
            <p className="text-emerald-400 font-semibold">{state.message}</p>
            {state.details?.offer_title && (
              <p className="text-xs text-white/70">Offer: {state.details.offer_title}</p>
            )}
            {state.details?.manual_code && (
              <p className="text-xs text-white/40">Code: {state.details.manual_code}</p>
            )}
          </div>
        )}
        {state.kind === 'error' && (
          <div className="rounded-xl bg-red-500/10 ring-1 ring-red-500/30 p-3">
            <p className="text-red-300 font-semibold">{state.message}</p>
            {state.detail && <p className="text-xs text-white/60 mt-1 break-words">{state.detail}</p>}
            {state.raw && <p className="text-xs text-white/40 mt-1 break-all">Input: {state.raw}</p>}
            <div className="flex gap-2 mt-3">
              <button onClick={openCamera} className="h-10 px-4 rounded-lg bg-white/10 hover:bg-white/15">
                Try camera again
              </button>
              <button onClick={stopStream} className="h-10 px-4 rounded-lg bg-white/10 hover:bg-white/15">
                Stop camera
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2 pt-2">
          <label className="text-sm text-white/80">Manual code</label>
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value.toUpperCase().slice(0, 5))}
            maxLength={5}
            placeholder="ABCDE"
            className="w-full h-11 rounded-xl bg-white/5 ring-1 ring-white/10 px-3 tracking-[0.35em] text-center text-lg"
          />
          <button
            disabled={manual.trim().length !== 5}
            onClick={() => redeem(manual.trim().toUpperCase())}
            className="h-11 w-full rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-50"
          >
            Redeem manually
          </button>

          <p className="text-xs text-white/40">
            Tip: You can also paste a raw token or a JSON like <code>{'{"token":"..."}'}</code> above — we’ll detect it.
          </p>
        </div>
      </section>
    </main>
  );
}
