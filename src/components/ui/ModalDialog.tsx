import { Button } from '@/components/ui/Button';
import styles from './ModalDialog.module.css';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
  variant?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ModalDialog({
  open,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  showCancel = false,
  variant = 'primary',
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onCancel} role="presentation">
      <section
        className={styles.sheet}
        role={showCancel ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby="modal-dialog-title"
        aria-describedby="modal-dialog-message"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="modal-dialog-title" className={styles.title}>{title}</h3>
        <p id="modal-dialog-message" className={styles.message}>{message}</p>

        <div className="flex-row gap-md">
          {showCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              {cancelLabel}
            </Button>
          )}
          <Button type="button" variant={variant} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}