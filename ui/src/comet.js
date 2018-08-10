//@ts-check
import SubView from './sub_view';
import xs from 'xstream';
import PostView from './post_view';
import PostComposeView from './post_compose_view';

function instanceToComponent(instance, sources) {
    let component;
    let componentSources = sources;

    const urlArgs = Object.assign(
        {},
        ...instance.search
            .slice(1)
            .split('&')
            .map(str => str.split('='))
            .map(([a, b]) => { let obj = {}; obj[a] = decodeURIComponent(b); return obj })
    );

    switch (instance.pathname) {
        case '/':
            component = SubView;
            componentSources.sub = xs.of('0');
            break;
        case '/post':
            component = PostView;
            componentSources.hash = xs.of(urlArgs.hash);
            break;
        case '/sub':
            component = SubView;
            componentSources.sub = xs.of(urlArgs.sub);
        case '/composePost':
            component = PostComposeView;
            break;
        default:
            throw 'Invalid path'; // 404
    }

    return component(componentSources);
}

export default function Comet(sources) {
    const currentComponent$ = sources.history.map(instance => instanceToComponent(instance, sources));

    return new Proxy({ DOM: null, HTTP: null, history: null }, {
        get(target, prop, receiver) {
            return currentComponent$.map(component => component[prop]).filter(sink => sink).flatten();
        }
    });
}