import { connect } from '@holochain/hc-web-client';

export const POST_READ = 'POST_READ';
export const POST_CREATED = 'POST_CREATED';
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
            const post = JSON.parse(res);
            dispatch(postRead(address, post));
            if (post.Err) {
                dispatch(zomeError('post/read_post', 'read post', post.Err));
            }
        });
};

export const createPost = (post, tags, callZome) => dispatch => {
    callFunction('posts', 'create_post', { post, tags }, callZome)
        .then(res => {
            const address = JSON.parse(res);
            if (address.Ok) {
                dispatch(postCreated(address.Ok));
            }
            if (post.Err) {
                dispatch(zomeError('post/create_post', 'create post', address.Err));
            }
        });
}

export const consumePostJustCreated = () => dispatch => {
    dispatch(postCreated(null));
}
