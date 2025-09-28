import { useEffect, useMemo, useState } from 'react'
import { getHealthLogs, createHealthLog, updateHealthLog, deleteHealthLog } from '../lib/api'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

const activityOptions = [
  { value: 'heart_rate', label: 'Nhịp tim' },
  { value: 'calories', label: 'Calories' },
  { value: 'steps', label: 'Bước chân' },
  { value: 'stress', label: 'Stress' },
  { value: 'spo2', label: 'SpO2' },
]

export default function LogsPage() {
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' hoặc 'desc'
  const [activityType, setActivityType] = useState('heart_rate')
  const [date, setDate] = useState('')
  const [weekStart, setWeekStart] = useState('')
  const [weekEnd, setWeekEnd] = useState('')
  const [filterMode, setFilterMode] = useState('day') // 'day' hoặc 'week'
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [data, setData] = useState({ items: [], total: 0, pages: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formErrors, setFormErrors] = useState({})

  const [form, setForm] = useState({ id: '', activityType: '', value: '', unit: '', note: '', occurredAt: '' })

  // Client-side validation schema
  const schema = yup.object().shape({
    activityType: yup.string().required('Vui lòng chọn hoạt động'),
    value: yup.number().typeError('Giá trị phải là số').required('Vui lòng nhập giá trị'),
    unit: yup.string().nullable(),
    note: yup.string().nullable(),
    occurredAt: yup.string().required('Vui lòng chọn thời gian').matches(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'Định dạng thời gian không hợp lệ'),
  })

  const { register, handleSubmit, formState: { errors: clientErrors }, reset, setValue } = useForm({
    resolver: yupResolver(schema),
    defaultValues: form,
  })

  const hasWeekRange = useMemo(() => weekStart && weekEnd, [weekStart, weekEnd])

  // Tự động tìm ngày gần nhất có dữ liệu khi load trang
  useEffect(() => {
    const findLatestDate = async () => {
      try {
        const res = await getHealthLogs({ activityType: 'heart_rate', limit: 1 })
        if (res.items.length > 0) {
          const latestDate = new Date(res.items[0].occurredAt).toISOString().slice(0, 10)
          setDate(latestDate)
        }
      } catch (e) {
        console.log('Không tìm thấy dữ liệu gần nhất')
      }
    }
    findLatestDate()
  }, [])

  useEffect(() => {
    setLoading(true)
    setError('')
    const params = { page, limit }
    if (activityType) params.activityType = activityType

    if (filterMode === 'day' && date) {
      params.date = date
      getHealthLogs(params)
        .then((res) => {
          setData(res)
        })
        .catch((e) => {
          setError(e?.response?.data?.message || e.message)
        })
        .finally(() => setLoading(false))
    } else if (filterMode === 'week' && hasWeekRange) {
      // Sử dụng backend để tính trung bình
      params.weekStart = weekStart
      params.weekEnd = weekEnd
      params.calculateAverage = 'true'
      
      getHealthLogs(params)
        .then((res) => {
          setData(res)
        })
        .catch((e) => {
          setError(e?.response?.data?.message || e.message)
        })
        .finally(() => setLoading(false))
    }
  }, [activityType, date, hasWeekRange, limit, page, weekEnd, weekStart, filterMode])

  // resetFilters removed

  function setWeekRange() {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    
    setWeekStart(startOfWeek.toISOString().slice(0, 10))
    setWeekEnd(endOfWeek.toISOString().slice(0, 10))
    setDate('')
    setFilterMode('week')
  }

  function startCreate() {
    setFormErrors({})
    const now = new Date().toISOString().slice(0,16)
    setForm({ id: '', activityType: '', value: '', unit: '', note: '', occurredAt: now })
    reset({ id: '', activityType: '', value: '', unit: '', note: '', occurredAt: now })
    setShowForm(true)
  }

  function startEdit(item) {
    setFormErrors({})
    const occurredLocal = new Date(item.occurredAt)
    const isoLocal = new Date(occurredLocal.getTime() - occurredLocal.getTimezoneOffset() * 60000).toISOString().slice(0,16)
    setForm({
      id: item._id,
      activityType: item.activityType,
      value: String(item.value),
      unit: item.unit || '',
      note: item.note || '',
      occurredAt: isoLocal,
    })
    // populate react-hook-form values
    reset({ id: item._id, activityType: item.activityType, value: String(item.value), unit: item.unit || '', note: item.note || '', occurredAt: isoLocal })
  }

  // submit handler wired through react-hook-form
  async function onSubmit(data) {
    setSaving(true)
    setError('')
    try {
      const payload = {
        activityType: data.activityType,
        value: Number(data.value),
        unit: data.unit || undefined,
        note: data.note || undefined,
        occurredAt: new Date(data.occurredAt).toISOString(),
      }
      if (data.id) {
        await updateHealthLog(data.id, payload)
      } else {
        await createHealthLog(payload)
      }
      reset({ id: '', activityType: '', value: '', unit: '', note: '', occurredAt: '' })
      setShowForm(false)
      // refresh
      const params = { page, limit }
      if (activityType) params.activityType = activityType
      if (date) params.date = date
      else if (hasWeekRange) { params.weekStart = weekStart; params.weekEnd = weekEnd }
      const res = await getHealthLogs(params)
      setData(res)
    } catch (e) {
      const resp = e?.response
      if (resp?.status === 400 && resp.data?.fieldErrors) {
        setFormErrors(resp.data.fieldErrors || {})
        setError(resp.data.message || 'Có lỗi dữ liệu, kiểm tra form')
      } else {
        setError(resp?.data?.message || e.message)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this log?')) return
    setSaving(true)
    setError('')
    try {
      await deleteHealthLog(id)
      const params = { page, limit }
      if (activityType) params.activityType = activityType
      if (date) params.date = date
      else if (hasWeekRange) { params.weekStart = weekStart; params.weekEnd = weekEnd }
      const res = await getHealthLogs(params)
      setData(res)
    } catch (e) {
      setError(e?.response?.data?.message || e.message)
    } finally {
      setSaving(false)
    }
  }

  // Sắp xếp dữ liệu theo giá trị
  const sortedItems = useMemo(() => {
    if (!data.items) return [];
    return [...data.items].sort((a, b) => {
      if (sortOrder === 'asc') return a.value - b.value;
      return b.value - a.value;
    });
  }, [data.items, sortOrder]);

  return (
    <>
      <div>
        <h1 className="text-lg sm:text-2xl font-bold mb-3 sm:mb-4 text-gray-900 dark:text-white">Nhật ký sức khỏe</h1>
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-3 sm:p-6 mb-3 sm:mb-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex flex-col w-full sm:min-w-[180px]">
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Hoạt động</label>
              <select className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white bg-white text-gray-900 rounded px-2 py-2" value={activityType} onChange={(e) => { setActivityType(e.target.value); setPage(1) }}>
                {activityOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col w-full sm:min-w-[180px]">
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Chế độ lọc</label>
              <div className="flex gap-2">
                <button 
                  className={`flex-1 px-3 py-2 rounded text-sm font-semibold shadow ${filterMode === 'day' ? 'bg-sky-600 text-white' : 'bg-gray-100 dark:bg-gray-600 dark:text-gray-200'}`}
                  onClick={() => { setFilterMode('day'); setWeekStart(''); setWeekEnd(''); setPage(1) }}
                >
                  Theo ngày
                </button>
                <button 
                  className={`flex-1 px-3 py-2 rounded text-sm font-semibold shadow ${filterMode === 'week' ? 'bg-sky-600 text-white' : 'bg-gray-100 dark:bg-gray-600 dark:text-gray-200'}`}
                  onClick={setWeekRange}
                >
                  Trung bình tuần
                </button>
              </div>
            </div>
            {filterMode === 'day' ? (
              <div className="flex flex-col w-full sm:min-w-[140px]">
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Ngày</label>
                <input type="date" className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white bg-white text-gray-900 rounded px-2 py-2" value={date} onChange={(e) => { setDate(e.target.value); setPage(1) }} />
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <div className="flex flex-col flex-1">
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Tuần từ</label>
                  <input type="date" className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white bg-white text-gray-900 rounded px-2 py-2" value={weekStart} onChange={(e) => { setWeekStart(e.target.value); setPage(1) }} />
                </div>
                <div className="flex flex-col flex-1">
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">đến</label>
                  <input type="date" className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white bg-white text-gray-900 rounded px-2 py-2" value={weekEnd} onChange={(e) => { setWeekEnd(e.target.value); setPage(1) }} />
                </div>
              </div>
            )}
            {/* Refresh button removed as requested */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 w-full sm:w-auto sm:ml-auto">
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Số lượng/trang</label>
              <select className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white bg-white text-gray-900 px-2 py-2 rounded" value={limit} onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1) }}>
                {[10, 20, 50].map(v => <option key={v} value={v}>{v}/trang</option>)}
              </select>
            </div>
          </div>
        </div>

        {error && <div className="text-red-600 dark:text-red-400 mb-3">{error}</div>}

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-lg overflow-hidden">
          <div className="hidden sm:grid grid-cols-12 text-sm font-semibold px-3 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 text-gray-800 dark:text-gray-200">
            <div className="col-span-3 flex items-center">Thời gian</div>
            <div className="col-span-2 flex items-center">Hoạt động</div>
            <div className="col-span-2 flex items-center justify-center gap-2">
              Giá trị
              <button
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${
                  sortOrder === 'asc' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                title={sortOrder === 'asc' ? 'Sắp xếp giảm dần' : 'Sắp xếp tăng dần'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
            <div className="col-span-2 flex items-center justify-center">Đơn vị</div>
            <div className="col-span-3 flex items-center">Ghi chú</div>
          </div>
          {loading ? (
            <div className="px-3 sm:px-6 py-6 sm:py-8 text-center">
              <div className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                Đang tải...
              </div>
            </div>
          ) : (
            <>
              {/* Desktop view */}
              <div className="hidden sm:block">
                {sortedItems.map((item, index) => (
                  <div key={item._id} className={`grid grid-cols-12 px-3 sm:px-6 py-3 sm:py-4 text-sm items-center transition-colors ${
                    item.isAverage 
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 border-l-4 border-blue-500' 
                      : index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-700/50'
                  } hover:bg-blue-50/50 dark:hover:bg-gray-600/50`}>
                  <div className="col-span-3 flex items-center text-gray-700 dark:text-gray-300">
                    <div>
                      <div className="font-medium">{new Date(item.occurredAt).toLocaleDateString('vi-VN')}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(item.occurredAt).toLocaleTimeString('vi-VN')}</div>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800 dark:text-gray-200">{item.activityType}</span>
                      {item.isAverage && (
                        <span className="text-xs bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-800 dark:to-indigo-800 text-blue-700 dark:text-blue-200 px-2 py-1 rounded-full font-medium">
                          Trung bình
                        </span>
                      )}
                      {item.source === 'mifit' && (
                        <span className="text-xs bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-800 dark:to-green-800 text-emerald-700 dark:text-emerald-200 px-2 py-1 rounded-full font-medium">
                          MiFit
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center justify-center">
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{item.value}</span>
                  </div>
                  <div className="col-span-2 flex items-center justify-center text-gray-600 dark:text-gray-300">
                    {item.unit || '-'}
                  </div>
                  <div className="col-span-3 flex items-center">
                    <div className="flex items-center gap-2 w-full">
                      <span className="truncate text-gray-600 dark:text-gray-300 flex-1" title={item.note || ''}>
                        {item.note || '-'}
                      </span>
                      {item.source === 'healthlog' && (
                        <div className="flex gap-1">
                          <button 
                            className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-800 hover:bg-amber-200 dark:hover:bg-amber-700 flex items-center justify-center text-amber-700 dark:text-amber-200 transition-colors" 
                            onClick={()=>startEdit(item)}
                            title="Sửa"
                          >
                            ✏️
                          </button>
                          <button 
                            className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-800 hover:bg-rose-200 dark:hover:bg-rose-700 flex items-center justify-center text-rose-700 dark:text-rose-200 transition-colors" 
                            onClick={()=>handleDelete(item._id)}
                            title="Xóa"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                ))}
              </div>

              {/* Mobile view */}
              <div className="sm:hidden">
                {sortedItems.map((item, index) => (
                  <div key={item._id} className={`px-3 py-4 border-b dark:border-gray-700 transition-colors ${
                    item.isAverage 
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 border-l-4 border-blue-500' 
                      : index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-700/50'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">{item.activityType}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {new Date(item.occurredAt).toLocaleDateString('vi-VN')} {new Date(item.occurredAt).toLocaleTimeString('vi-VN')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{item.value}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{item.unit || '-'}</div>
                      </div>
                    </div>
                    
                    {item.note && (
                      <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        <span className="font-medium">Ghi chú:</span> {item.note}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        {item.isAverage && (
                          <span className="text-xs bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-800 dark:to-indigo-800 text-blue-700 dark:text-blue-200 px-2 py-1 rounded-full font-medium">
                            Trung bình
                          </span>
                        )}
                        {item.source === 'mifit' && (
                          <span className="text-xs bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-800 dark:to-green-800 text-emerald-700 dark:text-emerald-200 px-2 py-1 rounded-full font-medium">
                            MiFit
                          </span>
                        )}
                      </div>
                      
                      {item.source === 'healthlog' && (
                        <div className="flex gap-1">
                          <button 
                            className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-800 hover:bg-amber-200 dark:hover:bg-amber-700 flex items-center justify-center text-amber-700 dark:text-amber-200 transition-colors" 
                            onClick={()=>startEdit(item)}
                            title="Sửa"
                          >
                            ✏️
                          </button>
                          <button 
                            className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-800 hover:bg-rose-200 dark:hover:bg-rose-700 flex items-center justify-center text-rose-700 dark:text-rose-200 transition-colors" 
                            onClick={()=>handleDelete(item._id)}
                            title="Xóa"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {!loading && data.items.length === 0 && (
            <div className="px-3 sm:px-6 py-8 sm:py-12 text-center">
              <div className="text-gray-400 dark:text-gray-500 text-3xl sm:text-4xl mb-3">📊</div>
              <div className="text-gray-600 dark:text-gray-300">Chưa có dữ liệu</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Hãy thêm bản ghi mới hoặc chọn ngày khác</div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-3 sm:mt-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Tổng: {data.total} • Trang {data.page} / {data.pages || 1}</div>
            <div className="flex gap-2">
              <button className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 rounded disabled:opacity-50 bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/30 text-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Trước</button>
              <button className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 rounded disabled:opacity-50 bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/30 text-sm" disabled={page >= (data.pages || 1)} onClick={() => setPage((p) => p + 1)}>Sau</button>
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            {!showForm && (
              <div className="flex justify-end">
                <button className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 sm:px-4 py-2 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-sm" onClick={startCreate}>+ Thêm bản ghi mới</button>
              </div>
            )}
            {showForm && (
              <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-4 mb-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-900 dark:text-white">{form.id ? 'Chỉnh sửa' : 'Thêm bản ghi mới'}</h2>
                  {!form.id && (
                    <button className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30" onClick={startCreate}>Tạo nhanh</button>
                  )}
                </div>
                <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3" onSubmit={handleSubmit(onSubmit)}>
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Hoạt động</label>
                    <select {...register('activityType')} className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white bg-white text-gray-900 rounded px-2 py-2">
                      <option value="" disabled>Chọn hoạt động</option>
                      {activityOptions.filter(o=>o.value).map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {(clientErrors.activityType?.message || formErrors.activityType) && <div className="text-red-600 dark:text-red-400 text-sm mt-1">{clientErrors.activityType?.message || formErrors.activityType}</div>}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Giá trị</label>
                    <input {...register('value')} type="number" step="any" className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white bg-white text-gray-900 rounded px-2 py-2" />
                    {(clientErrors.value?.message || formErrors.value) && <div className="text-red-600 dark:text-red-400 text-sm mt-1">{clientErrors.value?.message || formErrors.value}</div>}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Đơn vị</label>
                    <input {...register('unit')} type="text" className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white bg-white text-gray-900 rounded px-2 py-2" />
                    {(clientErrors.unit?.message || formErrors.unit) && <div className="text-red-600 dark:text-red-400 text-sm mt-1">{clientErrors.unit?.message || formErrors.unit}</div>}
                  </div>
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Thời gian</label>
                    <input {...register('occurredAt')} required type="datetime-local" className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white bg-white text-gray-900 rounded px-2 py-2" />
                    {(clientErrors.occurredAt?.message || formErrors.occurredAt) && <div className="text-red-600 dark:text-red-400 text-sm mt-1">{clientErrors.occurredAt?.message || formErrors.occurredAt}</div>}
                  </div>
                  <div className="sm:col-span-2 lg:col-span-6">
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Ghi chú</label>
                    <input {...register('note')} type="text" className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white bg-white text-gray-900 rounded px-2 py-2" />
                    {(clientErrors.note?.message || formErrors.note) && <div className="text-red-600 dark:text-red-400 text-sm mt-1">{clientErrors.note?.message || formErrors.note}</div>}
                  </div>
                  <div className="sm:col-span-2 lg:col-span-6 flex flex-col sm:flex-row gap-2">
                    <button disabled={saving} className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 rounded bg-sky-600 dark:bg-sky-700 text-white hover:bg-sky-700 dark:hover:bg-sky-600 disabled:opacity-50" type="submit">{form.id ? 'Cập nhật' : 'Tạo mới'}</button>
                    {form.id && (
                      <button type="button" className="border dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 rounded" onClick={()=>{setForm({ id:'', activityType:'', value:'', unit:'', note:'', occurredAt:'' }); setShowForm(false)}}>Hủy</button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}


