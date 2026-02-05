import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ProjectDetail from './ProjectDetail'
import type { Project, Task, Budget, Photo, Document } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (projectError || !project) {
    notFound()
  }

  // Fetch tasks for this project
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', id)
    .order('start_date', { ascending: true })

  // Fetch budgets for this project
  const { data: budgets } = await supabase
    .from('budgets')
    .select('*')
    .eq('project_id', id)

  // Fetch photos for this project
  const { data: photos } = await supabase
    .from('photos')
    .select('*')
    .eq('project_id', id)
    .order('uploaded_date', { ascending: false })

  // Fetch documents for this project
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', id)
    .order('uploaded_date', { ascending: false })

  return (
    <ProjectDetail
      project={project as Project}
      initialTasks={(tasks as Task[]) || []}
      initialBudgets={(budgets as Budget[]) || []}
      initialPhotos={(photos as Photo[]) || []}
      initialDocuments={(documents as Document[]) || []}
    />
  )
}
