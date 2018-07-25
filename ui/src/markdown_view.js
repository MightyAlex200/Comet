//@ts-check
import MarkdownIt from 'markdown-it';
import toVNode from 'snabbdom/tovnode';

const md = MarkdownIt();

function toNode(str) {
    const div = document.createElement('div');
    div.innerHTML = str;
    return div;
}

export default function MarkdownView(sources) {
    const sinks = {
        DOM: sources.text.map(text => toVNode(toNode(md.render(text)))),
    }
    return sinks;
}