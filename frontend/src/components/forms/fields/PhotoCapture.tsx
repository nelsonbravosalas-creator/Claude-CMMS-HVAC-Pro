import { useRef, useState } from 'react';

interface Props {
  value: string; // JPEG dataURL or ''
  onChange: (value: string) => void;
  disabled?: boolean;
}

const MAX_WIDTH = 1280;
const JPEG_QUALITY = 0.75;

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function PhotoCapture({ value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const dataUrl = await compressImage(file);
      onChange(dataUrl);
    } catch {
      // silently fail — field stays empty
    } finally {
      setIsProcessing(false);
      // Reset input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = () => onChange('');

  if (value) {
    return (
      <div className="space-y-2">
        <div className="relative rounded-lg overflow-hidden border border-[var(--color-border)]">
          <img
            src={value}
            alt="Foto capturada"
            className="w-full max-h-48 object-cover"
          />
        </div>
        {!disabled && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-xs text-[var(--color-primary)] hover:underline"
            >
              Cambiar foto
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="text-xs text-[var(--color-error)] hover:underline"
            >
              Eliminar
            </button>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => !disabled && inputRef.current?.click()}
        disabled={disabled || isProcessing}
        className={[
          'w-full h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1',
          'transition-colors',
          disabled
            ? 'opacity-50 cursor-not-allowed border-[var(--color-border)]'
            : 'cursor-pointer border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5',
        ].join(' ')}
      >
        {isProcessing ? (
          <span className="text-sm text-[var(--color-fg-muted)]">Procesando...</span>
        ) : (
          <>
            <svg className="w-6 h-6 text-[var(--color-fg-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs text-[var(--color-fg-muted)]">Tomar foto</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
