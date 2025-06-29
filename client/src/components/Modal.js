import { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, subtitle, children, showCloseButton = false }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showCloseButton) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, showCloseButton]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
          {subtitle && <p className="text-white/70">{subtitle}</p>}
          }
        </div>
        
        {children}
      </div>
    </div>
  );
}