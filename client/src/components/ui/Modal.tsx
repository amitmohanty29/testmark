import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-2xl',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-gov-sand-900/60 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />

        <div className={`relative transform overflow-hidden rounded bg-white text-left shadow-xl transition-all sm:my-8 w-full ${maxWidth} border border-[#d6cfbe]`}>
          {/* Header */}
          <div className="bg-[#f6f4ed] px-6 py-4 border-b border-[#e5dfd1] flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold font-serif text-[#006c51]">{title}</h3>
              {subtitle && <p className="text-xs text-gov-sand-600 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-gov-sand-500 hover:text-gov-sand-900 p-1.5 rounded hover:bg-gov-sand-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 max-h-[75vh] overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
