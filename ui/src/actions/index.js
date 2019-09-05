import { connect } from '@holochain/hc-web-client';

export const UPDATE_TAG_NAME = 'UPDATE_TAG_NAME';
export const DELETE_TAG_NAME = 'DELETE_TAG_NAME';
export const AGENT_ADDRESS_RECEIVED = 'AGENT_ADDRESS_RECEIVED'
export const SET_HIDE_POSTS = 'SET_HIDE_POSTS';
export const SET_HIDE_COMMENTS = 'SET_HIDE_COMMENTS';
export const SET_HIDE_THRESHOLD = 'SET_HIDE_THRESHOLD';
export const DELETE_KARMA_MAP = 'DELETE_KARMA_MAP';
export const POST_READ = 'POST_READ';
export const POST_DELETED = 'POST_DELETED';
export const COMMENT_READ = 'COMMENT_READ';
export const COMMENT_DELETED = 'COMMENT_DELETED';
export const COMMENTS_FETCHED = 'COMMENTS_FETCHED';
export const UPDATE_KARMA_MAP = 'UPDATE_KARMA_MAP';
export const VOTES_FETCHED = 'VOTES_FETCHED';
export const POST_TAGS_FETCHED = 'POST_TAGS_FETCHED';
export const MY_VOTE_FETCHED = 'MY_VOTE_FETCHED';
export const USERNAME_RESOLVED = 'USERNAME_RESOLVED';
export const USER_POSTS_FETCHED = 'USER_POSTS_FETCHED';
export const HOLOCHAIN_CONNECTED = 'HOLOCHAIN_CONNECTED';
export const ZOME_ERROR = 'ZOME_ERROR';

export const INSTANCE_ID = 'test-instance';

export const updateTagName = (tag, name) => ({
    type: UPDATE_TAG_NAME,
    tag,
    name,
});

export const deleteTagName = tag => ({
    type: DELETE_TAG_NAME,
    tag,
});

export const agentAddressReceived = agentAddress => ({
    type: AGENT_ADDRESS_RECEIVED,
    agentAddress,
});

export const setHidePosts = hidePosts => ({
    type: SET_HIDE_POSTS,
    hidePosts,
});

export const setHideComments = hideComments => ({
    type: SET_HIDE_COMMENTS,
    hideComments,
});

export const setHideThreshold = hideThreshold => ({
    type: SET_HIDE_THRESHOLD,
    hideThreshold,
});

export const deleteKarmaMap = () => ({
    type: DELETE_KARMA_MAP,
});

export const postRead = (address, post) => ({
    type: POST_READ,
    address,
    post,
});

export const postDeleted = address => ({
    type: POST_DELETED,
    address,
});

export const commentRead = (address, comment) => ({
    type: COMMENT_READ,
    address,
    comment,
});

export const commentDeleted = address => ({
    type: COMMENT_DELETED,
    address,
});

export const commentsFetched = (target, addresses) => ({
    type: COMMENTS_FETCHED,
    target,
    addresses,
});

export const updateKarmaMap = (weight, keyHash, tag) => ({
    type: UPDATE_KARMA_MAP,
    weight,
    keyHash,
    tag,
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

export const userPostsFetched = (keyHash, posts) => ({
    type: USER_POSTS_FETCHED,
    keyHash,
    posts,
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

export const tagNameUpdate = (tag, name) => dispatch => {
    dispatch(updateTagName(tag, name));
};

export const tagNameDelete = tag => dispatch => {
    dispatch(deleteTagName(tag));
};

export const connectToHolochain = () => dispatch => {
    connect({ url: 'ws://localhost:8888' })
        .then(({ callZome }) => dispatch(holochainConnection(callZome)));
};

const callFunction = (zome, func, params, callZome) => callZome(INSTANCE_ID, zome, func)(params);

export const getAgentAddress = (callZome) => dispatch => {
    callFunction('posts', 'get_agent_address', {}, callZome)
        .then(res => {
            dispatch(agentAddressReceived(JSON.parse(res)));
        });
};

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

export const deletePost = (address, callZome) => dispatch => {
    return callFunction('posts', 'delete_post', { address }, callZome)
        .then(res => {
            const result = JSON.parse(res);
            if (result.Err) {
                dispatch(zomeError('post/delete_post', 'delete post', result.Err));
            }
        });
}

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

export const deleteComment = (address, callZome) => dispatch => {
    return callFunction('comments', 'delete_comment', { address }, callZome)
        .then(res => {
            const result = JSON.parse(res);
            if (result.Err) {
                dispatch(zomeError('comments/delete_comment', 'delete comment', result.Err));
            }
        });
}

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

export const updateKarma = (weight, keyHash, tags) => dispatch => {
    for (const tag of tags) {
        dispatch(updateKarmaMap(weight, keyHash, tag));
    }
}

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
                dispatch(zomeError('posts/get_username', 'resolve username', result.Err));
            }
        });
};

export const fetchUserPosts = (keyHash, callZome) => dispatch => {
    callFunction('posts', 'user_posts', { author: keyHash }, callZome)
        .then(res => {
            const result = JSON.parse(res);
            dispatch(userPostsFetched(keyHash, result));
            if (result.Err) {
                dispatch(zomeError('posts/user_posts', 'fetch user posts', result.Err));
            }
        });
};
