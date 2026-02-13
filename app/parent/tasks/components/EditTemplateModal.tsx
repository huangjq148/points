import { TaskTemplate } from "../page";
import { Button, Modal, Input } from "@/components/ui";

interface EditTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTemplate: TaskTemplate | null;
  setEditingTemplate: (template: TaskTemplate | null) => void;
  onUpdate: (e: React.FormEvent) => void;
}

export default function EditTemplateModal({
  isOpen,
  onClose,
  editingTemplate,
  setEditingTemplate,
  onUpdate
}: EditTemplateModalProps) {
  if (!editingTemplate) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingTemplate?._id ? "编辑模板" : "新建模板"}
      width="max-w-md"
    >
      <form onSubmit={onUpdate} className="space-y-4 py-2">
        <Input
          label="模板名称"
          value={editingTemplate.name}
          onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
          placeholder="如：认真写作业"
          required
        />
        <Input
          label="模板描述"
          value={editingTemplate.description}
          onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
          placeholder="模板描述信息"
        />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">积分</label>
            <Input
              type="number"
              value={editingTemplate.points}
              onChange={(e) => setEditingTemplate({ ...editingTemplate, points: parseInt(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">图标</label>
            <div className="flex gap-2">
              <Input
                value={editingTemplate.icon}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, icon: e.target.value })}
                className="text-center text-xl"
              />
              <div className="flex flex-wrap gap-1 w-24">
                {["⭐", "📚", "🧹", "🏃", "🎨"].map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setEditingTemplate({ ...editingTemplate, icon: i })}
                    className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded hover:bg-gray-200"
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">任务类型</label>
          <div className="flex gap-2">
            {["daily", "advanced", "challenge"].map((type) => (
              <Button
                key={type}
                type="button"
                onClick={() => setEditingTemplate({ ...editingTemplate, type })}
                variant="secondary"
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all shadow-none ${
                  editingTemplate.type === type
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-blue-50"
                }`}
              >
                {type === "daily" ? "日常" : type === "advanced" ? "进阶" : "挑战"}
              </Button>
            ))}
          </div>
        </div>
        <div className="pt-4 flex gap-3">
          <Button
            onClick={onClose}
            variant="error"
            className="flex-1 py-3 font-semibold"
            type="button"
          >
            取消
          </Button>
          <Button className="flex-1 py-3 bg-blue-600 text-white hover:bg-blue-700" type="submit">
            确定
          </Button>
        </div>
      </form>
    </Modal>
  );
}
