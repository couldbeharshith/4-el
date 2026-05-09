import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto px-5 py-3 rounded shadow-xl border font-bold text-sm flex items-center gap-3 min-w-[300px] ${
                toast.type === 'success' ? 'bg-[#1A1714] text-accent-green border-accent-green' :
                toast.type === 'error' ? 'bg-[#1A1714] text-accent-red border-accent-red' :
                'bg-[#1A1714] text-text-primary border-border'
              }`}
            >
              {toast.type === 'success' && <span className="w-2 h-2 rounded-full bg-accent-green"></span>}
              {toast.type === 'error' && <span className="w-2 h-2 rounded-full bg-accent-red"></span>}
              {toast.type === 'info' && <span className="w-2 h-2 rounded-full bg-accent-blue"></span>}
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context.addToast;
};
