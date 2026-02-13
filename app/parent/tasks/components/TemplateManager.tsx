import { TaskTemplate } from "../page";
import { Button, Modal, Input } from "@/components/ui";
import { Edit2, Trash2, Plus } from "lucide-react";

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
      width="max-w-4xl"
      footer={
        <Button
          onClick={onClose}
          className="w-full py-3 font-semibold"
          variant="error"
        >
          关闭
        </Button>
      }
    >
      <div className="flex justify-end mb-4">
        <Button
          onClick={onNew}
          className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-none px-4 py-2 rounded-xl flex items-center gap-1 shadow-none"
          variant="secondary"
        >
          <Plus size={18} />
          <span>新建模板</span>
        </Button>
      </div>
      <div className="py-2">
        {templates.length === 0 ? (
          <div className="text-center py-12 text-gray-400 italic">暂无自定义模板</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <div
                key={template._id}
                className="flex flex-col p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-200 transition-all group relative"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="text-3xl bg-white w-14 h-14 flex items-center justify-center rounded-2xl shadow-sm border border-gray-50">
                    {template.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-800 truncate text-lg">{template.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 font-bold uppercase tracking-wider">
                        {template.points} 积分
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-bold uppercase tracking-wider">
                        {template.type === "daily" ? "日常" : template.type === "advanced" ? "进阶" : "挑战"}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">{template.description || "无描述"}</p>
                <div className="flex gap-2 mt-auto">
                  <Button
                    onClick={() => onApply(template)}
                    className="flex-1 bg-blue-600 text-white hover:bg-blue-700 py-2 rounded-xl text-sm font-semibold shadow-sm shadow-blue-100"
                  >
                    应用此模板
                  </Button>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => onEdit(template)}
                      variant="secondary"
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-transparent hover:border-blue-100 bg-transparent shadow-none"
                    >
                      <Edit2 size={18} />
                    </Button>
                    <Button
                      onClick={() => template._id && onDelete(template._id)}
                      variant="secondary"
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100 bg-transparent shadow-none"
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
