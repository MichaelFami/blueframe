'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Project, ProjectStatus, ProjectType } from '@/types/database'
import {
  Plus,
  MapPin,
  Calendar,
  DollarSign,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  X,
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'

const statusColors: Record<ProjectStatus, { bg: string; text: string; dot: string }> = {
  planning: { bg: 'bg-purple-500/20', text: 'text-purple-300', dot: 'bg-purple-400' },
  active: { bg: 'bg-blue-500/20', text: 'text-blue-300', dot: 'bg-blue-400' },
  on_hold: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  completed: { bg: 'bg-green-500/20', text: 'text-green-300', dot: 'bg-green-400' },
}

const projectTypes: { value: ProjectType; label: string }[] = [
  { value: 'new_build', label: 'New Build' },
  { value: 'remodel', label: 'Remodel' },
  { value: 'addition', label: 'Addition' },
  { value: 'renovation', label: 'Renovation' },
]

interface ProjectsListProps {
  initialProjects: Project[]
}

export default function ProjectsList({ initialProjects }: ProjectsListProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<ProjectStatus | 'all'>('all')
  const router = useRouter()
  const supabase = createClient()

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    type: 'new_build' as ProjectType,
    square_footage: '',
    total_budget: '',
    start_date: '',
    estimated_completion_date: '',
    notes: '',
  })

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: formData.name,
        address: formData.address,
        type: formData.type,
        square_footage: formData.square_footage ? parseInt(formData.square_footage) : null,
        total_budget: formData.total_budget ? parseFloat(formData.total_budget) : null,
        start_date: formData.start_date || null,
        estimated_completion_date: formData.estimated_completion_date || null,
        notes: formData.notes || null,
        status: 'planning' as const,
      } as any)
      .select()
      .single()

    if (error) {
      console.error('Error creating project:', error)
      alert('Failed to create project')
    } else if (data) {
      setProjects([data, ...projects])
      setShowModal(false)
      setFormData({
        name: '',
        address: '',
        type: 'new_build',
        square_footage: '',
        total_budget: '',
        start_date: '',
        estimated_completion_date: '',
        notes: '',
      })
    }

    setLoading(false)
  }

  const filteredProjects = filter === 'all'
    ? projects
    : projects.filter(p => p.status === filter)

  const getProjectHealth = (project: Project) => {
    // Simple health check - can be expanded later with actual cost data
    if (project.status === 'completed') return 'good'
    if (project.estimated_completion_date) {
      const daysRemaining = differenceInDays(new Date(project.estimated_completion_date), new Date())
      if (daysRemaining < 0) return 'danger'
      if (daysRemaining < 7) return 'warning'
    }
    return 'good'
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Projects</h1>
          <p className="text-slate-400 mt-1">Manage your construction projects</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['all', 'active', 'planning', 'on_hold', 'completed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ')}
            {status !== 'all' && (
              <span className="ml-2 text-sm opacity-70">
                ({projects.filter(p => p.status === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/50 rounded-2xl border border-slate-700">
          <div className="w-16 h-16 bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
          <p className="text-slate-400 mb-6">Create your first project to get started</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
          >
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const health = getProjectHealth(project)
            const colors = statusColors[project.status]

            return (
              <div
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 hover:border-blue-500/50 hover:bg-slate-800 transition-all cursor-pointer group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-slate-400">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm truncate">{project.address}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-3 mb-4">
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}>
                    <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                    {project.status.replace('_', ' ')}
                  </span>
                  {health === 'warning' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300">
                      <AlertTriangle className="w-3 h-3" />
                      Due soon
                    </span>
                  )}
                  {health === 'danger' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300">
                      <AlertTriangle className="w-3 h-3" />
                      Overdue
                    </span>
                  )}
                </div>

                {/* Meta Info */}
                <div className="space-y-2 text-sm">
                  {project.estimated_completion_date && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar className="w-4 h-4" />
                      <span>Due {format(new Date(project.estimated_completion_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {project.total_budget && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <DollarSign className="w-4 h-4" />
                      <span>Budget: ${project.total_budget.toLocaleString()}</span>
                    </div>
                  )}
                  {project.square_footage && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="w-4 h-4 text-center text-xs font-bold">ft²</span>
                      <span>{project.square_footage.toLocaleString()} sq ft</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">New Project</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Smith Residence Remodel"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Address *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="123 Main St, Austin, TX"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Project Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as ProjectType })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {projectTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Square Footage
                  </label>
                  <input
                    type="number"
                    value={formData.square_footage}
                    onChange={(e) => setFormData({ ...formData, square_footage: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="2,400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Total Budget
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={formData.total_budget}
                    onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
                    className="w-full pl-8 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="150,000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Est. Completion
                  </label>
                  <input
                    type="date"
                    value={formData.estimated_completion_date}
                    onChange={(e) => setFormData({ ...formData, estimated_completion_date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                      Creating...
                    </>
                  ) : (
                    'Create Project'
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
