const { getMiFitDb } = require('../services/mifitDb');

// MiFit sleep schema in Compass screenshot suggests fields:
// Key: "sleep", Time: <epoch>, Value: { min_hr, avg_hr, max_hr, duration, timezone, ... }

function epochSecondsToDate(epochSec) {
  if (!epochSec) return null;
  // Treat as UTC seconds
  return new Date(epochSec * 1000);
}

exports.getSleep = async (req, res, next) => {
  try {
    const { page = 1, limit = 25, year, month, date, weekStart, weekEnd } = req.query;
    const numericLimit = Math.min(parseInt(limit, 10) || 25, 500);
    const numericPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (numericPage - 1) * numericLimit;

    const db = getMiFitDb();
    const collection = db.collection('sleep');

    const filter = { Key: 'sleep' };
    // Lọc theo ngày/tháng/năm/tuần
    if (date) {
      // Lọc theo ngày cụ thể
      const start = new Date(date);
      const end = new Date(date);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      filter.Time = {
        $gte: Math.floor(start.getTime() / 1000),
        $lte: Math.floor(end.getTime() / 1000)
      };
    } else if (year && month) {
      // Lọc theo tháng/năm
      const y = parseInt(year, 10);
      const m = parseInt(month, 10) - 1;
      const start = new Date(Date.UTC(y, m, 1));
      const end = new Date(Date.UTC(y, m + 1, 1));
      filter.Time = {
        $gte: Math.floor(start.getTime() / 1000),
        $lt: Math.floor(end.getTime() / 1000)
      };
    } else if (weekStart && weekEnd) {
      // Lọc theo tuần
      const start = new Date(weekStart);
      const end = new Date(weekEnd);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      filter.Time = {
        $gte: Math.floor(start.getTime() / 1000),
        $lte: Math.floor(end.getTime() / 1000)
      };
    }

    const total = await collection.countDocuments(filter);
    const docs = await collection
      .find(filter)
      .sort({ Time: -1, _id: -1 })
      .skip(skip)
      .limit(numericLimit)
      .toArray();

    const items = docs.map((d) => ({
      id: d._id,
      uid: d.Uid,
      sid: d.Sid,
      time: d.Time,
      occurredAt: epochSecondsToDate(d.Time),
      duration: d.Value?.duration ?? null,
      minHr: d.Value?.min_hr ?? null,
      avgHr: d.Value?.avg_hr ?? null,
      maxHr: d.Value?.max_hr ?? null,
      timezone: d.Value?.timezone ?? null,
      raw: {
        ...d.Value,
        // Đảm bảo các trường giai đoạn ngủ có giá trị
        sleep_light_duration: d.Value?.sleep_light_duration ?? 0,
        sleep_deep_duration: d.Value?.sleep_deep_duration ?? 0,
        sleep_rem_duration: d.Value?.sleep_rem_duration ?? 0,
        sleep_awake_duration: d.Value?.sleep_awake_duration ?? 0,
        awake_count: d.Value?.awake_count ?? 0,
        bedtime: d.Value?.bedtime ?? null,
        wake_up_time: d.Value?.wake_up_time ?? null,
        device_bedtime: d.Value?.device_bedtime ?? null,
        device_wake_up_time: d.Value?.device_wake_up_time ?? null,
      },
    }));

    res.json({
      items,
      total,
      page: numericPage,
      pages: Math.ceil(total / numericLimit),
      limit: numericLimit,
    });
  } catch (err) {
    next(err);
  }
};


