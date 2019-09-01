import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { readPost, fetchPostTags } from '../actions';
import { Paper, Box, Typography, withStyles, Divider, Button, CircularProgress } from '@material-ui/core';
import PostSignature from './PostSignature';
import ReactMarkdown from 'react-markdown';
import CommentsView from './CommentsView';
import CommentCompose from './CommentCompose';
import VoteView from './VoteView';
import TagsView from './TagsView';

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

    renderPost() {
        const post = this.props.postsRead[this.props.address];
        if (post && post.Ok) {
            const inTermsOf = this.getInTermsOf();
            return (
                <React.Fragment>
                    <Box className={this.props.classes.sideBySide}>
                        <Box>
                            <VoteView keyHash={post.Ok.key_hash} inTermsOf={inTermsOf} address={this.props.address} />
                        </Box>
                        <Box className={this.props.classes.post}>
                            <Typography className={this.props.classes.root} variant="h4">{post.Ok.title}</Typography>
                            <Box className={this.props.classes.root}>
                                <PostSignature post={post.Ok} /> <TagsView inTermsOf={inTermsOf} postTags={this.props.postTags[this.props.address]} />
                            </Box>
                            <Divider />
                            <ReactMarkdown className={this.props.classes.root} source={post.Ok.content} />
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
};

const propsMap = (state, ownProps) => ({
    holochainConnected: state.holochainConnected,
    callZome: state.callZome,
    postTags: state.postTags,
    postsRead: state.postsRead,
});

export default connect(propsMap, { readPost, fetchPostTags })(withStyles(styles)(PostView));
