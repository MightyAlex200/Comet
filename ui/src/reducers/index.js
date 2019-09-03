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
    UPDATE_KARMA_MAP,
    USER_POSTS_FETCHED,
    UPDATE_TAG_NAME,
    DELETE_TAG_NAME,
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
        case UPDATE_TAG_NAME:
            const updatedTagNames = { ...state.tagNames };
            for (const key in updatedTagNames)
                if (updatedTagNames[key] === action.name)
                    delete updatedTagNames[key];
            updatedTagNames[action.tag.toString()] = action.name;

            const updatedNameTags = { ...state.nameTags };
            for (const key in updatedNameTags)
                if (updatedNameTags[key] === action.tag.toString())
                    delete updatedNameTags[key];
            updatedNameTags[action.name] = action.tag.toString();

            return {
                ...state,
                tagNames: updatedTagNames,
                nameTags: updatedNameTags,
            };
        case DELETE_TAG_NAME:
            const newTagNames = { ...state.tagNames };
            delete newTagNames[action.tag.toString()];
            const newNameTags = { ...state.nameTags };
            for (const key in newNameTags)
                if (newNameTags[key] === action.tag.toString())
                    delete newNameTags[key];

            return {
                ...state,
                tagNames: newTagNames,
                nameTags: newNameTags,
            };
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
        case UPDATE_KARMA_MAP:
            const key = `${action.keyHash}:${action.tag}`;
            return {
                ...state,
                karmaMap: {
                    ...state.karmaMap,
                    [key]: (state.karmaMap[key] || 0) + action.weight,
                }
            }
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
        case USER_POSTS_FETCHED:
            return {
                ...state,
                userPosts: {
                    ...state.userPosts,
                    [action.keyHash]: action.posts,
                },
            }
        case HOLOCHAIN_CONNECTED:
            return { ...state, callZome: action.callZome, holochainConnected: true, };
        default:
            return state;
    }
}
