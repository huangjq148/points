import React from 'react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
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
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 px-4 py-2 text-white rounded-xl shadow-lg transition-colors ${
              type === 'danger' 
                ? 'bg-red-500 hover:bg-red-600 shadow-red-200' 
                : 'bg-blue-500 hover:bg-blue-600 shadow-blue-200'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;