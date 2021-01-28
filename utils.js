require('dotenv').config();
const request = require('./await-request')
const Template = require('./models/template')
const { v4 } = require('uuid')

const generateId = () => v4().split('-').join('')

const errorJson = {
    children: [
        {
            type: 'paragraph',
            children: [{
                text: 'Error while Fetching Data'
            }]
        }
    ]
}
const getTemplate = async (content_uid, visual_id) => {
    let templateJson
    try {
        templateJson = await Template.findOne({ content_uid: content_uid, visual_id: visual_id }).exec()
    } catch (err) {
        console.log(err)

        return errorJson
    }
    if (!templateJson) {
        return errorJson
    }
    return templateJson
}
const base_url = process.env.base_url

const headers = {
    'api_key': process.env.api_key,
    'access_token': process.env.access_token,
    'environment': process.env.environment,
    'authorization': process.env.authorization
}

const multiValueType = ['grid-list', 'list-container']
const multiValueField = {
    'list-container': 'list-child',
    'grid-list': 'grid-child'
}


const getSingleEntry = async (uid, entryId) => {
    const entryUrl = `https://${base_url}/v3/content_types/${uid}/entries/${entryId}`
    return request({ headers, url: entryUrl, method: "GET" }).then((val) => {
        return JSON.parse(val)["entry"]
    }).catch((err) => { console.log('50', err) })
}

const getValuesHelper = async (el, res, parent) => {
    let fieldAttrs = parent?.attrs?.field_attrs;

    if (!el.children) {
        if (fieldAttrs?.uid) {

            // ********     handle link encountered  ********//
            if (fieldAttrs?.data_type === 'link') {
                let { title, href } = res[fieldAttrs?.uid];
                let json = { type: 'link', attrs: { url: href }, children: [{ text: title }] };
                return json;
            }

            if (fieldAttrs?.data_type === 'file') {
                let { url } = res[fieldAttrs?.uid] || {};
                // console.log(fieldAttrs);
                let json = {
                    type: 'image',
                    attrs: {
                        url: url
                    },
                    children: [{ text: '' }]
                }
                return json;
            }
            // ********     handle reference encountered  ********//
            if (fieldAttrs?.data_type === 'reference') {

                const references = await Promise.all((res[fieldAttrs?.uid] || []).map(async reference => {
                    let contentTypeUid = reference['_content_type_uid'];
                    let uid = reference['uid']
                    let json = [{ text: '' }];
                    let visualPageIdReference = parent?.visualPageId || 1;

                    getTemplate(contentTypeUid, visualPageIdReference).then(res => {
                        json = res.children
                    }).catch(err => console.log(err));

                    var val = await getSingleEntry(contentTypeUid, uid).then(res => {
                        //console.log("preview", res);
                        return getValues(json, res);
                    });

                    // console.log("reference", val, json, uid, contentTypeUid)
                    if (val === [] || val === undefined)
                        return { type: multiValueField[parent.type], children: [{ text: '' }] }
                    else
                        return { type: multiValueField[parent.type], children: val };
                }))

                if (references.length === 0) {
                    return {
                        type: parent.type,
                        attrs: { ...parent.attrs },
                        children: [{ text: '' }]
                    }
                }
                return {
                    type: parent.type,
                    attrs: { ...parent.attrs },
                    children: references
                }
            }

            // ********     handle multiple encountered  ********//
            if (fieldAttrs?.multiple) {
                if (typeof (res?.[fieldAttrs?.uid][0]) === 'string') {
                    let newEl = {
                        type: parent.type,
                        attrs: { ...parent.attrs },
                        children: (res?.[fieldAttrs?.uid] || []).map(item => {
                            return ({
                                type: multiValueField[parent.type],
                                children: [{ text: item }]
                            })
                        })
                    }
                    return newEl;
                }
                else {
                    return el
                }
            }
            let newEl = {
                ...el,
                text: String(res?.[fieldAttrs?.uid])
            }
            return newEl
        }
        return el;
    }
    let newEl = {
        ...el
    }
    newEl['children'] = await getValues(el.children, res, el);
    return newEl;
}

const getValues = async (value, res, parent = {}) => {
    //console.log("get values", value, res, parent)
    let result = [];
    if (!value) return;

    for (let el of value) {
        if (multiValueType.includes(el.type)) {
            el = { ...el, children: [{ text: '{{hi}}' }] }
        }
        const json = await getValuesHelper(el, res, parent);
        if (multiValueType.includes(el.type)) {
            result.push(json.children[0]);
        }
        else {
            result.push(json);
        }
    }
    return result;
}
exports.getValues = getValues;
exports.getSingleEntry = getSingleEntry;
exports.generateId = generateId;