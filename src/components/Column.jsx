import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, rectSortingStrategy } from '@dnd-kit/sortable'
import TaskCard from './TaskCard'

// layout: 'list' (day columns) | 'grid' (Bank, Done, Archived full-width rows)
export default function Column({ id, label, tasks, taskTypes, layout = 'list', onTaskEdit, onAddTask, headerAction }) {
  const { isOver, setNodeRef } = useDroppable({ id })

  const isGrid = layout === 'grid'
  const strategy = isGrid ? rectSortingStrategy : verticalListSortingStrategy

  return (
    <div ref={setNodeRef} className="flex flex-col min-h-0 h-full">
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
          {tasks.length > 0 && (
            <span className="ml-1.5 text-slate-400 font-normal normal-case">
              {tasks.length}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-1">
          {headerAction}
          <button
            onClick={() => onAddTask(id)}
            className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors text-base leading-none"
            title={`Add task to ${label}`}
          >
            +
          </button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={`
          flex-1 rounded-lg transition-colors min-h-[60px] overflow-y-auto
          ${isGrid
            ? 'grid gap-2 p-2 content-start'
            : 'flex flex-col gap-2 p-2'
          }
          ${isOver ? 'bg-rose-50 ring-2 ring-rose-200 ring-inset' : 'bg-pink-50/60'}
        `}
        style={isGrid ? { gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' } : undefined}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={strategy}>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              taskType={taskTypes.find(tt => tt.id === task.task_type_id)}
              onEdit={() => onTaskEdit(task)}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-full min-h-[40px]">
            <span className="text-xs text-slate-300">Empty</span>
          </div>
        )}
      </div>
    </div>
  )
}
