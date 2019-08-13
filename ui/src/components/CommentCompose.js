import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { withStyles, Collapse, TextField, Button } from '@material-ui/core';
import { createComment } from '../actions';
import util from '../util';

const styles = theme => ({
    root: {
        paddingBottom: theme.spacing(1),
        width: '100%',
    },
    submitButton: {
        marginRight: theme.spacing(1),
    },
});

class CommentCompose extends React.Component {
    state = {
        comment: '',
        composeOpen: false,
        submitted: false,
    }

    updateComment = event => {
        const val = event.target.value;
        this.setState(state => ({ ...state, comment: val }));
    }

    submitComment = () => {
        this.props.createComment(this.getComment(util.getUtcUnixTime()), this.props.address, this.props.callZome)
            .then(result => {
                if (result.Ok) {
                    this.setState(state => ({ ...state, submitted: false, composeOpen: false }));
                    if (this.props.callback) {
                        this.props.callback(result.Ok);
                    }
                }
            });
        this.setState(state => ({ ...state, submitted: true }));
    }

    getComment(utc_unix_time) {
        return {
            content: this.state.comment,
            utc_unix_time,
        }
    }

    toggleComposeOpen = () => {
        this.setState(state => ({ ...state, composeOpen: !state.composeOpen, comment: '' }));
    }

    render() {
        return (
            <React.Fragment>
                <Collapse in={this.state.composeOpen}>
                    <TextField
                        className={this.props.classes.root}
                        label="Comment"
                        variant="outlined"
                        value={this.state.comment}
                        onChange={this.updateComment}
                        disabled={this.state.submitted}
                        multiline
                    />
                </Collapse>
                {this.state.composeOpen ?
                    <Button
                        onClick={this.submitComment}
                        className={this.props.classes.submitButton}
                        variant="contained"
                        color="primary"
                        disabled={!this.props.holochainConnected || this.state.submitted}
                        size="small"
                    >
                        Submit
                    </Button>
                    : null
                }
                <Button size="small" disabled={this.state.submitted} onClick={this.toggleComposeOpen} variant="outlined">
                    {this.state.composeOpen ? 'Cancel' : 'Reply'}
                </Button>
            </React.Fragment>
        );
    }
}

CommentCompose.propTypes = {
    address: PropTypes.string.isRequired,
    holochainConnected: PropTypes.bool.isRequired,
    callZome: PropTypes.func,
    createComment: PropTypes.func.isRequired,
    classes: PropTypes.object.isRequired,
    callback: PropTypes.func,
};

const propsMap = props => ({
    holochainConnected: props.holochainConnected,
    callZome: props.callZome,
});

export default connect(propsMap, { createComment })(withStyles(styles)(CommentCompose));
