//@ts-check
import xs from 'xstream';
import PostsView from './posts_view';
import isolate from '@cycle/isolate';

export default function TagView(sources) {
    const postsView$ = sources.tag.map(tag =>
        sources.HTTP.select(`fromTag${tag}`)
            .flatten()
            .map(res => res.text)
            .map(JSON.parse)
            .map(posts => posts.map(post => post.Hash))
            .map(hashes => isolate(PostsView, tag)({ ...sources, hashes: xs.of(hashes) }))
    ).flatten();

    const dom$ = postsView$.map(postsView => postsView.DOM).flatten();

    const fromTagHTTP$ = sources.tag.map(tag => ({
        url: '/fn/posts/fromTag',
        method: 'POST',
        category: `fromTag${tag}`,
        send: tag,
    }));

    const http$ = xs.merge(fromTagHTTP$, postsView$.map(postsView => postsView.HTTP).flatten());

    const sinks = {
        DOM: dom$,
        HTTP: http$,
    };

    return sinks;
}