//@ts-check
import MarkdownIt from 'markdown-it';
import toVNode from 'snabbdom/tovnode';

const md = MarkdownIt();

function toNode(str) {
    const template = document.createElement('template');
    template.innerHTML = str;
    return template.content.firstChild;
}

export default function MarkdownView(sources) {
    const sinks = {
        DOM: sources.text.map(text => toVNode(toNode(md.render(text)))),
    }
    return sinks;
}