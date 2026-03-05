import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const STATUSES = [
  { id: 'bank', label: 'Bank' },
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' },
  { id: 'done', label: 'Done' },
  { id: 'archived', label: 'Archived' },
]

export default function TaskModal({ task, taskTypes, userId, initialStatus, onClose, onSave, onDelete }) {
  const isEditing = !!task?.id
  const [name, setName] = useState(task?.name ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [taskTypeId, setTaskTypeId] = useState(task?.task_type_id ?? '')
  const [status, setStatus] = useState(task?.status ?? initialStatus ?? 'bank')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const nameRef = useRef(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    try {
      if (isEditing) {
        const { data, error } = await supabase
          .from('tasks')
          .update({
            name: name.trim(),
            description: description.trim(),
            task_type_id: taskTypeId || null,
            status,
          })
          .eq('id', task.id)
          .select('*, task_types(*)')
          .single()
        if (error) throw error
        onSave(data)
      } else {
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            name: name.trim(),
            description: description.trim(),
            task_type_id: taskTypeId || null,
            status,
            user_id: userId,
            position: 9999,
          })
          .select('*, task_types(*)')
          .single()
        if (error) throw error
        onSave(data)
      }
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this task?')) return
    setLoading(true)
    const { error } = await supabase.from('tasks').delete().eq('id', task.id)
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      onDelete(task.id)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">
            {isEditing ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="Task name"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <select
                value={taskTypeId}
                onChange={e => setTaskTypeId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent bg-white"
              >
                <option value="">No type</option>
                {taskTypes.map(tt => (
                  <option key={tt.id} value={tt.id}>{tt.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent bg-white"
              >
                {STATUSES.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Type color preview */}
          {taskTypeId && (() => {
            const tt = taskTypes.find(t => t.id === taskTypeId)
            return tt ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tt.color }}
                />
                <span>This task will be color-coded with <strong>{tt.name}</strong></span>
              </div>
            ) : null
          })()}

          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-3 py-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                Delete
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="px-4 py-2 text-sm bg-rose-400 hover:bg-rose-500 disabled:bg-rose-200 text-white font-medium rounded-lg transition-colors"
              >
                {loading ? 'Saving...' : isEditing ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
