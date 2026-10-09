'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

/** Inline value with a copy button (VIN, stock #). */
export function CopyValue({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono tracking-tight">{value}</span>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 grid size-7 place-items-center rounded-md outline-none focus-visible:ring-[3px]"
        aria-label={copied ? `${label} copied` : `Copy ${label}`}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </span>
  );
}
