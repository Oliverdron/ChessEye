// CS3483 addition: feedback elements for the record page.
// Feedback is scaled to the action: a small toast for a recorded move (minor), a banner with
// a beep and speech for starting / ending a game (major), a message box with cause and fix
// for problems, and a modal dialog only for the one action that cannot be undone.
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

export const HandshakeIcon = ({ size = 26 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--cc-info)" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 11l4-4 5 2 3-2 6 4" />
    <path d="M20 11l-5 5c-1 1-2 1-3 0l-4-4" />
    <path d="M2 11l5 5" />
    <path d="M11 9l-2 2c-.6.6-.6 1.4 0 2s1.4.6 2 0l2-2" />
  </svg>
);

export const Kbd = ({ children }: { children: ReactNode }) => <kbd className="cc-kbd">{children}</kbd>;

export interface BannerMessage {
  kind: "start" | "over",
  title: string,
  detail: string,
  id: number
}

export const Banner = ({ banner }: { banner: BannerMessage | null }) => (
  <div role="status" aria-live="polite">
    {banner !== null && (
      <div className={`cc-banner${banner.kind === "over" ? " cc-banner--over" : ""}`}>
        <i className={`bi ${banner.kind === "over" ? "bi-flag-fill" : "bi-record-circle"}`} aria-hidden="true" />
        <span className="d-flex flex-column">
          <span className="cc-banner__title">{banner.title}</span>
          <span className="cc-banner__detail">{banner.detail}</span>
        </span>
      </div>
    )}
  </div>
);

export const MoveToast = ({ label, words }: { label: string, words: string } ) => (
  <div className="cc-toast">
    <b>{label}</b>
    <span>{words}</span>
  </div>
);

export interface Problem {
  title: string,
  cause: string,
  fix: string,
  action?: { label: string, run: () => void }
}

export const MessageBox = ({ problem, onClose }: { problem: Problem, onClose: () => void }) => (
  <div className="cc-msg" role="alert">
    <span className="cc-msg__title"><i className="bi bi-exclamation-triangle" aria-hidden="true" />{problem.title}</span>
    <span className="cc-msg__part"><b>What happened</b>{problem.cause}</span>
    <span className="cc-msg__part"><b>How to fix it</b>{problem.fix}</span>
    <div className="cc-actions">
      {problem.action !== undefined && (
        <button type="button" className="cc-btn cc-btn--primary" onClick={problem.action.run}>
          {problem.action.label}
        </button>
      )}
      <button type="button" className="cc-btn" onClick={onClose}>Close</button>
    </div>
  </div>
);

// Modal: the rest of the page cannot be used until the user decides. The safe choice
// ("cancelLabel") has focus, so Enter or Escape never deletes anything.
export const ConfirmDialog = ({ title, body, confirmLabel, cancelLabel, onConfirm, onCancel }: {
  title: string,
  body: string,
  confirmLabel: string,
  cancelLabel: string,
  onConfirm: () => void,
  onCancel: () => void
}) => {
  const titleId = useId();
  const bodyId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => previous?.focus();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onCancel();
    } else if (e.key === "Tab") {
      // Keep focus inside the dialog
      const buttons = dialogRef.current?.querySelectorAll("button");
      if (buttons === undefined || buttons.length === 0) {
        return;
      }
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div className="cc-backdrop">
      <div ref={dialogRef} className="cc-dialog" role="alertdialog" aria-modal="true"
        aria-labelledby={titleId} aria-describedby={bodyId} onKeyDown={onKeyDown}>
        <h2 id={titleId}>{title}</h2>
        <p id={bodyId}>{body}</p>
        <div className="cc-dialog__buttons">
          <button type="button" className="cc-btn cc-btn--danger" onClick={onConfirm}>{confirmLabel}</button>
          <button ref={cancelRef} type="button" className="cc-btn cc-btn--primary" onClick={onCancel}>{cancelLabel}</button>
        </div>
      </div>
    </div>
  );
};
