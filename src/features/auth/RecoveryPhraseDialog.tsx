import { Check, Copy, X } from "lucide-react";
import { useState } from "react";
import { Modal } from "../../components/Modal";

/** The account's recovery phrase: the one thing that brings this local-first
 *  account back on another device, shown plainly and once at a time. */
export function RecoveryPhraseDialog({
  open,
  phrase,
  onClose,
  title = "Your recovery phrase",
  intro = "Write this phrase down and keep it somewhere safe. It is the only way to sign in to this account on another device.",
}: {
  open: boolean;
  phrase: string;
  onClose(): void;
  title?: string;
  intro?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(phrase);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Selecting the phrase is still possible when the clipboard is not.
    }
  };

  return (
    <Modal open={open} label={title} onClose={onClose} className="recovery">
      <div className="recovery__head">
        <h2 className="recovery__title">{title}</h2>
        <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      <div className="recovery__body">
        <p className="recovery__lede">{intro}</p>
        <code className="recovery__phrase">{phrase}</code>
        <div className="recovery__actions">
          <button type="button" className="btn btn--outline" onClick={() => void copy()}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copied" : "Copy phrase"}
          </button>
          <button type="button" className="btn btn--primary" onClick={onClose}>I’ve saved it</button>
        </div>
        <p className="recovery__warning">Anyone with this phrase can read and edit your notebook. Don’t share it or keep it in an ordinary note.</p>
      </div>
    </Modal>
  );
}
