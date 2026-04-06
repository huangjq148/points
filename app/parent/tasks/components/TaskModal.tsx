'use client';

import { Button, Drawer, DatePicker, Image } from '@/components/ui';
import Input from '@/components/ui/Input';
import { User } from '@/context/AppContext';
import { CalendarDays, Camera, Sparkles, Users } from 'lucide-react';

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

const drawerSurfaceClass =
  "rounded-[28px] border border-[color:var(--ui-border)] bg-[var(--ui-surface-2)] p-4 shadow-[var(--ui-shadow-sm)]";
const sectionCardClass =
  "rounded-2xl border border-[color:var(--ui-border)] bg-[var(--ui-surface-1)] px-4 py-4 shadow-[var(--ui-shadow-sm)]";
const heroCardClass =
  "relative overflow-hidden rounded-[28px] border border-[color:var(--ui-border)] bg-[linear-gradient(135deg,rgba(59,130,246,0.14),transparent_52%),var(--ui-surface-1)] p-5 shadow-[var(--ui-shadow-md)]";
const labelClass = "block text-sm font-semibold text-[var(--ui-text-primary)]";
const helperClass = "text-xs text-[var(--ui-text-muted)]";
const inputClass =
  "rounded-xl";
const textareaClass =
  "w-full rounded-xl border border-[color:var(--ui-border)] bg-[var(--ui-surface-1)] px-4 py-3 text-[var(--ui-text-primary)] placeholder:text-[var(--ui-text-soft)] focus:border-[color:var(--ui-border-strong)] focus:ring-4 focus:ring-[var(--ui-focus-ring)] outline-none transition-all resize-none shadow-[var(--ui-shadow-sm)]";

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
  const modeTitle = mode === "add" ? "创建新任务" : "编辑任务配置";
  const modeDescription =
    mode === "add"
      ? "为孩子快速布置一个清晰可执行的新任务，支持按日期范围和按周排期。"
      : "更新任务内容、时间安排和提交要求，变更会立即同步到任务列表。";

  const formBody = (
    <div className={drawerSurfaceClass}>
      <div className='space-y-5'>
        <div className={heroCardClass}>
          <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(96,165,250,0.22)_0%,transparent_72%)]" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-[color:var(--ui-primary-border)] bg-[var(--ui-primary-soft-bg)] text-[var(--ui-action-blue-text)] shadow-[var(--ui-primary-shadow)]">
              <Sparkles size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--ui-primary-border)] bg-[var(--ui-primary-soft-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ui-action-blue-text)]">
                  <Sparkles size={12} />
                  {mode === "add" ? "新增任务" : "任务编辑"}
                </span>
                {mode === "add" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--ui-border)] bg-[var(--ui-surface-2)] px-2.5 py-1 text-[11px] font-medium text-[var(--ui-text-secondary)]">
                    <CalendarDays size={12} />
                    支持多种排期
                  </span>
                )}
              </div>
              <h3 className="mt-3 text-xl font-black tracking-tight text-[var(--ui-text-primary)]">{modeTitle}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--ui-text-muted)]">{modeDescription}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-xl border border-[color:var(--ui-border)] bg-[var(--ui-surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--ui-text-secondary)]">
                  <Users size={13} />
                  {mode === "add" ? "可批量分配给孩子" : "保留当前执行对象"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-xl border border-[color:var(--ui-border)] bg-[var(--ui-surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--ui-text-secondary)]">
                  <CalendarDays size={13} />
                  {mode === "add" ? "截止时间与排期可同时配置" : "支持调整起止时间"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {mode === 'add' && childList && toggleChild && (
          <div className={sectionCardClass}>
            <label className={`${labelClass} mb-3`}>
              选择孩子
            </label>
            <div className='flex flex-wrap gap-2'>
              {childList.map((child: User) => (
                <div
                  key={child.id}
                  onClick={() => toggleChild(child.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all border-2 ${
                    taskData.selectedChildren.includes(child.id)
                      ? 'bg-[image:var(--ui-primary-bg)] border-[color:var(--ui-primary-border)] text-white shadow-[var(--ui-primary-shadow)]'
                      : 'bg-[var(--ui-surface-1)] border-[color:var(--ui-border)] text-[var(--ui-text-secondary)] hover:bg-[var(--ui-surface-3)]'
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
          <div className={`${sectionCardClass} space-y-3`}>
            <label className={labelClass}>排期方式</label>
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
                        ? 'bg-[image:var(--ui-primary-bg)] border-[color:var(--ui-primary-border)] text-white'
                        : 'bg-[var(--ui-surface-1)] border-[color:var(--ui-border)] text-[var(--ui-text-secondary)] hover:bg-[var(--ui-surface-3)] hover:border-[color:var(--ui-border-strong)]'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className={helperClass}>
              {scheduleMode === 'single'
                ? '可自定义起始和截止时间'
                : scheduleMode === 'range'
                  ? '根据所选日期范围每天创建一条任务，默认 00:00 - 23:59'
                  : '根据所选日期所在周（周一至周日）每日创建任务，默认 00:00 - 23:59'}
            </p>
          </div>
        )}

        {showSinglePickers && (
          <div className={`${sectionCardClass} grid grid-cols-1 gap-4 md:grid-cols-2`}>
            <div>
              <label className={`${labelClass} mb-2`}>
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
                className={inputClass}
              />
            </div>

            <div>
              <label className={`${labelClass} mb-2`}>
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
                className={inputClass}
              />
            </div>
          </div>
        )}

        {rangeModeActive && (
          <div className={`${sectionCardClass} grid grid-cols-1 md:grid-cols-2 gap-4`}>
            <div>
              <label className={`${labelClass} mb-2`}>
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
                className={inputClass}
              />
            </div>
            <div>
              <label className={`${labelClass} mb-2`}>
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
                className={inputClass}
              />
            </div>
          </div>
        )}

        {weekModeActive && (
          <div className={`${sectionCardClass} space-y-2`}>
            <label className={labelClass}>
              参考日期（按所在周排期）
            </label>
            <DatePicker
              selected={taskData.weekReference}
              onChange={(date: Date | null) =>
                setTaskData({ ...taskData, weekReference: date })
              }
              placeholderText='选择日期'
              dateFormat='yyyy-MM-dd'
              className={inputClass}
            />
            {weekBounds && (
              <p className={helperClass}>
                本周范围：{formatLocalDate(weekBounds.start)} - {formatLocalDate(weekBounds.end)}
              </p>
            )}
          </div>
        )}

        <div className={`${sectionCardClass} space-y-4`}>
          <Input
            label='任务名称'
            value={taskData.name}
            onChange={(e) => setTaskData({ ...taskData, name: e.target.value })}
            placeholder='如：整理书包'
            className={inputClass}
          />

          <div>
            <label className={`${labelClass} mb-2`}>
              任务描述（可选）
            </label>
            <textarea
              value={taskData.description}
              onChange={(e) =>
                setTaskData({ ...taskData, description: e.target.value })
              }
              placeholder='详细描述任务要求，帮助孩子更好地理解'
              className={textareaClass}
              rows={3}
            />
          </div>

          <div>
            <label className={`${labelClass} mb-2`}>
              任务配图（可选）
            </label>
            <label className='relative flex flex-col items-center justify-center p-4 border-2 border-dashed border-[color:var(--ui-border-strong)] rounded-2xl bg-[var(--ui-surface-2)] hover:border-[color:var(--ui-focus)] hover:bg-[var(--ui-surface-3)] transition-all cursor-pointer group'>
              <input
                type='file'
                accept='image/*'
                onChange={onPhotoSelect}
                className='hidden'
              />
              <div className='flex flex-col items-center gap-2'>
                <div className='w-10 h-10 rounded-full bg-[var(--ui-surface-1)] flex items-center justify-center ring-1 ring-[color:var(--ui-border)] group-hover:scale-110 transition-transform shadow-[var(--ui-shadow-sm)]'>
                  <Camera className='text-[var(--ui-text-secondary)]' size={20} />
                </div>
                <span className='text-xs font-medium text-[var(--ui-text-muted)]'>
                  {mode === 'add' ? '点击上传或拖拽图片' : '点击上传或更换图片'}
                </span>
              </div>
            </label>
            {photoPreview && (
              <div className='mt-3 relative rounded-xl overflow-hidden border border-[color:var(--ui-border)] shadow-[var(--ui-shadow-sm)]'>
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
              <label className={`${labelClass} mb-2`}>
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
                className={inputClass}
              />
            </div>
            <div className='flex-1'>
              <label className={`${labelClass} mb-2`}>
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
                        ? 'border-[color:var(--ui-primary-border)] bg-[image:var(--ui-primary-bg)] text-white shadow-[var(--ui-primary-shadow)]'
                        : 'border-[color:var(--ui-border)] bg-[var(--ui-surface-1)] text-[var(--ui-text-secondary)] hover:bg-[var(--ui-surface-3)] hover:border-[color:var(--ui-border-strong)]'
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
              <label className='flex items-center gap-3 p-3 rounded-xl border border-[color:var(--ui-border)] bg-[var(--ui-surface-1)] hover:bg-[var(--ui-surface-3)] transition-colors cursor-pointer'>
              <input
                type='checkbox'
                checked={taskData.requirePhoto}
                onChange={(e) =>
                  setTaskData({ ...taskData, requirePhoto: e.target.checked })
                }
                className='w-5 h-5 rounded-xl border-[color:var(--ui-border-strong)] text-[var(--ui-focus)] focus:ring-[var(--ui-focus-ring)]'
              />
              <div className='flex flex-col'>
                <span className='text-sm font-semibold text-[var(--ui-text-primary)]'>
                  要求拍照提交
                </span>
                <span className='text-xs text-[var(--ui-text-muted)]'>
                  完成后需上传照片证明
                </span>
              </div>
            </label>
              <label className='flex items-center gap-3 p-3 rounded-xl border border-[color:var(--ui-border)] bg-[var(--ui-surface-1)] hover:bg-[var(--ui-surface-3)] transition-colors cursor-pointer'>
              <input
                type='checkbox'
                checked={taskData.saveAsTemplate}
                onChange={(e) =>
                  setTaskData({ ...taskData, saveAsTemplate: e.target.checked })
                }
                className='w-5 h-5 rounded-xl border-[color:var(--ui-border-strong)] text-[var(--ui-focus)] focus:ring-[var(--ui-focus-ring)]'
              />
              <div className='flex flex-col'>
                <span className='text-sm font-semibold text-[var(--ui-text-primary)]'>
                  同时保存为模板
                </span>
                <span className='text-xs text-[var(--ui-text-muted)]'>方便下次直接使用</span>
              </div>
            </label>
          </div>
        )}

        {mode === 'edit' && (
          <div className='pt-2'>
            <label className='flex items-center gap-3 p-3 rounded-xl border border-[color:var(--ui-border)] bg-[var(--ui-surface-1)] hover:bg-[var(--ui-surface-3)] transition-colors cursor-pointer'>
              <input
                type='checkbox'
                checked={taskData.requirePhoto}
                onChange={(e) =>
                  setTaskData({ ...taskData, requirePhoto: e.target.checked })
                }
                className='w-5 h-5 rounded-xl border-[color:var(--ui-border-strong)] text-[var(--ui-focus)] focus:ring-[var(--ui-focus-ring)]'
              />
              <div className='flex flex-col'>
                <span className='text-sm font-semibold text-[var(--ui-text-primary)]'>
                  要求拍照提交
                </span>
                <span className='text-xs text-[var(--ui-text-muted)]'>
                  完成后需上传照片证明
                </span>
              </div>
            </label>
          </div>
        )}

        <div className={sectionCardClass}>
          <label className={`${labelClass} mb-3`}>
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
                      ? 'bg-[image:var(--ui-primary-bg)] text-white ring-2 ring-[color:var(--ui-primary-border)] ring-offset-2 ring-offset-[var(--ui-surface-1)] scale-110 shadow-[var(--ui-primary-shadow)]'
                      : 'bg-[var(--ui-surface-1)] hover:bg-[var(--ui-surface-3)] text-[var(--ui-text-muted)] hover:text-[var(--ui-text-secondary)] border border-[color:var(--ui-border)]'
                  }`}
                >
                  <span className='leading-none'>{icon}</span>
                </button>
              ),
            )}
          </div>
        </div>
      </div>
      </div>
  );

  const footer = (
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
        className='flex-1 py-3 rounded-xl font-semibold'
      >
        {mode === 'add' ? '确认添加' : '保存修改'}
      </Button>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'add' ? '添加新任务' : '编辑任务'}
      width={mode === 'add' ? 'min(100vw, 560px)' : 'min(100vw, 640px)'}
      noInternalScroll={false}
      footer={footer}
      className="bg-[linear-gradient(180deg,rgba(59,130,246,0.06)_0%,transparent_16%),var(--ui-panel-bg)]"
    >
      {formBody}
    </Drawer>
  );
}
