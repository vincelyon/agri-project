"use client";

import Link from "next/link";
import { useState } from "react";

/** One-time display of an auto-generated temporary password. */
export function TempPasswordReveal({
  email,
  temporaryPassword,
  title = "Temporary password",
  doneHref = "/users",
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-700">
        <strong>{title}.</strong> Share this password with <strong>{email}</strong> now — it will not
        be shown again. They must change it at first sign-in.
      </p>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
        <code className="flex-1 break-all font-mono text-base font-semibold text-ink">{temporaryPassword}</code>
        <button type="button" className="btn btn-secondary btn-sm" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <Link href={doneHref} className="btn btn-primary">
        Done
      </Link>
    </div>
  );
}
