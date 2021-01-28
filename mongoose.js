const mongoose = require('mongoose')

const Pages = require('./models/pages');
const Block = require('./models/block')
const Template = require('./models/template')
const HttpError = require('./models/http-error');
var request = require('request');
const { json } = require('body-parser');
const { toHtml } = require('./jsonToHtml')
const { getValues, getSingleEntry } = require('./utils')
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
    let { doc, updateBlocks, deletedNodes } = req.body
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

        for (const block of updateBlocks) {
            await Block.updateOne({ _id: block.id }, { attrs: block.attrs, children: block.children, type: block.type, _id: block.id, docsId: block.docsId }, { session: sess, upsert: true })
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

    getSingleEntry(uid, entryId).then(async (val) => {
        let actualData = val
        let templateJson
        try {
            templateJson = await Template.findOne({ content_uid: uid, visual_id: visualId }).exec()
        } catch (err) {
            const error = new HttpError(
                'Something went wrong, could not find a Template.',
                500
            );
            return next(error);
        }
        if (!templateJson) {
            const error = new HttpError(
                'Could not find Template for the provided visual id.',
                404
            );
            return next(error);
        }
        templateJson.type = "template"

        getValues(templateJson.children, actualData).then((val) => {
            let tempVal = {
                type: 'template',
                children: [
                    { text: 'Error' }
                ]
            }
            if (val) {
                tempVal.children = val
            }
            res.status(200).send(toHtml(tempVal))
        }).catch((err) => {
            console.log(err)
            res.status(400).send("<p>Error while fetching Data</p>")

        })
    })

}

const getAllVisualPage = async (req, res, next) => {
    const { content_uid } = req.params
    let content;
    try {
        content = await Template.find({ content_uid: content_uid })
    } catch (err) {
        const error = new HttpError(
            'Something went wrong, could not find a Template.',
            500
        );
        return next(error);
    }

    res.json({ content })
}
const getVisualPageWithId = async (req, res, next) => {
    const { content_uid, visual_id } = req.params
    let content;
    try {
        content = await Template.find({ content_uid: content_uid, visual_id: visual_id })
    } catch (err) {
        const error = new HttpError(
            'Something went wrong, could not find a Template.',
            500
        );
        return next(error);
    }
    if (content.length !== 0) {
        content = content[0]
        res.json({ content })
    } else {
        res.json({ message: "No Visual Page with Given Id" })
    }
}
const createNewVisualPage = async (req, res, next) => {
    let content;
    try {
        content = await Template.find({ content_uid: req.body.content_uid, visual_id: req.body.visual_id })
    } catch (err) {
        const error = new HttpError(
            'Something went wrong, could not find a Template.',
            500
        );
        return next(error);
    }
    if (content.length !== 0) {
        res.status(406).json({ error: "Visual page with given id already exists" })
        return
    }
    const createdVisualPage = new Template({
        _id: req.body.id,
        children: req.body.children,
        visual_id: req.body.visual_id,
        content_uid: req.body.content_uid,
        preview: req.body.preview
    })
    try {
        await createdVisualPage.save()
    } catch (err) {
        console.log(err)
        const error = new HttpError(
            'Creating pages failed, please try again.',
            500
        );
        return next(error);
    }

    res.status(201).json({ page: createdVisualPage });
}
const updateVisualPage = async (req, res, next) => {
    const { visual_id, content_uid } = req.params
    let body = req.body

    let update = {}
    if (body.children) {
        update.children = body.children
    }
    if (body.preview) {
        update.preview = body.preview
    }

    try {
        await Template.findOneAndUpdate({ content_uid: content_uid, visual_id: visual_id }, update)

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

const getLayoutChild = async (json, blocksId = []) => {

    if (json.hasOwnProperty('text')) {
        return json
    }
    if (typeof json === "string") {
        try {
            let block = await Block.findOne({ _id: json }, {}, { lean: true })
            let newblock = { ...block }
            newblock.id = newblock._id
            blocksId.push(newblock.id)
            delete newblock._id
            let response = await getLayoutChild(newblock, blocksId)

            return response
        } catch (err) {
            console.log(err)
        }
    }
    let children = await Promise.all(Array.from(json?.children || []).map(async (child) => (await getLayoutChild(child, blocksId))))
    let result = { ...json, children }
    if (result._id) {
        result.id = result._id
        delete result._id
    }
    return result
}
const getAllSnippetWithUserId = async (req, res, next) => {
    const { userId } = req.params
    let content;
    try {
        content = await Block.find({ "type": "layout", "attrs.userId": userId }, {}, { lean: true })
    } catch (err) {
        const error = new HttpError(
            'Something went wrong, could not find a Template.',
            500
        );
        return next(error);
    }
    if (content.length !== 0) {

        let layouts = await Promise.all(Array.from(content).map(async (child) => (await getLayoutChild(child))))
        res.json({ layouts: layouts })
    } else {
        res.json({ message: "No Layout with Given Id" })
    }
}

const deleteLayout = async (req, res, next) => {
    const { layoutId } = req.params;
    let content;
    let blocksId = []
    try {
        content = await Block.find({ "type": "layout", "_id": layoutId }, {}, { lean: true })
        blocksId.push(layoutId)
    } catch (err) {
        const error = new HttpError(
            'Something went wrong, could not find a Template.',
            500
        );
        return next(error);
    }
    if (content.length !== 0) {
        await Promise.all(Array.from(content).map(async (child) => (await getLayoutChild(child, blocksId))))
        try {
            await Block.deleteMany({ _id: { $in: blocksId } })
        }
        catch (err) {
            const error = new HttpError(
                'Something went wrong, could not delete Block.',
                500
            );
            return next(error);
        }
        res.json({ success: "Delete successfully" })
    } else {
        res.json({ message: "No Layout with Given Id" })
    }

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
exports.getAllVisualPage = getAllVisualPage;
exports.getVisualPageWithId = getVisualPageWithId;
exports.createNewVisualPage = createNewVisualPage;
exports.updateVisualPage = updateVisualPage;
exports.getAllSnippetWithUserId = getAllSnippetWithUserId;
exports.deleteLayout = deleteLayout;