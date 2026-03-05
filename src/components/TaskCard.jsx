import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function TaskCard({ task, taskType, onEdit, isDragOverlay = false }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const accentColor = taskType?.color || '#6366f1'

  const cardContent = (
    <div
      className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm cursor-grab active:cursor-grabbing select-none"
      style={{ borderLeftWidth: 3, borderLeftColor: accentColor }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-800 leading-snug flex-1 min-w-0 truncate">
          {task.name}
        </p>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onEdit() }}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors text-sm"
          title="Edit task"
        >
          ✎
        </button>
      </div>
      {task.description && (
        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}
      {taskType && (
        <span
          className="inline-block mt-2 px-1.5 py-0.5 rounded text-xs font-medium text-white"
          style={{ backgroundColor: accentColor }}
        >
          {taskType.name}
        </span>
      )}
    </div>
  )

  if (isDragOverlay) {
    return (
      <div className="rotate-2 scale-105 opacity-95 shadow-xl">
        {cardContent}
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'opacity-30' : ''}
      {...attributes}
      {...listeners}
    >
      {cardContent}
    </div>
  )
}
