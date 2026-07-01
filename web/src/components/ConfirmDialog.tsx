"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DialogShell } from "@/components/DialogShell";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ message: "" });
  const resolveRef = useRef<(value: boolean) => void>(() => {});

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const close = (result: boolean) => {
    setOpen(false);
    resolveRef.current(result);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {open && (
        <DialogShell
          onClose={() => close(false)}
          title={options.title ?? "Confirm"}
          role="alertdialog"
          ariaLabelledBy="confirm-title"
          ariaDescribedBy="confirm-message"
          footer={
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => close(false)}
              >
                {options.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={
                  options.destructive
                    ? { background: "var(--error)", boxShadow: "none" }
                    : undefined
                }
                onClick={() => close(true)}
              >
                {options.confirmLabel ?? "Confirm"}
              </button>
            </>
          }
        >
          <p
            id="confirm-message"
            style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.95rem" }}
          >
            {options.message}
          </p>
        </DialogShell>
      )}
    </ConfirmContext.Provider>
  );
}
