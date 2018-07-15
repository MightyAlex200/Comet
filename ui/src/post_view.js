//@ts-check
import xs from 'xstream';
import { h1 } from '@cycle/dom';

export default function PostView(sources) {

    const http$ = sources.props.map(({ hash }) => ({
        url: '/fn/posts/postRead',
        method: 'POST',
        category: `post${hash}`,
        send: `"${hash}"`,
    }));

    // @cycle/http's httpDriver does not actually provide isolation even with a scope
    // This is a workaround
    // TODO: Create a better, more elegant solution (open up issue in cycle about full http isolation?)

    const dom$ = sources.props.map(({ hash }) => sources.HTTP.select(`post${hash}`)
        .flatten()
        .map(res => res.text)
        .map(post =>
            h1(post === null ? "null" : post)
        )
        .startWith(null)
    ).flatten();

    return {
        DOM: dom$,
        HTTP: http$,
    }
};