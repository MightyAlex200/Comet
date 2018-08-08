//@ts-check
import MarkdownIt from 'markdown-it';
import toVNode from 'snabbdom/tovnode';
import MarkdownItSup from 'markdown-it-sup';
import MarkdownItSub from 'markdown-it-sub';
import MarkdownItAbbr from 'markdown-it-abbr';

const md = MarkdownIt()
    .use(MarkdownItSup)
    .use(MarkdownItSub)
    .use(MarkdownItAbbr);

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