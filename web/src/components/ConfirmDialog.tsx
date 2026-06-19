"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

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
        <div className="dialog-overlay" onClick={() => close(false)}>
          <div
            className="dialog-sheet panel panel-pad"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
          >
            {options.title && (
              <h2
                id="confirm-title"
                className="settings-heading"
                style={{ marginBottom: 12 }}
              >
                {options.title}
              </h2>
            )}
            <p
              id="confirm-message"
              style={{ margin: 0, color: "var(--parchment-muted)", fontSize: "0.95rem" }}
            >
              {options.message}
            </p>
            <div className="dialog-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => close(false)}
              >
                {options.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                className={`btn ${options.destructive ? "btn-primary" : "btn-primary"}`}
                style={
                  options.destructive
                    ? { background: "var(--error)", boxShadow: "none" }
                    : undefined
                }
                onClick={() => close(true)}
              >
                {options.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
