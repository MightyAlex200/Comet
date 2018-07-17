//@ts-check
import xs from 'xstream';
import { input, div, a } from '@cycle/dom';
import isGoodSubName from './good_subname';
import makeUnique from './make_unique';

const UNFAVORABLE_TAG = 'Unfavorable sub name. Should be lowercase, trimmed';

function fromTags(tags) {
    return div('.tagInput.form-control', { style: { display: 'flex', 'align-items': 'center' } }, [
        ...(tags.map(tag => a(`.tag.badge${isGoodSubName(tag) ? '.badge-info' : '.badge-danger'}`, 
            { style: { 'min-width': '1em', 'min-height': '1.5em' }, attrs: { href: '#', title: isGoodSubName(tag) ? tag : UNFAVORABLE_TAG, tag } }, tag+'\n'))),
        input('.tagInputInput', { style: { border: 'none', outline: 'none', flex: 1 } }),
    ]);
}

export default function TagInput(sources) {
    const removeLastTag$ = sources.DOM.select('.tagInputInput').events('keydown')
        .filter(event => event.key == 'Backspace')
        .filter(event => event.target.value == '');
    
    const removeTag$ = sources.DOM.select('.tag').events('click');

    const comma$ = sources.DOM.select('.tagInputInput').events('input')
        .filter(event => event.inputType == 'insertText' && event.data == ',');

    const tags$ = xs.merge(comma$, removeLastTag$, removeTag$)
        .fold((tags, event) => {
            if (event.inputType == 'insertText') {
                return makeUnique(tags.concat(event.target.value.slice(0, -1)))
            } else {
                if(event.type == 'click') {
                    return tags.filter(tag => tag != event.target.getAttribute("tag"))
                } else {
                    return tags.slice(0, -1);
                }
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