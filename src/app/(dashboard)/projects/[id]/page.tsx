import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ProjectDetail from './ProjectDetail'
import type { Project, Task, Budget } from '@/types/database'

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

  return (
    <ProjectDetail
      project={project as Project}
      initialTasks={(tasks as Task[]) || []}
      initialBudgets={(budgets as Budget[]) || []}
    />
  )
}
