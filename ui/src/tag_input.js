//@ts-check
import xs from 'xstream';
import { input, div, span } from '@cycle/dom';
import isGoodSubName from './good_subname';

function fromTags(tags) {
    return div('.form-control', { style: { display: 'flex', 'align-items': 'center' } }, [
        ...(tags.map(tag => span(`.badge${isGoodSubName(tag) ? '.badge-info' : '.badge-danger'}`, tag))),
        input('.tagInputInput', { style: { border: 'none', outline: 'none', flex: 1 } }),
    ]);
}

export default function TagInput(sources) {
    const removeTag$ = sources.DOM.select('.tagInputInput').events('keydown')
        .filter(event => event.key == 'Backspace')
        .filter(event => event.target.value == '');

    const comma$ = sources.DOM.select('.tagInputInput').events('input')
        .filter(event => event.inputType == 'insertText' && event.data == ',');

    const tags$ = xs.merge(comma$, removeTag$)
        .fold((tags, event) => {
            if (event.inputType == 'insertText') {
                return tags.concat(event.target.value.slice(0, -1))
            } else {
                return tags.slice(0, -1);
            }
        }, []);

    const dom$ = xs.combine(tags$, comma$)
        .map(([tags, event]) => {
            event.target.value = '';
            return fromTags(tags);
        })
        .startWith(fromTags([]));

    const sinks = {
        DOM: dom$,
    };

    return sinks;
}