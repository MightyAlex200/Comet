import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withSnackbar } from 'notistack';
import { withRouter } from 'react-router-dom';
import { readPost, fetchPostTags, deletePost } from '../actions';
import {
    Link,
    Paper,
    Box,
    Typography,
    withStyles,
    Divider,
    Button,
    CircularProgress,
    IconButton,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
} from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import PostSignature from './PostSignature';
import CommentsView from './CommentsView';
import CommentCompose from './CommentCompose';
import VoteView from './VoteView';
import TagsView from './TagsView';
import MarkdownRenderer from './MarkdownRender';

const styles = theme => ({
    root: {
        padding: theme.spacing(1),
    },
    centerProgress: {
        padding: theme.spacing(3),
        textAlign: 'center',
    },
    sideBySide: {
        display: 'flex',
    },
    post: {
        flexGrow: 1,
    },
});

class PostView extends Component {
    state = {
        postCache: false,
        tagCache: false,
        newComment: null,
        hidden: false,
        showTemp: false,
        deletePromptOpen: false,
    }

    componentDidMount() {
        this.cache();
    }

    componentDidUpdate(prevProps) {
        this.invalidateCache(prevProps);
        this.cache();
    }

    cache() {
        if (!this.props.holochainConnected) { return; }

        if (!this.state.postCache) {
            this.fetchPost();
            this.setState(state => ({ ...state, postCache: true }));
        }

        if (!this.state.tagCache) {
            this.getTags();
            this.setState(state => ({ ...state, tagCache: true }));
        }
    }

    invalidateCache(prevProps) {
        const post = this.props.postsRead[this.props.address];
        if (!post && (prevProps.address !== this.props.address)) {
            this.setState(state => ({ ...state, postCache: false }));
        }

        const tags = this.props.postTags[this.props.address];
        if (!tags && (prevProps.address !== this.props.address)) {
            this.setState(state => ({ ...state, tagCache: false }));
        }
    }

    getTags() {
        this.props.fetchPostTags(this.props.address, this.props.callZome);
    }

    fetchPost() {
        this.props.readPost(this.props.address, this.props.callZome);
    }

    setRetry = () => {
        this.setState(state => ({ ...state, postCache: false }));
    }

    setNewComment = newComment => {
        this.setState(state => ({ ...state, newComment }));
    }

    getInTermsOf() {
        let inTermsOf = this.props.inTermsOf;
        const inTermsOfResult = this.props.postTags[this.props.address];
        if (inTermsOfResult && inTermsOfResult.Ok && !inTermsOf) {
            inTermsOf = inTermsOfResult.Ok.original_tags;
        }
        return inTermsOf || [];
    }

    onScoreUpdate = score => {
        this.setState(state => ({ ...state, hidden: (this.props.hidePosts && score < this.props.minimumScore) }));
    }

    showTemp = () => {
        this.setState(state => ({ ...state, showTemp: true }));
    }

    hideTemp = () => {
        this.setState(state => ({ ...state, showTemp: false }));
    }

    promptDelete = () => {
        this.setState(state => ({ ...state, deletePromptOpen: true }));
    }

    closeDeletePrompt = () => {
        this.setState(state => ({ ...state, deletePromptOpen: false }));
    }

    deletePost = () => {
        this.props.deletePost(this.props.address, this.props.callZome)
            .then(result => {
                if (!result.Err) {
                    this.props.enqueueSnackbar('Post deleted', { variant: 'success' });
                    this.props.history.goBack();
                }
            });
    }

    renderPost() {
        const post = this.props.postsRead[this.props.address];
        if (post && post.Ok) {
            const inTermsOf = this.getInTermsOf();
            return (
                <React.Fragment>
                    <Box className={this.props.classes.sideBySide}>
                        <Box>
                            <VoteView onScoreUpdate={this.onScoreUpdate} keyHash={post.Ok.key_hash} inTermsOf={inTermsOf} address={this.props.address} />
                        </Box>
                        <Box className={this.props.classes.post}>
                            <Typography style={{ display: 'inline' }} className={this.props.classes.root} variant="h4">{post.Ok.title}</Typography>
                            {this.state.hidden ? <Link component="button" onClick={this.hideTemp}>(hide)</Link> : null}
                            {this.props.agentAddress === post.Ok.key_hash
                                ? (
                                    <IconButton onClick={this.promptDelete} size="small" style={{ float: 'right' }}>
                                        <DeleteIcon />
                                    </IconButton>
                                )
                                : null
                            }
                            <Dialog open={this.state.deletePromptOpen} onClose={this.closeDeletePrompt}>
                                <DialogTitle>
                                    Delete post?
                                </DialogTitle>
                                <DialogContent>
                                    Are you sure you want to delete this post?
                                    <Typography variant="subtitle2">
                                        The post will not be shown, but its contents will still exist on the network
                                    </Typography>
                                </DialogContent>
                                <DialogActions>
                                    <Button onClick={this.deletePost}>
                                        Yes
                                    </Button>
                                    <Button onClick={this.closeDeletePrompt}>
                                        No
                                    </Button>
                                </DialogActions>
                            </Dialog>
                            <Box className={this.props.classes.root}>
                                <PostSignature inTermsOf={inTermsOf} post={post.Ok} /> <TagsView inTermsOf={inTermsOf} postTags={this.props.postTags[this.props.address]} />
                            </Box>
                            <Divider />
                            <MarkdownRenderer className={this.props.classes.root} source={post.Ok.content} />
                        </Box>
                    </Box>
                    <Divider />
                    <br />
                    <CommentCompose callback={this.setNewComment} address={this.props.address} />
                </React.Fragment>
            );
        } else if (post && post.Err) {
            return (
                <Box className={this.props.classes.centerProgress}>
                    <Typography variant="body1">Failed to get post.</Typography>
                    <Button variant="outlined" onClick={this.setRetry}>Retry</Button>
                </Box>
            );
        } else {
            return (
                <Box className={this.props.classes.centerProgress}>
                    <CircularProgress />
                </Box>
            );
        }
    }

    render() {
        if (!this.state.hidden || this.state.showTemp) {
            return (
                <Box>
                    <Paper className={this.props.classes.root}>
                        {this.renderPost()}
                    </Paper>
                    {this.props.noComments ?
                        null :
                        <React.Fragment>
                            <CommentsView header inTermsOf={this.getInTermsOf()} newComment={this.state.newComment} target={this.props.address} />
                        </React.Fragment>
                    }
                </Box>
            );
        } else {
            return (
                <Paper className={this.props.classes.root}>
                    This post is hidden <Link component="button" onClick={this.showTemp}>(show it)</Link>
                </Paper>
            );
        }
    }
}

PostView.propTypes = {
    address: PropTypes.string.isRequired,
    holochainConnected: PropTypes.bool.isRequired,
    callZome: PropTypes.func,
    postsRead: PropTypes.object.isRequired,
    classes: PropTypes.object.isRequired,
    readPost: PropTypes.func.isRequired,
    noComments: PropTypes.bool,
    fetchPostTags: PropTypes.func.isRequired,
    postTags: PropTypes.object.isRequired,
    inTermsOf: PropTypes.array,
    hidePosts: PropTypes.bool.isRequired,
    minimumScore: PropTypes.number.isRequired,
    deletePost: PropTypes.func.isRequired,
    history: PropTypes.object.isRequired,
    agentAddress: PropTypes.string,
};

const propsMap = (state, ownProps) => ({
    holochainConnected: state.holochainConnected,
    callZome: state.callZome,
    postTags: state.postTags,
    postsRead: state.postsRead,
    hidePosts: state.hidePosts,
    minimumScore: state.minimumScore,
    agentAddress: state.agentAddress,
});

export default connect(propsMap, { readPost, fetchPostTags, deletePost })(withSnackbar(withRouter(withStyles(styles)(PostView))));
