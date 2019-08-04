import { connect } from '@holochain/hc-web-client';

export const POST_READ = 'POST_READ';
export const HOLOCHAIN_CONNECTED = 'HOLOCHAIN_CONNECTED';
export const ZOME_ERROR = 'ZOME_ERROR';

export const INSTANCE_ID = 'test-instance';

export const postRead = (address, post) => ({
    type: POST_READ,
    address,
    post,
});

export const holochainConnection = (callZome) => ({
    type: HOLOCHAIN_CONNECTED,
    callZome,
});

export const zomeError = (func, action, error, ident) => ({
    type: ZOME_ERROR,
    func,
    action,
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
        })
};
