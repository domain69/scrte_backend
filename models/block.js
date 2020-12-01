const mongoose = require('mongoose')

const blockSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    type: { type: String, required: true },
    attrs: { type: Object },
    children: { type: Array },
    docsId: { type: Array }
}, {
    versionKey: false
})

module.exports = mongoose.model('Block', blockSchema)