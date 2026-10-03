import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeScannerState } from 'html5-qrcode';
import { Camera, X, AlertCircle, ScanLine, RefreshCw, CheckCircle2 } from 'lucide-react';

interface BarcodeCameraScannerProps {
  onDetected: (decodedText: string) => void;
  onClose: () => void;
}

const SCANNER_ELEMENT_ID = 'pantry-pay-barcode-reader';

export const BarcodeCameraScanner: React.FC<BarcodeCameraScannerProps> = ({ onDetected, onClose }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasDetectedRef = useRef(false);
  const startedRef = useRef(false);
  const [starting, setStarting] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastDetected, setLastDetected] = useState<string | null>(null);

  // Safely stops & clears the scanner without ever throwing synchronously.
  const safeTeardown = (scanner: Html5Qrcode | null) => {
    if (!scanner) return;
    try {
      const state = scanner.getState();
      if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
        scanner
          .stop()
          .then(() => {
            try { scanner.clear(); } catch { /* ignore */ }
          })
          .catch(() => { /* ignore */ });
      } else {
        try { scanner.clear(); } catch { /* ignore */ }
      }
    } catch {
      /* getState/stop may throw synchronously if never started — ignore */
    }
  };

  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      if (startedRef.current) return;
      startedRef.current = true;
      try {
        const html5Qrcode = new Html5Qrcode(SCANNER_ELEMENT_ID, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.CODABAR,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });
        scannerRef.current = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 260, height: 160 },
            aspectRatio: 1.6,
          },
          (decodedText) => {
            if (hasDetectedRef.current) return;
            hasDetectedRef.current = true;
            setLastDetected(decodedText);
            if (navigator.vibrate) navigator.vibrate(120);
            setTimeout(() => {
              onDetected(decodedText);
            }, 400);
          },
          () => {
            // Per-frame decode failure is normal; ignore.
          }
        );

        if (isMounted) {
          setStarting(false);
        } else {
          // Component unmounted during async start — tear down immediately.
          safeTeardown(html5Qrcode);
        }
      } catch (err: any) {
        console.warn('[BarcodeCameraScanner] Camera start note:', err);
        if (isMounted) {
          setStarting(false);
          setCameraError(
            err?.message?.includes('Permission') || err?.name === 'NotAllowedError'
              ? 'Camera permission denied. Please allow camera access in your browser settings and try again.'
              : 'Unable to access camera. Ensure a camera is available and not used by another app. You can type the barcode manually instead.'
          );
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      safeTeardown(scannerRef.current);
      scannerRef.current = null;
    };
  }, [onDetected]);

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
      data-testid="barcode-scanner-overlay"
    >
      <div className="bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="bg-slate-800 px-5 py-4 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Live Barcode Scanner</h3>
              <p className="text-[10px] text-slate-400">Point your camera at the product barcode</p>
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="barcode-scanner-close-button"
            className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera viewport */}
        <div className="relative bg-black aspect-[1.6] w-full overflow-hidden">
          <div id={SCANNER_ELEMENT_ID} className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />

          {/* Scan frame overlay */}
          {!cameraError && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative w-[260px] h-[160px] border-2 border-emerald-400/80 rounded-xl">
                <div className="absolute -top-px -left-px w-6 h-6 border-t-4 border-l-4 border-emerald-300 rounded-tl-xl" />
                <div className="absolute -top-px -right-px w-6 h-6 border-t-4 border-r-4 border-emerald-300 rounded-tr-xl" />
                <div className="absolute -bottom-px -left-px w-6 h-6 border-b-4 border-l-4 border-emerald-300 rounded-bl-xl" />
                <div className="absolute -bottom-px -right-px w-6 h-6 border-b-4 border-r-4 border-emerald-300 rounded-br-xl" />
                {!lastDetected && (
                  <div className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_12px_2px_rgba(16,185,129,0.8)] animate-scanline" />
                )}
              </div>
            </div>
          )}

          {starting && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-emerald-300">
              <RefreshCw className="w-8 h-8 animate-spin" />
              <span className="text-xs font-bold">Starting camera…</span>
            </div>
          )}

          {lastDetected && (
            <div className="absolute inset-0 bg-emerald-600/30 flex flex-col items-center justify-center gap-2 text-white animate-fadeIn">
              <CheckCircle2 className="w-12 h-12 text-emerald-300" />
              <span className="text-xs font-black font-mono bg-slate-900/70 px-3 py-1 rounded-lg">{lastDetected}</span>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertCircle className="w-10 h-10 text-rose-400" />
              <p className="text-xs text-rose-200 font-medium max-w-xs">{cameraError}</p>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-3 bg-slate-800 border-t border-slate-700 flex items-center gap-2 text-[11px] text-slate-400">
          <ScanLine className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Only items present in your home pantry stock will be accepted after scanning.</span>
        </div>
      </div>
    </div>
  );
};
