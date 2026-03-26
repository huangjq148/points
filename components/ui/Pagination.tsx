import React from 'react';
import Button from './Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  CONTROL_HEIGHT_CLASS,
  CONTROL_PANEL_RADIUS_CLASS,
  CONTROL_PANEL_SUBTLE_CLASS,
} from './controlStyles';

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
      <span
        className={`inline-flex items-center px-4 text-sm font-medium text-slate-600 ${CONTROL_HEIGHT_CLASS} ${CONTROL_PANEL_RADIUS_CLASS} ${CONTROL_PANEL_SUBTLE_CLASS}`}
      >
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
