import { Button, Modal } from "@/components/ui";
import { Edit2, Plus, Sparkles, Trash2 } from "lucide-react";
import { TaskTemplate } from "../page";

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
          <p className="text-sm text-slate-500">选择模板快速创建任务，或维护自己的常用模板。</p>
          <Button
            onClick={onNew}
            className="h-10 rounded-xl bg-slate-900 px-4 text-white shadow-sm hover:bg-slate-800"
          >
            <Plus size={16} />
            <span className="font-semibold">新建模板</span>
          </Button>
        </div>

        {templates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center">
            <div className="text-3xl">📋</div>
            <p className="mt-3 text-sm font-medium text-slate-500">暂无自定义模板</p>
            <Button onClick={onNew} className="mt-5 h-10 rounded-xl bg-slate-900 px-4 text-white">
              <Plus size={16} />
                <span className="font-semibold">新建模板</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 min-w-0">
            {templates.map((template) => (
              <div
                key={template._id}
                className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md min-w-0"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-2xl">
                    {template.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="truncate font-semibold text-slate-900">{template.name}</h4>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        template.type === "daily"
                          ? "border-blue-100 bg-blue-50 text-blue-700"
                          : template.type === "advanced"
                            ? "border-stone-200 bg-stone-50 text-stone-700"
                            : "border-rose-100 bg-rose-50 text-rose-700"
                      }`}>
                        {template.type === "daily" ? "日常" : template.type === "advanced" ? "进阶" : "挑战"}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {template.description || "点击应用此模板快速布置任务"}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                        {template.points} 积分
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Button
                    onClick={() => onApply(template)}
                    className="flex-1 h-10 rounded-xl bg-slate-900 text-white shadow-sm hover:bg-slate-800"
                  >
                    <Sparkles size={15} />
                    <span className="font-semibold">应用模板</span>
                  </Button>
                  <Button
                    onClick={() => onEdit(template)}
                    variant="secondary"
                    className="h-10 w-10 rounded-xl border border-slate-200 bg-white p-0 text-slate-500 shadow-sm hover:text-slate-700 hover:bg-slate-50"
                    title="编辑"
                  >
                    <Edit2 size={16} />
                  </Button>
                  <Button
                    onClick={() => template._id && onDelete(template._id)}
                    variant="error"
                    className="h-10 w-10 rounded-xl p-0 shadow-sm"
                    title="删除"
                  >
                    <Trash2 size={16} />
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
