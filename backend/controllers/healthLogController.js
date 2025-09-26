const HealthLog = require('../models/HealthLog');
const { getMiFitDb } = require('../services/mifitDb');

function buildDateRangeFilter({ date, weekStart, weekEnd }) {
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    start.setHours(0, 0, 0, 0);
    return { $gte: start, $lte: end };
  }
  if (weekStart && weekEnd) {
    const start = new Date(weekStart);
    const end = new Date(weekEnd);
    end.setHours(23, 59, 59, 999);
    start.setHours(0, 0, 0, 0);
    return { $gte: start, $lte: end };
  }
  return undefined;
}

exports.createHealthLog = async (req, res, next) => {
  try {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const arr = errors.array();
      const fieldErrors = arr.reduce((acc, cur) => {
        // use param as key, keep first message per field
        if (!acc[cur.param]) acc[cur.param] = cur.msg || cur.msg || 'Invalid value';
        return acc;
      }, {});
      return res.status(400).json({ message: 'Validation failed', errors: arr, fieldErrors });
    }
    const { activityType, value, unit, note, occurredAt } = req.body;
    const item = await HealthLog.create({ activityType, value, unit, note, occurredAt });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

// Map MiFit activity types to HealthLog activity types (bỏ sleep)
const mifitToHealthLogMap = {
  'heart_rate': 'heart_rate',
  'steps': 'steps',
  'calories': 'calories',
  'stress': 'stress',
  'spo2': 'spo2',
  'resting_heart_rate': 'resting_heart_rate'
};

function epochSecondsToDate(epochSec) {
  if (!epochSec) return null;
  return new Date(epochSec * 1000);
}

async function getMiFitData(activityType, dateRange, skip, limit) {
  try {
    const db = getMiFitDb();
    const collection = db.collection(activityType);
    
    const filter = { Key: activityType };
    if (dateRange) {
      filter.Time = {
        $gte: Math.floor(dateRange.$gte.getTime() / 1000),
        $lte: Math.floor(dateRange.$lte.getTime() / 1000)
      };
    }

    const total = await collection.countDocuments(filter);
    const docs = await collection
      .find(filter)
      .sort({ Time: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Mapping giá trị và đơn vị cho từng loại activity
    function getMiFitValueAndUnit(activityType, valueObj) {
      switch (activityType) {
        case 'heart_rate':
          // Dữ liệu thực tế: Value.bpm
          return { value: valueObj?.bpm ?? valueObj?.value ?? 0, unit: 'bpm' };
        case 'resting_heart_rate':
          // Dữ liệu thực tế: Value.bpm
          return { value: valueObj?.bpm ?? valueObj?.value ?? 0, unit: 'bpm' };
        case 'spo2':
          // Dữ liệu thực tế: Value.spo2
          return { value: valueObj?.spo2 ?? valueObj?.value ?? 0, unit: '%' };
        case 'stress':
          // Dữ liệu thực tế: Value.stress
          return { value: valueObj?.stress ?? valueObj?.value ?? 0, unit: 'score' };
        case 'steps':
          return { value: valueObj?.steps ?? valueObj?.value ?? 0, unit: 'steps' };
        case 'calories':
          return { value: valueObj?.calories ?? valueObj?.value ?? 0, unit: 'kcal' };
        case 'sleep':
          return { value: valueObj?.duration ?? valueObj?.value ?? 0, unit: 'phút' };
        default:
          return { value: valueObj?.value ?? 0, unit: valueObj?.unit ?? '' };
      }
    }

    return {
      items: docs.map((d) => {
        const { value, unit } = getMiFitValueAndUnit(activityType, d.Value);
        return {
          _id: d._id,
          activityType: mifitToHealthLogMap[activityType] || activityType,
          value,
          unit,
          note: `MiFit ${activityType}`,
          occurredAt: epochSecondsToDate(d.Time),
          source: 'mifit'
        };
      }),
      total
    };
  } catch (err) {
    console.log(`Không thể đọc dữ liệu MiFit ${activityType}:`, err.message);
    return { items: [], total: 0 };
  }
}

exports.getHealthLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, activityType, date, weekStart, weekEnd, calculateAverage } = req.query;
    console.log('[API] getHealthLogs called with:', { page, limit, activityType, date, weekStart, weekEnd });
    
    const numericLimit = Math.min(parseInt(limit, 10) || 10, 100);
    const numericPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (numericPage - 1) * numericLimit;

    const dateRange = buildDateRangeFilter({ date, weekStart, weekEnd });
    console.log('[API] dateRange:', dateRange);
    
    // Lấy dữ liệu từ HealthLog
    const healthLogFilter = {};
    if (activityType) healthLogFilter.activityType = activityType;
    if (dateRange) healthLogFilter.occurredAt = dateRange;
    
    console.log('[API] healthLogFilter:', healthLogFilter);

    let allItems = [];
    let total = 0;

    // Nếu là calories và có filter ngày/tuần thì tính tổng
    if (activityType === 'calories' && dateRange) {
      // Tổng từ HealthLog
      const healthLogSum = await HealthLog.aggregate([
        { $match: healthLogFilter },
        { $group: { _id: null, sum: { $sum: "$value" } } }
      ]);
      const sumHealthLog = healthLogSum[0]?.sum || 0;

      // Tổng từ MiFit
      const mifitData = await getMiFitData(activityType, dateRange, 0, 1000);
      const sumMiFit = mifitData.items.reduce((acc, item) => acc + (item.value || 0), 0);

      const sumTotal = sumHealthLog + sumMiFit;
      allItems = [{
        activityType: 'calories',
        value: sumTotal,
        unit: 'kcal',
        note: 'Tổng calories trong khoảng thời gian',
        occurredAt: date || weekStart || weekEnd,
        source: 'tổng'
      }];
      total = 1;
    } 
    // Nếu yêu cầu tính trung bình và có filter ngày/tuần
    else if (calculateAverage === 'true' && dateRange && activityType) {
      // Lấy tất cả dữ liệu từ HealthLog
      const healthLogItems = await HealthLog.find(healthLogFilter);
      const healthLogValues = healthLogItems.map(item => item.value).filter(val => !isNaN(val));

      // Lấy tất cả dữ liệu từ MiFit
      const mifitData = await getMiFitData(activityType, dateRange, 0, 1000);
      const mifitValues = mifitData.items.map(item => item.value).filter(val => !isNaN(val));

      // Tính trung bình
      const allValues = [...healthLogValues, ...mifitValues];
      if (allValues.length > 0) {
        const average = allValues.reduce((sum, val) => sum + val, 0) / allValues.length;
        const roundedAverage = Math.round(average * 100) / 100;

        // Tính số ngày trong khoảng
        const startDate = new Date(weekStart || date);
        const endDate = new Date(weekEnd || date);
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

        allItems = [{
          _id: 'average_' + Date.now(),
          activityType: activityType,
          value: roundedAverage,
          unit: healthLogItems[0]?.unit || mifitData.items[0]?.unit || '',
          note: `Trung bình ${allValues.length} bản ghi trong ${daysDiff} ngày`,
          occurredAt: new Date(),
          source: 'calculated',
          isAverage: true
        }];
        total = 1;
      } else {
        allItems = [];
        total = 0;
      }
    } else {
      // Trường hợp khác: lấy từng bản ghi
      const [healthLogItems, healthLogTotal] = await Promise.all([
        HealthLog.find(healthLogFilter).sort({ occurredAt: -1, _id: -1 }).skip(skip).limit(numericLimit),
        HealthLog.countDocuments(healthLogFilter),
      ]);

      allItems = healthLogItems.map(item => ({ ...item.toObject(), source: 'healthlog' }));
      total = healthLogTotal;

      // Nếu có chọn activityType cụ thể, cũng lấy dữ liệu MiFit tương ứng
      if (activityType && mifitToHealthLogMap[activityType]) {
        console.log('[API] Getting MiFit data for:', activityType);
        const mifitData = await getMiFitData(activityType, dateRange, skip, numericLimit);
        console.log('[API] MiFit results:', { items: mifitData.items.length, total: mifitData.total });
        allItems = [...allItems, ...mifitData.items];
        total += mifitData.total;
        // Sắp xếp lại theo thời gian
        allItems.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
      }
    }

    console.log('[API] Final results:', { items: allItems.length, total });

    res.json({
      items: allItems,
      total,
      page: numericPage,
      pages: Math.ceil(total / numericLimit),
      limit: numericLimit,
    });
  } catch (err) {
    console.error('[API] getHealthLogs error:', err);
    next(err);
  }
};

exports.getHealthLogById = async (req, res, next) => {
  try {
    const item = await HealthLog.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

exports.updateHealthLog = async (req, res, next) => {
  try {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const arr = errors.array();
      const fieldErrors = arr.reduce((acc, cur) => {
        if (!acc[cur.param]) acc[cur.param] = cur.msg || cur.msg || 'Invalid value';
        return acc;
      }, {});
      return res.status(400).json({ message: 'Validation failed', errors: arr, fieldErrors });
    }
    const item = await HealthLog.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

exports.deleteHealthLog = async (req, res, next) => {
  try {
    const item = await HealthLog.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.getMonthlyStats = async (req, res, next) => {
  try {
    const { year, month } = req.query; // month 1-12
    const y = parseInt(year, 10) || new Date().getFullYear();
    const m = (parseInt(month, 10) || new Date().getMonth() + 1) - 1; // 0-based
    const start = new Date(Date.UTC(y, m, 1));
    const end = new Date(Date.UTC(y, m + 1, 1));

    const stats = await HealthLog.aggregate([
      { $match: { occurredAt: { $gte: start, $lt: end } } },
      { $group: { _id: '$activityType', count: { $sum: 1 } } },
      { $project: { _id: 0, activityType: '$_id', count: 1 } },
      { $sort: { activityType: 1 } },
    ]);

    res.json({ year: y, month: m + 1, stats });
  } catch (err) {
    next(err);
  }
};


