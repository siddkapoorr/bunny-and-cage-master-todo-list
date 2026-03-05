import { useState } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULT_COLORS = [
  // Row 1 — Reds → Oranges → Ambers  (hue ~0° → 43°)
  '#ef4444', '#f87171', '#f97316', '#fb923c', '#f59e0b', '#fbbf24',
  // Row 2 — Emerald → Teal → Cyan → Blue  (hue ~161° → 217°)
  '#10b981', '#34d399', '#2dd4bf', '#06b6d4', '#3b82f6', '#60a5fa',
  // Row 3 — Indigo → Purple → Fuchsia  (hue ~239° → 293°)
  '#6366f1', '#818cf8', '#a855f7', '#c084fc', '#d946ef', '#e879f9',
  // Row 4 — Pink → Rose  (hue ~322° → 351°)
  '#be185d', '#ec4899', '#f472b6', '#e11d48', '#f43f5e', '#fb7185',
]

// 6-column grid keeps the 4 themed rows visually intact
function ColorGrid({ selected, onSelect }) {
  return (
    <div className="grid grid-cols-6 gap-1">
      {DEFAULT_COLORS.map(c => (
        <button
          type="button"
          key={c}
          onClick={() => onSelect(c)}
          className="w-6 h-6 rounded-full transition-transform hover:scale-110 flex-shrink-0"
          style={{
            backgroundColor: c,
            outline: selected === c ? `2px solid ${c}` : 'none',
            outlineOffset: 2,
          }}
        />
      ))}
    </div>
  )
}

function TypeRow({ type, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(type.name)
  const [color, setColor] = useState(type.color)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setLoading(true)
    const { data, error } = await supabase
      .from('task_types')
      .update({ name: name.trim(), color })
      .eq('id', type.id)
      .select()
      .single()
    setLoading(false)
    if (!error) {
      onUpdate(data)
      setEditing(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete type "${type.name}"? Tasks using it will become untyped.`)) return
    setLoading(true)
    const { error } = await supabase.from('task_types').delete().eq('id', type.id)
    if (!error) onDelete(type.id)
    setLoading(false)
  }

  if (editing) {
    return (
      <div className="p-2 bg-slate-50 rounded-lg space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="flex-1 px-2 py-1 text-sm rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
            autoFocus
          />
          <button
            onClick={handleSave}
            disabled={loading || !name.trim()}
            className="px-2 py-1 text-xs bg-rose-400 text-white rounded hover:bg-rose-500 disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => { setEditing(false); setName(type.name); setColor(type.color) }}
            className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-200 rounded"
          >
            Cancel
          </button>
        </div>
        <div className="flex items-end gap-2">
          <ColorGrid selected={color} onSelect={setColor} />
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent flex-shrink-0"
            title="Custom color"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-2 py-2 hover:bg-slate-50 rounded-lg group">
      <span
        className="w-4 h-4 rounded-full flex-shrink-0"
        style={{ backgroundColor: type.color }}
      />
      <span className="flex-1 text-sm text-slate-700">{type.name}</span>
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 hover:bg-slate-200 rounded"
      >
        Edit
      </button>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 hover:bg-red-50 rounded"
      >
        Delete
      </button>
    </div>
  )
}

export default function TaskTypeManager({ taskTypes, userId, onClose, onChange }) {
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(DEFAULT_COLORS[0])
  const [adding, setAdding] = useState(false)

  async function handleAdd(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    const { data, error } = await supabase
      .from('task_types')
      .insert({ name: newName.trim(), color: newColor, user_id: userId })
      .select()
      .single()
    setAdding(false)
    if (!error) {
      onChange([...taskTypes, data])
      setNewName('')
      setNewColor(DEFAULT_COLORS[0])
    }
  }

  function handleUpdate(updated) {
    onChange(taskTypes.map(tt => tt.id === updated.id ? updated : tt))
  }

  function handleDelete(id) {
    onChange(taskTypes.filter(tt => tt.id !== id))
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Task Types</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-1 max-h-64 overflow-y-auto">
          {taskTypes.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No types yet. Add one below!</p>
          )}
          {taskTypes.map(tt => (
            <TypeRow
              key={tt.id}
              type={tt}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>

        <div className="p-4 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-500 mb-3">Add new type</p>
          <form onSubmit={handleAdd} className="space-y-3">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Type name (e.g. Work, Personal)"
              className="w-full px-3 py-2 rounded-lg border border-pink-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
            />
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Color</span>
                <input
                  type="color"
                  value={newColor}
                  onChange={e => setNewColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
                  title="Custom color"
                />
              </div>
              <ColorGrid selected={newColor} onSelect={setNewColor} />
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: newColor }}
              />
              <span className="text-xs text-slate-500">{newName || 'Preview'}</span>
            </div>
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              className="w-full py-2 text-sm bg-rose-400 hover:bg-rose-500 disabled:bg-rose-200 text-white font-medium rounded-lg transition-colors"
            >
              {adding ? 'Adding...' : 'Add Type'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
