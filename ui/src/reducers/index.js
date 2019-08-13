import {
    POST_READ,
    HOLOCHAIN_CONNECTED,
    ZOME_ERROR,
    USERNAME_RESOLVED,
    COMMENT_READ,
    COMMENTS_FETCHED,
    VOTES_FETCHED,
    POST_TAGS_FETCHED,
    MY_VOTE_FETCHED,
} from '../actions/'
import defaultState from './defaultState';
import util from '../util';

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
        case VOTES_FETCHED:
            return {
                ...state,
                votes: {
                    ...state.votes,
                    [action.target]: action.votes,
                },
            };
        case POST_TAGS_FETCHED:
            return {
                ...state,
                postTags: {
                    ...state.postTags,
                    [action.address]: action.postTags,
                },
            };
        case MY_VOTE_FETCHED:
            return {
                ...state,
                myVotes: {
                    ...state.myVotes,
                    [action.address]: {
                        ...state.myVotes[action.address],
                        [util.inTermsOfToString(action.inTermsOf)]: action.vote,
                    },
                },
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
