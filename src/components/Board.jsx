import { useState, useEffect, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core'

import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { supabase } from '../lib/supabase'
import Column from './Column'
import TaskCard from './TaskCard'
import TaskModal from './TaskModal'
import TaskTypeManager from './TaskTypeManager'

// Use pointer position as primary — falls back to rect intersection.
// This is critical for detecting drops on the full-width Bank/Done/Archived
// rows when dragging up/down from the day columns.
function collisionDetection(args) {
  const pointerCollisions = pointerWithin(args)
  if (pointerCollisions.length > 0) return pointerCollisions
  return rectIntersection(args)
}

const STATUSES = [
  { id: 'bank',      label: 'Bank',      layout: 'full' },
  { id: 'monday',    label: 'Monday',    layout: 'column' },
  { id: 'tuesday',   label: 'Tuesday',   layout: 'column' },
  { id: 'wednesday', label: 'Wednesday', layout: 'column' },
  { id: 'thursday',  label: 'Thursday',  layout: 'column' },
  { id: 'friday',    label: 'Friday',    layout: 'column' },
  { id: 'saturday',  label: 'Saturday',  layout: 'column' },
  { id: 'sunday',    label: 'Sunday',    layout: 'column' },
  { id: 'done',      label: 'Done',      layout: 'full' },
  { id: 'archived',  label: 'Archived',  layout: 'full' },
]

const DAY_STATUSES = STATUSES.filter(s => s.layout === 'column')
const FULL_STATUSES = STATUSES.filter(s => s.layout === 'full')
const STATUS_IDS = new Set(STATUSES.map(s => s.id))
const CLOSED_STATUSES = new Set(['done', 'archived'])

function buildGrouped(tasks) {
  const grouped = {}
  STATUSES.forEach(s => { grouped[s.id] = [] })
  tasks.forEach(task => {
    if (grouped[task.status]) {
      grouped[task.status].push(task)
    }
  })
  Object.keys(grouped).forEach(key => {
    grouped[key].sort((a, b) => a.position - b.position)
  })
  return grouped
}

export default function Board({ session }) {
  const userId = session.user.id
  const BRANDED_EMAILS = ['maybuny.hu@gmail.com', 'sidkapoor39@gmail.com']
  const isMay = BRANDED_EMAILS.includes(session.user.email?.toLowerCase())

  const [tasksByStatus, setTasksByStatus] = useState(() => buildGrouped([]))
  const [taskTypes, setTaskTypes] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [modalState, setModalState] = useState(null) // null | { task?: obj, initialStatus?: string }
  const [showTypeManager, setShowTypeManager] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [loading, setLoading] = useState(true)

  const draggedFromContainer = useRef(null)

  // ── Sensors ────────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // ── Data fetching ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAll()
  }, [userId])

  async function fetchAll() {
    setLoading(true)
    const [tasksRes, typesRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('position', { ascending: true }),
      supabase
        .from('task_types')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
    ])
    if (tasksRes.data) setTasksByStatus(buildGrouped(tasksRes.data))
    if (typesRes.data) setTaskTypes(typesRes.data)
    setLoading(false)
  }

  // ── DnD helpers ────────────────────────────────────────────────────────────
  function findContainer(id) {
    if (STATUS_IDS.has(id)) return id
    for (const [colId, tasks] of Object.entries(tasksByStatus)) {
      if (tasks.some(t => t.id === id)) return colId
    }
    return null
  }

  function getActiveTask() {
    if (!activeId) return null
    return Object.values(tasksByStatus).flat().find(t => t.id === activeId) ?? null
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────
  function handleDragStart({ active }) {
    setActiveId(active.id)
    draggedFromContainer.current = findContainer(active.id)
  }

  function handleDragOver({ active, over }) {
    if (!over) return
    const activeContainer = findContainer(active.id)
    const overContainer = findContainer(over.id)
    if (!activeContainer || !overContainer || activeContainer === overContainer) return

    setTasksByStatus(prev => {
      const srcItems = [...prev[activeContainer]]
      const dstItems = [...prev[overContainer]]
      const activeIndex = srcItems.findIndex(t => t.id === active.id)
      if (activeIndex === -1) return prev

      const [moved] = srcItems.splice(activeIndex, 1)
      const movedTask = { ...moved, status: overContainer }

      const overIndex = dstItems.findIndex(t => t.id === over.id)
      if (overIndex === -1) {
        dstItems.push(movedTask)
      } else {
        dstItems.splice(overIndex, 0, movedTask)
      }

      return { ...prev, [activeContainer]: srcItems, [overContainer]: dstItems }
    })
  }

  async function handleDragEnd({ active, over }) {
    const activeId = active.id
    setActiveId(null)

    if (!over) {
      // Dropped outside — revert to last persisted state
      fetchAll()
      draggedFromContainer.current = null
      return
    }

    const originalContainer = draggedFromContainer.current
    const currentContainer = findContainer(activeId)
    draggedFromContainer.current = null

    if (!currentContainer) return

    if (originalContainer === currentContainer) {
      // Same-container reorder
      const items = tasksByStatus[currentContainer]
      const activeIndex = items.findIndex(t => t.id === activeId)
      const overIndex = items.findIndex(t => t.id === over.id)

      let finalItems = items
      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        finalItems = arrayMove(items, activeIndex, overIndex)
        setTasksByStatus(prev => ({ ...prev, [currentContainer]: finalItems }))
      }

      await syncColumn(currentContainer, finalItems)
    } else {
      // Cross-container move (state already updated in onDragOver)
      const now = new Date().toISOString()
      const srcItems = tasksByStatus[originalContainer]
      const dstItems = tasksByStatus[currentContainer].map(t => {
        if (CLOSED_STATUSES.has(currentContainer) && !t.closed_at) return { ...t, closed_at: now }
        if (!CLOSED_STATUSES.has(currentContainer) && t.closed_at) return { ...t, closed_at: null }
        return t
      })

      setTasksByStatus(prev => ({ ...prev, [originalContainer]: srcItems, [currentContainer]: dstItems }))

      await Promise.all([
        syncColumn(originalContainer, srcItems),
        syncColumn(currentContainer, dstItems),
      ])
    }
  }

  async function syncColumn(status, items) {
    if (items.length === 0) return
    const now = new Date().toISOString()
    await Promise.all(
      items.map((task, i) => {
        const update = { status, position: i }
        if (CLOSED_STATUSES.has(status) && !task.closed_at) update.closed_at = now
        else if (!CLOSED_STATUSES.has(status) && task.closed_at) update.closed_at = null
        return supabase.from('tasks').update(update).eq('id', task.id)
      })
    )
  }

  // ── Task CRUD ──────────────────────────────────────────────────────────────
  function handleTaskSave(savedTask) {
    setTasksByStatus(prev => {
      const next = { ...prev }
      // Remove from old location (in case status changed during edit)
      Object.keys(next).forEach(key => {
        next[key] = next[key].filter(t => t.id !== savedTask.id)
      })
      // Insert at end of new status column
      const col = next[savedTask.status] ?? []
      next[savedTask.status] = [...col, savedTask]
      return next
    })
    setModalState(null)
  }

  function handleTaskDelete(taskId) {
    setTasksByStatus(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(key => {
        next[key] = next[key].filter(t => t.id !== taskId)
      })
      return next
    })
    setModalState(null)
  }

  // ── Bulk actions ───────────────────────────────────────────────────────────
  async function handleArchiveAll() {
    const doneTasks = tasksByStatus['done'] ?? []
    if (doneTasks.length === 0) return
    const archivedCount = tasksByStatus['archived']?.length ?? 0
    const now = new Date().toISOString()
    await Promise.all(
      doneTasks.map((task, i) =>
        supabase.from('tasks').update({
          status: 'archived',
          position: archivedCount + i,
          closed_at: task.closed_at || now,
        }).eq('id', task.id)
      )
    )
    setTasksByStatus(prev => ({
      ...prev,
      done: [],
      archived: [
        ...(prev.archived ?? []),
        ...doneTasks.map((t, i) => ({ ...t, status: 'archived', position: archivedCount + i, closed_at: t.closed_at || now })),
      ],
    }))
  }

  async function handleDeleteArchive() {
    const archivedTasks = tasksByStatus['archived'] ?? []
    if (archivedTasks.length === 0) return
    if (!window.confirm(`Permanently delete all ${archivedTasks.length} archived task${archivedTasks.length === 1 ? '' : 's'}? This cannot be undone.`)) return
    await supabase.from('tasks').delete().eq('user_id', userId).eq('status', 'archived')
    setTasksByStatus(prev => ({ ...prev, archived: [] }))
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading board...</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-pink-50">
      {/* Header */}
      <header className="bg-white border-b border-pink-100 px-3 md:px-5 py-3 flex items-center justify-between flex-shrink-0 shadow-sm">
        <h1 className="flex-shrink-0 text-base font-bold text-rose-700 tracking-tight">
          <span className="md:hidden">🐰 BCM To-Do List</span>
          <span className="hidden md:inline">🐰 {isMay ? 'Bunny and Cage Master To-Do List' : 'BCM To-Do List'}</span>
        </h1>
        <div className="flex items-center gap-2">
          {/* Mobile: + button + ⋯ menu */}
          <button
            onClick={() => setModalState({})}
            className="md:hidden w-8 h-8 flex items-center justify-center bg-rose-400 hover:bg-rose-500 text-white font-bold text-lg rounded-full transition-colors"
          >
            +
          </button>
          <div className="relative md:hidden">
            <button
              onClick={() => setShowMenu(v => !v)}
              className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-pink-50 rounded-full transition-colors text-xl leading-none"
            >
              ···
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-pink-100 z-20 min-w-[160px] py-1 overflow-hidden">
                  <button
                    onClick={() => { setShowTypeManager(true); setShowMenu(false) }}
                    className="w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-pink-50 text-left"
                  >
                    Manage Types
                  </button>
                  <button
                    onClick={() => supabase.auth.signOut()}
                    className="w-full px-4 py-2.5 text-sm text-slate-500 hover:bg-pink-50 text-left"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Desktop: full buttons */}
          <button
            onClick={() => setModalState({})}
            className="hidden md:block py-1.5 px-3 text-xs bg-rose-400 hover:bg-rose-500 text-white font-medium rounded-lg transition-colors"
          >
            + New Task
          </button>
          <button
            onClick={() => setShowTypeManager(true)}
            className="hidden md:block py-1.5 px-3 text-xs text-slate-600 hover:bg-pink-50 rounded-lg transition-colors"
          >
            Manage Types
          </button>
          <span className="text-xs text-slate-400 hidden md:block">{session.user.email}</span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="hidden md:block py-1.5 px-3 text-xs text-slate-500 hover:bg-pink-50 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">

          {/* Bank — full width */}
          <div className="bg-white rounded-xl border border-pink-100 shadow-sm p-3">
            <Column
              id="bank"
              label="Bank"
              tasks={tasksByStatus['bank'] ?? []}
              taskTypes={taskTypes}
              layout="grid"
              onTaskEdit={task => setModalState({ task })}
              onAddTask={status => setModalState({ initialStatus: status })}
            />
          </div>

          {/* Mon–Sun — scrollable on mobile, 7-column grid on desktop */}
          <div className="flex gap-3 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
            {DAY_STATUSES.map(s => (
              <div key={s.id} className="bg-white rounded-xl border border-pink-100 shadow-sm p-3 flex flex-col min-h-[200px] flex-shrink-0 w-64 lg:w-auto">
                <Column
                  id={s.id}
                  label={s.label}
                  tasks={tasksByStatus[s.id] ?? []}
                  taskTypes={taskTypes}
                  layout="list"
                  onTaskEdit={task => setModalState({ task })}
                  onAddTask={status => setModalState({ initialStatus: status })}
                />
              </div>
            ))}
          </div>

          {/* Done — full width */}
          <div className="bg-white rounded-xl border border-pink-100 shadow-sm p-3">
            <Column
              id="done"
              label="Done"
              tasks={tasksByStatus['done'] ?? []}
              taskTypes={taskTypes}
              layout="grid"
              onTaskEdit={task => setModalState({ task })}
              onAddTask={status => setModalState({ initialStatus: status })}
              headerAction={
                (tasksByStatus['done']?.length ?? 0) > 0 && (
                  <button
                    onClick={handleArchiveAll}
                    className="px-2.5 py-0.5 text-xs bg-rose-100 hover:bg-rose-200 text-rose-600 font-medium rounded-md transition-colors"
                  >
                    Archive
                  </button>
                )
              }
            />
          </div>

          {/* Archived — full width */}
          <div className="bg-white rounded-xl border border-pink-100 shadow-sm p-3">
            <Column
              id="archived"
              label="Archived"
              tasks={tasksByStatus['archived'] ?? []}
              taskTypes={taskTypes}
              layout="grid"
              onTaskEdit={task => setModalState({ task })}
              onAddTask={status => setModalState({ initialStatus: status })}
              headerAction={
                (tasksByStatus['archived']?.length ?? 0) > 0 && (
                  <button
                    onClick={handleDeleteArchive}
                    className="px-2.5 py-0.5 text-xs bg-red-100 hover:bg-red-200 text-red-600 font-medium rounded-md transition-colors"
                  >
                    Delete Archive
                  </button>
                )
              }
            />
          </div>

        </div>

        {/* Footer */}
        <div className="flex-shrink-0 text-center py-2 text-xs text-rose-300 select-none">
          {isMay ? '🐾 designed for May Joy Hu 🐾' : 'Designed by Sid Kapoor'}
        </div>

        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
          {activeId ? (
            <TaskCard
              task={getActiveTask()}
              taskType={taskTypes.find(tt => tt.id === getActiveTask()?.task_type_id)}
              onEdit={() => {}}
              isDragOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task create/edit modal */}
      {modalState !== null && (
        <TaskModal
          task={modalState.task ?? null}
          taskTypes={taskTypes}
          userId={userId}
          initialStatus={modalState.initialStatus ?? 'bank'}
          onClose={() => setModalState(null)}
          onSave={handleTaskSave}
          onDelete={handleTaskDelete}
        />
      )}

      {/* Task type manager modal */}
      {showTypeManager && (
        <TaskTypeManager
          taskTypes={taskTypes}
          userId={userId}
          onClose={() => setShowTypeManager(false)}
          onChange={setTaskTypes}
        />
      )}
    </div>
  )
}
