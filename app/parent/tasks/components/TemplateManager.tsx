import { Button, Modal } from "@/components/ui";
import { Edit2, Plus, Sparkles, Trash2 } from "lucide-react";
import { TaskTemplate } from "../page";

const typeBadgeClassMap = {
  daily: "border-[color:var(--ui-success-border)] bg-[var(--ui-success-bg)] text-[var(--ui-success-text)]",
  advanced: "border-[color:var(--ui-action-blue-border)] bg-[var(--ui-action-blue-bg)] text-[var(--ui-action-blue-text)]",
  challenge: "border-[color:var(--ui-warning-border)] bg-[var(--ui-warning-bg)] text-[var(--ui-warning-text)]",
} as const;

const getTypeBadgeClass = (type: string) =>
  typeBadgeClassMap[type as keyof typeof typeBadgeClassMap] ?? typeBadgeClassMap.daily;

interface TemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
  templates: TaskTemplate[];
  onApply: (template: TaskTemplate) => void;
  onEdit: (template: TaskTemplate) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export default function TemplateManager({
  isOpen,
  onClose,
  templates,
  onApply,
  onEdit,
  onDelete,
  onNew
}: TemplateManagerProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="任务模板管理"
      width={920}
      footer={
        <Button
          onClick={onClose}
          className="w-full h-10 font-semibold rounded-xl shadow-sm hover:shadow-md transition-all"
          variant="secondary"
        >
          关闭
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--ui-text-muted)]">选择模板快速创建任务，或维护自己的常用模板。</p>
          <Button
            onClick={onNew}
            className="h-10 rounded-xl px-4"
          >
            <Plus size={16} />
            <span className="font-semibold">新建模板</span>
          </Button>
        </div>

        {templates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--ui-border)] bg-[var(--ui-surface-2)] py-14 text-center">
            <div className="text-3xl">📋</div>
            <p className="mt-3 text-sm font-medium text-[var(--ui-text-muted)]">暂无自定义模板</p>
            <Button onClick={onNew} className="mt-5 h-10 rounded-xl px-4">
              <Plus size={16} />
                <span className="font-semibold">新建模板</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 min-w-0">
            {templates.map((template) => (
              <div
                key={template._id}
                className="group rounded-2xl border border-[color:var(--ui-border)] bg-[var(--ui-surface-1)] p-4 shadow-[var(--ui-shadow-sm)] transition-all hover:border-[color:var(--ui-border-strong)] hover:shadow-[var(--ui-shadow-md)] min-w-0"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-[color:var(--ui-border)] bg-[var(--ui-surface-2)] text-2xl">
                    {template.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="truncate font-semibold text-[var(--ui-text-primary)]">{template.name}</h4>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getTypeBadgeClass(template.type)}`}>
                        {template.type === "daily" ? "日常" : template.type === "advanced" ? "进阶" : "挑战"}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--ui-text-muted)]">
                      {template.description || "点击应用此模板快速布置任务"}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[color:var(--ui-border)] bg-[var(--ui-surface-2)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--ui-text-secondary)]">
                        {template.points} 积分
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Button
                    onClick={() => onApply(template)}
                    className="flex-1 h-10 rounded-xl"
                  >
                    <Sparkles size={15} />
                    <span className="font-semibold">应用模板</span>
                  </Button>
                  <Button
                    onClick={() => onEdit(template)}
                    variant="secondary"
                    className="h-10 rounded-xl px-3"
                    title="编辑"
                  >
                    <Edit2 size={16} />
                    <span className="font-semibold">编辑</span>
                  </Button>
                  <Button
                    onClick={() => template._id && onDelete(template._id)}
                    variant="error"
                    className="h-10 rounded-xl px-3"
                    title="删除"
                  >
                    <Trash2 size={16} />
                    <span className="font-semibold">删除</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
