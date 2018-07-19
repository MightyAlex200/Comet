//@ts-check
import xs from 'xstream';
import { div, small } from '@cycle/dom';
import isolate from '@cycle/isolate';
import CommentsView from './comments_view';
import VoteView from './vote_view';

export default function CommentView(sources) {
    const commentReadHTTP$ = sources.hash.map(hash => ({
        url: '/fn/comments/commentRead',
        method: 'POST',
        category: `commentRead${hash}`,
        send: `"${hash}"`,
        ok(res) { if (res) { let text = JSON.parse(res.text); if (text) { return !!text.content } else { return false } } else { return false; }; },
    }));

    // @cycle/http's httpDriver does not actually provide isolation even with a scope
    // This is a workaround
    // TODO: Create a better, more elegant solution (open up issue in cycle about full http isolation?)

    const commentReadDOM$ = sources.hash.map(hash => sources.HTTP.select(`commentRead${hash}`)
        .flatten()
        .replaceError(() => xs.of({ text: '{"content": "Error loading comment"}' }))
        .map(res => res.text)
        .map(JSON.parse)
        .map(({ content }) => content)
        .startWith('Loading comment')
        .map(text => div('.comment-content', text))
    ).flatten();

    const subComment$ = sources.hash.map(hash =>
        isolate(CommentsView, hash)({ ...sources, hash: xs.of(hash) })
    );

    const subCommentDOM$ = subComment$.map(subComment => subComment.DOM).flatten();

    const subCommentHTTP$ = subComment$.map(subComment => subComment.HTTP).flatten();

    const voteSink$ = sources.hash.map(hash => isolate(VoteView, `vote${hash}`)({...sources, hash: xs.of(hash)}));

    const voteHTTP$ = voteSink$.map(voteSinks => voteSinks.HTTP).flatten();

    const voteDOM$ = voteSink$.map(voteSinks => voteSinks.DOM).flatten().startWith(null);

    const dom$ = xs.combine(sources.hash, voteDOM$, commentReadDOM$, subCommentDOM$)
        .map(([hash, voteDOM,...children]) => div('.comment-container', { style: { display: 'flex' } }, [
            div('.comment-left', { style: { display: 'flex', 'flex-direction': 'column', 'align-items': 'center' } }, [
                div(`.comment-vote-${hash}.collapse.show`, voteDOM),
                div('.comment-side-bar', {
                    style: { 'background-color': 'cornflowerblue', margin: '4px', width: '4px', flex: 1, cursor: 'pointer' },
                    attrs: { 'data-toggle': 'collapse', 'data-target': `.comment-children-${hash},.comment-vote-${hash}` },
                }),
            ]),
            div('.comment-right', { style: { flex: 1 } }, [
                small('.comment-header', { 
                    attrs: { 'data-toggle': 'collapse', 'data-target': `.comment-children-${hash},.comment-vote-${hash}` },
                    style: { cursor: 'pointer' },
                }, '[+] Comment'),
                div(`.comment-children-${hash}.collapse.show`, children),
            ]),
        ]));

    const http$ = xs.merge(commentReadHTTP$, subCommentHTTP$, voteHTTP$);

    const sinks = {
        DOM: dom$,
        HTTP: http$,
    };

    return sinks;
}