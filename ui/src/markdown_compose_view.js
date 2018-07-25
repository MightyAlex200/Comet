//@ts-check
import xs from 'xstream';
import { div, textarea } from '@cycle/dom';
import MarkdownView from './markdown_view';

export default function MarkdownComposeView(sources) {
    // Left: markdown input
    // Right: markdown preview

    const inputDOM$ = xs.of(
        textarea('.markdown-input.form-control')
    );

    const inputText$ = sources.DOM
        .select('.markdown-input')
        .events('input')
        .map(event => event.target.value);

    const previewDOM = MarkdownView({ text: inputText$ }).DOM.startWith(null);

    const dom$ = xs.combine(inputDOM$, previewDOM)
        .map(([input, preview]) => div('.markdown-compose-view.row', [
            div('.col', [input]),
            div('.col', [preview]),
        ]));

    const sinks = {
        DOM: dom$,
        text: inputText$,
    };

    return sinks; 
}