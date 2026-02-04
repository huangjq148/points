import React from 'react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

const AlertModal: React.FC<AlertModalProps> = ({ 
  isOpen, onClose, title = '提示', message, type = 'info' 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 transform transition-all" onClick={e => e.stopPropagation()}>
        <div className="text-center">
           <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${
             type === 'error' ? 'bg-red-100 text-red-600' : 
             type === 'success' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
           }`}>
             {type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'}
           </div>
           <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
           <p className="text-sm text-gray-500 mb-6 whitespace-pre-line">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
        >
          确定
        </button>
      </div>
    </div>
  );
};

export default AlertModal;