const mongoose = require('mongoose')

const templateSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    children: { type: Array },
    visual_id: { type: String, required: true },
    content_uid: { type: String, required: true },
    preview: { type: String }
}, {
    versionKey: false
})

module.exports = mongoose.model('Template', templateSchema)