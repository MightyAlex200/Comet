import React from 'react';
import { connect } from 'react-redux';
import { fetchComments } from '../actions';
import PropTypes from 'prop-types';
import CommentView from './CommentView';
import { withStyles, Paper, Box, CircularProgress, Typography } from '@material-ui/core';

const styles = theme => ({
    root: {
        padding: theme.spacing(1),
    },
    centerProgress: {
        padding: theme.spacing(1),
        textAlign: 'center',
    },
    comment: {
        paddingTop: theme.spacing(1),
        paddingLeft: theme.spacing(1),
    },
    commentsHeader: {
        padding: theme.spacing(1),
    },
});

class CommentsView extends React.Component {
    state = {
        commentsCache: false,
    }

    componentDidMount() {
        const commentsFetched = this.props.commentsByAddress[this.props.target];
        if (!commentsFetched && this.props.holochainConnected) {
            this.fetchComments();
        }
    }

    componentDidUpdate(prevProps) {
        const holochainJustConnected = prevProps.holochainConnected !== this.props.holochainConnected;
        const targetChanged = prevProps.target !== this.props.target;
        const commentsFetched = this.props.commentsByAddress[this.props.target];
        if (this.props.holochainConnected && (targetChanged || holochainJustConnected) && !commentsFetched) {
            this.fetchComments();
        }

        if (this.props.newComment && (this.props.newComment !== prevProps.newComment)) {
            this.fetchComments();
        }
    }

    cache() {
        if (!this.state.commentsCache) {
            this.fetchComments();
            this.setState(state => ({ ...state, commentsCache: true }));
        }
    }

    invalidateCache(prevProps) {
        if ((prevProps.newComment !== this.props.newComment) || (prevProps.target !== this.props.target)) {
            this.setState(state => ({ ...state, commentsCache: false }));
        }
    }

    fetchComments() {
        this.props.fetchComments(this.props.target, this.props.callZome);
    }

    render() {
        const comments = this.props.commentsByAddress[this.props.target];
        if (comments && comments.Ok) {
            return (
                <React.Fragment>
                    {this.props.header ?
                        <Typography className={this.props.classes.commentsHeader} variant="h2">
                            {`${comments.Ok.length} Comment${(comments.Ok.length === 1) ? '' : 's'}`}
                        </Typography>
                        : null
                    }
                    {comments.Ok.map(address =>
                        <Box className={this.props.classes.comment} key={address}>
                            <CommentView inTermsOf={this.props.inTermsOf} address={address} />
                        </Box>
                    )}
                </React.Fragment>
            );
        } else if (comments) {
            return (
                <Paper className={this.props.classes.root}>
                    <Box className={this.props.classes.centerProgress}>
                        Failed to load comment.
                    </Box>
                </Paper>
            );
        } else {
            return (
                <Paper className={this.props.classes.root}>
                    <Box className={this.props.classes.centerProgress}>
                        <CircularProgress />
                    </Box>
                </Paper>
            );
        }
    }
}

CommentsView.propTypes = {
    holochainConnected: PropTypes.bool.isRequired,
    callZome: PropTypes.func,
    commentsByAddress: PropTypes.object.isRequired,
    fetchComments: PropTypes.func.isRequired,
    target: PropTypes.string.isRequired,
    classes: PropTypes.object.isRequired,
    newComment: PropTypes.string,
    inTermsOf: PropTypes.array,
    header: PropTypes.bool,
};

const propsMap = props => ({
    holochainConnected: props.holochainConnected,
    callZome: props.callZome,
    commentsByAddress: props.commentsByAddress,
});

export default connect(propsMap, { fetchComments })(withStyles(styles)(CommentsView));
