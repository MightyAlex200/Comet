//@ts-check
import xs from 'xstream';
import isolate from '@cycle/isolate';
import CommentView from './comment_view';
import { div, p } from '@cycle/dom';

export default function CommentsView(sources) {
    // @cycle/http's httpDriver does not actually provide isolation even with a scope
    // This is a workaround
    // TODO: Create a better, more elegant solution (open up issue in cycle about full http isolation?)

    const fromHashHTTP$ = sources.hash.map(hash => ({
        url: '/fn/comments/fromHash',
        method: 'POST',
        category: `fromHash${hash}`,
        send: hash,
    }));

    const subCommentsSinksArray$ = sources.hash.map(hash => sources.HTTP.select(`fromHash${hash}`)
        .flatten()
        .replaceError(() => xs.of({ text: '[]' }))
        .map(res => res.text)
        .map(JSON.parse)
        .map(subCommentArray => subCommentArray.map(subComment => subComment.Hash))
        .map(hashArray => hashArray.map(hash => isolate(CommentView, hash)({ ...sources, hash: xs.of(hash) })))
        .startWith([])
    ).flatten();

    const subCommentsDOM$Array$ = subCommentsSinksArray$.map(sinksArray => sinksArray.map(sinks => sinks.DOM));

    const subCommentsDOM$ = subCommentsDOM$Array$
        .map(dom$Array => xs.combine(...dom$Array))
        .flatten()
        .startWith([])
        .map(domArray => div(".sub-comments", { props: { style: "padding-left: 24px" } }, domArray));

    const subCommentsHTTP$Array$ = subCommentsSinksArray$.map(sinksArray => sinksArray.map(sinks => sinks.HTTP));

    const subCommentsHTTP$ = subCommentsHTTP$Array$
        .map(subCommentsHTTP$Array => xs.merge(...subCommentsHTTP$Array))
        .flatten();

    const dom$ = subCommentsDOM$;

    const http$ = xs.merge(fromHashHTTP$, subCommentsHTTP$);

    const sinks = {
        DOM: dom$,
        HTTP: http$,
    };

    return sinks;
}