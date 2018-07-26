//@ts-check
import xs from 'xstream';
import MarkdownComposeView from './markdown_compose_view';
import { button, div } from '@cycle/dom';

export default function CommentComposeView(sources) {
    const markdownComposeView = MarkdownComposeView(sources);

    const markdownDOM$ = markdownComposeView.DOM;

    const postButtonDOM$ = xs.of(
        button('.btn.btn-primary.post-button', 'Post')
    );

    const replyButtonDOM$ = sources.hash.map(hash =>
        button('.btn.btn-link.reply-button', { attrs: {'data-toggle': 'collapse', 'data-target': `.reply-compose-area-${hash}`} }, 'Reply')
    );

    const composeDOM$ = xs.combine(markdownDOM$, postButtonDOM$)
        .map(div);

    const dom$ = xs.combine(replyButtonDOM$, composeDOM$, sources.hash)
        .map(([replyButton, composeDOM, hash]) => div('.reply-area', [
            replyButton,
            div(`.reply-compose-area-${hash}.collapse`, composeDOM),
        ]));

    const postClick$ = sources.DOM
        .select('.post-button')
        .events('click');
    
    const markdownText$ = markdownComposeView.text;

    const postHTTP$ = xs.combine(markdownText$, postClick$, sources.hash)
        .map(([markdownText, clickEvent, hash]) => ({
            url: '/fn/comments/commentCreate',
            method: 'POST',
            category: `commentCreate${hash}`,
            send: `{ "commentEntry": { "content": "${markdownText.replace(/"/g, '\\"')}" }, "targetHash": "${hash}" }`,
        }));

    const http$ = postHTTP$;

    const sinks = {
        DOM: dom$,
        HTTP: http$,
    };

    return sinks;
}