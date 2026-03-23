'use client';

import { Button, Modal, DatePicker, Image } from '@/components/ui';
import Input from '@/components/ui/Input';
import { User } from '@/context/AppContext';
import { Camera } from 'lucide-react';

export type ExpiryPolicyType = 'auto_close' | 'keep' | 'rollover';

export interface TaskFormData {
  name: string;
  description: string;
  points: number;
  icon: string;
  type: string;
  requirePhoto: boolean;
  selectedChildren: string[];
  imageUrl: string;
  startDate: Date | null;
  deadline: Date | null;
  scheduleMode: "single" | "range" | "week";
  rangeStart: Date | null;
  rangeEnd: Date | null;
  weekReference: Date | null;
  saveAsTemplate: boolean;
}

const formatLocalDate = (date: Date) => date.toLocaleDateString("zh-CN");

const getWeekBounds = (reference: Date) => {
  const normalizedRef = new Date(reference);
  normalizedRef.setHours(0, 0, 0, 0);
  const day = normalizedRef.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(normalizedRef);
  monday.setDate(normalizedRef.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
};

const SCHEDULE_MODES: { value: TaskFormData["scheduleMode"]; label: string }[] = [
  { value: "single", label: "自定义时间" },
  { value: "range", label: "按日期范围" },
  { value: "week", label: "按周排期" },
];

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  childList?: User[];
  taskData: TaskFormData;
  setTaskData: React.Dispatch<React.SetStateAction<TaskFormData>>;
  onSubmit: () => void;
  onPhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  photoPreview: string;
  toggleChild?: (childId: string) => void;
}

export default function TaskModal({
  isOpen,
  onClose,
  mode,
  childList,
  taskData,
  setTaskData,
  onSubmit,
  onPhotoSelect,
  photoPreview,
  toggleChild,
}: TaskModalProps) {
  const scheduleMode = taskData.scheduleMode || "single";
  const showSinglePickers = mode === "edit" || scheduleMode === "single";
  const rangeModeActive = mode === "add" && scheduleMode === "range";
  const weekModeActive = mode === "add" && scheduleMode === "week";
  const weekBounds = taskData.weekReference ? getWeekBounds(taskData.weekReference) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'add' ? '添加新任务' : '编辑任务'}
      width={600}
      noInternalScroll={true}
      footer={
        <div className='flex gap-3 w-full'>
          <Button
            onClick={onClose}
            variant='error'
            className='flex-1 py-3 font-semibold'
          >
            取消
          </Button>
          <Button
            onClick={onSubmit}
            className='flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold shadow-sm transition-colors'
          >
            {mode === 'add' ? '确认添加' : '保存修改'}
          </Button>
        </div>
      }
    >
      <div className='space-y-5 pt-2 pb-6 max-h-[calc(80vh-200px)] overflow-y-auto custom-scrollbar pr-2 pl-2'>
        {mode === 'add' && childList && toggleChild && (
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              选择孩子
            </label>
            <div className='flex flex-wrap gap-2'>
              {childList.map((child: User) => (
                <div
                  key={child.id}
                  onClick={() => toggleChild(child.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all border-2 ${
                    taskData.selectedChildren.includes(child.id)
                      ? 'bg-slate-50 border-slate-300 text-slate-800'
                      : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className='text-lg'>{child.avatar || '👤'}</span>
                  <span className='text-sm font-medium'>{child.username}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === 'add' && (
          <div className='space-y-3'>
            <label className='text-sm font-medium text-gray-700'>排期方式</label>
            <div className='flex gap-2'>
              {SCHEDULE_MODES.map((option) => {
                const isActive = scheduleMode === option.value;
                return (
                  <button
                    key={option.value}
                    type='button'
                    onClick={() =>
                      setTaskData((prev) => ({
                        ...prev,
                        scheduleMode: option.value,
                        rangeStart: option.value === 'range' ? prev.rangeStart : null,
                        rangeEnd: option.value === 'range' ? prev.rangeEnd : null,
                        weekReference: option.value === 'week' ? prev.weekReference : null,
                      }))
                    }
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition ${
                      isActive
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-slate-50'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className='text-xs text-gray-500'>
              {scheduleMode === 'single'
                ? '可自定义起始和截止时间'
                : scheduleMode === 'range'
                  ? '根据所选日期范围每天创建一条任务，默认 00:00 - 23:59'
                  : '根据所选日期所在周（周一至周日）每日创建任务，默认 00:00 - 23:59'}
            </p>
          </div>
        )}

        {showSinglePickers && (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                起始时间（必填）
              </label>
              <DatePicker
                selected={taskData.startDate}
                onChange={(date: Date | null) =>
                  setTaskData({ ...taskData, startDate: date })
                }
                placeholderText='设置起始时间'
                showTimeInput
                timeInputLabel='时间:'
                timeFormat='HH:mm'
                dateFormat='yyyy-MM-dd HH:mm'
                selectsStart
                maxDate={taskData.deadline || undefined}
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                截止时间（必填）
              </label>
              <DatePicker
                selected={taskData.deadline}
                onChange={(date: Date | null) =>
                  setTaskData({ ...taskData, deadline: date })
                }
                placeholderText='设置截止时间'
                showTimeInput
                timeInputLabel='时间:'
                timeFormat='HH:mm'
                dateFormat='yyyy-MM-dd HH:mm'
                selectsEnd
                minDate={taskData.startDate || undefined}
              />
            </div>
          </div>
        )}

        {rangeModeActive && (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                起始日期
              </label>
              <DatePicker
                selected={taskData.rangeStart}
                onChange={(date: Date | null) =>
                  setTaskData({ ...taskData, rangeStart: date })
                }
                placeholderText='开始日期'
                dateFormat='yyyy-MM-dd'
                selectsStart
                maxDate={taskData.rangeEnd || undefined}
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                结束日期
              </label>
              <DatePicker
                selected={taskData.rangeEnd}
                onChange={(date: Date | null) =>
                  setTaskData({ ...taskData, rangeEnd: date })
                }
                placeholderText='结束日期'
                dateFormat='yyyy-MM-dd'
                selectsEnd
                minDate={taskData.rangeStart || undefined}
              />
            </div>
          </div>
        )}

        {weekModeActive && (
          <div className='space-y-2'>
            <label className='block text-sm font-medium text-gray-700'>
              参考日期（按所在周排期）
            </label>
            <DatePicker
              selected={taskData.weekReference}
              onChange={(date: Date | null) =>
                setTaskData({ ...taskData, weekReference: date })
              }
              placeholderText='选择日期'
              dateFormat='yyyy-MM-dd'
            />
            {weekBounds && (
              <p className='text-xs text-gray-500'>
                本周范围：{formatLocalDate(weekBounds.start)} - {formatLocalDate(weekBounds.end)}
              </p>
            )}
          </div>
        )}

        <div className='space-y-3'>
          <Input
            label='任务名称'
            value={taskData.name}
            onChange={(e) => setTaskData({ ...taskData, name: e.target.value })}
            placeholder='如：整理书包'
            className='rounded-xl border-gray-200'
          />

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              任务描述（可选）
            </label>
            <textarea
              value={taskData.description}
              onChange={(e) =>
                setTaskData({ ...taskData, description: e.target.value })
              }
              placeholder='详细描述任务要求，帮助孩子更好地理解'
              className='w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none transition-all resize-none'
              rows={3}
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              任务配图（可选）
            </label>
            <label className='relative flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-2xl hover:border-slate-400 hover:bg-slate-50/60 transition-all cursor-pointer group'>
              <input
                type='file'
                accept='image/*'
                onChange={onPhotoSelect}
                className='hidden'
              />
              <div className='flex flex-col items-center gap-2'>
                <div className='w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform'>
                  <Camera className='text-slate-600' size={20} />
                </div>
                <span className='text-xs font-medium text-gray-500'>
                  {mode === 'add' ? '点击上传或拖拽图片' : '点击上传或更换图片'}
                </span>
              </div>
            </label>
            {photoPreview && (
              <div className='mt-3 relative rounded-xl overflow-hidden border border-gray-100 shadow-sm'>
                <Image
                  src={photoPreview}
                  alt='预览'
                  className='w-full h-32 object-cover'
                  enableZoom={false}
                  containerClassName='w-full h-32'
                />
              </div>
            )}
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                积分奖励
              </label>
              <Input
                type='number'
                value={taskData.points}
                onChange={(e) =>
                  setTaskData({
                    ...taskData,
                    points: parseInt(e.target.value) || 0,
                  })
                }
                className='rounded-xl border-gray-200'
              />
            </div>
            <div className='flex-1'>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                任务类型
              </label>
              <div className='flex gap-2'>
                {(['daily', 'advanced', 'challenge'] as const).map((type) => (
                  <Button
                    key={type}
                    type='button'
                    onClick={() => setTaskData({ ...taskData, type })}
                    variant={taskData.type === type ? 'primary' : 'default'}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all shadow-none ${
                      taskData.type === type
                        ? 'border-slate-400 bg-slate-50 text-slate-800 shadow-sm'
                        : 'hover:bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    {type === 'daily'
                      ? '日常'
                      : type === 'advanced'
                        ? '进阶'
                        : '挑战'}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {mode === 'add' && (
          <div className='space-y-3 pt-2'>
              <label className='flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-slate-50 transition-colors cursor-pointer'>
              <input
                type='checkbox'
                checked={taskData.requirePhoto}
                onChange={(e) =>
                  setTaskData({ ...taskData, requirePhoto: e.target.checked })
                }
                className='w-5 h-5 rounded-lg border-gray-300 text-slate-900 focus:ring-slate-200'
              />
              <div className='flex flex-col'>
                <span className='text-sm font-semibold text-gray-700'>
                  要求拍照提交
                </span>
                <span className='text-xs text-gray-500'>
                  完成后需上传照片证明
                </span>
              </div>
            </label>
              <label className='flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-slate-50 transition-colors cursor-pointer'>
              <input
                type='checkbox'
                checked={taskData.saveAsTemplate}
                onChange={(e) =>
                  setTaskData({ ...taskData, saveAsTemplate: e.target.checked })
                }
                className='w-5 h-5 rounded-lg border-gray-300 text-slate-900 focus:ring-slate-200'
              />
              <div className='flex flex-col'>
                <span className='text-sm font-semibold text-gray-700'>
                  同时保存为模板
                </span>
                <span className='text-xs text-gray-500'>方便下次直接使用</span>
              </div>
            </label>
          </div>
        )}

        {mode === 'edit' && (
          <div className='pt-2'>
            <label className='flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-slate-50 transition-colors cursor-pointer'>
              <input
                type='checkbox'
                checked={taskData.requirePhoto}
                onChange={(e) =>
                  setTaskData({ ...taskData, requirePhoto: e.target.checked })
                }
                className='w-5 h-5 rounded-lg border-gray-300 text-slate-900 focus:ring-slate-200'
              />
              <div className='flex flex-col'>
                <span className='text-sm font-semibold text-gray-700'>
                  要求拍照提交
                </span>
                <span className='text-xs text-gray-500'>
                  完成后需上传照片证明
                </span>
              </div>
            </label>
          </div>
        )}

        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            选择图标
          </label>
          <div className='flex flex-wrap gap-2'>
            {['⭐', '📚', '🧹', '🏃', '🎨', '🎵', '🥦', '🥛', '😴', '🎹'].map(
              (icon) => (
                <button
                  key={icon}
                  type='button'
                  onClick={() => setTaskData({ ...taskData, icon })}
                  className={`w-10 h-10 rounded-xl text-xl leading-none flex items-center justify-center transition-all ${
                    taskData.icon === icon
                      ? 'bg-slate-200 ring-2 ring-slate-400 ring-offset-1 scale-110'
                      : 'bg-gray-50 hover:bg-slate-100 text-gray-400 hover:text-slate-600'
                  }`}
                >
                  <span className='leading-none'>{icon}</span>
                </button>
              ),
            )}
          </div>
        </div>

      </div>
    </Modal>
  );
}
