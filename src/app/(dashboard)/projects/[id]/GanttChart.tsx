'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task, TaskStatus, TradeType } from '@/types/database'
import {
  Plus,
  ZoomIn,
  ZoomOut,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react'
import { format, addDays } from 'date-fns'

const tradeTypes: { value: TradeType; label: string; color: string }[] = [
  { value: 'demolition', label: 'Demolition', color: '#ef4444' },
  { value: 'framing', label: 'Framing', color: '#f97316' },
  { value: 'plumbing', label: 'Plumbing', color: '#3b82f6' },
  { value: 'electrical', label: 'Electrical', color: '#eab308' },
  { value: 'hvac', label: 'HVAC', color: '#06b6d4' },
  { value: 'insulation', label: 'Insulation', color: '#ec4899' },
  { value: 'drywall', label: 'Drywall', color: '#8b5cf6' },
  { value: 'painting', label: 'Painting', color: '#10b981' },
  { value: 'flooring', label: 'Flooring', color: '#84cc16' },
  { value: 'roofing', label: 'Roofing', color: '#78716c' },
  { value: 'cabinets', label: 'Cabinets', color: '#a855f7' },
  { value: 'countertops', label: 'Countertops', color: '#14b8a6' },
  { value: 'tile', label: 'Tile', color: '#f43f5e' },
  { value: 'trim', label: 'Trim', color: '#6366f1' },
  { value: 'landscaping', label: 'Landscaping', color: '#22c55e' },
  { value: 'concrete', label: 'Concrete', color: '#64748b' },
  { value: 'other', label: 'Other', color: '#94a3b8' },
]

const getTradeColor = (trade: TradeType) => {
  return tradeTypes.find(t => t.value === trade)?.color || '#94a3b8'
}

interface GanttChartProps {
  projectId: string
  tasks: Task[]
  setTasks: (tasks: Task[]) => void
}

export default function GanttChart({ projectId, tasks, setTasks }: GanttChartProps) {
  const ganttContainer = useRef<HTMLDivElement>(null)
  const [ganttReady, setGanttReady] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(false)
  const [zoomLevel, setZoomLevel] = useState<'day' | 'week' | 'month'>('week')
  const supabase = createClient()

  const [formData, setFormData] = useState({
    name: '',
    trade_type: 'other' as TradeType,
    start_date: format(new Date(), 'yyyy-MM-dd'),
    duration_days: '5',
    assigned_to: '',
    notes: '',
    status: 'not_started' as TaskStatus,
  })

  // Initialize Gantt
  useEffect(() => {
    let gantt: any = null

    const initGantt = async () => {
      if (typeof window !== 'undefined' && ganttContainer.current) {
        const { gantt: dhtmlxGantt } = await import('dhtmlx-gantt')
        gantt = dhtmlxGantt

        // Import CSS
        await import('dhtmlx-gantt/codebase/dhtmlxgantt.css')

        // Configure Gantt
        gantt.config.date_format = '%Y-%m-%d'
        gantt.config.xml_date = '%Y-%m-%d'
        gantt.config.readonly = false
        gantt.config.drag_move = true
        gantt.config.drag_resize = true
        gantt.config.drag_progress = false
        gantt.config.drag_links = true
        gantt.config.auto_scheduling = true
        gantt.config.auto_scheduling_strict = true
        gantt.config.work_time = true
        gantt.config.correct_work_time = true
        gantt.config.fit_tasks = true

        // Set working days (Mon-Fri)
        gantt.setWorkTime({ day: 0, hours: false }) // Sunday
        gantt.setWorkTime({ day: 6, hours: false }) // Saturday

        // Dark theme styling
        gantt.config.columns = [
          { name: 'text', label: 'Task', tree: true, width: 200 },
          { name: 'start_date', label: 'Start', align: 'center', width: 90 },
          { name: 'duration', label: 'Days', align: 'center', width: 50 },
        ]

        // Scale configuration
        gantt.config.scale_unit = 'week'
        gantt.config.step = 1
        gantt.config.date_scale = 'Week %W'
        gantt.config.subscales = [
          { unit: 'day', step: 1, date: '%d %M' }
        ]
        gantt.config.scale_height = 60

        // Task template for colors
        gantt.templates.task_class = function(start: Date, end: Date, task: any) {
          return `trade-${task.trade_type || 'other'}`
        }

        // Grid styling
        gantt.templates.grid_row_class = function() {
          return 'gantt-row-dark'
        }

        // Initialize
        gantt.init(ganttContainer.current)
        setGanttReady(true)

        // Load tasks
        const ganttTasks = tasks.map(task => ({
          id: task.id,
          text: task.name,
          start_date: task.start_date,
          duration: task.duration_days,
          trade_type: task.trade_type,
          status: task.status,
          color: getTradeColor(task.trade_type),
          progress: task.status === 'completed' ? 1 : task.status === 'in_progress' ? 0.5 : 0,
        }))

        // Load links (dependencies)
        const links = tasks.flatMap(task =>
          (task.dependencies || []).map((depId, index) => ({
            id: `${task.id}-${depId}`,
            source: depId,
            target: task.id,
            type: '0', // finish-to-start
          }))
        )

        gantt.parse({ data: ganttTasks, links })

        // Event handlers
        gantt.attachEvent('onAfterTaskDrag', async function(id: string, mode: string) {
          const task = gantt.getTask(id)
          const startDate = gantt.date.date_to_str('%Y-%m-%d')(task.start_date)
          const endDate = gantt.date.date_to_str('%Y-%m-%d')(task.end_date)

          await updateTaskInDb(id, {
            start_date: startDate,
            end_date: endDate,
            duration_days: task.duration,
          })
        })

        gantt.attachEvent('onTaskDblClick', function(id: string) {
          const task = tasks.find(t => t.id === id)
          if (task) {
            setEditingTask(task)
            setFormData({
              name: task.name,
              trade_type: task.trade_type,
              start_date: task.start_date,
              duration_days: task.duration_days.toString(),
              assigned_to: task.assigned_to || '',
              notes: task.notes || '',
              status: task.status,
            })
            setShowTaskModal(true)
          }
          return false // Prevent default editor
        })

        gantt.attachEvent('onLinkCreated', async function(link: any) {
          const targetTask = tasks.find(t => t.id === link.target)
          if (targetTask) {
            const newDeps = [...(targetTask.dependencies || []), link.source]
            await updateTaskInDb(link.target, { dependencies: newDeps })
          }
          return true
        })
      }
    }

    initGantt()

    return () => {
      if (gantt) {
        gantt.clearAll()
      }
    }
  }, [])

  // Update gantt when tasks change
  useEffect(() => {
    const updateGantt = async () => {
      if (ganttReady && typeof window !== 'undefined') {
        const { gantt } = await import('dhtmlx-gantt')
        gantt.clearAll()

        const ganttTasks = tasks.map(task => ({
          id: task.id,
          text: task.name,
          start_date: task.start_date,
          duration: task.duration_days,
          trade_type: task.trade_type,
          status: task.status,
          color: getTradeColor(task.trade_type),
          progress: task.status === 'completed' ? 1 : task.status === 'in_progress' ? 0.5 : 0,
        }))

        const links = tasks.flatMap(task =>
          (task.dependencies || []).map((depId) => ({
            id: `${task.id}-${depId}`,
            source: depId,
            target: task.id,
            type: '0',
          }))
        )

        gantt.parse({ data: ganttTasks, links })
      }
    }
    updateGantt()
  }, [tasks, ganttReady])

  const updateTaskInDb = async (taskId: string, updates: Partial<Task>) => {
    const { error } = await supabase
      .from('tasks')
      .update(updates as any)
      .eq('id', taskId)

    if (!error) {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, ...updates } : t))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const startDate = new Date(formData.start_date)
    const endDate = addDays(startDate, parseInt(formData.duration_days))

    if (editingTask) {
      // Update existing task
      const { error } = await supabase
        .from('tasks')
        .update({
          name: formData.name,
          trade_type: formData.trade_type,
          start_date: formData.start_date,
          end_date: format(endDate, 'yyyy-MM-dd'),
          duration_days: parseInt(formData.duration_days),
          assigned_to: formData.assigned_to || null,
          notes: formData.notes || null,
          status: formData.status,
        } as any)
        .eq('id', editingTask.id)

      if (!error) {
        setTasks(tasks.map(t =>
          t.id === editingTask.id
            ? {
                ...t,
                name: formData.name,
                trade_type: formData.trade_type,
                start_date: formData.start_date,
                end_date: format(endDate, 'yyyy-MM-dd'),
                duration_days: parseInt(formData.duration_days),
                assigned_to: formData.assigned_to || null,
                notes: formData.notes || null,
                status: formData.status,
              }
            : t
        ))
      }
    } else {
      // Create new task
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          project_id: projectId,
          name: formData.name,
          trade_type: formData.trade_type,
          start_date: formData.start_date,
          end_date: format(endDate, 'yyyy-MM-dd'),
          duration_days: parseInt(formData.duration_days),
          assigned_to: formData.assigned_to || null,
          notes: formData.notes || null,
          status: formData.status,
          dependencies: [],
        } as any)
        .select()
        .single()

      if (!error && data) {
        setTasks([...tasks, data as Task])
      }
    }

    setShowTaskModal(false)
    setEditingTask(null)
    resetForm()
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!editingTask) return
    setLoading(true)

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', editingTask.id)

    if (!error) {
      setTasks(tasks.filter(t => t.id !== editingTask.id))
    }

    setShowTaskModal(false)
    setEditingTask(null)
    resetForm()
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      trade_type: 'other',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      duration_days: '5',
      assigned_to: '',
      notes: '',
      status: 'not_started',
    })
  }

  const handleZoom = async (level: 'day' | 'week' | 'month') => {
    setZoomLevel(level)
    if (typeof window !== 'undefined') {
      const { gantt } = await import('dhtmlx-gantt')

      switch (level) {
        case 'day':
          gantt.config.scale_unit = 'day'
          gantt.config.date_scale = '%d %M'
          gantt.config.subscales = []
          break
        case 'week':
          gantt.config.scale_unit = 'week'
          gantt.config.date_scale = 'Week %W'
          gantt.config.subscales = [{ unit: 'day', step: 1, date: '%d' }]
          break
        case 'month':
          gantt.config.scale_unit = 'month'
          gantt.config.date_scale = '%F %Y'
          gantt.config.subscales = [{ unit: 'week', step: 1, date: 'Week %W' }]
          break
      }
      gantt.render()
    }
  }

  const scrollToToday = async () => {
    if (typeof window !== 'undefined') {
      const { gantt } = await import('dhtmlx-gantt')
      gantt.showDate(new Date())
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingTask(null)
              resetForm()
              setShowTaskModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={scrollToToday}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Today
          </button>

          <div className="flex items-center bg-slate-700 rounded-lg">
            <button
              onClick={() => handleZoom('day')}
              className={`px-3 py-2 rounded-l-lg transition-colors ${
                zoomLevel === 'day' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => handleZoom('week')}
              className={`px-3 py-2 transition-colors ${
                zoomLevel === 'week' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => handleZoom('month')}
              className={`px-3 py-2 rounded-r-lg transition-colors ${
                zoomLevel === 'month' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {/* Trade Legend */}
      <div className="flex flex-wrap gap-2">
        {tradeTypes.slice(0, 10).map((trade) => (
          <div
            key={trade.value}
            className="flex items-center gap-2 px-3 py-1 bg-slate-800/50 rounded-lg text-sm"
          >
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: trade.color }}
            />
            <span className="text-slate-300">{trade.label}</span>
          </div>
        ))}
      </div>

      {/* Gantt Container */}
      <div
        ref={ganttContainer}
        className="w-full h-[500px] bg-slate-800 rounded-xl border border-slate-700 overflow-hidden"
        style={{
          // Custom CSS variables for dark theme
          // @ts-ignore
          '--dhtmlx-gantt-background-color': '#1e293b',
          '--dhtmlx-gantt-text-color': '#f1f5f9',
        }}
      />

      {/* Custom styles for dark theme */}
      <style jsx global>{`
        .gantt_container {
          background-color: #1e293b !important;
          font-family: inherit !important;
        }
        .gantt_grid, .gantt_grid_data, .gantt_task_bg, .gantt_task_scale {
          background-color: #1e293b !important;
        }
        .gantt_row, .gantt_row_odd {
          background-color: #1e293b !important;
        }
        .gantt_row:hover, .gantt_row_odd:hover {
          background-color: #334155 !important;
        }
        .gantt_cell, .gantt_grid_head_cell {
          color: #f1f5f9 !important;
          border-color: #334155 !important;
        }
        .gantt_scale_cell {
          color: #94a3b8 !important;
          background-color: #0f172a !important;
          border-color: #334155 !important;
        }
        .gantt_task_line {
          border-radius: 4px !important;
          border: none !important;
        }
        .gantt_task_content {
          color: white !important;
          font-weight: 500 !important;
        }
        .gantt_link_line_left, .gantt_link_line_right {
          background-color: #64748b !important;
        }
        .gantt_link_arrow_left, .gantt_link_arrow_right {
          border-color: #64748b !important;
        }
        .gantt_marker {
          background-color: #ef4444 !important;
        }
        .gantt_grid_scale, .gantt_task_scale {
          background-color: #0f172a !important;
        }
        .gantt_task_progress {
          background-color: rgba(0, 0, 0, 0.3) !important;
        }
      `}</style>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowTaskModal(false)
              setEditingTask(null)
              resetForm()
            }}
          />
          <div className="relative bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {editingTask ? 'Edit Task' : 'Add Task'}
              </h2>
              <button
                onClick={() => {
                  setShowTaskModal(false)
                  setEditingTask(null)
                  resetForm()
                }}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Task Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Kitchen Demo"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Trade Type
                  </label>
                  <select
                    value={formData.trade_type}
                    onChange={(e) => setFormData({ ...formData, trade_type: e.target.value as TradeType })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {tradeTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="delayed">Delayed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Duration (Days) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Assigned To
                </label>
                <input
                  type="text"
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Subcontractor or crew name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                {editingTask && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-xl transition-colors"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskModal(false)
                    setEditingTask(null)
                    resetForm()
                  }}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingTask ? 'Save Changes' : 'Add Task'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
