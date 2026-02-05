'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Document, DocumentCategory } from '@/types/database'
import {
  Plus,
  FileText,
  Upload,
  X,
  Download,
  Trash2,
  Filter,
  Search,
  Loader2,
  File,
  FileImage,
  FileSpreadsheet,
  FileType,
  ExternalLink,
} from 'lucide-react'
import { format } from 'date-fns'

const documentCategories: { value: DocumentCategory; label: string; icon: string }[] = [
  { value: 'permits', label: 'Permits', icon: '📋' },
  { value: 'contracts', label: 'Contracts', icon: '📝' },
  { value: 'architectural_plans', label: 'Architectural Plans', icon: '📐' },
  { value: 'invoices', label: 'Invoices', icon: '🧾' },
  { value: 'receipts', label: 'Receipts', icon: '🧾' },
  { value: 'warranties', label: 'Warranties', icon: '🛡️' },
  { value: 'insurance', label: 'Insurance', icon: '🏥' },
  { value: 'change_orders', label: 'Change Orders', icon: '🔄' },
  { value: 'inspection_reports', label: 'Inspection Reports', icon: '🔍' },
  { value: 'other', label: 'Other', icon: '📁' },
]

const getFileIcon = (fileType: string | null) => {
  if (!fileType) return File
  if (fileType.includes('pdf')) return FileText
  if (fileType.includes('image')) return FileImage
  if (fileType.includes('sheet') || fileType.includes('excel')) return FileSpreadsheet
  if (fileType.includes('word') || fileType.includes('document')) return FileType
  return File
}

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return 'Unknown size'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface DocumentsTabProps {
  projectId: string
  documents: Document[]
  setDocuments: (documents: Document[]) => void
}

export default function DocumentsTab({ projectId, documents, setDocuments }: DocumentsTabProps) {
  const [uploading, setUploading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [filterCategory, setFilterCategory] = useState<DocumentCategory | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const [uploadData, setUploadData] = useState({
    category: 'other' as DocumentCategory,
    description: '',
    file: null as File | null,
  })

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    if (filterCategory !== 'all' && doc.category !== filterCategory) return false
    if (searchTerm && !doc.file_name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  // Group by category
  const groupedDocuments = filteredDocuments.reduce((acc, doc) => {
    const category = doc.category
    if (!acc[category]) acc[category] = []
    acc[category].push(doc)
    return acc
  }, {} as Record<DocumentCategory, Document[]>)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadData(prev => ({ ...prev, file }))
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadData.file) return

    setUploading(true)

    const file = uploadData.file
    const fileExt = file.name.split('.').pop()
    const fileName = `${projectId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('project-documents')
      .upload(fileName, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      alert('Failed to upload document')
      setUploading(false)
      return
    }

    // Get public URL (or signed URL for private bucket)
    const { data: { publicUrl } } = supabase.storage
      .from('project-documents')
      .getPublicUrl(fileName)

    // Save document record
    const { data, error } = await supabase
      .from('documents')
      .insert({
        project_id: projectId,
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        category: uploadData.category,
        description: uploadData.description || null,
        tags: [],
        version: 1,
      })
      .select()
      .single()

    if (!error && data) {
      setDocuments([data as Document, ...documents])
    }

    setShowUploadModal(false)
    setUploadData({
      category: 'other',
      description: '',
      file: null,
    })
    setUploading(false)
  }

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete "${doc.file_name}"?`)) return

    // Delete from storage
    const fileName = doc.file_url.split('/').pop()
    if (fileName) {
      await supabase.storage
        .from('project-documents')
        .remove([`${projectId}/${fileName}`])
    }

    // Delete record
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', doc.id)

    if (!error) {
      setDocuments(documents.filter(d => d.id !== doc.id))
    }
  }

  const getCategoryInfo = (category: DocumentCategory) => {
    return documentCategories.find(c => c.value === category) || documentCategories[9]
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search files..."
              className="pl-9 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
            />
          </div>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as DocumentCategory | 'all')}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {documentCategories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Document Count */}
      <div className="text-sm text-slate-400">
        {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
        {filterCategory !== 'all' || searchTerm ? ' (filtered)' : ''}
      </div>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/50 rounded-xl border border-slate-700">
          <FileText className="w-12 h-12 mx-auto mb-4 text-slate-500" />
          <h3 className="text-lg font-semibold text-white mb-2">No documents yet</h3>
          <p className="text-slate-400 mb-4">Upload documents to keep your project files organized</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Upload Document
          </button>
        </div>
      ) : filterCategory === 'all' && !searchTerm ? (
        // Grouped view
        <div className="space-y-6">
          {Object.entries(groupedDocuments).map(([category, docs]) => {
            const categoryInfo = getCategoryInfo(category as DocumentCategory)
            return (
              <div key={category}>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-3">
                  <span>{categoryInfo.icon}</span>
                  {categoryInfo.label}
                  <span className="text-sm font-normal text-slate-400">({docs.length})</span>
                </h3>
                <div className="space-y-2">
                  {docs.map(doc => (
                    <DocumentRow key={doc.id} doc={doc} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        // Flat list view (when filtered)
        <div className="space-y-2">
          {filteredDocuments.map(doc => (
            <DocumentRow key={doc.id} doc={doc} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowUploadModal(false)} />
          <div className="relative bg-slate-800 rounded-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Upload Document</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-5">
              {/* Drop Zone */}
              <div
                className="border-2 border-dashed border-slate-600 rounded-xl p-6 text-center hover:border-blue-500/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadData.file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-blue-400" />
                    <div className="text-left">
                      <p className="text-white font-medium truncate max-w-[200px]">{uploadData.file.name}</p>
                      <p className="text-slate-400 text-sm">{formatFileSize(uploadData.file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setUploadData(prev => ({ ...prev, file: null }))
                      }}
                      className="p-1 text-slate-400 hover:text-red-400"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-white font-medium mb-1">Click to select a file</p>
                    <p className="text-slate-400 text-sm">PDF, Word, Excel, Images up to 50MB</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Category
                </label>
                <select
                  value={uploadData.category}
                  onChange={(e) => setUploadData({ ...uploadData, category: e.target.value as DocumentCategory })}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {documentCategories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={uploadData.description}
                  onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadData.file}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Upload
                    </>
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

// Document Row Component
function DocumentRow({ doc, onDelete }: { doc: Document; onDelete: (doc: Document) => void }) {
  const FileIcon = getFileIcon(doc.file_type)

  return (
    <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors group">
      <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
        <FileIcon className="w-5 h-5 text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate">{doc.file_name}</p>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <span>{formatFileSize(doc.file_size)}</span>
          {doc.description && <span>• {doc.description}</span>}
          <span>• {doc.uploaded_date && format(new Date(doc.uploaded_date), 'MMM d, yyyy')}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={doc.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        <a
          href={doc.file_url}
          download={doc.file_name}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
        </a>
        <button
          onClick={() => onDelete(doc)}
          className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
