//@ts-check
import xs from 'xstream';
import { run } from '@cycle/run';
import { makeDOMDriver } from '@cycle/dom';
import { makeHTTPDriver } from '@cycle/http';
import isolate from '@cycle/isolate';
import PostView from './post_view';
import CommentView from './comment_view';

function main(sources) {
    const viewHash = "QmacEfcQbuxDDaatxdknpZzgxWbQ9VpU24o2EJ1UhdhLQg";
    // const postView = isolate(PostView)({props: xs.of({hash: "QmTw1XpJFmVUCkiNjd63UrjRnAsziGBjLcu3YzsAFLDuux"}), ...sources});
    const commentView = isolate(CommentView, viewHash)({ props: xs.of({ hash: viewHash }), ...sources });

    return commentView;
}

const drivers = {
    DOM: makeDOMDriver('#app'),
    HTTP: makeHTTPDriver(),
};

run(main, drivers);