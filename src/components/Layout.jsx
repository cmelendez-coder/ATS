import Sidebar from './Sidebar'

export default function Layout({ children }) {
  return (
    <div className="bg-surface text-on-surface h-screen flex overflow-hidden antialiased selection:bg-primary-fixed selection:text-on-primary-fixed">
      <Sidebar />
      <main className="flex-1 flex flex-col md:ml-64 relative h-full overflow-hidden">
        {children}
      </main>
    </div>
  )
}
