var kebbabCase = require('lodash.kebabcase')

const elementClassNameList = {
    "row": "scrte-vp-row",
    "column": "scrte-vp-column",
    "divider": "scrte-vp-divider",
    "check-list": "scrte-vp-check-list",
    "table": "scrte-vp-div-table",
    "table-head": "scrte-vp-div-table-head",
    "table-row": "scrte-vp-div-table-row",
    "table-cell-heading": "scrte-vp-div-table-cell-heading",
    "table-body": "scrte-vp-div-table-body",
    "table-cell": "scrte-vp-div-table-cell",
}
const ELEMENT_TYPES = {
    'paragraph': (attrs, child) => (`<p ${attrs} >${child}</p>`),
    'row': (attrs, child) => (`<div ${attrs}>${child}</div>`),
    'column': (attrs, child) => (`<div ${attrs} >${child}</div>`),
    'span': (attrs, child) => (`<span ${attrs}>${child}</span>`),
    'div': (attrs, child) => (`<div ${attrs}>${child}</div>`),
    'link': (attrs, child) => (`<a ${attrs}>${child}</a>`),
    'divider': (attrs, child) => (`<div ${attrs} ></div>`),
    'image': (attrs, child) => (`<img ${attrs} />`),
    'heading-one': (attrs, child) => (`<h1 ${attrs}>${child}</h1>`),
    'heading-two': (attrs, child) => (`<h2 ${attrs}>${child}</h2>`),
    'heading-three': (attrs, child) => (`<h3 ${attrs}>${child}</h3>`),
    'heading-four': (attrs, child) => (`<h4 ${attrs}>${child}</h4>`),
    'heading-five': (attrs, child) => (`<h5 ${attrs}>${child}</h5>`),
    'heading-six': (attrs, child) => (`<h6 ${attrs}>${child}</h6>`),
    'grid-list': (attrs, child) => (`<div ${attrs}>${child}</div>`),
    'grid-child': (attrs, child) => (`<div ${attrs}>${child}</div>`),
    'block-quote': (attrs, child) => (`<blockquote ${attrs}>${child}</blockquote>`),
    'code': (attrs, child) => (`<pre ${attrs}><code>${child}</code></pre>`),
    'ordered-list': (attrs, child) => (`<ol ${attrs}>${child}</ol>`),
    'unordered-list': (attrs, child) => (`<ul ${attrs}>${child}</ul>`),
    'list-item': (attrs, child) => (`<li ${attrs}>${child}</li>`),
    'check-list': (attrs, child) => (`<div ${attrs}><span class="scrte-vp-checklist-checkbox"><input type="checkbox" ${child.checked} disabled /></span><span class="${child.className}">${child.children}</span></div>`),
    'table': (attrs, child) => (`<table ${attrs}>${child}</table>`),
    'table-head': (attrs, child) => (`<thead ${attrs}>${child}</thead>`),
    'table-row': (attrs, child) => (`<tr ${attrs}>${child}</tr>`),
    'table-cell-heading': (attrs, child) => (`<th ${attrs}>${child}</th>`),
    'table-body': (attrs, child) => (`<tbody ${attrs}>${child}</tbody>`),
    'table-cell': (attrs, child) => (`<td ${attrs}>${child}</td>`),
    'embed': (attrs, child) => (`<iframe ${attrs}></iframe>`)
}

const toHtml = (jsonValue) => {
    if (jsonValue.hasOwnProperty('text')) {
        let attrs = ''
        let textDecoration = ''
        if (jsonValue.bold) {
            attrs += 'font-weight:700; '
        }
        if (jsonValue.italic) {
            attrs += 'font-style:italic; '
        }
        if (jsonValue.underline) {
            textDecoration += 'underline '
        }
        if (jsonValue.strikethrough) {
            textDecoration += 'line-through '
        }
        if (jsonValue.subscript) {
            attrs += 'vertical-align:sub; font-size:smaller;'
        }
        if (jsonValue.superscript) {
            attrs += 'vertical-align:super; font-size:smaller;'
        }

        if (textDecoration) {
            attrs += `text-decoration: ${textDecoration};`
        }
        if (jsonValue.mark) {
            attrs += 'background:#ffe58f; '
        }
        if (jsonValue?.attrs?.style) {
            if (jsonValue.attrs?.style.color) {
                attrs += `color: ${jsonValue.attrs.style.color}; `
            }
            if (jsonValue.attrs.style.fontFamily) {
                attrs += `font-family: ${jsonValue.attrs.style.fontFamily}; `
            }
            if (jsonValue.attrs.style.fontSize) {
                attrs += `font-size: ${jsonValue.attrs.style.fontSize}; `
            }
        }
        if (attrs) {
            return `<span style="${attrs}">${jsonValue.text}</span>`
        } else {
            return jsonValue.text
        }
    }
    let children
    if (jsonValue.children) {
        children = Array.from(jsonValue.children).map(toHtml)
        let child = ''
        Array.from(children).map((el) => child += el)
        children = child
    }
    if (jsonValue.type === 'template') {
        return `<div class="scrte-vp">${children}</div>`
    }
    if (ELEMENT_TYPES[jsonValue.type]) {
        let attrs = jsonValue?.attrs || {}
        let style = attrs?.styles || {}
        let elementStyle = attrs?.style || {}
        style = { ...style, ...elementStyle }
        let htmlStyle = ''
        let newStyle = ''
        if (style) {
            Object.keys(style).forEach((key) => {
                htmlStyle += `${kebbabCase(key)}: ${style[key]};`
            })
        }
        if (attrs?.id) {
            newStyle += ` id="${attrs.id}"`
        }
        if (attrs?.className || elementClassNameList[jsonValue.type]) {
            let allClass = '';
            Array.from(attrs.className || []).map((child) => {
                allClass += `${child} `
            })
            if (elementClassNameList[jsonValue.type]) {
                allClass += elementClassNameList[jsonValue.type]
            }
            newStyle += `class="${allClass}"`
        }
        if (jsonValue.type === 'link') {
            newStyle += ` href="${attrs.url}"`
            if (attrs.target) {
                newStyle += ` target="${attrs.target}"`
            }
        }
        if (jsonValue.type === 'image' || jsonValue.type === 'embed') {
            newStyle += ` src="${attrs.url}"`
            newStyle += ` width="${attrs.width || 100}%"`
            if (attrs.height) {
                newStyle += ` height="${attrs.height}px"`
            }
        }
        if (jsonValue.type === "column") {
            if (attrs.width) {
                htmlStyle += ` width:${attrs.width * 100}%;`
            }
        }
        if (jsonValue.type === "grid-list") {
            htmlStyle += `padding: 10px 0; display: grid; grid-template-columns:repeat(${attrs.column},1fr); grid-gap: ${attrs.vgutter}px ${attrs.gutter}px`
        }
        if (jsonValue.type === "grid-child") {
            htmlStyle += `padding: 5px 10px, border-radius: 3px, background: #f2f4f5, border: 1px solid #f0f0f0`
        }
        if (jsonValue.type === "check-list") {
            let copychild = children
            children = {}
            children.checked = attrs.checked ? "Checked" : ""
            children.className = attrs.checked ? "scrte-vp-checklist-text-done" : "scrte-vp-checklist-text-notDone"
            children.children = copychild
        }
        if (jsonValue.type === "table") {
            let colWidths = attrs.colWidths
            let col = '';
            Array.from(colWidths).map((child, index) => col += `<col style="width:${child}px"></col>`)
            let colgroup = `<colgroup>${col}</colgroup>`
            children = colgroup + children
        }
        if (htmlStyle) {
            htmlStyle = `style="${htmlStyle}"`
            newStyle += htmlStyle
        }
        // REFERENCE VALUE
        return ELEMENT_TYPES[jsonValue.type](newStyle, children)
    }
}

exports.toHtml = toHtml