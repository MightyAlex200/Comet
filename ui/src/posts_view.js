//@ts-check
import xs from 'xstream';
import isolate from '@cycle/isolate';
import PostView from './post_view';
import { div } from '@cycle/dom';

// TODO: Make less verbose
//   Sub-TODO: create PostSummary which expands into a PostView
export default function PostsView(sources) {
    const postViews$ = sources.hashes.map(hashes => hashes.map(hash => isolate(PostView, hash)({ ...sources, hash: xs.of(hash) })));

    const postViewsDOM$ = postViews$
        .map(postViews => postViews.map(postView => postView.DOM))
        .map(doms$ => xs.combine(...doms$))
        .flatten()
        .map(doms => div('.posts-view', doms));
    
    const postViewsHTTP$ = postViews$
        .map(postViews => postViews.map(postView => postView.HTTP))
        .map(https$ => xs.merge(...https$))
        .flatten();

    const dom$ = postViewsDOM$;

    const http$ = postViewsHTTP$;

    const sinks = {
        DOM: dom$,
        HTTP: http$,
    };
    return sinks;
}