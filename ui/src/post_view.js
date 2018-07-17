//@ts-check
import xs from 'xstream';
import { div, h2, p } from '@cycle/dom';
import isolate from '@cycle/isolate';
import CommentsView from './comments_view';

function renderPost(post) {
    return div('.post', [h2(post.title), p(post.content)]);
}

export default function PostView(sources) {
    const postHTTP$ = sources.hash.map(hash => ({
        url: '/fn/posts/postRead',
        method: 'POST',
        category: `post${hash}`,
        send: `"${hash}"`,
        ok(res) { if (res) { let text = JSON.parse(res.text); if (text) { return !!(text.title && text.content) } else { return false } } else { return false; }; },
    }));

    // @cycle/http's httpDriver does not actually provide isolation even with a scope
    // This is a workaround
    // TODO: Create a better, more elegant solution (open up issue in cycle about full http isolation?)

    const postDOM$ = sources.hash.map(hash => sources.HTTP.select(`post${hash}`)
        .flatten()
        .replaceError(() => xs.of({ text: '{"title": "Error", "content": "Could not load post"}' }))
        .map(res => res.text)
        .map(JSON.parse)
        .map(post =>
            renderPost(post)
        )
        .startWith(null)
    ).flatten();

    const commentsSinks$ = sources.hash.map((hash) =>
        isolate(CommentsView, hash)({ ...sources, hash: xs.of(hash) })
    );

    const commentsDOM$ = commentsSinks$.map(sinks => sinks.DOM).flatten();

    const commentsHTTP$ = commentsSinks$.map(sinks => sinks.HTTP).flatten();

    const dom$ = xs.combine(postDOM$, commentsDOM$)
        .map(doms => div('.post.card', doms));

    const http$ = xs.merge(postHTTP$, commentsHTTP$);

    return {
        DOM: dom$,
        HTTP: http$,
    }
};