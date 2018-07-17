//@ts-check
import xs from 'xstream';
import PostsView from './posts_view';
import isolate from '@cycle/isolate';

export default function SubView(sources) {
    const postsView$ = sources.sub.map(sub =>
        sources.HTTP.select(`fromSub${sub}`)
            .flatten()
            .map(res => res.text)
            .map(JSON.parse)
            .map(posts => posts.map(post => post.Hash))
            .map(hashes => isolate(PostsView, sub)({ ...sources, hashes: xs.of(hashes) }))
    ).flatten();

    const dom$ = postsView$.map(postsView => postsView.DOM).flatten();

    const fromSubHTTP$ = sources.sub.map(sub => ({
        url: '/fn/posts/fromSub',
        method: 'POST',
        category: `fromSub${sub}`,
        send: sub,
    }));

    const http$ = xs.merge(fromSubHTTP$, postsView$.map(postsView => postsView.HTTP).flatten());

    const sinks = {
        DOM: dom$,
        HTTP: http$,
    };

    return sinks;
}