import './App.css'
import Logs from './pages/Logs.jsx'
import Stats from './pages/Stats.jsx'
import MonthlyChart from './components/MonthlyChart.jsx'
import { useState, useEffect } from 'react'

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true)
      document.documentElement.classList.add('dark')
    } else {
      setIsDarkMode(false)
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    
    if (newMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-x-hidden">
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 py-2 sm:py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">HealthLog</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Theo dõi sức khỏe của bạn</p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title={isDarkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-2 sm:px-6 py-2 sm:py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 w-full">
          <section className="lg:col-span-8">
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg p-4 sm:p-6">
              <Logs />
            </div>
          </section>
          <aside className="lg:col-span-4">
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg p-4 sm:p-6 lg:sticky lg:top-8">
              <Stats />
            </div>
          </aside>
        </div>
        
        {/* Thống kê tháng */}
        <div className="mt-4 sm:mt-8">
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg p-4 sm:p-6">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">Thống kê tháng</h2>
            </div>
            <MonthlyChart year={new Date().getFullYear()} month={new Date().getMonth() + 1} />
          </div>
        </div>
      </main>

      <footer className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50 mt-8 sm:mt-16 mb-4 sm:mb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 text-center">
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} HealthLog - Made by Nguyễn Hữu Huynh
          </div>
        </div>
      </footer>
    </div>
  )
}
