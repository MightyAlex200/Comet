import { connect } from '@holochain/hc-web-client';

export const POST_READ = 'POST_READ';
export const POST_CREATED = 'POST_CREATED';
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

export const usernameResolved = (keyHash, username) => ({
    type: USERNAME_RESOLVED,
    keyHash,
    username,
})

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

export const createPost = (post, tags, callZome) => dispatch => {
    callFunction('posts', 'create_post', { post, tags }, callZome)
        .then(res => {
            const result = JSON.parse(res);
            if (result.Ok) {
                dispatch(postCreated(result.Ok));
            }
            if (post.Err) {
                dispatch(zomeError('post/create_post', 'create post', result.Err));
            }
        });
}

export const consumePostJustCreated = () => dispatch => {
    dispatch(postCreated(null));
}

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
}
