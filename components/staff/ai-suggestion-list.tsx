"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

function splitSuggestionLabel(text: string) {
  const firstColon = text.indexOf(":");
  if (firstColon > 0) {
    return {
      label: text.slice(0, firstColon).trim(),
      body: text.slice(firstColon + 1).trim(),
    };
  }
  return { label: "Outreach message", body: text };
}

export function AiSuggestionList({
  requestId,
  suggestions,
}: {
  requestId: number;
  suggestions: string[];
}) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  async function copySuggestion(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      window.setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      setCopiedIndex(null);
    }
  }

  return (
    <div className="space-y-2">
      {suggestions.map((suggestion, index) => {
        const parsed = splitSuggestionLabel(suggestion);
        const isCopied = copiedIndex === index;
        return (
          <div key={`${requestId}-suggestion-${index}`} className="rounded-md border bg-background p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
              {parsed.label}
            </p>
            <p className="text-sm text-foreground/90">{parsed.body}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => copySuggestion(parsed.body, index)}
              >
                {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {isCopied ? "Copied" : "Copy message"}
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link href={`/staff/alerts?request=${requestId}`}>
                  <Send className="h-3.5 w-3.5" />
                  Use in alerts
                </Link>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
