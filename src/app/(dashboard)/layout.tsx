import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-900">
      <Sidebar />
      <main className="lg:pl-72">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
