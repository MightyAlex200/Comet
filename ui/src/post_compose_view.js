//@ts-check
import xs from 'xstream';
import MarkdownComposeView from './markdown_compose_view';
import { div, button, input } from '@cycle/dom';

// TODO: tags
export default function PostComposeView(sources) {
    const titleInputDOM$ = xs.of(
        input('.title-input.form-control', { attrs: { placeholder: 'Title' } })
    );

    const markdownComposeView = MarkdownComposeView(sources);

    const markdownDOM$ = markdownComposeView.DOM;

    const postButtonDOM$ = xs.of(
        button('.btn.btn-primary.post-button', 'Post')
    );

    const dom$ = xs.combine(titleInputDOM$, markdownDOM$, postButtonDOM$)
        .map(div);

    const postClick$ = sources.DOM
        .select('.post-button')
        .events('click');

    const title$ = sources.DOM
        .select('.title-input')
        .events('input')
        .map(event => event.target.value);

    const markdownText$ = markdownComposeView.text;

    const postHTTP$ = xs.combine(title$, markdownText$, postClick$)
        .map(([title, markdownText, clickEvent]) => ({
            url: '/fn/posts/postCreate',
            method: 'POST',
            category: `postCreate`,
            send: `{ "postEntry": { "title": "${title.replace(/"/g, '\\"')}", "content": "${markdownText.replace(/"/g, '\\"')}" }, "tags": [] }`,
        }));
    
    const http$ = postHTTP$;

    const sinks = {
        DOM: dom$,
        HTTP: http$,
    };

    return sinks;
}