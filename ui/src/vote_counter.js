//@ts-check
import xs from 'xstream';
import isolate from '@cycle/isolate';
import VoteTransformer from './vote_transformer';

export default function VoteCounter(sources) {
    const http$ = sources.hash.map(hash => ({
        url: '/fn/votes/fromHash',
        method: 'POST',
        category: `fromHash${hash}`,
        send: hash,
    }));

    const fromHash$ = sources.hash.map(hash =>
        sources.HTTP
            .select(`fromHash${hash}`)
            .flatten()
            .map(res => res.text)
            .map(JSON.parse)
    ).flatten();

    const voteTransformers$ = xs.combine(sources.hash, sources.karmaMap, fromHash$)
        .map(([hash, karmaMap, votes]) => votes.map(vote => isolate(VoteTransformer, hash)({ vote: xs.of(vote), karmaMap: xs.of(karmaMap) })));

    const score$ = voteTransformers$
        .map(voteTransformers => voteTransformers.map(sinks => sinks.voteValue))
        .map(streams => xs.combine(...streams))
        .flatten()
        .map(values => values.reduce((sum, next) => sum + next, 0));

    const sinks = {
        HTTP: http$,
        score: score$,
    };

    return sinks;
}