import React from 'react';
import { connect } from 'react-redux';
import { readPost, fetchPostTags } from '../actions';
import PropTypes from 'prop-types';
import { withStyles, Box, Typography, Paper, Link } from '@material-ui/core';
import { Link as RouterLink } from 'react-router-dom';
import PostSignature from './PostSignature';
import VoteView from './VoteView';

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
    componentDidMount() {
        const postRead = this.props.holochainConnected && this.props.postsRead[this.props.address];
        if (this.props.holochainConnected && !postRead) {
            this.getPost();
        }

        if (!this.props.holochainConnected) { return; }

        const tags = this.props.postTags[this.props.address];

        if (!this.props.inTermsOf && !tags) {
            this.getTags();
        }
    }

    componentDidUpdate(prevProps) {
        const holochainJustConnected = prevProps.holochainConnected !== this.props.holochainConnected;
        const addressChanged = prevProps.address !== this.props.address;
        const postRead = this.props.holochainConnected && this.props.postsRead[this.props.address];
        if (this.props.holochainConnected && (addressChanged || holochainJustConnected) && !postRead) {
            this.getPost();
        }

        if (!this.props.holochainConnected) { return; }

        const tags = this.props.postTags[this.props.address];

        if (!this.props.inTermsOf && !tags) {
            this.getTags();
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
                <React.Fragment>
                    <Link component={RouterLink} to={`/post/${this.props.address}`} variant="h5">{post.Ok.title}</Link>
                    <PostSignature post={post.Ok} />
                </React.Fragment>
            );
        } else if (post) {
            return (<Typography variant="body1">{`Failed to get post: ${JSON.stringify(post.Err)}`}</Typography>)
        } else if (this.props.holochainConnected) {
            return (<Typography variant="body1">Loading Post...</Typography>);
        } else {
            return (<Typography variant="body1">Connecting to Holochain...</Typography>);
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
            <Paper className={this.props.classes.root}>
                <VoteView inTermsOf={this.getInTermsOf()} address={this.props.address} />
                <Box className={this.props.classes.padded}>
                    {this.renderInternal()}
                </Box>
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
