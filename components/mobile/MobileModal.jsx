"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { X, ChevronLeft } from "lucide-react";

const MobileModal = ({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
  showBackButton = false,
  onBack,
  size = "full",
  position = "bottom",
  preventClose = false,
  className,
  contentClassName,
  overlayClassName,
}) => {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Handle escape key
  const handleEscape = useCallback((e) => {
    if (e.key === "Escape" && !preventClose) {
      onClose();
    }
  }, [onClose, preventClose]);

  // Handle focus management
  const handleFocusManagement = useCallback(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      modalRef.current?.focus();
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [isOpen]);

  // Handle body scroll lock
  const handleBodyScroll = useCallback(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }
  }, [isOpen]);

  // Handle overlay click
  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget && !preventClose) {
      onClose();
    }
  }, [onClose, preventClose]);

  // Setup event listeners
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      handleFocusManagement();
      handleBodyScroll();
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      handleBodyScroll();
    };
  }, [isOpen, handleEscape, handleFocusManagement, handleBodyScroll]);

  // Don't render if not open
  if (!isOpen) return null;

  // Size classes
  const sizeClasses = {
    full: "w-full h-full",
    sheet: "w-full max-w-md h-auto max-h-[90vh]",
    dialog: "w-[90vw] max-w-md h-auto max-h-[80vh]",
    small: "w-[80vw] max-w-sm h-auto max-h-[70vh]",
  };

  // Position classes
  const positionClasses = {
    center: "items-center justify-center",
    bottom: "items-end justify-center",
    top: "items-start justify-center",
  };

  const modalContent = (
    <div
      className={cn(
        "fixed inset-0 z-50 flex",
        positionClasses[position],
        overlayClassName
      )}
      onClick={handleOverlayClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className={cn(
          "relative bg-background border border-border shadow-xl",
          "focus:outline-none",
          "transform transition-all duration-300 ease-out",
          sizeClasses[size],
          position === "bottom" && "translate-y-0 animate-in slide-in-from-bottom",
          position === "top" && "translate-y-0 animate-in slide-in-from-top",
          position === "center" && "scale-100 animate-in zoom-in-95",
          contentClassName
        )}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
      >
        {/* Header */}
        {(title || showCloseButton || showBackButton) && (
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              {showBackButton && (
                <button
                  onClick={onBack || onClose}
                  className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  aria-label="Go back"
                >
                  <ChevronLeft className="h-5 w-5 text-foreground" />
                </button>
              )}
              {title && (
                <h2 id="modal-title" className="text-lg font-semibold text-foreground">
                  {title}
                </h2>
              )}
            </div>
            
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5 text-foreground" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {children}
        </div>

        {/* Handle for bottom sheet */}
        {position === "bottom" && size === "full" && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-muted-foreground/30 rounded-full" />
        )}
      </div>
    </div>
  );

  // Use portal for proper stacking
  return createPortal(modalContent, document.body);
};

// Specialized modal variants
export const MobileBottomSheet = ({
  isOpen,
  onClose,
  title,
  children,
  showHandle = true,
  maxHeight = "80vh",
  ...props
}) => {
  return (
    <MobileModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      position="bottom"
      size="full"
      {...props}
      contentClassName={cn(
        "rounded-t-3xl",
        showHandle && "pt-6",
        props.contentClassName
      )}
      overlayClassName={cn("items-end", props.overlayClassName)}
    >
      {/* Handle */}
      {showHandle && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-muted-foreground/30 rounded-full" />
      )}
      
      {/* Content */}
      <div className="h-full overflow-y-auto" style={{ maxHeight }}>
        {children}
      </div>
    </MobileModal>
  );
};

export const MobileDialog = ({
  isOpen,
  onClose,
  title,
  children,
  ...props
}) => {
  return (
    <MobileModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      position="center"
      size="dialog"
      {...props}
      contentClassName={cn(
        "rounded-2xl",
        props.contentClassName
      )}
    >
      {children}
    </MobileModal>
  );
};

export const MobileFullScreenModal = ({
  isOpen,
  onClose,
  title,
  children,
  showBackButton = true,
  ...props
}) => {
  return (
    <MobileModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      position="bottom"
      size="full"
      showBackButton={showBackButton}
      showCloseButton={false}
      {...props}
    >
      {children}
    </MobileModal>
  );
};

// Hook for modal management
export const useMobileModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [modalProps, setModalProps] = useState({});

  const openModal = useCallback((content, props = {}) => {
    setModalContent(content);
    setModalProps(props);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => {
      setModalContent(null);
      setModalProps({});
    }, 300); // Wait for close animation
  }, []);

  const ModalComponent = useCallback(() => {
    if (!modalContent) return null;
    
    return (
      <MobileModal
        isOpen={isOpen}
        onClose={closeModal}
        {...modalProps}
      >
        {modalContent}
      </MobileModal>
    );
  }, [isOpen, closeModal, modalContent, modalProps]);

  return {
    isOpen,
    openModal,
    closeModal,
    ModalComponent,
  };
};

export { MobileModal };