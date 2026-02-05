'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Project, Task, Budget, Photo, Document, ProjectStatus } from '@/types/database'
import {
  ArrowLeft,
  MapPin,
  Calendar,
  DollarSign,
  Edit2,
  Trash2,
  LayoutDashboard,
  CalendarDays,
  PiggyBank,
  Camera,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MoreVertical,
  Loader2,
  X,
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import GanttChart from './GanttChart'
import BudgetTab from './BudgetTab'
import PhotosTab from './PhotosTab'
import DocumentsTab from './DocumentsTab'

const statusColors: Record<ProjectStatus, { bg: string; text: string; dot: string }> = {
  planning: { bg: 'bg-purple-500/20', text: 'text-purple-300', dot: 'bg-purple-400' },
  active: { bg: 'bg-blue-500/20', text: 'text-blue-300', dot: 'bg-blue-400' },
  on_hold: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  completed: { bg: 'bg-green-500/20', text: 'text-green-300', dot: 'bg-green-400' },
}

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays },
  { id: 'budget', label: 'Budget', icon: PiggyBank },
  { id: 'photos', label: 'Photos', icon: Camera },
  { id: 'documents', label: 'Documents', icon: FileText },
]

interface ProjectDetailProps {
  project: Project
  initialTasks: Task[]
  initialBudgets: Budget[]
  initialPhotos: Photo[]
  initialDocuments: Document[]
}

export default function ProjectDetail({ project: initialProject, initialTasks, initialBudgets, initialPhotos, initialDocuments }: ProjectDetailProps) {
  const [project, setProject] = useState<Project>(initialProject)
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [budgets, setBudgets] = useState<Budget[]>(initialBudgets)
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [activeTab, setActiveTab] = useState('overview')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const colors = statusColors[project.status]

  const daysRemaining = project.estimated_completion_date
    ? differenceInDays(new Date(project.estimated_completion_date), new Date())
    : null

  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const totalTasks = tasks.length
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', project.id)

    if (error) {
      console.error('Error deleting project:', error)
      alert('Failed to delete project')
      setDeleting(false)
    } else {
      router.push('/projects')
    }
  }

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    const { error } = await supabase
      .from('projects')
      .update({ status: newStatus } as any)
      .eq('id', project.id)

    if (!error) {
      setProject({ ...project, status: newStatus })
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Back button & Header */}
      <div className="mb-6">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
                {project.name}
              </h1>
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text} flex-shrink-0`}>
                <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                {project.status.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{project.address}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status dropdown */}
            <select
              value={project.status}
              onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
              className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>

            <button
              onClick={() => setShowEditModal(true)}
              className="p-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors"
            >
              <Edit2 className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-xl transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Calendar className="w-4 h-4" />
            Days Remaining
          </div>
          <div className="text-2xl font-bold text-white">
            {daysRemaining !== null ? (
              daysRemaining >= 0 ? daysRemaining : (
                <span className="text-red-400">{Math.abs(daysRemaining)} overdue</span>
              )
            ) : '—'}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <CheckCircle2 className="w-4 h-4" />
            Tasks Complete
          </div>
          <div className="text-2xl font-bold text-white">
            {completedTasks}/{totalTasks}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            Budget
          </div>
          <div className="text-2xl font-bold text-white">
            {project.total_budget ? `$${project.total_budget.toLocaleString()}` : '—'}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Clock className="w-4 h-4" />
            Progress
          </div>
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-white">{progressPercent}%</div>
            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700 mb-6">
        <div className="flex gap-1 overflow-x-auto pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <OverviewTab project={project} tasks={tasks} budgets={budgets} />
        )}
        {activeTab === 'schedule' && (
          <GanttChart projectId={project.id} tasks={tasks} setTasks={setTasks} />
        )}
        {activeTab === 'budget' && (
          <BudgetTab projectId={project.id} budgets={budgets} setBudgets={setBudgets} />
        )}
        {activeTab === 'photos' && (
          <PhotosTab projectId={project.id} photos={photos} setPhotos={setPhotos} />
        )}
        {activeTab === 'documents' && (
          <DocumentsTab projectId={project.id} documents={documents} setDocuments={setDocuments} />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-slate-800 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete Project</h3>
                <p className="text-slate-400 text-sm">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-slate-300 mb-6">
              Are you sure you want to delete <strong>{project.name}</strong>? All tasks, budgets, photos, and documents will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Project'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Overview Tab Component
function OverviewTab({ project, tasks, budgets }: { project: Project; tasks: Task[]; budgets: Budget[] }) {
  const upcomingTasks = tasks
    .filter(t => t.status !== 'completed')
    .slice(0, 5)

  const totalBudget = project.total_budget || 0
  const totalSpent = budgets.reduce((sum, b) => sum + Number(b.actual_amount || 0), 0)
  const budgetPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Project Details */}
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Project Details</h3>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-slate-400">Type</span>
            <span className="text-white capitalize">{project.type.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Square Footage</span>
            <span className="text-white">{project.square_footage?.toLocaleString() || '—'} sq ft</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Start Date</span>
            <span className="text-white">
              {project.start_date ? format(new Date(project.start_date), 'MMM d, yyyy') : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Est. Completion</span>
            <span className="text-white">
              {project.estimated_completion_date
                ? format(new Date(project.estimated_completion_date), 'MMM d, yyyy')
                : '—'}
            </span>
          </div>
          {project.client_name && (
            <div className="flex justify-between">
              <span className="text-slate-400">Client</span>
              <span className="text-white">{project.client_name}</span>
            </div>
          )}
        </div>
        {project.notes && (
          <div className="mt-6 pt-4 border-t border-slate-700">
            <span className="text-slate-400 text-sm">Notes</span>
            <p className="text-white mt-1">{project.notes}</p>
          </div>
        )}
      </div>

      {/* Budget Summary */}
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Budget Summary</h3>
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400">Spent</span>
            <span className="text-white">
              ${totalSpent.toLocaleString()} / ${totalBudget.toLocaleString()}
            </span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                budgetPercent > 100 ? 'bg-red-500' : budgetPercent > 80 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(budgetPercent, 100)}%` }}
            />
          </div>
          {budgetPercent > 100 && (
            <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Over budget by ${(totalSpent - totalBudget).toLocaleString()}
            </p>
          )}
        </div>
        <div className="text-sm text-slate-400">
          {budgets.length === 0 ? (
            <p>No budget categories set up yet. Go to the Budget tab to add categories.</p>
          ) : (
            <p>{budgets.length} budget categories tracked</p>
          )}
        </div>
      </div>

      {/* Upcoming Tasks */}
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold text-white mb-4">Upcoming Tasks</h3>
        {upcomingTasks.length === 0 ? (
          <p className="text-slate-400">No upcoming tasks. Add tasks in the Schedule tab.</p>
        ) : (
          <div className="space-y-3">
            {upcomingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    task.status === 'in_progress' ? 'bg-blue-400' :
                    task.status === 'delayed' ? 'bg-red-400' : 'bg-slate-500'
                  }`} />
                  <div>
                    <p className="text-white font-medium">{task.name}</p>
                    <p className="text-slate-400 text-sm capitalize">{task.trade_type.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p className="text-white">{format(new Date(task.start_date), 'MMM d')}</p>
                  <p className="text-slate-400">{task.duration_days} days</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
