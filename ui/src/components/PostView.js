import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { readPost, createComment } from '../actions';
import { Paper, Box, Typography, withStyles, Divider, Button, CircularProgress } from '@material-ui/core';
import PostSignature from './PostSignature';
import ReactMarkdown from 'react-markdown';
import CommentsView from './CommentsView';
import CommentCompose from './CommentCompose';

const styles = theme => ({
    root: {
        padding: theme.spacing(1),
    },
    centerProgress: {
        padding: theme.spacing(3),
        textAlign: 'center',
    },
});

class PostView extends Component {
    state = {
        retry: true,
        newComment: null,
    }

    componentDidMount() {
        const postRead = this.props.holochainConnected && this.props.postsRead[this.props.address];
        if (this.props.holochainConnected && !postRead) {
            this.fetchPost();
        }
    }

    componentDidUpdate(prevProps) {
        const holochainJustConnected = prevProps.holochainConnected !== this.props.holochainConnected;
        const addressChanged = prevProps.address !== this.props.address;
        const postRead = this.props.holochainConnected && this.props.postsRead[this.props.address];
        if (this.props.holochainConnected && (((addressChanged || holochainJustConnected) && !postRead) || this.state.retry)) {
            this.fetchPost();
        }
    }

    fetchPost() {
        this.setState(state => ({ ...state, retry: false }));
        this.props.readPost(this.props.address, this.props.callZome);
    }

    setRetry = () => {
        this.setState(state => ({ ...state, retry: true }));
    }

    setNewComment = newComment => {
        this.setState(state => ({ ...state, newComment }));
    }

    renderPost() {
        const post = this.props.postsRead[this.props.address];
        if (post && post.Ok) {
            return (<Box>
                <Typography className={this.props.classes.root} variant="h4">{post.Ok.title}</Typography>
                <Box className={this.props.classes.root}>
                    <PostSignature post={post.Ok} />
                </Box>
                <Divider />
                <ReactMarkdown className={this.props.classes.root} source={post.Ok.content} />
                <Divider />
                <br />
                <CommentCompose callback={this.setNewComment} address={this.props.address} />
            </Box>);
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
                {this.props.noComments ? null : <CommentsView newComment={this.state.newComment} target={this.props.address} />}
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
    createComment: PropTypes.func.isRequired,
    noComments: PropTypes.bool,
};

const propsMap = (state, ownProps) => ({
    holochainConnected: state.holochainConnected,
    callZome: state.callZome,
    postsRead: state.postsRead,
});

export default connect(propsMap, { readPost, createComment })(withStyles(styles)(PostView));
