//@ts-check
import xs from 'xstream';

// In: { vote: { Entry, Source }, karmaMap: Map<Source, Weight> }
// Out: { voteValue: Number }
export default function VoteTransformer(sources) {
    const voteValue$ = xs.combine(sources.vote, sources.karmaMap)
        .map(([vote, karmaMap]) => karmaMap[vote.Source] * vote.Entry.fraction * (vote.Entry.isPositive ? 1 : -1));

    const sinks = {
        voteValue: voteValue$,
    };

    return sinks;
}