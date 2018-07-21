//@ts-check
import xs from 'xstream';
import { div, span } from '@cycle/dom';
import isolate from '@cycle/isolate';
import VoteCounter from './vote_counter';

function roundTenth(num) {
    return Math.round(num * 10) / 10;
}

export default function VoteView(sources) {
    const myVoteHTTP$ = sources.hash.map(hash => ({
        url: '/fn/votes/myVote',
        method: 'POST',
        category: `myVote${hash}`,
        send: `"${hash}"`,
    }));

    const upvote$ = sources.DOM.select('.upvote-button')
        .events('click')
        .map(clickEvent => {
            const boundingBox = clickEvent.target.getBoundingClientRect();
            const clickY = clickEvent.clientY;
            const relativeClickY = clickY - boundingBox.top;
            return (boundingBox.height - relativeClickY) / boundingBox.height;
        })
        .map(roundTenth);

    const downvote$ = sources.DOM.select('.downvote-button')
        .events('click')
        .map(clickEvent => {
            const boundingBox = clickEvent.target.getBoundingClientRect();
            const clickY = clickEvent.clientY;
            const relativeClickY = clickY - boundingBox.top;
            return -relativeClickY / boundingBox.height;
        })
        .map(roundTenth);

    const outVote$ = xs.merge(upvote$, downvote$);

    const voteHTTP$ = sources.hash.map(hash =>
        outVote$
            .map(weight => [weight > 0, Math.abs(weight)])
            .map(([isPositive, fraction]) => ({
                url: '/fn/votes/vote',
                method: 'POST',
                category: `vote${hash}`,
                send: `{ "targetHash": "${hash}", "voteEntry": { "isPositive": ${isPositive}, "fraction": ${fraction} } }`,
            }))
    ).flatten();

    const myVote$ = sources.hash.map(hash =>
        sources.HTTP.select(`myVote${hash}`)
            .flatten()
            .map(rawRes => rawRes.text)
            .map(JSON.parse)
            .filter(res => res) // not null
            .map(res => res.Entry)
            .map(entry => entry.fraction * (entry.isPositive ? 1 : -1))
    ).flatten();

    const voteCounter$ = xs.combine(sources.hash, sources.karmaMap)
        .map(([hash, karmaMap]) => 
            isolate(VoteCounter, `voteCounter${hash}`)({ ...sources, hash: xs.of(hash), karmaMap: xs.of(karmaMap) })
        );

    const voteCounterHTTP$ = voteCounter$.map(voteCounter => voteCounter.HTTP).flatten();

    const voteCounterScore$ = voteCounter$
        .map(voteCounter => voteCounter.score)
        .flatten()
        .startWith(0);

    const vote$ = xs.merge(upvote$, downvote$, myVote$);

    const http$ = xs.merge(myVoteHTTP$, voteHTTP$, voteCounterHTTP$);

    const dom$ = xs.combine(
        vote$.startWith(0).map(vote => vote * 100),
        voteCounterScore$,
    )
        .map(([votePercentage, score]) =>
            div('.vote-view', [
                div('.upvote-holder', [
                    span('.upvote-button.material-icons', 'arrow_upward'),
                    span('.upvote-representation.material-icons', {
                        style: {
                            'clip-path': `polygon(0 ${100 - votePercentage}%, 100% ${100 - votePercentage}%, 100% 100%, 0 100%)`
                        }
                    }, 'arrow_upward'),
                ]),
                div('.score-view', score.toString()),
                div('.downvote-holder', [
                    span('.downvote-button.material-icons', 'arrow_downward'),
                    span('.downvote-representation.material-icons', {
                        style: {
                            'clip-path': `polygon(0 0, 100% 0, 100% ${-votePercentage}%, 0 ${-votePercentage}%)`
                        }
                    }, 'arrow_downward'),
                ]),
            ])
        );

    const sinks = {
        HTTP: http$,
        DOM: dom$,
    };

    return sinks;
}