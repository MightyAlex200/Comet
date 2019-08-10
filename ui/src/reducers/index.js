import {
    POST_READ,
    HOLOCHAIN_CONNECTED,
    ZOME_ERROR,
    POST_CREATED,
    USERNAME_RESOLVED,
    COMMENT_READ,
    COMMENT_CREATED,
    COMMENTS_FETCHED,
} from '../actions/'
import defaultState from './defaultState';

export default (state = defaultState, action) => {
    switch (action.type) {
        case ZOME_ERROR:
            const func = action.func;
            const failedAction = action.failedAction;
            const error = action.error;
            return { ...state, errors: [...state.errors, { func, failedAction, error }] };
        case POST_READ:
            // TODO: Delete unused posts
            return {
                ...state,
                postsRead: { ...state.postsRead, [action.address]: action.post },
            };
        case COMMENT_READ:
            return {
                ...state,
                commentsRead: { ...state.commentsRead, [action.address]: action.comment },
            };
        case COMMENTS_FETCHED:
            return {
                ...state,
                commentsByAddress: { ...state.commentsByAddress, [action.target]: action.addresses }
            };
        case POST_CREATED:
            return {
                ...state,
                postJustCreated: action.address,
            };
        case COMMENT_CREATED:
            return {
                ...state,
                commentJustCreatedTarget: action.target,
                commentJustCreated: action.address,
            };
        case USERNAME_RESOLVED:
            return {
                ...state,
                usernames: {
                    ...state.usernames,
                    [action.keyHash]: action.username,
                },
            };
        case HOLOCHAIN_CONNECTED:
            return { ...state, callZome: action.callZome, holochainConnected: true, };
        default:
            return state;
    }
}
