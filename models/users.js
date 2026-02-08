const mongoose = require('mongoose')

const usersSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    passwordHash: String,
    role: { type: String, enum: ['ADMIN', 'AGENT', 'CUSTOMER'] }
}, { timestamps: true })

module.exports = mongoose.model('Users', usersSchema)