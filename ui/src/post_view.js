//@ts-check
import xs from 'xstream';
import { h1 } from '@cycle/dom';

export default function PostView(sources) {

    const http$ = sources.props.map(props => ({
        url: '/fn/posts/postRead',
        method: 'POST',
        category: 'posts',
        send: `"${props.hash}"`,
    }));

    const dom$ = sources.HTTP.select('posts')
        .flatten()
        .map(res => res.text)
        .map(post =>
            h1(post === null ? "null" : post)
        )
        .startWith(null);

    return {
        DOM: dom$,
        HTTP: http$,
    }
};