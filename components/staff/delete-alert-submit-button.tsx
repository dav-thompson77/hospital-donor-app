"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function DeleteAlertSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="sm"
      variant="destructive"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm("Delete this alert? This cannot be undone.")) {
          event.preventDefault();
        }
      }}
    >
      {pending ? "Deleting..." : "Delete"}
    </Button>
  );
}
