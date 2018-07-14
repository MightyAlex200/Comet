//@ts-check
import xs from 'xstream';
import { run } from '@cycle/run';
import { makeDOMDriver } from '@cycle/dom';
import { makeHTTPDriver } from '@cycle/http';
import isolate from '@cycle/isolate';
import PostView from './postView';

function main(sources) {
    const postView = isolate(PostView)({props: xs.of({hash: "QmTw1XpJFmVUCkiNjd63UrjRnAsziGBjLcu3YzsAFLDuux"}), ...sources});

    return postView;
}

const drivers = {
    DOM: makeDOMDriver('#app'),
    HTTP: makeHTTPDriver(),
};

run(main, drivers);