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
        variant="ghost"
        disabled={currentPage === 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        className="text-gray-500 disabled:opacity-30 flex items-center gap-1"
      >
        <ChevronLeft size={16} />
        上一页
      </Button>
      <span className="text-sm text-gray-500">
        第 {currentPage} 页 / 共 {totalPages} 页
      </span>
      <Button
        variant="ghost"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        className="text-gray-500 disabled:opacity-30 flex items-center gap-1"
      >
        下一页
        <ChevronRight size={16} />
      </Button>
    </div>
  );
};

export default Pagination;
