//@ts-check
import xs from 'xstream';
import { run } from '@cycle/run';
import { makeDOMDriver, h1 } from '@cycle/dom';

function main() {
    // TODO: Everything
}

const drivers = {
    DOM: makeDOMDriver('#app')
};

run(main, drivers);