import { POST_READ, HOLOCHAIN_CONNECTED, ZOME_ERROR, POST_CREATED } from '../actions/'
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
        case POST_CREATED:
            return {
                ...state,
                postJustCreated: action.address,
            };
        case HOLOCHAIN_CONNECTED:
            return { ...state, callZome: action.callZome, holochainConnected: true, };
        default:
            return state;
    }
}
