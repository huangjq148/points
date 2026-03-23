import { Button, Modal } from "@/components/ui";
import { Edit2, Plus, Trash2 } from "lucide-react";
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
      width={800}
      footer={
        <Button
          onClick={onClose}
          className="w-full py-3 font-semibold rounded-2xl shadow-sm hover:shadow-md transition-all"
          variant="secondary"
        >
          关闭
        </Button>
      }
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <p className="text-gray-500 text-sm">选择一个模板快速创建任务，或管理您的自定义模板</p>
        <Button
          onClick={onNew}
          className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap"
        >
          <Plus size={18} />
          <span className="font-semibold">新建模板</span>
        </Button>
      </div>
      <div className="py-2 -mx-2 px-2 overflow-x-auto">
        {templates.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-slate-400 font-medium">暂无自定义模板</p>
            <p className="text-slate-300 text-xs mt-1">点击&quot;新建模板&quot;开始创建</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 min-w-0">
            {templates.map((template) => (
              <div
                key={template._id}
                className="flex flex-col p-4 sm:p-5 rounded-3xl bg-white border border-gray-100 hover:border-slate-300 hover:shadow-lg transition-all duration-300 group relative overflow-hidden min-w-0"
              >
                <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4 relative">
                  <div className="text-2xl sm:text-3xl bg-slate-50 w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center rounded-2xl shadow-sm border border-slate-100 group-hover:bg-slate-100 transition-colors duration-300 flex-shrink-0">
                    {template.icon}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5 sm:pt-1">
                    <h4 className="font-bold text-gray-800 truncate text-base sm:text-lg group-hover:text-slate-900 transition-colors">{template.name}</h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1 sm:mt-2">
                      <span className="text-[10px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border border-slate-200 whitespace-nowrap">
                        {template.points} 积分
                      </span>
                      <Button
                        variant="secondary"
                        className={`text-[10px] px-2 py-0.5 h-auto rounded-lg font-bold uppercase tracking-wider border pointer-events-none shadow-none whitespace-nowrap ${
                          template.type === "daily" 
                            ? "bg-slate-50 text-slate-600 border-slate-200" 
                            : template.type === "advanced" 
                              ? "bg-stone-50 text-stone-600 border-stone-200" 
                              : "bg-neutral-50 text-neutral-600 border-neutral-200"
                        }`}
                      >
                        {template.type === "daily" ? "日常" : template.type === "advanced" ? "进阶" : "挑战"}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-500 line-clamp-2 mb-4 sm:mb-6 leading-relaxed relative">
                  {template.description || "点击应用此模板快速布置任务"}
                </p>
                
                <div className="flex gap-2 sm:gap-3 mt-auto relative">
                  <Button
                    onClick={() => onApply(template)}
                    className="flex-1 bg-slate-900 text-white hover:bg-slate-800 py-2 sm:py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors"
                  >
                    应用此模板
                  </Button>
                  <div className="flex gap-1.5 sm:gap-2">
                    <Button
                      onClick={() => onEdit(template)}
                      variant="secondary"
                      className="w-9 h-9 sm:w-10 sm:h-10 p-0 text-gray-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl border border-gray-100 bg-white transition-all shadow-sm flex-shrink-0"
                      title="编辑"
                    >
                      <Edit2 size={18} />
                    </Button>
                    <Button
                      onClick={() => template._id && onDelete(template._id)}
                      variant="error"
                      className="w-9 h-9 sm:w-10 sm:h-10 p-0 rounded-xl transition-all shadow-sm flex-shrink-0"
                      title="删除"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
