var kebbabCase = require('lodash.kebabcase')
const ELEMENT_TYPES = {
    'paragraph': (attrs, child) => (`<p ${attrs} >${child}</p>`)
}

const toHtml = (jsonValue, resultData) => {
    if (jsonValue.hasOwnProperty('text')) {
        return jsonValue.text
    }
    let children
    if (jsonValue.children) {
        children = Array.from(jsonValue.children).map((child) => (toHtml(child, resultData)))
        let child = ''
        Array.from(children).map((el) => child += el)
        children = child
    }
    if (jsonValue.type === 'template') {
        return children
    }
    if (ELEMENT_TYPES[jsonValue.type]) {
        let attrs = jsonValue?.attrs || {}
        let style = attrs?.styles || {}
        let htmlStyle = ''
        if (style) {
            Object.keys(style).forEach((key) => {
                htmlStyle += `${kebbabCase(key)}: ${style[key]};`
            })
            htmlStyle = `style="${htmlStyle}"`
        }
        if (attrs?.id) {
            htmlStyle += ` id="${attrs.id}"`
        }
        //single value
        if (typeof jsonValue?.attrs?.field_attrs?.uid === 'string') {
            children = resultData[jsonValue?.attrs?.field_attrs?.uid]
        }
        return ELEMENT_TYPES[jsonValue.type](htmlStyle, children)
    }
}

exports.toHtml = toHtml