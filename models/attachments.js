const mongoose = require('mongoose')

const attachmentsSchema = new mongoose.Schema({
    ticketId: mongoose.Schema.Types.ObjectId,
    uploadedBy: mongoose.Schema.Types.ObjectId,
    fileId: mongoose.Schema.Types.ObjectId,
    originalName: String,
    fileType: String,
    size: Number,
    path: String
}, { timestamps: true })

module.exports = mongoose.model('Attachments', attachmentsSchema)