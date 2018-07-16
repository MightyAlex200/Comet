//@ts-check
import xs from 'xstream';
import { run } from '@cycle/run';
import { makeDOMDriver } from '@cycle/dom';
import { makeHTTPDriver } from '@cycle/http';
import isolate from '@cycle/isolate';
import PostView from './post_view';
import CommentView from './comment_view';
import CommentsView from './comments_view';

function main(sources) {
    const postHash = "QmTw1XpJFmVUCkiNjd63UrjRnAsziGBjLcu3YzsAFLDuux";
    const commentHash = "QmacEfcQbuxDDaatxdknpZzgxWbQ9VpU24o2EJ1UhdhLQg";
    const postView = isolate(PostView)({ props: xs.of({ hash: postHash }), ...sources });
    // const commentView = isolate(CommentView, commentHash)({ props: xs.of({ hash: commentHash }), ...sources });
    // const commentsView = isolate(CommentsView, postHash)({props: xs.of({hash: postHash}), ...sources});

    return postView;
}

const drivers = {
    DOM: makeDOMDriver('#app'),
    HTTP: makeHTTPDriver(),
};

run(main, drivers);