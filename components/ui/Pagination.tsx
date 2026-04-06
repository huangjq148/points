import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';
import {
  CONTROL_HEIGHT_CLASS,
  CONTROL_PANEL_RADIUS_CLASS,
  CONTROL_PANEL_SUBTLE_CLASS,
} from './controlStyles';

type PaginationVariant = 'default' | 'rich';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
  variant?: PaginationVariant;
  showPageSizeLabel?: boolean;
  showQuickJumper?: boolean;
  alwaysShow?: boolean;
  pageSizeOptions?: number[];
}

function getPageItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis', totalPages] as const;
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      'ellipsis',
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ] as const;
  }

  return [
    1,
    'ellipsis',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'ellipsis',
    totalPages,
  ] as const;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  className = '',
  variant = 'default',
  showPageSizeLabel = true,
  showQuickJumper = true,
  alwaysShow = false,
  pageSizeOptions = [10, 20, 50],
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const [jumpValue, setJumpValue] = useState('');

  const pageItems = useMemo(
    () => getPageItems(currentPage, totalPages),
    [currentPage, totalPages],
  );

  if (!alwaysShow && totalPages <= 1) return null;

  const handlePrev = () => onPageChange(Math.max(1, currentPage - 1));
  const handleNext = () => onPageChange(Math.min(totalPages, currentPage + 1));
  const handleJump = () => {
    const page = Number(jumpValue);
    if (!Number.isFinite(page)) return;
    onPageChange(Math.min(totalPages, Math.max(1, page)));
  };

  if (variant === 'rich') {
    return (
      <div className={`mt-4 flex flex-wrap items-center gap-3 ${className}`}>
        <Button
          variant='secondary'
          disabled={currentPage === 1}
          onClick={handlePrev}
          className='min-w-0 rounded-2xl px-3 text-[var(--ui-text-muted)] disabled:opacity-30'
        >
          <ChevronLeft size={16} />
        </Button>

        <div className='flex items-center gap-2'>
          {pageItems.map((item, index) =>
            item === 'ellipsis' ? (
              <div
                key={`ellipsis-${index}`}
                className='inline-flex h-11 min-w-[2.75rem] items-center justify-center text-lg font-bold tracking-[0.2em] text-[var(--ui-text-soft)]'
              >
                ...
              </div>
            ) : (
              <button
                key={item}
                type='button'
                onClick={() => onPageChange(item)}
                className={
                  item === currentPage
                    ? 'inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-2xl border border-[color:var(--ui-primary-border)] bg-[var(--ui-primary-soft-bg)] text-base font-bold text-[var(--ui-focus)] shadow-[var(--ui-primary-soft-shadow)]'
                    : 'inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-2xl border border-transparent bg-transparent text-base font-semibold text-[var(--ui-text-muted)] transition-colors hover:bg-[var(--ui-surface-3)] hover:text-[var(--ui-text-primary)]'
                }
              >
                {item}
              </button>
            ),
          )}
        </div>

        <Button
          variant='secondary'
          disabled={currentPage >= totalPages}
          onClick={handleNext}
          className='min-w-0 rounded-2xl px-3 text-[var(--ui-text-muted)] disabled:opacity-30'
        >
          <ChevronRight size={16} />
        </Button>

        {showPageSizeLabel ? (
          onPageSizeChange ? (
            <label className='relative inline-flex h-11 items-center rounded-2xl border border-[color:var(--ui-border)] bg-[var(--ui-surface-1)] pr-10 shadow-[var(--ui-shadow-sm)]'>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className='h-full appearance-none rounded-2xl bg-transparent px-4 text-sm font-semibold text-[var(--ui-text-muted)] outline-none'
              >
                {pageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option} 条/页
                  </option>
                ))}
              </select>
              <span className='pointer-events-none absolute right-4 text-xs text-[var(--ui-text-soft)]'>
                ▼
              </span>
            </label>
          ) : (
            <div className='inline-flex h-11 items-center rounded-2xl border border-[color:var(--ui-border)] bg-[var(--ui-surface-1)] px-4 text-sm font-semibold text-[var(--ui-text-muted)] shadow-[var(--ui-shadow-sm)]'>
              {pageSize} 条/页
            </div>
          )
        ) : null}

        {showQuickJumper ? (
          <>
            <div className='flex items-center gap-2 text-sm font-medium text-[var(--ui-text-muted)]'>
              <span>跳至</span>
              <input
                key={`${currentPage}-${totalPages}`}
                type='number'
                min={1}
                max={totalPages}
                value={jumpValue}
                onChange={(e) => setJumpValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleJump();
                }}
                className='h-11 w-20 rounded-2xl border border-[color:var(--ui-border)] bg-[var(--ui-surface-1)] px-3 text-center text-sm font-semibold text-[var(--ui-text-primary)] shadow-[var(--ui-shadow-sm)] outline-none transition focus:border-[color:var(--ui-primary-border)] focus:ring-4 focus:ring-[var(--ui-focus-ring)]'
              />
              <span>页</span>
            </div>

            <Button
              variant='secondary'
              onClick={handleJump}
              disabled={!jumpValue.trim()}
              className='rounded-2xl px-4 text-[var(--ui-text-muted)] disabled:opacity-30'
            >
              跳转
            </Button>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`mt-6 flex items-center justify-center gap-4 ${className}`}>
        <Button
          variant='secondary'
          disabled={currentPage === 1}
          onClick={handlePrev}
          className='text-[var(--ui-text-muted)] disabled:opacity-30'
      >
        <ChevronLeft size={16} />
        上一页
      </Button>
      <span
        className={`inline-flex items-center px-4 text-sm font-medium text-[var(--ui-text-muted)] ${CONTROL_HEIGHT_CLASS} ${CONTROL_PANEL_RADIUS_CLASS} ${CONTROL_PANEL_SUBTLE_CLASS}`}
      >
        第 {currentPage} 页 / 共 {totalPages} 页
      </span>
        <Button
          variant='secondary'
          disabled={currentPage >= totalPages}
          onClick={handleNext}
          className='text-[var(--ui-text-muted)] disabled:opacity-30'
      >
        下一页
        <ChevronRight size={16} />
      </Button>
    </div>
  );
};

export default Pagination;
