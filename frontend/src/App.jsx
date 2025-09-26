import './App.css'
import Logs from './pages/Logs.jsx'
import Stats from './pages/Stats.jsx'
import MonthlyChart from './components/MonthlyChart.jsx'

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">HealthLog</h1>
              <p className="text-sm text-gray-600">Theo dõi sức khỏe của bạn</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          <section className="col-span-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6">
              <Logs />
            </div>
          </section>
          <aside className="col-span-4">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6 sticky top-8">
              <Stats />
            </div>
          </aside>
        </div>
        
        {/* Thống kê tháng */}
        <div className="mt-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Thống kê tháng</h2>
            </div>
            <MonthlyChart year={new Date().getFullYear()} month={new Date().getMonth() + 1} />
          </div>
        </div>
      </main>

      <footer className="bg-white/50 backdrop-blur-sm border-t border-gray-200/50 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center">
          <div className="text-sm text-gray-500">
            © {new Date().getFullYear()} HealthLog - Made by Nguyễn Hữu Huynh
          </div>
        </div>
      </footer>
    </div>
  )
}
