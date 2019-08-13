import { connect } from '@holochain/hc-web-client';

export const POST_READ = 'POST_READ';
export const COMMENT_READ = 'COMMENT_READ';
export const COMMENTS_FETCHED = 'COMMENTS_FETCHED';
export const VOTES_FETCHED = 'VOTES_FETCHED';
export const POST_TAGS_FETCHED = 'POST_TAGS_FETCHED';
export const MY_VOTE_FETCHED = 'MY_VOTE_FETCHED';
export const USERNAME_RESOLVED = 'USERNAME_RESOLVED';
export const HOLOCHAIN_CONNECTED = 'HOLOCHAIN_CONNECTED';
export const ZOME_ERROR = 'ZOME_ERROR';

export const INSTANCE_ID = 'test-instance';

export const postRead = (address, post) => ({
    type: POST_READ,
    address,
    post,
});

export const commentRead = (address, comment) => ({
    type: COMMENT_READ,
    address,
    comment,
});

export const commentsFetched = (target, addresses) => ({
    type: COMMENTS_FETCHED,
    target,
    addresses,
});

export const votesFetched = (target, votes) => ({
    type: VOTES_FETCHED,
    target,
    votes,
});

export const postTagsFetched = (address, postTags) => ({
    type: POST_TAGS_FETCHED,
    address,
    postTags,
});

export const myVoteFetched = (address, vote, inTermsOf) => ({
    type: MY_VOTE_FETCHED,
    address,
    vote,
    inTermsOf,
});

export const usernameResolved = (keyHash, username) => ({
    type: USERNAME_RESOLVED,
    keyHash,
    username,
});

export const holochainConnection = (callZome) => ({
    type: HOLOCHAIN_CONNECTED,
    callZome,
});

export const zomeError = (func, failedAction, error, ident) => ({
    type: ZOME_ERROR,
    func,
    failedAction,
    error,
});

export const connectToHolochain = () => dispatch => {
    connect({ url: 'ws://localhost:8888' })
        .then(({ callZome }) => dispatch(holochainConnection(callZome)));
};

const callFunction = (zome, func, params, callZome) => callZome(INSTANCE_ID, zome, func)(params);

export const readPost = (address, callZome) => dispatch => {
    callFunction('posts', 'read_post', { address }, callZome)
        .then(res => {
            const result = JSON.parse(res);
            dispatch(postRead(address, result));
            if (result.Err) {
                dispatch(zomeError('post/read_post', 'read post', result.Err));
            }
        });
};

export const readComment = (address, callZome) => dispatch => {
    callFunction('comments', 'read_comment', { address }, callZome)
        .then(res => {
            const result = JSON.parse(res);
            dispatch(commentRead(address, result));
            if (result.Err) {
                dispatch(zomeError('comments/read_comment', 'read comment', result.Err));
            }
        });
};

export const createPost = (post, tags, callZome) => dispatch => {
    return callFunction('posts', 'create_post', { post, tags }, callZome)
        .then(res => {
            const result = JSON.parse(res);
            if (result.Err) {
                dispatch(zomeError('posts/create_post', 'create post', result.Err));
            }
            return result;
        });
};

export const createComment = (comment, target, callZome) => dispatch => {
    return callFunction('comments', 'create_comment', { comment, target }, callZome)
        .then(res => {
            const result = JSON.parse(res);
            if (result.Err) {
                dispatch(zomeError('comments/create_comment', 'create comment', result.Err));
            }
            return result;
        });
};

export const fetchComments = (address, callZome) => dispatch => {
    callFunction('comments', 'comments_from_address', { address }, callZome)
        .then(res => {
            const result = JSON.parse(res);
            dispatch(commentsFetched(address, result));
            if (result.Err) {
                dispatch(zomeError('comments/comments_from_address', 'fetch comments', result.Err));
            }
        });
};

export const fetchVotes = (address, callZome) => dispatch => {
    callFunction('votes', 'votes_from_address', { address }, callZome)
        .then(res => {
            const result = JSON.parse(res);
            dispatch(votesFetched(address, result));
            if (result.Err) {
                dispatch(zomeError('votes/votes_from_address', 'fetch votes', result.Err));
            }
        });
};

export const fetchPostTags = (address, callZome) => dispatch => {
    callFunction('posts', 'post_tags', { address }, callZome)
        .then(res => {
            const result = JSON.parse(res);
            dispatch(postTagsFetched(address, result));
            if (result.Err) {
                dispatch(zomeError('posts/posts_from_address', 'fetch post tags', result.Err));
            }
        });
};

export const fetchMyVote = (address, inTermsOf, callZome) => dispatch => {
    callFunction('votes', 'get_my_vote', { address, in_terms_of: inTermsOf }, callZome)
        .then(res => {
            const result = JSON.parse(res);
            dispatch(myVoteFetched(address, result, inTermsOf));
            if (result.Err) {
                dispatch(zomeError('votes/get_my_vote', 'fetch your vote', result.Err));
            }
        });
};

export const castVote = (target, utcUnixTime, fraction, inTermsOf, callZome) => dispatch => {
    return callFunction('votes', 'vote', { target, in_terms_of: inTermsOf, utc_unix_time: utcUnixTime, fraction }, callZome)
        .then(res => {
            const result = JSON.parse(res);
            if (result.Err) {
                dispatch(zomeError('votes/vote', 'cast your vote', result.Err));
            }
        });
};

export const getUsername = (keyHash, callZome) => dispatch => {
    callFunction('posts', 'get_username', { agent_address: keyHash }, callZome)
        .then(res => {
            const result = JSON.parse(res);
            if (result.Ok) {
                dispatch(usernameResolved(keyHash, result.Ok));
            } else {
                dispatch(zomeError('post/get_username', 'resolve username', result.Err));
            }
        });
};
