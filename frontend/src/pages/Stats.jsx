import { useEffect, useState } from 'react'
import { getMiFitSleep } from '../lib/api'

export default function StatsPage() {
  const [sleepData, setSleepData] = useState({ items: [], total: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [availableDates, setAvailableDates] = useState([])

  // Format duration từ phút sang giờ:phút
  function formatDuration(minutes) {
    if (!minutes) return '0h 0m'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  // Tính phần trăm của từng giai đoạn
  function calculateSleepStages(duration, light, deep, rem, awake) {
    if (!duration) return { light: 0, deep: 0, rem: 0, awake: 0 }
    return {
      light: Math.round((light / duration) * 100),
      deep: Math.round((deep / duration) * 100),
      rem: Math.round((rem / duration) * 100),
      awake: Math.round((awake / duration) * 100)
    }
  }

  function epochToLocalTime(epoch) {
    if (!epoch) return null
    return new Date(epoch * 1000)
  }

  useEffect(() => {
    setLoading(true)
    setError('')
    // Lấy nhiều dữ liệu hơn để có đủ các tháng trước
    getMiFitSleep({ limit: 200 })
      .then((res) => {
        console.log('[Sleep] API response:', res)
        setSleepData(res)
        
        // Tạo danh sách các ngày có dữ liệu
        const dates = [...new Set(res.items.map(item => 
          new Date(item.occurredAt).toISOString().slice(0, 10)
        ))].sort().reverse()
        setAvailableDates(dates)
        console.log('[Sleep] Available dates:', dates)
        
        if (res.items.length > 0 && !selectedDate) {
          // Tự động chọn ngày gần nhất
          const latestDate = dates[0]
          setSelectedDate(latestDate)
          console.log('[Sleep] Auto-selected date:', latestDate)
        }
      })
      .catch((e) => {
        console.error('[Sleep] API error:', e)
        setError(e?.response?.data?.message || e.message)
      })
      .finally(() => setLoading(false))
  }, [])

  // Lọc và gộp dữ liệu theo ngày được chọn
  const filteredSleep = (() => {
    // Nếu không chọn ngày, hiển thị ngày gần nhất
    let targetDate = selectedDate || availableDates[0]
    if (!targetDate) return []
    
    // Kiểm tra xem ngày được chọn có dữ liệu không
    let dayData = sleepData.items.filter(item => {
      const itemDate = new Date(item.occurredAt).toISOString().slice(0, 10)
      return itemDate === targetDate
    })
    
    // Nếu không có dữ liệu cho ngày được chọn, tìm ngày gần nhất có dữ liệu
    if (dayData.length === 0 && selectedDate) {
      const selectedDateObj = new Date(selectedDate)
      const closestDate = availableDates.find(date => {
        const dateObj = new Date(date)
        return dateObj <= selectedDateObj
      })
      
      if (closestDate) {
        targetDate = closestDate
        dayData = sleepData.items.filter(item => {
          const itemDate = new Date(item.occurredAt).toISOString().slice(0, 10)
          return itemDate === targetDate
        })
        // Cập nhật selectedDate để hiển thị ngày thực tế có dữ liệu
        if (closestDate !== selectedDate) {
          setSelectedDate(closestDate)
        }
      }
    }
    
    if (dayData.length === 0) return []
    
    // Gộp tất cả bản ghi trong ngày thành 1 thống kê
    const combined = dayData.reduce((acc, item) => {
      return {
        id: acc.id || item.id,
        occurredAt: acc.occurredAt || item.occurredAt,
        duration: (acc.duration || 0) + (item.duration || 0),
        minHr: Math.min(acc.minHr || Infinity, item.minHr || Infinity),
        avgHr: Math.round(((acc.avgHr || 0) + (item.avgHr || 0)) / 2),
        maxHr: Math.max(acc.maxHr || 0, item.maxHr || 0),
        raw: {
          sleep_light_duration: (acc.raw?.sleep_light_duration || 0) + (item.raw?.sleep_light_duration || 0),
          sleep_deep_duration: (acc.raw?.sleep_deep_duration || 0) + (item.raw?.sleep_deep_duration || 0),
          sleep_rem_duration: (acc.raw?.sleep_rem_duration || 0) + (item.raw?.sleep_rem_duration || 0),
          sleep_awake_duration: (acc.raw?.sleep_awake_duration || 0) + (item.raw?.sleep_awake_duration || 0),
          awake_count: (acc.raw?.awake_count || 0) + (item.raw?.awake_count || 0),
          timezone: acc.raw?.timezone || item.raw?.timezone,
        }
      }
    }, {})
    
    // Xử lý trường hợp minHr = Infinity
    if (combined.minHr === Infinity) combined.minHr = null
    
    // Chuẩn bị danh sách các lần ngủ trong ngày
    const sessions = dayData
      .sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt))
      .map((s) => {
        const start = epochToLocalTime(s.raw?.device_bedtime || s.raw?.bedtime)
        const end = epochToLocalTime(s.raw?.device_wake_up_time || s.raw?.wake_up_time)
        return {
          id: s.id,
          start,
          end,
          occurredAt: new Date(s.occurredAt),
          duration: s.duration || 0,
        }
      })

    return [{ ...combined, sessions }]
  })()

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">Giấc ngủ chi tiết</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">Phân tích chất lượng giấc ngủ</p>
      </div>
      
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-3 sm:p-5 mb-4 sm:mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-end">
          <div className="flex flex-col w-full sm:min-w-[140px]">
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Ngày</label>
            <input 
              type="date" 
              className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white bg-white text-gray-900 rounded px-2 py-2" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg text-center sm:text-left">
            {availableDates.length} ngày có dữ liệu
          </div>
        </div>
      </div>

      {error && <div className="text-red-600 dark:text-red-400 mb-3">{error}</div>}

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            Đang tải...
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredSleep.map((sleep) => {
            const stages = calculateSleepStages(
              sleep.duration, 
              sleep.raw?.sleep_light_duration || 0,
              sleep.raw?.sleep_deep_duration || 0,
              sleep.raw?.sleep_rem_duration || 0,
              sleep.raw?.sleep_awake_duration || 0
            )

            // Đánh giá giấc ngủ theo tiêu chuẩn sức khỏe tốt
            function getSleepQuality(sleep) {
              // Tiêu chuẩn tham khảo: tổng thời gian ngủ >= 7h, ngủ sâu >= 15%, REM >= 20%, số lần thức giấc < 5
              const durationH = sleep.duration / 60;
              const deepPct = stages.deep;
              const remPct = stages.rem;
              const awakeCount = sleep.raw?.awake_count || 0;
              if (durationH >= 7 && deepPct >= 15 && remPct >= 20 && awakeCount < 5) {
                return { text: 'Giấc ngủ tốt 👍', color: 'text-emerald-700', icon: '✅' };
              } else if (durationH >= 6) {
                return { text: 'Giấc ngủ tạm ổn', color: 'text-yellow-700', icon: '⚠️' };
              } else {
                return { text: 'Giấc ngủ chưa đủ hoặc chưa sâu', color: 'text-red-700', icon: '❌' };
              }
            }
            const quality = getSleepQuality(sleep);

            return (
              <div key={sleep.id} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-3">
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white">
                      {new Date(sleep.occurredAt).toLocaleDateString('vi-VN')}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      {new Date(sleep.occurredAt).toLocaleTimeString('vi-VN')}
                    </p>
                  </div>
                  <div className="text-center sm:text-right">
                    <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatDuration(sleep.duration)}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Tổng thời gian ngủ</div>
                    {/* Đánh giá giấc ngủ */}
                    <div className={`mt-2 font-semibold text-sm ${quality.color}`}>
                      <span>{quality.icon}</span> {quality.text}
                    </div>
                  </div>
                </div>

                {/* Nhịp tim */}
                <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-red-600 dark:text-red-400">{sleep.minHr || '-'}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">Nhịp tim min</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">{sleep.avgHr || '-'}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">Nhịp tim TB</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-red-700 dark:text-red-500">{sleep.maxHr || '-'}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">Nhịp tim max</div>
                  </div>
                </div>

                {/* Các giai đoạn ngủ */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-800 dark:text-gray-200">Các giai đoạn ngủ</h4>
                  
                  {/* Ngủ sâu */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-800 rounded"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Ngủ sâu</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {formatDuration(sleep.raw?.sleep_deep_duration || 0)} ({stages.deep}%)
                    </div>
                  </div>
                  
                  {/* Ngủ REM */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-purple-600 rounded"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Ngủ REM</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {formatDuration(sleep.raw?.sleep_rem_duration || 0)} ({stages.rem}%)
                    </div>
                  </div>
                  
                  {/* Ngủ nông */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-400 rounded"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Ngủ nông</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {formatDuration(sleep.raw?.sleep_light_duration || 0)} ({stages.light}%)
                    </div>
                  </div>
                  
                  {/* Thức giấc */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Thức giấc</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {formatDuration(sleep.raw?.sleep_awake_duration || 0)} ({stages.awake}%)
                    </div>
                  </div>
                </div>

                {/* Thông tin bổ sung */}
                <div className="mt-4 pt-3 border-t dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400">
                  <div className="grid grid-cols-2 gap-2">
                    <div>Số lần thức giấc: {sleep.raw?.awake_count || 0}</div>
                    <div>Múi giờ: {sleep.raw?.timezone || '-'}</div>
                  </div>
                </div>

                {/* Danh sách các lần ngủ trong ngày */}
                <div className="mt-4">
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Các lần ngủ trong ngày</h4>
                  {sleep.sessions && sleep.sessions.length > 0 ? (
                    <div className="divide-y dark:divide-gray-600 border dark:border-gray-600 rounded">
                      {sleep.sessions.map((ses) => (
                        <div key={ses.id} className="flex items-center justify-between px-3 py-2 text-sm">
                          <div className="text-gray-700 dark:text-gray-300">
                            {ses.start && ses.end
                              ? `${ses.start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} – ${ses.end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                              : ses.occurredAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-gray-600 dark:text-gray-300">{formatDuration(ses.duration)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400">Không có bản ghi chi tiết.</div>
                  )}
                </div>
              </div>
            )
          })}
          
          {filteredSleep.length === 0 && (
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-6 text-center text-gray-600 dark:text-gray-300">
              <div className="text-lg mb-2">😴</div>
              <div>Không có dữ liệu giấc ngủ cho ngày này</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


