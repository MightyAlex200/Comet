import { connect } from '@holochain/hc-web-client';

export const POST_READ = 'POST_READ';
export const COMMENT_READ = 'COMMENT_READ';
export const POST_CREATED = 'POST_CREATED';
export const COMMENT_CREATED = 'COMMENT_CREATED';
export const COMMENTS_FETCHED = 'COMMENTS_FETCHED';
export const USERNAME_RESOLVED = 'USERNAME_RESOLVED';
export const HOLOCHAIN_CONNECTED = 'HOLOCHAIN_CONNECTED';
export const ZOME_ERROR = 'ZOME_ERROR';

export const INSTANCE_ID = 'test-instance';

export const postRead = (address, post) => ({
    type: POST_READ,
    address,
    post,
});

export const postCreated = (address) => ({
    type: POST_CREATED,
    address,
});

export const commentRead = (address, comment) => ({
    type: COMMENT_READ,
    address,
    comment,
});

export const commentCreated = (address, target) => ({
    type: COMMENT_CREATED,
    target,
    address,
});

export const commentsFetched = (target, addresses) => ({
    type: COMMENTS_FETCHED,
    target,
    addresses,
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
    callFunction('posts', 'create_post', { post, tags }, callZome)
        .then(res => {
            const result = JSON.parse(res);
            if (result.Ok) {
                dispatch(postCreated(result.Ok));
            }
            if (result.Err) {
                dispatch(zomeError('posts/create_post', 'create post', result.Err));
            }
        });
};

export const createComment = (comment, target, callZome) => dispatch => {
    callFunction('comments', 'create_comment', { comment, target }, callZome)
        .then(res => {
            const result = JSON.parse(res);
            if (result.Ok) {
                dispatch(commentCreated(result.Ok, target));
            }
            if (result.Err) {
                dispatch(zomeError('comments/create_comment', 'create comment', result.Err));
            }
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

export const consumePostJustCreated = () => dispatch => {
    dispatch(postCreated(null));
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
