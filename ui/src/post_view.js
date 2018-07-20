//@ts-check
import xs from 'xstream';
import { div, h2, p, hr } from '@cycle/dom';
import isolate from '@cycle/isolate';
import CommentsView from './comments_view';
import VoteView from './vote_view';

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

    const vote$ = sources.hash.map(hash => isolate(VoteView, `vote${hash}`)({ ...sources, hash: xs.of(hash) }));

    const voteDOM$ = vote$.map(sinks => sinks.DOM).flatten();

    const voteHTTP$ = vote$.map(sinks => sinks.HTTP).flatten();

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

    const dom$ = xs.combine(voteDOM$, postDOM$, commentsDOM$)
        .map(([voteDOM, postDOM, commentsDOM]) => div('.post.card', [
            div('.card-body', [
                div('.post-vote-container', [
                    voteDOM,
                    postDOM
                ]),
                hr(),
                commentsDOM,
            ])
        ]));

    const http$ = xs.merge(postHTTP$, commentsHTTP$, voteHTTP$);

    return {
        DOM: dom$,
        HTTP: http$,
    }
};