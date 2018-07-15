//@ts-check
import xs from 'xstream';
import { div } from "@cycle/dom";
import isolate from '@cycle/isolate';

export default function CommentView(sources) {
    const commentReadHTTP$ = sources.props.map(({ hash }) =>
        ({
            url: '/fn/comments/commentRead',
            method: 'POST',
            category: `commentRead${hash}`,
            send: `"${hash}"`,
            ok(res) { if (res) { let text = JSON.parse(res.text); if (text) { return !!text.content } else { return false } } else { return false; }; },
        })
    );

    const fromHashHTTP$ = sources.props.map(({ hash }) =>
        ({
            url: '/fn/comments/fromHash',
            method: 'POST',
            category: `fromHash${hash}`,
            send: hash,
        })
    );

    const commentHTTP$ = xs.merge(commentReadHTTP$, fromHashHTTP$);

    // @cycle/http's httpDriver does not actually provide isolation even with a scope
    // This is a workaround
    // TODO: Create a better, more elegant solution (open up issue in cycle about full http isolation?)

    const commentReadDOM$ = sources.props.map(({ hash }) => sources.HTTP.select(`commentRead${hash}`)
        .flatten()
        .replaceError(() => xs.of({text: '{"content": "Error loading comment"}'}))
        .map(res => res.text)
        .map(JSON.parse)
        .map(({ content }) => content)
        .startWith("Loading comment")
        .map(text => div(".commentContent", text))
    ).flatten();

    const fromHashSinksArray$ = sources.props.map(({ hash }) => sources.HTTP.select(`fromHash${hash}`)
        .flatten()
        .replaceError(() => xs.of({text: '[]'}))
        .map(res => res.text)
        .map(JSON.parse)
        .map(subCommentArray => subCommentArray.map(subComment => subComment.Hash))
        .map(hashArray => hashArray.map(hash => isolate(CommentView, hash)({ ...sources, props: xs.of({ hash }) })))
        .startWith([])
    ).flatten();

    const fromHashDOM$ = fromHashSinksArray$
        .map(sinksArray => sinksArray.map(sinks => sinks.DOM))
        .map(dom$Array => xs.combine(...dom$Array))
        .flatten()
        .map(domArray => div(".subComments", { props: { style: "position: relative; left: 24px" } }, domArray));

    const subCommentHTTP$ = fromHashSinksArray$
        .map(sinksArray => sinksArray.map(sinks => sinks.HTTP))
        .map(http$Array => xs.merge(...http$Array))
        .flatten();

    const dom$ = xs.combine(commentReadDOM$, fromHashDOM$)
        .map(children => div(".comment", {}, children));

    const http$ = xs.merge(commentHTTP$, subCommentHTTP$);

    const sinks = {
        DOM: dom$,
        HTTP: http$,
    };

    return sinks;
}