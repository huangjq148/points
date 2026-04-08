'use client';

import { Calendar } from 'lucide-react';
import DatePicker from '@/components/ui/DatePicker';

interface TaskDateRangeFilterProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  className?: string;
  startPlaceholder?: string;
  endPlaceholder?: string;
}

export default function TaskDateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className = '',
  startPlaceholder = '开始日期',
  endPlaceholder = '结束日期',
}: TaskDateRangeFilterProps) {
  return (
    <div className='grid min-w-0 flex-1 grid-cols-2 gap-2'>
      <DatePicker
        selected={startDate}
        onChange={onStartDateChange}
        placeholderText={startPlaceholder}
        icon={null}
        isClearable={false}
        wrapperClassName='w-full min-w-0'
      />
      <DatePicker
        selected={endDate}
        onChange={onEndDateChange}
        placeholderText={endPlaceholder}
        icon={null}
        isClearable={false}
        wrapperClassName='w-full min-w-0'
      />
    </div>
  );
}
