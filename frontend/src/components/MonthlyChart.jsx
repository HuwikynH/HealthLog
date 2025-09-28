import { useEffect, useState } from 'react'
import { getHealthLogs, getMiFitSleep } from '../lib/api'

function abnormalDay({ heartRates, spo2s, sleepDuration }) {
  const abnormal = []
  if (heartRates.length && (Math.max(...heartRates) > 120 || Math.min(...heartRates) < 50)) abnormal.push('Nhịp tim bất thường')
  if (spo2s.length && Math.min(...spo2s) < 94) abnormal.push('SpO2 thấp')
  if (sleepDuration !== null && sleepDuration < 360) abnormal.push('Ngủ ít (<6h)')
  return abnormal
}

export default function MonthlyChart({ year, month }) {
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(month)
  const [selectedYear, setSelectedYear] = useState(year)

  useEffect(() => {
    setLoading(true)
    // Lấy dữ liệu từng ngày trong tháng
    const start = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1))
    const end = new Date(Date.UTC(selectedYear, selectedMonth, 0))
    const dayList = []
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dayList.push(new Date(d))
    }
    Promise.all(dayList.map(day => {
      const dayStr = day.toISOString().slice(0, 10)
      return Promise.all([
  getHealthLogs({ activityType: 'heart_rate', date: dayStr, limit: 100 }),
  getHealthLogs({ activityType: 'spo2', date: dayStr, limit: 100 }),
  getMiFitSleep({ year: selectedYear, month: selectedMonth, limit: 100 })
      ]).then(([hrRes, spo2Res, sleepRes]) => {
        const heartRates = hrRes.items.map(i => i.value)
        const spo2s = spo2Res.items.map(i => i.value)
        // Lấy giấc ngủ của ngày đó
        const sleepDay = sleepRes.items.filter(i => {
          const itemDate = new Date(i.occurredAt).toISOString().slice(0, 10)
          return itemDate === dayStr
        })
        const sleepDuration = sleepDay.length ? sleepDay.reduce((a, b) => a + (b.duration || 0), 0) : null
        return {
          date: dayStr,
          heartRates,
          spo2s,
          sleepDuration,
          abnormal: abnormalDay({ heartRates, spo2s, sleepDuration })
        }
      })
    })).then(setDays).finally(() => setLoading(false))
  }, [selectedYear, selectedMonth])

  return (
    <div className="mt-4 sm:mt-8 mb-4 sm:mb-8">
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-3 sm:p-4 shadow-sm">
        <h2 className="text-base sm:text-lg font-bold mb-2 text-gray-900 dark:text-white">Bảng thống kê chi tiết tháng</h2>
        <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row gap-2 sm:gap-2 items-stretch sm:items-center">
          <label className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Chọn tháng:</label>
          <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white bg-white text-gray-900 rounded px-2 py-1">
            {[...Array(12)].map((_, i) => (
              <option key={i+1} value={i+1}>{i+1}</option>
            ))}
          </select>
          <label className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Năm:</label>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white bg-white text-gray-900 rounded px-2 py-1">
            {[2023, 2024, 2025].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="mb-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">Tháng {selectedMonth}/{selectedYear}</div>
        {loading ? <div className="text-gray-600 dark:text-gray-300 text-sm">Đang tải...</div> : (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="px-2 sm:px-0">
              <table className="min-w-[500px] sm:min-w-[600px] w-full text-xs sm:text-sm border dark:border-gray-600">
              <thead>
                <tr className="bg-sky-50 dark:bg-gray-700">
                  <th className="border dark:border-gray-600 px-1 sm:px-2 py-1 text-gray-900 dark:text-white">Ngày</th>
                  <th className="border dark:border-gray-600 px-1 sm:px-2 py-1 text-gray-900 dark:text-white">Nhịp tim (min-max)</th>
                  <th className="border dark:border-gray-600 px-1 sm:px-2 py-1 text-gray-900 dark:text-white">SpO2 (min)</th>
                  <th className="border dark:border-gray-600 px-1 sm:px-2 py-1 text-gray-900 dark:text-white">Thời gian ngủ</th>
                  <th className="border dark:border-gray-600 px-1 sm:px-2 py-1 text-gray-900 dark:text-white">Cảnh báo</th>
                </tr>
              </thead>
              <tbody>
                {days.map(day => (
                  <tr key={day.date} className={day.abnormal.length ? 'bg-rose-50 dark:bg-red-900/20' : 'bg-white dark:bg-gray-800'}>
                    <td className="border dark:border-gray-600 px-1 sm:px-2 py-1 font-semibold text-gray-900 dark:text-white">{new Date(day.date).toLocaleDateString('vi-VN')}</td>
                    <td className="border dark:border-gray-600 px-1 sm:px-2 py-1 text-gray-700 dark:text-gray-300">{day.heartRates.length ? `${Math.min(...day.heartRates)} - ${Math.max(...day.heartRates)}` : '-'}</td>
                    <td className="border dark:border-gray-600 px-1 sm:px-2 py-1 text-gray-700 dark:text-gray-300">{day.spo2s.length ? Math.min(...day.spo2s) : '-'}</td>
                    <td className="border dark:border-gray-600 px-1 sm:px-2 py-1 text-gray-700 dark:text-gray-300">{day.sleepDuration !== null ? `${Math.floor(day.sleepDuration/60)}h ${day.sleepDuration%60}m` : '-'}</td>
                    <td className="border dark:border-gray-600 px-1 sm:px-2 py-1 text-red-700 dark:text-red-400">{day.abnormal.length ? day.abnormal.join(', ') : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
