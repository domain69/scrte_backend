const mongoose = require('mongoose')

const Pages = require('./models/pages');
const Block = require('./models/block')
const HttpError = require('./models/http-error');
var request = require('request');
const { json } = require('body-parser');
const { toHtml } = require('./jsonToHtml')

const getAllPages = async (req, res, next) => {
    const pages = await Pages.find().exec();
    res.json(pages)
}

const getPageswithUserId = async (req, res, next) => {
    let pages
    try {
        pages = await Pages.find({ userId: req.params.userId })

    } catch (err) {
        const error = new HttpError(
            'Something went wrong, could not find a page.',
            500
        );
        return next(error);
    }
    if (!pages) {
        const error = new HttpError(
            'Could not find pages for the provided id.',
            404
        );
        return next(error);
    }
    res.json({ pages })
}

const createPage = async (req, res, next) => {
    const createdPage = new Pages({
        _id: req.body.id,
        type: req.body.type,
        children: req.body.children,
        userId: req.body.userId,
        title: req.body.title
    })
    try {
        await createdPage.save()
    } catch (err) {
        console.log(err)
        const error = new HttpError(
            'Creating pages failed, please try again.',
            500
        );
        return next(error);
    }
    res.status(201).json({ page: createdPage });
}

const getBlocksWithinDoc = async (req, res, next) => {
    let docId = req.params.docId
    let blocks
    try {
        blocks = await Block.find({ docsId: docId })

    } catch (err) {
        const error = new HttpError(
            'Something went wrong, could not find a page.',
            500
        );
        return next(error);
    }
    if (!blocks) {
        const error = new HttpError(
            'Could not find Blocks for the provided id.',
            404
        );
        return next(error);
    }
    res.json({ blocks })
}

const createMultipleBlock = async (req, res, next) => {
    let newBlocks = Array.from(req.body.blocks).map((child) => ({
        _id: child.id,
        type: child.type,
        attrs: child.attrs,
        children: child.children,
        docsId: child.docsId
    }))
    let createBlock
    try {
        createBlock = await Block.create(newBlocks)
    } catch (err) {
        console.log(err)
        const error = new HttpError(
            'Creating pages failed, please try again.',
            500
        );
        return next(error);
    }
    res.status(201).json({ blocks: createBlock })
}

const pageWithBlocks = async (req, res, next) => {

}


const removeAllBlocks = async (req, res, next) => {
    try {
        await Block.deleteMany({}, (err) => (err))
        res.status(201).json({ message: 'Successfully deleted' })
    } catch (err) {
        res.status(500).json({ err: err })
    }

}
const updateBlock = async (req, res, next) => {
    const blockId = req.params.id
    let body = req.body
    delete body.id
    try {
        await Block.findByIdAndUpdate(blockId, { ...body })
        res.status(201).json({ message: 'Successfully Updated' })

    } catch (err) {
        console.log(err)
        const error = new HttpError(
            'Updating pages failed, please try again.',
            500
        );
        return next(error);
    }

}
const updatePage = async (req, res, next) => {
    const pageId = req.params.id
    let body = req.body
    if (body.id) {
        delete body.id
    }
    try {
        await Pages.findByIdAndUpdate(pageId, { ...body })
        res.status(201).json({ message: 'Successfully Updated' })

    } catch (err) {
        console.log(err)
        const error = new HttpError(
            'Updating pages failed, please try again.',
            500
        );
        return next(error);
    }

}
const deleteBlockWithId = async (req, res, next) => {
    let blockId = req.params.id
    try {
        await Block.findByIdAndDelete(blockId, (err) => {
            console.log(err)
        })
        res.status(201).json({ message: 'Successfully deleted' })
    } catch (err) {
        res.status(500).json({ err: err })
    }

}
const saveDocumentChanges = async (req, res, next) => {
    let { doc, newBlocks, updateBlocks, deletedNodes } = req.body

    let page;
    try {
        page = await Pages.findById(doc.id);
    } catch (err) {
        console.log(err)
        const error = new HttpError(
            'Failed while fetch Document, please try again.',
            500
        );
        return next(error);
    }

    if (!page) {
        const error = new HttpError('Could not find page for provided id.', 404);
        return next(error);
    }
    let sess
    try {
        sess = await mongoose.startSession();
        sess.startTransaction()
        page.children = doc.children
        page.attrs = doc.attrs
        await page.save({ session: sess })
        await Block.deleteMany({ _id: { $in: deletedNodes } }, { session: sess })
        // Array.from(deletedNodes).map(async (deletedId) => {
        //     console.log(deletedId)
        //     try {
        //         await Block.findByIdAndDelete(deletedId, { session: sess })
        //     } catch (err) {
        //         console.log('DeleteBlock', err)
        //     }
        // })
        await Block.insertMany(newBlocks, { session: sess })
        for (const block of updateBlocks) {
            await Block.updateOne({ _id: block.id }, { attrs: block.attrs, children: block.children, type: block.type }, { session: sess })
        }
        // Array.from(updateBlocks).map(async (element) => {
        //     try {
        //         await Block.findByIdAndUpdate(element.id, { attrs: element.attrs, children: element.children, type: element.type }, { session: sess })
        //     } catch (err) {
        //         console.log('Update Issue', err)
        //     }
        // })

        await sess.commitTransaction();

        res.status(201).json({ message: 'Successfully Updated' })
    } catch (err) {
        await sess.abortTransaction();
        res.status(500).json({ err: err })
    }

}
const getPageWithId = async (req, res, next) => {
    let page
    try {
        page = await Pages.find({ _id: req.params.id })

    } catch (err) {
        const error = new HttpError(
            'Something went wrong, could not find a page.',
            500
        );
        return next(error);
    }
    if (!page) {
        const error = new HttpError(
            'Could not find page for the provided id.',
            404
        );
        return next(error);
    }
    res.json({ page })
}
const deletePageAndBlock = async (req, res, next) => {
    let page
    let sess
    let deletedBlock
    let updateBlock
    try {
        sess = await mongoose.startSession();
        sess.startTransaction()
        page = await Pages.findByIdAndDelete(req.params.id, { session: sess })
        deletedBlock = await Block.deleteMany({ $and: [{ docsId: req.params.id }, { docsId: { $size: 1 } }] }, { session: sess })
        updateBlock = await Block.updateMany({ docsId: req.params.id }, { $pull: { docsId: req.params.id } }, { session: sess })
        await sess.commitTransaction();
    } catch (err) {
        await sess.abortTransaction();

        const error = new HttpError(
            'Something went wrong, could not find a page.',
            500
        );
        return next(error);
    }

    res.status(202).json({ message: 'Successfully Deleted Page' })
}

const getComponent = async (req, res, next) => {
    let { uid, entryId, visualId } = req.body;
    const base_url = 'api.contentstack.io'

    const headers = {
        'api_key': 'blt2cf669e5016d5e07',
        'access_token': 'cs81606189c4e950040a23abe0',
        'environment': 'development',
        'authorization': 'csf9e7a0d0e7e9d04e14215f9a'
    }
    request({
        headers,
        uri: `https://${base_url}/v3/content_types/${uid}/entries/${entryId}`,
        method: 'GET'
    }, function (err, response, body) {
        let actualData = JSON.parse(body)['entry']
        let templateJson = {
            type: 'template',
            children: [
                {
                    "type": "paragraph",
                    "children": [
                        {
                            "text": ""
                        }
                    ]
                },
                {
                    "type": "paragraph",
                    "attrs": {
                        "id": 'test1',
                        "field_attrs": {
                            "display_name": "Title",
                            "uid": "title",
                            "data_type": "text",
                            "mandatory": true,
                            "unique": true,
                            "field_metadata": {
                                "_default": true,
                                "version": 3
                            },
                            "multiple": false,
                            "non_localizable": false
                        },
                        "styles": {
                            "paddingTop": "14px",
                            "paddingBottom": "23px",
                            "font-family": "cursive",
                            "fontWeight": "600"
                        }
                    },
                    "children": [
                        {
                            "text": "Title"
                        }
                    ]
                },
                {
                    "type": "paragraph",
                    "attrs": {
                        "field_attrs": {
                            "display_name": "URL",
                            "uid": "url",
                            "data_type": "text",
                            "mandatory": true,
                            "field_metadata": {
                                "_default": true,
                                "version": 3
                            },
                            "multiple": false,
                            "unique": false,
                            "non_localizable": false
                        }
                    },
                    "children": [
                        {
                            "text": "URL"
                        }
                    ]
                },
                {
                    "type": "paragraph",
                    "attrs": {
                        "field_attrs": {
                            "data_type": "text",
                            "display_name": "Banner",
                            "uid": "multi_line",
                            "field_metadata": {
                                "description": "",
                                "default_value": "",
                                "multiline": true,
                                "version": 3
                            },
                            "format": "",
                            "error_messages": {
                                "format": ""
                            },
                            "multiple": false,
                            "mandatory": false,
                            "unique": false,
                            "non_localizable": false
                        }
                    },
                    "children": [
                        {
                            "text": "Banner"
                        }
                    ]
                }
            ]
        }
        console.log(err)
        res.status(200).send(toHtml(templateJson, actualData))
    });
}

exports.getAllPages = getAllPages;
exports.getPageswithUserId = getPageswithUserId;
exports.createPage = createPage;
exports.getBlocksWithinDoc = getBlocksWithinDoc;
exports.createMultipleBlock = createMultipleBlock;
exports.pageWithBlocks = pageWithBlocks;
exports.removeAllBlocks = removeAllBlocks;
exports.updateBlock = updateBlock;
exports.updatePage = updatePage;
exports.deleteBlockWithId = deleteBlockWithId;
exports.saveDocumentChanges = saveDocumentChanges;
exports.getPageWithId = getPageWithId;
exports.deletePageAndBlock = deletePageAndBlock;
exports.getComponent = getComponent;