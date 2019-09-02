import React from 'react';
import { connect } from 'react-redux';
import { readPost, fetchPostTags } from '../actions';
import PropTypes from 'prop-types';
import { withStyles, Box, Typography, Paper, Link } from '@material-ui/core';
import { Link as RouterLink } from 'react-router-dom';
import PostSignature from './PostSignature';
import VoteView from './VoteView';
import TagsView from './TagsView';

const styles = theme => ({
    root: {
        padding: theme.spacing(1),
        display: 'flex',
    },
    padded: {
        padding: theme.spacing(1),
    }
})

class PostSummary extends React.Component {
    state = {
        postCache: false,
        tagCache: false,
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
            this.getPost();
            this.setState(state => ({ ...state, postCache: true }));
        }

        if (!this.state.tagCache) {
            this.getTags();
            this.setState(state => ({ ...state, tagCache: true }));
        }
    }

    invalidateCache(prevProps) {
        if (prevProps.address !== this.props.address) {
            this.setState(state => ({ ...state, postCache: false }));
        }

        if (prevProps.address !== this.props.address) {
            this.setState(state => ({ ...state, tagCache: false }));
        }
    }

    getTags() {
        this.props.fetchPostTags(this.props.address, this.props.callZome);
    }

    getPost() {
        this.props.readPost(this.props.address, this.props.callZome);
    }

    renderInternal() {
        const post = this.props.postsRead[this.props.address];

        if (post && post.Ok) {
            return (
                <Box className={this.props.classes.root}>
                    <VoteView keyHash={post.Ok.key_hash} inTermsOf={this.getInTermsOf()} address={this.props.address} />
                    <Box className={this.props.classes.padded}>
                        <Link component={RouterLink} to={`/post/${this.props.address}`} variant="h5">{post.Ok.title}</Link>
                        <br />
                        <PostSignature inTermsOf={this.getInTermsOf()} post={post.Ok} /> <TagsView postTags={this.props.postTags[this.props.address]} inTermsOf={this.getInTermsOf()} />
                    </Box>
                </Box>
            );
        } else if (post) {
            return (<Typography className={this.props.classes.padded} variant="body1">{`Failed to get post: ${JSON.stringify(post.Err)}`}</Typography>)
        } else if (this.props.holochainConnected) {
            return (<Typography className={this.props.classes.padded} variant="body1">Loading Post...</Typography>);
        } else {
            return (<Typography className={this.props.classes.padded} variant="body1">Connecting to Holochain...</Typography>);
        }
    }

    getInTermsOf() {
        let inTermsOf = this.props.inTermsOf;
        const inTermsOfResult = this.props.postTags[this.props.address];
        if (inTermsOfResult && inTermsOfResult.Ok && !inTermsOf) {
            inTermsOf = inTermsOfResult.Ok.original_tags;
        }
        return inTermsOf || [];
    }

    render() {
        return (
            <Paper>
                {this.renderInternal()}
            </Paper>
        )
    }
}

PostSummary.propTypes = {
    holochainConnected: PropTypes.bool.isRequired,
    callZome: PropTypes.func,
    postsRead: PropTypes.object.isRequired,
    address: PropTypes.string.isRequired,
    classes: PropTypes.object.isRequired,
    inTermsOf: PropTypes.object,
    fetchPostTags: PropTypes.func.isRequired,
    postTags: PropTypes.object.isRequired,
}

const propsMap = (state, ownProps) => ({
    holochainConnected: state.holochainConnected,
    callZome: state.callZome,
    postTags: state.postTags,
    postsRead: state.postsRead,
});

export default connect(propsMap, { readPost, fetchPostTags })(withStyles(styles)(PostSummary));
