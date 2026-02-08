const mongoose = require('mongoose')

const ticketsSchema = new mongoose.Schema({
    title: String,
    description: String,
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'] },
    status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'], default: 'OPEN' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Tickets', ticketsSchema)