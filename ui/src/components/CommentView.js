import React from 'react';
import PropTypes from 'prop-types';
import { readComment, deleteComment } from '../actions';
import { Paper, Divider } from '@material-ui/core';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core';
import PostSignature from './PostSignature';
import { withSnackbar } from 'notistack';
import {
    Link,
    Box,
    Typography,
    CircularProgress,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
} from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
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
        newComment: false,
        commentCache: false,
        hidden: false,
        manualHiding: false,
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

    setNewComment = () => {
        this.setState(state => ({ ...state, newComment: !state.newComment }));
    }

    onScoreUpdate = score => {
        this.setState(state => (state.manualHiding ? state : { ...state, hidden: (this.props.hideComments && score < this.props.minimumScore) }));
    }

    show = () => {
        this.setState(state => ({ ...state, hidden: false, manualHiding: true }));
    }

    hide = () => {
        this.setState(state => ({ ...state, hidden: true, manualHiding: true }));
    }

    promptDelete = () => {
        this.setState(state => ({ ...state, deletePromptOpen: true }));
    }

    closeDeletePrompt = () => {
        this.setState(state => ({ ...state, deletePromptOpen: false }));
    }

    deleteComment = () => {
        this.props.deleteComment(this.props.address, this.props.callZome)
            .then(result => {
                if (!result.Err) {
                    this.props.enqueueSnackbar('Comment deleted', { variant: 'success' });
                    this.closeDeletePrompt();
                    this.props.updateParent();
                }
            });
    }

    renderComment() {
        const comment = this.props.commentsRead[this.props.address];
        if (comment && comment.Ok) {
            return (
                <Box className={this.props.classes.sideBySide}>
                    <Box>
                        <VoteView onScoreUpdate={this.onScoreUpdate} keyHash={comment.Ok.key_hash} inTermsOf={this.props.inTermsOf} address={this.props.address} />
                    </Box>
                    <Box className={this.props.classes.expand}>
                        {!this.state.hidden ? <Link component="button" onClick={this.hide}>[-]</Link> : null}
                        {' '}
                        <PostSignature inTermsOf={this.props.inTermsOf} post={comment.Ok} /> <TagsView inTermsOf={this.props.inTermsOf} />
                        {this.props.agentAddress === comment.Ok.key_hash
                            ? (
                                <IconButton onClick={this.promptDelete} size="small" style={{ float: 'right' }}>
                                    <DeleteIcon />
                                </IconButton>
                            )
                            : null
                        }
                        <Dialog open={this.state.deletePromptOpen} onClose={this.closeDeletePrompt}>
                            <DialogTitle>
                                Delete comment?
                                </DialogTitle>
                            <DialogContent>
                                Are you sure you want to delete this comment?
                                <Typography variant="subtitle2">
                                    The comment will not be shown, but its contents will still exist on the network
                                </Typography>
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={this.deleteComment}>
                                    Yes
                                    </Button>
                                <Button onClick={this.closeDeletePrompt}>
                                    No
                                    </Button>
                            </DialogActions>
                        </Dialog>
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
        if (!this.state.hidden) {
            return (
                <React.Fragment>
                    <Paper className={this.props.classes.root}>
                        {this.renderComment()}
                    </Paper>
                    <CommentsView inTermsOf={this.props.inTermsOf} newComment={this.state.newComment} target={this.props.address} />
                </React.Fragment>
            );
        } else {
            return (
                <React.Fragment>
                    <Paper className={this.props.classes.root}>Comment hidden <Link component="button" onClick={this.show}>(show it)</Link></Paper>
                </React.Fragment>
            );
        }
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
    hideComments: PropTypes.bool.isRequired,
    minimumScore: PropTypes.number.isRequired,
    agentAddress: PropTypes.string,
    deleteComment: PropTypes.func.isRequired,
    updateParent: PropTypes.func.isRequired,
};

const propsMap = props => ({
    holochainConnected: props.holochainConnected,
    callZome: props.callZome,
    commentsRead: props.commentsRead,
    hideComments: props.hideComments,
    minimumScore: props.minimumScore,
    agentAddress: props.agentAddress,
});

export default connect(propsMap, { readComment, deleteComment })(withSnackbar(withStyles(styles)(CommentView)));
