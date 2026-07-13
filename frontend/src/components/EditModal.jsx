import { useEffect, useRef, useState } from 'react';

const ANIMATION_DURATION_MS = 240;

export default function EditModal({ open, title, onClose, onSave, children, saveLabel = 'Enregistrer' }) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  useEffect(() => {
    let timeoutId;

    if (open) {
      previousActiveElementRef.current = document.activeElement;
      setMounted(true);
      requestAnimationFrame(() => setClosing(false));
    } else if (mounted) {
      setClosing(true);
      timeoutId = window.setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, ANIMATION_DURATION_MS);
    }

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [mounted, open]);

  useEffect(() => {
    if (!mounted || closing) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimeout = window.setTimeout(() => {
      const firstField = panelRef.current?.querySelector(
        'input:not([type="hidden"]), select, textarea, button:not([type="button"])'
      );

      if (firstField) {
        firstField.focus();
      }
    }, 0);

    return () => {
      window.clearTimeout(focusTimeout);
      document.body.style.overflow = originalOverflow;
    };
  }, [closing, mounted]);

  useEffect(() => {
    if (!mounted || closing) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key !== 'Tab') {
        return;
      }

      const panel = panelRef.current;
      if (!panel) {
        return;
      }

      const focusableElements = Array.from(
        panel.querySelectorAll(
          'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute('aria-hidden'));

      if (focusableElements.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === firstFocusable || activeElement === panel) {
          event.preventDefault();
          lastFocusable.focus();
        }
      } else if (activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closing, mounted]);

  useEffect(() => {
    if (mounted || !previousActiveElementRef.current) {
      return undefined;
    }

    const previousActiveElement = previousActiveElementRef.current;
    previousActiveElementRef.current = null;

    if (typeof previousActiveElement.focus === 'function') {
      previousActiveElement.focus();
    }

    return undefined;
  }, [mounted]);

  if (!mounted) {
    return null;
  }

  const panelClassName = closing ? 'modal-panel modal-panel--closing' : 'modal-panel modal-panel--open';

  return (
    <div className={closing ? 'modal-backdrop modal-backdrop--closing' : 'modal-backdrop modal-backdrop--open'} role="presentation" onClick={onClose}>
      <aside ref={panelRef} className={panelClassName} role="dialog" aria-modal="true" aria-labelledby="edit-modal-title" tabIndex="-1" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-kicker">Édition</p>
            <h3 id="edit-modal-title">{title}</h3>
          </div>
          <button type="button" className="secondary-btn" onClick={onClose}>
            Fermer
          </button>
        </div>

        <div className="modal-body">{children}</div>

        <div className="modal-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="primary-btn" onClick={onSave}>
            {saveLabel}
          </button>
        </div>
      </aside>
    </div>
  );
}
