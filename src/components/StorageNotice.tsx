"use client";

import Link from "next/link";
import { CloudOff, CloudCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

/**
 * Says out loud where progress is being written.
 *
 * Signed out the app falls back to localStorage, which is fine — but silently
 * doing so makes a correctly-working database look broken, because nothing
 * ever appears in it.
 */
export default function StorageNotice({ className }: { className?: string }) {
  const { user, loading, configured } = useAuth();

  if (loading) return null;

  if (user) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border border-signal/25 bg-signal/8 px-3 py-2 text-xs text-secondary",
          className,
        )}
      >
        <CloudCheck className="size-3.5 shrink-0 text-signal" />
        Synced to your account — submissions, interviews and chats are saved to the database.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-secondary",
        className,
      )}
    >
      <CloudOff className="size-3.5 shrink-0 text-warn" />
      <span>
        <strong className="text-primary">Saving to this browser only.</strong> Nothing is being
        written to the database until you sign in — clear your cache and this is gone.
      </span>
      {configured && (
        <Link href="/login?next=%2Fdashboard" className="font-medium text-signal hover:underline">
          Sign in to sync →
        </Link>
      )}
    </div>
  );
}
