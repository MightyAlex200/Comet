//@ts-check
import xs from 'xstream';
import { div } from "@cycle/dom";
import isolate from '@cycle/isolate';
import CommentsView from './comments_view';

export default function CommentView(sources) {
    const commentReadHTTP$ = sources.hash.map(hash => ({
        url: '/fn/comments/commentRead',
        method: 'POST',
        category: `commentRead${hash}`,
        send: `"${hash}"`,
        ok(res) { if (res) { let text = JSON.parse(res.text); if (text) { return !!text.content } else { return false } } else { return false; }; },
    }));

    // @cycle/http's httpDriver does not actually provide isolation even with a scope
    // This is a workaround
    // TODO: Create a better, more elegant solution (open up issue in cycle about full http isolation?)

    const commentReadDOM$ = sources.hash.map(hash => sources.HTTP.select(`commentRead${hash}`)
        .flatten()
        .replaceError(() => xs.of({ text: '{"content": "Error loading comment"}' }))
        .map(res => res.text)
        .map(JSON.parse)
        .map(({ content }) => content)
        .startWith("Loading comment")
        .map(text => div(".comment-content", text))
    ).flatten();

    const subComment$ = sources.hash.map(hash =>
        isolate(CommentsView, hash)({ ...sources, hash: xs.of(hash) })
    );

    const subCommentDOM$ = subComment$.map(subComment => subComment.DOM).flatten();

    const subCommentHTTP$ = subComment$.map(subComment => subComment.HTTP).flatten();

    const dom$ = xs.combine(commentReadDOM$, subCommentDOM$)
        .map(children => div(".comment", {}, children));

    const http$ = xs.merge(commentReadHTTP$, subCommentHTTP$);

    const sinks = {
        DOM: dom$,
        HTTP: http$,
    };

    return sinks;
}