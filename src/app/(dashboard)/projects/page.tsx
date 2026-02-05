import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProjectsList from './ProjectsList'
import type { Project } from '@/types/database'

export default async function ProjectsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects:', error)
  }

  return <ProjectsList initialProjects={(projects as Project[]) || []} />
}
