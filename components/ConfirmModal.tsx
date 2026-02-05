import React from 'react';
import Button from '@/components/ui/Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info' | 'warning';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, onClose, onConfirm, title, message, 
  confirmText = '确认', cancelText = '取消', type = 'info' 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" style={{ zIndex: 'var(--z-alert)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 transform transition-all" onClick={e => e.stopPropagation()}>
        <div className="text-center">
           <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${
             type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
           }`}>
             {type === 'danger' ? '⚠️' : 'ℹ️'}
           </div>
           <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
           <p className="text-sm text-gray-500 mb-6">{message}</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="ghost"
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            onClick={() => { onConfirm(); onClose(); }}
            variant={type === 'danger' ? 'error' : 'primary'}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;