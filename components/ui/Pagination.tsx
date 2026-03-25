import React from 'react';
import Button from './Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  className = '',
}) => {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) return null;

  return (
    <div className={`flex justify-center items-center gap-4 mt-6 ${className}`}>
      <Button
        variant="secondary"
        disabled={currentPage === 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        className="text-gray-500 disabled:opacity-30"
      >
        <ChevronLeft size={16} />
        上一页
      </Button>
      <span className="inline-flex h-11 min-h-11 items-center rounded-[14px] border border-slate-200/90 bg-white/88 px-4 text-sm font-medium text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-sm">
        第 {currentPage} 页 / 共 {totalPages} 页
      </span>
      <Button
        variant="secondary"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        className="text-gray-500 disabled:opacity-30"
      >
        下一页
        <ChevronRight size={16} />
      </Button>
    </div>
  );
};

export default Pagination;
