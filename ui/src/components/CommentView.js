import React from 'react';
import PropTypes from 'prop-types';
import { readComment } from '../actions';
import { Paper, Divider } from '@material-ui/core';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core';
import PostSignature from './PostSignature';
import { Box, Typography, CircularProgress } from '@material-ui/core';
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
    expand: {
        flexGrow: 1,
        paddingLeft: theme.spacing(1),
    },
});

class CommentView extends React.Component {
    state = {
        newComment: null,
        commentCache: false,
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

        if (!this.state.commentCache) {
            this.fetchComment();
            this.setState(state => ({ ...state, commentCache: true }));
        }
    }

    invalidateCache(prevProps) {
        if (prevProps.address !== this.props.address) {
            this.setState(state => ({ ...state, commentCache: false }));
        }
    }

    fetchComment() {
        this.props.readComment(this.props.address, this.props.callZome);
    }

    setNewComment = newComment => {
        this.setState(state => ({ ...state, newComment }));
    }

    renderComment() {
        const comment = this.props.commentsRead[this.props.address];
        if (comment && comment.Ok) {
            return (
                <Box className={this.props.classes.sideBySide}>
                    <Box>
                        <VoteView keyHash={comment.Ok.key_hash} inTermsOf={this.props.inTermsOf} address={this.props.address} />
                    </Box>
                    <Box className={this.props.classes.expand}>
                        <PostSignature inTermsOf={this.props.inTermsOf} post={comment.Ok} /> <TagsView inTermsOf={this.props.inTermsOf} />
                        <MarkdownRenderer className={this.props.classes.root} source={comment.Ok.content} />
                        <Divider />
                        <br />
                        <CommentCompose callback={this.setNewComment} address={this.props.address} />
                    </Box>
                </Box>
            );
        } else if (comment) {
            return (
                <Box className={this.props.classes.centerProgress}>
                    <Typography variant="body1">Failed to get comment.</Typography>
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
            <React.Fragment>
                <Paper className={this.props.classes.root}>
                    {this.renderComment()}
                </Paper>
                <CommentsView inTermsOf={this.props.inTermsOf} newComment={this.state.newComment} target={this.props.address} />
            </React.Fragment>
        );
    }
}

CommentView.propTypes = {
    holochainConnected: PropTypes.bool.isRequired,
    callZome: PropTypes.func,
    commentsRead: PropTypes.object.isRequired,
    readComment: PropTypes.func.isRequired,
    address: PropTypes.string.isRequired,
    classes: PropTypes.object.isRequired,
    inTermsOf: PropTypes.array,
};

const propsMap = props => ({
    holochainConnected: props.holochainConnected,
    callZome: props.callZome,
    commentsRead: props.commentsRead,
});

export default connect(propsMap, { readComment })(withStyles(styles)(CommentView));
