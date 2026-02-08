const mongoose = require('mongoose')

const CommentsSchema = new mongoose.Schema({
    ticketId: mongoose.Schema.Types.ObjectId,
    message: String,
    authorId: mongoose.Schema.Types.ObjectId
}, { timestamps: true })


module.exports = mongoose.model('Comments', CommentsSchema)