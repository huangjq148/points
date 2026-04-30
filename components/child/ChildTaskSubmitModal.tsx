"use client";

import type { ChangeEvent, RefObject } from "react";
import { Image, Modal } from "@/components/ui";

interface TaskSubmitModalTask {
  name: string;
  icon: string;
  points: number;
  requirePhoto?: boolean;
}

interface ChildTaskSubmitModalProps {
  isOpen: boolean;
  task: TaskSubmitModalTask | null;
  submitting: boolean;
  hasPhoto: boolean;
  photoPreview: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onPhotoSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
}

export default function ChildTaskSubmitModal({
  isOpen,
  task,
  submitting,
  hasPhoto,
  photoPreview,
  fileInputRef,
  onClose,
  onPhotoSelect,
  onSubmit,
}: ChildTaskSubmitModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      width={520}
      className="child-task-submit-modal overflow-hidden !rounded-[2rem] shadow-[0_24px_80px_rgba(14,116,144,0.22)]"
      showCloseButton={false}
      footer={
        <div className="flex w-full gap-3">
          <button
            className="min-h-12 flex-1 rounded-[1.25rem] border border-[color:var(--child-border)] bg-[var(--child-surface-muted)] px-4 py-3 text-base font-black text-[var(--child-text)] transition hover:bg-[var(--child-surface)]"
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="min-h-12 flex-1 rounded-[1.25rem] bg-gradient-to-r from-teal-500 via-sky-500 to-indigo-500 px-4 py-3 text-lg font-black text-white shadow-lg transition hover:shadow-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onSubmit}
            disabled={submitting || !!(task?.requirePhoto && !hasPhoto)}
          >
            {submitting ? "提交中..." : "提交审核"}
          </button>
        </div>
      }
    >
      {task && (
        <div className="space-y-4">
          <div className="child-task-submit-hero rounded-[1.75rem] px-4 py-4 shadow-sm sm:px-5 sm:py-5">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="flex h-14 w-14 flex-none items-center justify-center rounded-[1.4rem] border border-[color:var(--child-border)] bg-[var(--child-surface)] text-3xl shadow-[0_12px_30px_rgba(59,130,246,0.12)] sm:h-16 sm:w-16 sm:text-4xl">
                {task.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-black leading-tight text-[var(--child-text)] sm:text-xl">
                  {task.name}
                </h3>
              </div>
              <div className="flex flex-none items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-[color:rgba(14,165,233,0.14)] px-2.5 py-1 text-sm font-black text-sky-700 ring-1 ring-[color:rgba(125,211,252,0.24)]">
                  +{task.points}
                </span>
              </div>
            </div>
          </div>

          <div className="child-task-submit-surface rounded-[1.5rem] p-3 shadow-sm sm:p-4">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={onPhotoSelect}
            />
            <div
              className="child-task-submit-upload group relative cursor-pointer rounded-[2rem] border-2 border-dashed p-1.5 transition-all"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
                fileInputRef.current?.click();
              }}
            >
              {photoPreview ? (
                <div className="relative aspect-video overflow-hidden rounded-2xl">
                  <Image
                    src={photoPreview}
                    alt="照片预览"
                    className="h-full w-full object-cover"
                    enableZoom={false}
                    containerClassName="h-full w-full"
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="rounded-full bg-[var(--child-surface-strong)] px-5 py-2.5 text-sm font-bold text-[var(--child-text)] ring-1 ring-[color:var(--child-border)] backdrop-blur-sm">
                      📷 更换照片
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2.5 py-6 sm:py-8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(14,165,233,0.14)_0%,rgba(99,102,241,0.18)_100%)] sm:h-16 sm:w-16">
                    <span className="text-2xl sm:text-3xl">📸</span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-[var(--child-text)] sm:text-base">
                      上传任务照片
                    </p>
                    <p className="mt-1 text-xs text-[var(--child-text-muted)] sm:text-sm">
                      {task.requirePhoto ? "⚠️ 必须上传照片" : "✨ 上传更容易通过"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
