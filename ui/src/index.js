//@ts-check
import xs from 'xstream';
import { run } from '@cycle/run';
import { makeDOMDriver, div } from '@cycle/dom';
import { makeHTTPDriver } from '@cycle/http';
import isolate from '@cycle/isolate';
import PostView from './post_view';
import CommentView from './comment_view';
import CommentsView from './comments_view';
import TagInput from './tag_input';
import PostsView from './posts_view';
import SubView from './sub_view';
import VoteView from './vote_view';
import MarkdownComposeView from './markdown_compose_view';

function main(sources) {
    // const postHash = 'QmTw1XpJFmVUCkiNjd63UrjRnAsziGBjLcu3YzsAFLDuux';
    // const commentHash = 'QmacEfcQbuxDDaatxdknpZzgxWbQ9VpU24o2EJ1UhdhLQg';
    // const postView = isolate(PostView)({ hash: xs.of(postHash), karmaMap: xs.of(new Proxy({}, { get: function() {return 1} })), ...sources });
    // const commentView = isolate(CommentView, commentHash)({ hash: xs.of(commentHash), ...sources });
    // const commentsView = isolate(CommentsView, postHash)({hash: xs.of(postHash), ...sources});
    // const tagInput = isolate(TagInput)(sources);
    // const postsView = isolate(PostsView)({ hashes: xs.of([postHash]), ...sources });
    // const subView = isolate(SubView)({ sub: xs.of('3562527'), ...sources})
    // const voteView = isolate(VoteView)({ hash: xs.of(postHash), ...sources });
    const markdownComposeView = isolate(MarkdownComposeView)(sources);

    // return voteView;
    // return {
    //     ...postView,
    //     DOM: postView.DOM.map(dom => div('.container', dom)),
    // };
    return markdownComposeView;
}

const drivers = {
    DOM: makeDOMDriver('#app'),
    HTTP: makeHTTPDriver(),
};

run(main, drivers);