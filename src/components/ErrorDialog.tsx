import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type ErrorDialogRef = {
  open: (message: string) => void;
};

export const ErrorDialog = forwardRef<ErrorDialogRef>((_, ref) => {
  const opener = useRef<HTMLElement | null>(null);
  const parentDialog = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  useImperativeHandle(ref, () => ({
    open(msg: string) {
      if (!open) {
        opener.current = document.activeElement as HTMLElement | null;
        parentDialog.current = opener.current?.closest<HTMLElement>('[role="dialog"]') ?? Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).at(-1) ?? null;
      }
      setMessage(msg);
      setOpen(true);
    },
  }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm" onCloseAutoFocus={(event) => {
        event.preventDefault();
        setTimeout(() => {
          const parent = parentDialog.current?.isConnected && parentDialog.current.getAttribute('data-state') !== 'closed' ? parentDialog.current
            : Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).filter((dialog) => dialog.getAttribute('data-state') !== 'closed').at(-1);
          const trigger = opener.current;
          const target = trigger?.isConnected && trigger !== document.body && trigger.getAttribute('role') !== 'dialog' && !trigger.matches(':disabled') ? trigger
            : parent?.isConnected ? parent.querySelector<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]') ?? parent : null;
          target?.focus();
        }, 0);
      }}>
        <DialogHeader>
          <DialogTitle className="text-red-600">Error</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
