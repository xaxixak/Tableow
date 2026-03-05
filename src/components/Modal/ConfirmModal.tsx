import { Modal } from "./Modal";
import { cn } from "../../lib/utils.ts";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary";
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const confirmButtonClass =
    variant === "danger"
      ? "bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-500"
      : "bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        {message}
      </p>

      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-colors",
            "bg-slate-100 dark:bg-zinc-800",
            "text-slate-700 dark:text-slate-300",
            "hover:bg-slate-200 dark:hover:bg-zinc-700"
          )}
        >
          {cancelText}
        </button>
        <button
          onClick={handleConfirm}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium text-white transition-colors",
            confirmButtonClass
          )}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
