'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Budget, BudgetCategory } from '@/types/database'
import {
  Plus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Trash2,
  Loader2,
  X,
} from 'lucide-react'

const budgetCategories: { value: BudgetCategory; label: string; icon: string }[] = [
  { value: 'labor', label: 'Labor', icon: '👷' },
  { value: 'materials', label: 'Materials', icon: '🧱' },
  { value: 'permits_fees', label: 'Permits & Fees', icon: '📋' },
  { value: 'equipment_rental', label: 'Equipment Rental', icon: '🚜' },
  { value: 'subcontractors', label: 'Subcontractors', icon: '🔧' },
  { value: 'contingency', label: 'Contingency', icon: '🛡️' },
  { value: 'other', label: 'Other', icon: '📦' },
]

interface BudgetTabProps {
  projectId: string
  budgets: Budget[]
  setBudgets: (budgets: Budget[]) => void
}

export default function BudgetTab({ projectId, budgets, setBudgets }: BudgetTabProps) {
  const [showModal, setShowModal] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const [formData, setFormData] = useState({
    category: 'materials' as BudgetCategory,
    estimated_amount: '',
    actual_amount: '',
    notes: '',
  })

  const totalEstimated = budgets.reduce((sum, b) => sum + Number(b.estimated_amount || 0), 0)
  const totalActual = budgets.reduce((sum, b) => sum + Number(b.actual_amount || 0), 0)
  const totalVariance = totalEstimated - totalActual
  const overallPercent = totalEstimated > 0 ? Math.round((totalActual / totalEstimated) * 100) : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (editingBudget) {
      const { error } = await supabase
        .from('budgets')
        .update({
          estimated_amount: parseFloat(formData.estimated_amount) || 0,
          actual_amount: parseFloat(formData.actual_amount) || 0,
          notes: formData.notes || null,
        } as any)
        .eq('id', editingBudget.id)

      if (!error) {
        setBudgets(budgets.map(b =>
          b.id === editingBudget.id
            ? {
                ...b,
                estimated_amount: parseFloat(formData.estimated_amount) || 0,
                actual_amount: parseFloat(formData.actual_amount) || 0,
                notes: formData.notes || null,
              }
            : b
        ))
      }
    } else {
      // Check if category already exists
      const existing = budgets.find(b => b.category === formData.category)
      if (existing) {
        alert('This budget category already exists. Edit the existing one instead.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('budgets')
        .insert({
          project_id: projectId,
          category: formData.category,
          estimated_amount: parseFloat(formData.estimated_amount) || 0,
          actual_amount: parseFloat(formData.actual_amount) || 0,
          notes: formData.notes || null,
        } as any)
        .select()
        .single()

      if (!error && data) {
        setBudgets([...budgets, data as Budget])
      }
    }

    setShowModal(false)
    setEditingBudget(null)
    resetForm()
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!editingBudget) return
    setLoading(true)

    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', editingBudget.id)

    if (!error) {
      setBudgets(budgets.filter(b => b.id !== editingBudget.id))
    }

    setShowModal(false)
    setEditingBudget(null)
    resetForm()
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({
      category: 'materials',
      estimated_amount: '',
      actual_amount: '',
      notes: '',
    })
  }

  const openEditModal = (budget: Budget) => {
    setEditingBudget(budget)
    setFormData({
      category: budget.category,
      estimated_amount: budget.estimated_amount?.toString() || '',
      actual_amount: budget.actual_amount?.toString() || '',
      notes: budget.notes || '',
    })
    setShowModal(true)
  }

  const getCategoryInfo = (category: BudgetCategory) => {
    return budgetCategories.find(c => c.value === category) || budgetCategories[6]
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <DollarSign className="w-4 h-4" />
            Total Estimated
          </div>
          <div className="text-2xl font-bold text-white">
            ${totalEstimated.toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <DollarSign className="w-4 h-4" />
            Total Spent
          </div>
          <div className="text-2xl font-bold text-white">
            ${totalActual.toLocaleString()}
          </div>
          <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                overallPercent > 100 ? 'bg-red-500' : overallPercent > 80 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(overallPercent, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            {totalVariance >= 0 ? (
              <TrendingDown className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingUp className="w-4 h-4 text-red-400" />
            )}
            Variance
          </div>
          <div className={`text-2xl font-bold ${totalVariance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalVariance >= 0 ? '+' : '-'}${Math.abs(totalVariance).toLocaleString()}
          </div>
          <div className={`text-sm ${totalVariance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalVariance >= 0 ? 'Under budget' : 'Over budget'}
          </div>
        </div>
      </div>

      {/* Add Budget Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Budget Categories</h3>
        <button
          onClick={() => {
            setEditingBudget(null)
            resetForm()
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Budget Categories List */}
      {budgets.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
          <DollarSign className="w-12 h-12 mx-auto mb-4 text-slate-500" />
          <h3 className="text-lg font-semibold text-white mb-2">No budget categories yet</h3>
          <p className="text-slate-400 mb-4">Add budget categories to track your project costs</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Add First Category
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((budget) => {
            const categoryInfo = getCategoryInfo(budget.category)
            const estimated = Number(budget.estimated_amount || 0)
            const actual = Number(budget.actual_amount || 0)
            const variance = estimated - actual
            const percent = estimated > 0 ? Math.round((actual / estimated) * 100) : 0

            return (
              <div
                key={budget.id}
                className="bg-slate-800/50 rounded-xl border border-slate-700 p-5 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{categoryInfo.icon}</span>
                    <div>
                      <h4 className="font-semibold text-white">{categoryInfo.label}</h4>
                      {budget.notes && (
                        <p className="text-sm text-slate-400 mt-1">{budget.notes}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => openEditModal(budget)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Estimated</div>
                    <div className="text-white font-medium">${estimated.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Actual</div>
                    <div className="text-white font-medium">${actual.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Variance</div>
                    <div className={`font-medium ${variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {variance >= 0 ? '+' : '-'}${Math.abs(variance).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      percent > 100 ? 'bg-red-500' : percent > 80 ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-2 text-xs">
                  <span className="text-slate-400">{percent}% used</span>
                  {percent > 100 && (
                    <span className="flex items-center gap-1 text-red-400">
                      <AlertTriangle className="w-3 h-3" />
                      Over budget
                    </span>
                  )}
                  {percent <= 100 && percent > 80 && (
                    <span className="flex items-center gap-1 text-yellow-400">
                      <AlertTriangle className="w-3 h-3" />
                      Approaching limit
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Budget Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowModal(false)
              setEditingBudget(null)
              resetForm()
            }}
          />
          <div className="relative bg-slate-800 rounded-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {editingBudget ? 'Edit Budget Category' : 'Add Budget Category'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingBudget(null)
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
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as BudgetCategory })}
                  disabled={!!editingBudget}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {budgetCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Estimated Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.estimated_amount}
                    onChange={(e) => setFormData({ ...formData, estimated_amount: e.target.value })}
                    className="w-full pl-8 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="10,000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Actual Amount Spent
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.actual_amount}
                    onChange={(e) => setFormData({ ...formData, actual_amount: e.target.value })}
                    className="w-full pl-8 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
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
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                {editingBudget && (
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
                    setShowModal(false)
                    setEditingBudget(null)
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
                    editingBudget ? 'Save Changes' : 'Add Category'
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
