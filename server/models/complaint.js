const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Complaint = sequelize.define('Complaint', {
  refNumber: { type: DataTypes.STRING, allowNull: true },
  fullName: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  crimeDate: { type: DataTypes.STRING, allowNull: false },
  state: { type: DataTypes.STRING, allowNull: true, defaultValue: '' },
  district: { type: DataTypes.STRING, allowNull: false },
  address: { type: DataTypes.STRING, allowNull: false },
  complaintType: { type: DataTypes.STRING, allowNull: false },
  complaint: { type: DataTypes.TEXT, allowNull: false },
  aiCategory: { type: DataTypes.STRING, defaultValue: 'Unclassified' },
  aiPriority: { type: DataTypes.STRING, defaultValue: 'MEDIUM' },
  status: { type: DataTypes.STRING, defaultValue: 'Pending' },
  officerNote: { type: DataTypes.TEXT, defaultValue: '' }
}, {
  timestamps: true
});

module.exports = Complaint;