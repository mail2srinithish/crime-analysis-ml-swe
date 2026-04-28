const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Complaint = sequelize.define('Complaint', {
  fullName: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  crimeDate: { type: DataTypes.STRING, allowNull: false },
  district: { type: DataTypes.STRING, allowNull: false },
  address: { type: DataTypes.STRING, allowNull: false },
  complaintType: { type: DataTypes.STRING, allowNull: false },
  complaint: { type: DataTypes.TEXT, allowNull: false },
  aiCategory: { type: DataTypes.STRING, defaultValue: 'Unclassified' },
  aiPriority: { type: DataTypes.STRING, defaultValue: 'MEDIUM' }
}, {
  timestamps: true
});

module.exports = Complaint;