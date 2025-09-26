const mongoose = require('mongoose');

const allowedActivityTypes = [
  'heart_rate',
  'calories',
  'steps',
  'sleep',
  'stress',
  'spo2',
  'resting_heart_rate',
];

const HealthLogSchema = new mongoose.Schema(
  {
    activityType: {
      type: String,
      enum: allowedActivityTypes,
      required: true,
      index: true,
    },
    value: { type: Number, required: true },
    unit: { type: String },
    note: { type: String },
    occurredAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('HealthLog', HealthLogSchema);


