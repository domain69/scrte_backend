const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors')
const mongoose = require('mongoose')
const mongooseMethods = require('./mongoose')
const HttpError = require('./models/http-error')
require('dotenv').config();

const url = process.env.URL

const app = express();
app.use(cors())
app.use(bodyParser.json())



app.get('/pages', mongooseMethods.getAllPages)
app.get('/pages/:userId', mongooseMethods.getPageswithUserId)
app.get('/page/:id', mongooseMethods.getPageWithId)
app.get('/delete/page/:id', mongooseMethods.deletePageAndBlock)

app.get('/blocks/:docId', mongooseMethods.getBlocksWithinDoc)
app.get('/clear', mongooseMethods.removeAllBlocks)

app.post('/addPages', mongooseMethods.createPage)
app.post('/addBlocks', mongooseMethods.createMultipleBlock)

app.put('/blocks/:id', mongooseMethods.updateBlock)
app.put('/page/:id', mongooseMethods.updatePage)

app.get('/delete/block/:id', mongooseMethods.deleteBlockWithId)
app.patch('/update/', mongooseMethods.saveDocumentChanges)

app.post('/template/getComponent/', mongooseMethods.getComponent)
//app.post('/uploadNewPage', mongooseMethods.pageWithBlocks)

app.use((req, res, next) => {
    console.log(req.method, req.url)
    const error = new HttpError('Could not find this route.', 404);
    throw error;
});

app.use((error, req, res, next) => {
    if (res.headerSent) {
        return next(error);
    }
    res.status(error.code || 500);
    res.json({ message: error.message || 'An unknown error occurred!' });
});

mongoose.connect(url, { useUnifiedTopology: true, useNewUrlParser: true }).then((res) => {
    app.listen(process.env.PORT || 5000)
    console.log('Connected to database')
}).catch((err) => {
    console.log(err)
})
