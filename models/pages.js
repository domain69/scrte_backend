const mongoose = require('mongoose')

const pagesSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    type: { type: String, required: true },
    children: { type: Array, required: true },
    userId: { type: String, required: true },
    title: { type: String },
}, {
    versionKey: false
})

module.exports = mongoose.model('Pages', pagesSchema)