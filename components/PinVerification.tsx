'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Lock, Calculator } from 'lucide-react';
import Button from '@/components/ui/Button';

interface PinVerificationProps {
  onVerified: () => void;
  onCancel: () => void;
}

export default function PinVerification({ onVerified, onCancel }: PinVerificationProps) {
  const { switchToParent } = useApp();
  const [pin, setPin] = useState('');
  const [showMathChallenge, setShowMathChallenge] = useState(false);
  const [num1] = useState(() => Math.floor(Math.random() * 9) + 1);
  const [num2] = useState(() => Math.floor(Math.random() * 9) + 1);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');

  const handlePinSubmit = async () => {
    if (pin.length !== 4) return;
    
    const success = await switchToParent();
    if (success) {
      onVerified();
    } else {
      setError('PIN码错误，请再试一次');
      setPin('');
    }
  };

  const handleMathSubmit = async () => {
    if (parseInt(answer) === num1 * num2) {
      const success = await switchToParent();
      if (success) {
        onVerified();
      }
    } else {
      setError('答案不对哦，再想想！');
      setAnswer('');
    }
  };

  const toggleMethod = () => {
    setShowMathChallenge(!showMathChallenge);
    setError('');
    setPin('');
    setAnswer('');
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content text-center" onClick={(_e) => _e.stopPropagation()}>
        <Lock size={48} className="mx-auto mb-4 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {showMathChallenge ? '数学挑战' : '家长验证'}
        </h2>
        <p className="text-gray-600 mb-6">
          {showMathChallenge 
            ? `请计算：${num1} × ${num2} = ?` 
            : '请输入4位PIN码'}
        </p>

        {showMathChallenge ? (
          <>
            <div className="relative mx-auto max-w-xs mb-4">
              <Calculator className="absolute left-4 top-1/2 transform -translate-y-1/2 text-green-500" size={20} />
              <input
                type="number"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="input-field pl-12 text-center text-2xl"
                placeholder="?"
                autoFocus
              />
            </div>
            <Button onClick={handleMathSubmit} className="w-full mt-4" variant="primary">
              确认
            </Button>
          </>
        ) : (
          <>
            <div className="flex gap-2 justify-center mb-6">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-2xl font-bold border-2 border-gray-200"
                >
                  {pin[i] || ''}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <Button
                  key={num}
                  onClick={() => pin.length < 4 && setPin(pin + num.toString())}
                  variant="ghost"
                  className="w-16 h-16 bg-gray-100 rounded-xl text-xl font-bold hover:bg-gray-200 transition p-0 shadow-none"
                >
                  {num}
                </Button>
              ))}
              <Button
                onClick={() => setPin(pin.slice(0, -1))}
                variant="ghost"
                className="w-16 h-16 bg-gray-100 rounded-xl text-lg font-medium hover:bg-gray-200 transition p-0 shadow-none"
              >
                删除
              </Button>
              <Button
                onClick={() => pin.length < 4 && setPin(pin + '0')}
                variant="ghost"
                className="w-16 h-16 bg-gray-100 rounded-xl text-xl font-bold hover:bg-gray-200 transition p-0 shadow-none"
              >
                0
              </Button>
              <Button
                onClick={() => setPin('')}
                variant="ghost"
                className="w-16 h-16 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200 transition p-0 shadow-none"
              >
                清空
              </Button>
            </div>

            <Button onClick={handlePinSubmit} className="w-full mt-4" variant="primary">
              确认
            </Button>
          </>
        )}

        {error && (
          <div className="bg-red-100 text-red-600 px-4 py-2 rounded-xl mt-4">
            {error}
          </div>
        )}

        <Button
          onClick={toggleMethod}
          variant="ghost"
          className="mt-4 text-green-600 hover:text-green-700 font-medium bg-transparent border-none cursor-pointer shadow-none hover:bg-transparent"
        >
          {showMathChallenge ? '使用PIN码验证' : '换个方式：数学挑战'}
        </Button>

        <Button
          onClick={onCancel}
          variant="ghost"
          className="mt-4 w-full text-gray-500 hover:text-gray-600"
        >
          取消
        </Button>
      </div>
    </div>
  );
}
