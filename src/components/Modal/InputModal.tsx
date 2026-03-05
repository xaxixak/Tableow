import { useState, useEffect, useRef } from "react";
import { Modal } from "./Modal";
import { cn } from "../../lib/utils.ts";

interface InputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: string;
  placeholder?: string;
  defaultValue?: string;
  submitText?: string;
  cancelText?: string;
}

export function InputModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  placeholder = "",
  defaultValue = "",
  submitText = "OK",
  cancelText = "Cancel",
}: InputModalProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset value when modal opens
  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      // Focus input after modal renders
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, defaultValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) {
      onSubmit(trimmed);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full px-3 py-2 rounded-md border text-sm",
            "bg-white dark:bg-zinc-800",
            "border-slate-300 dark:border-zinc-600",
            "text-slate-900 dark:text-slate-100",
            "placeholder:text-slate-400 dark:placeholder:text-slate-500",
            "focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          )}
        />

        <div className="flex gap-2 mt-4 justify-end">
          <button
            type="button"
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
            type="submit"
            disabled={!value.trim()}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              "bg-blue-600 dark:bg-blue-600",
              "text-white",
              "hover:bg-blue-700 dark:hover:bg-blue-500",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {submitText}
          </button>
        </div>
      </form>
    </Modal>
  );
}
