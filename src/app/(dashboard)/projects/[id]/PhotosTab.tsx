'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Photo, PhotoCategory } from '@/types/database'
import {
  Plus,
  Camera,
  Upload,
  X,
  ZoomIn,
  Download,
  Trash2,
  Filter,
  Grid,
  List,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Calendar,
} from 'lucide-react'
import { format } from 'date-fns'

const photoCategories: { value: PhotoCategory; label: string }[] = [
  { value: 'before', label: 'Before' },
  { value: 'progress', label: 'Progress' },
  { value: 'after', label: 'After' },
  { value: 'issue', label: 'Issue' },
  { value: 'other', label: 'Other' },
]

const categoryColors: Record<PhotoCategory, string> = {
  before: 'bg-purple-500/20 text-purple-300',
  progress: 'bg-blue-500/20 text-blue-300',
  after: 'bg-green-500/20 text-green-300',
  issue: 'bg-red-500/20 text-red-300',
  other: 'bg-slate-500/20 text-slate-300',
}

interface PhotosTabProps {
  projectId: string
  photos: Photo[]
  setPhotos: (photos: Photo[]) => void
}

export default function PhotosTab({ projectId, photos, setPhotos }: PhotosTabProps) {
  const [uploading, setUploading] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [filterCategory, setFilterCategory] = useState<PhotoCategory | 'all'>('all')
  const [filterLocation, setFilterLocation] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const [uploadData, setUploadData] = useState({
    location: '',
    category: 'progress' as PhotoCategory,
    caption: '',
    files: [] as File[],
  })

  // Get unique locations for filter
  const locations = [...new Set(photos.map(p => p.location).filter(Boolean))]

  // Filter photos
  const filteredPhotos = photos.filter(p => {
    if (filterCategory !== 'all' && p.category !== filterCategory) return false
    if (filterLocation !== 'all' && p.location !== filterLocation) return false
    return true
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setUploadData(prev => ({ ...prev, files: [...prev.files, ...files] }))
  }

  const removeFile = (index: number) => {
    setUploadData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }))
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (uploadData.files.length === 0) return

    setUploading(true)
    const newPhotos: Photo[] = []

    for (const file of uploadData.files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${projectId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('project-photos')
        .upload(fileName, file)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        continue
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('project-photos')
        .getPublicUrl(fileName)

      // Save photo record
      const { data, error } = await supabase
        .from('photos')
        .insert({
          project_id: projectId,
          file_url: publicUrl,
          location: uploadData.location || null,
          category: uploadData.category,
          caption: uploadData.caption || null,
          taken_date: format(new Date(), 'yyyy-MM-dd'),
          file_size: file.size,
        })
        .select()
        .single()

      if (!error && data) {
        newPhotos.push(data as Photo)
      }
    }

    setPhotos([...newPhotos, ...photos])
    setShowUploadModal(false)
    setUploadData({
      location: '',
      category: 'progress',
      caption: '',
      files: [],
    })
    setUploading(false)
  }

  const handleDelete = async (photo: Photo) => {
    if (!confirm('Delete this photo?')) return

    // Delete from storage
    const fileName = photo.file_url.split('/').pop()
    if (fileName) {
      await supabase.storage
        .from('project-photos')
        .remove([`${projectId}/${fileName}`])
    }

    // Delete record
    const { error } = await supabase
      .from('photos')
      .delete()
      .eq('id', photo.id)

    if (!error) {
      setPhotos(photos.filter(p => p.id !== photo.id))
      if (lightboxIndex !== null) {
        setLightboxIndex(null)
      }
    }
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
  }

  const closeLightbox = () => {
    setLightboxIndex(null)
  }

  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (lightboxIndex === null) return
    const newIndex = direction === 'prev'
      ? (lightboxIndex - 1 + filteredPhotos.length) % filteredPhotos.length
      : (lightboxIndex + 1) % filteredPhotos.length
    setLightboxIndex(newIndex)
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
            Upload Photos
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as PhotoCategory | 'all')}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {photoCategories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>

          {/* Location Filter */}
          {locations.length > 0 && (
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Locations</option>
              {locations.map(loc => (
                <option key={loc} value={loc!}>{loc}</option>
              ))}
            </select>
          )}

          {/* View Toggle */}
          <div className="flex items-center bg-slate-700 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-l-lg transition-colors ${
                viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-r-lg transition-colors ${
                viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Photo Count */}
      <div className="text-sm text-slate-400">
        {filteredPhotos.length} photo{filteredPhotos.length !== 1 ? 's' : ''}
        {filterCategory !== 'all' || filterLocation !== 'all' ? ' (filtered)' : ''}
      </div>

      {/* Photos Grid/List */}
      {filteredPhotos.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/50 rounded-xl border border-slate-700">
          <Camera className="w-12 h-12 mx-auto mb-4 text-slate-500" />
          <h3 className="text-lg font-semibold text-white mb-2">No photos yet</h3>
          <p className="text-slate-400 mb-4">Upload photos to document your project progress</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Upload Photos
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredPhotos.map((photo, index) => (
            <div
              key={photo.id}
              className="group relative aspect-square bg-slate-800 rounded-xl overflow-hidden border border-slate-700 cursor-pointer hover:border-blue-500/50 transition-colors"
              onClick={() => openLightbox(index)}
            >
              <img
                src={photo.file_url}
                alt={photo.caption || 'Project photo'}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${categoryColors[photo.category]}`}>
                  {photo.category}
                </span>
                {photo.location && (
                  <p className="text-white text-xs mt-1 truncate">{photo.location}</p>
                )}
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(photo)
                  }}
                  className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPhotos.map((photo, index) => (
            <div
              key={photo.id}
              className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors"
            >
              <div
                className="w-16 h-16 bg-slate-800 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                onClick={() => openLightbox(index)}
              >
                <img
                  src={photo.file_url}
                  alt={photo.caption || 'Project photo'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[photo.category]}`}>
                    {photo.category}
                  </span>
                  {photo.location && (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <MapPin className="w-3 h-3" />
                      {photo.location}
                    </span>
                  )}
                </div>
                {photo.caption && <p className="text-white text-sm truncate">{photo.caption}</p>}
                <p className="text-slate-400 text-xs">
                  {photo.uploaded_date && format(new Date(photo.uploaded_date), 'MMM d, yyyy')}
                </p>
              </div>
              <button
                onClick={() => handleDelete(photo)}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowUploadModal(false)} />
          <div className="relative bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Upload Photos</h2>
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
                className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center hover:border-blue-500/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-10 h-10 mx-auto mb-3 text-slate-400" />
                <p className="text-white font-medium mb-1">Click to upload or drag and drop</p>
                <p className="text-slate-400 text-sm">PNG, JPG, HEIC up to 10MB each</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Selected Files */}
              {uploadData.files.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-400">{uploadData.files.length} file(s) selected</p>
                  <div className="flex flex-wrap gap-2">
                    {uploadData.files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 rounded-lg text-sm"
                      >
                        <span className="text-white truncate max-w-[150px]">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-slate-400 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={uploadData.location}
                    onChange={(e) => setUploadData({ ...uploadData, location: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Kitchen"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Category
                  </label>
                  <select
                    value={uploadData.category}
                    onChange={(e) => setUploadData({ ...uploadData, category: e.target.value as PhotoCategory })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {photoCategories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Caption
                </label>
                <input
                  type="text"
                  value={uploadData.caption}
                  onChange={(e) => setUploadData({ ...uploadData, caption: e.target.value })}
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
                  disabled={uploading || uploadData.files.length === 0}
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

      {/* Lightbox */}
      {lightboxIndex !== null && filteredPhotos[lightboxIndex] && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white"
          >
            <X className="w-8 h-8" />
          </button>

          <button
            onClick={() => navigateLightbox('prev')}
            className="absolute left-4 p-2 text-white/80 hover:text-white"
          >
            <ChevronLeft className="w-10 h-10" />
          </button>

          <button
            onClick={() => navigateLightbox('next')}
            className="absolute right-4 p-2 text-white/80 hover:text-white"
          >
            <ChevronRight className="w-10 h-10" />
          </button>

          <div className="max-w-5xl max-h-[85vh] px-16">
            <img
              src={filteredPhotos[lightboxIndex].file_url}
              alt={filteredPhotos[lightboxIndex].caption || 'Project photo'}
              className="max-w-full max-h-[75vh] object-contain mx-auto"
            />
            <div className="mt-4 text-center">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${categoryColors[filteredPhotos[lightboxIndex].category]}`}>
                {filteredPhotos[lightboxIndex].category}
              </span>
              {filteredPhotos[lightboxIndex].location && (
                <span className="ml-3 text-white/80">
                  {filteredPhotos[lightboxIndex].location}
                </span>
              )}
              {filteredPhotos[lightboxIndex].caption && (
                <p className="mt-2 text-white">{filteredPhotos[lightboxIndex].caption}</p>
              )}
              <p className="mt-1 text-white/60 text-sm">
                {lightboxIndex + 1} of {filteredPhotos.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
