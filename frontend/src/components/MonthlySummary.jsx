import { useEffect, useState } from 'react'
import { getMonthlyStats, getHealthLogs, getMiFitSleep } from '../lib/api'

export default function MonthlySummary({ year, month }) {
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(false)
  const [warnings, setWarnings] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(month)
  const [selectedYear, setSelectedYear] = useState(year)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getMonthlyStats({ year, month }),
      getHealthLogs({ page: 1, limit: 1000, year, month }),
      getMiFitSleep({ limit: 200 })
    ]).then(([statRes, logsRes, sleepRes]) => {
      setStats(statRes.stats)
      // Phân tích cảnh báo
      const warns = []
      // Nhịp tim bất thường
      const heartRates = logsRes.items.filter(i => i.activityType === 'heart_rate').map(i => i.value)
      if (heartRates.length && (Math.max(...heartRates) > 120 || Math.min(...heartRates) < 50)) {
        warns.push('Nhịp tim có giá trị bất thường, nên kiểm tra tim mạch.')
      }
      // SpO2 thấp
      const spo2s = logsRes.items.filter(i => i.activityType === 'spo2').map(i => i.value)
      if (spo2s.length && Math.min(...spo2s) < 94) {
        warns.push('SpO2 thấp, nên kiểm tra hô hấp hoặc oxy máu.')
      }
      // Giấc ngủ kém
      const sleepDurations = sleepRes.items.map(i => i.duration)
      if (sleepDurations.length && (sleepDurations.filter(d => d < 360).length > 10)) {
        warns.push('Có nhiều ngày ngủ ít hơn 6h, nên cải thiện giấc ngủ.')
      }
      setWarnings(warns)
    }).finally(() => setLoading(false))
  }, [selectedYear, selectedMonth])

  return (
    <div className="mt-8 mb-8">
      <div className="bg-white border rounded p-4 shadow-sm">
        <h2 className="text-lg font-bold mb-2">Thống kê hoạt động trong tháng</h2>
        <div className="mb-4 flex gap-2 items-center">
          <label className="text-sm">Chọn tháng:</label>
          <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="border rounded px-2 py-1">
            {[...Array(12)].map((_, i) => (
              <option key={i+1} value={i+1}>{i+1}</option>
            ))}
          </select>
          <label className="text-sm">Năm:</label>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="border rounded px-2 py-1">
            {[2023, 2024, 2025].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        {loading ? <div>Đang tải...</div> : (
          <>
            <div className="mb-2 text-sm text-gray-700">Tổng hợp số lần hoạt động trong tháng {selectedMonth}/{selectedYear}:</div>
            <ul className="mb-4 text-sm">
              {stats.map(s => (
                <li key={s.activityType}><b>{s.activityType}</b>: {s.count} lần</li>
              ))}
            </ul>
            {warnings.length > 0 ? (
              <div className="mb-2 text-red-700 font-semibold">Cảnh báo sức khỏe:</div>
            ) : (
              <div className="mb-2 text-emerald-700 font-semibold">Không có cảnh báo sức khỏe nghiêm trọng.</div>
            )}
            <ul className="text-sm">
              {warnings.map((w, idx) => (
                <li key={idx}>• {w}</li>
              ))}
            </ul>
            {warnings.length > 0 && (
              <div className="mt-2 text-xs text-gray-600">Khuyến nghị: Nên kiểm tra sức khỏe tổng quát, duy trì lối sống lành mạnh, tập thể dục đều đặn và ngủ đủ giấc.</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
