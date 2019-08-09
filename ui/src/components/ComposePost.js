import React from 'react';
import { createPost, consumePostJustCreated } from '../actions';
import { withStyles, Typography, TextField, Button } from '@material-ui/core';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

const styles = theme => ({
    header: {
        marginBottom: theme.spacing(2),
    },
    input: {
        marginBottom: theme.spacing(1),
        width: "100%",
    },
    button: {
        marginTop: theme.spacing(1),
    }
});

class ComposePost extends React.Component {
    state = {
        title: '',
        content: '',
        tagInput: '',
    };

    componentDidUpdate(prevProps) {
        if (this.props.postJustCreated) {
            this.props.history.push(`/post/${this.props.postJustCreated}`);
            this.props.consumePostJustCreated();
        }
    }

    onChange = prop => event => {
        const val = event.target.value;
        this.setState(state => ({ ...state, [prop]: val }));
    }

    onSubmit = event => {
        event.preventDefault();
        this.props.createPost(this.getPost(this.getUtcUnixTime()), this.getTags(), this.props.callZome);
    }

    getUtcUnixTime() {
        return Math.floor(new Date().getTime() / 1000);
    }

    getTags() {
        return this.state.tagInput.split(',').map(a => JSON.parse(a.trim()));
    }

    getPost(utc_unix_time) {
        return {
            title: this.state.title,
            content: this.state.content,
            utc_unix_time,
        };
    }

    render() {
        return (
            <form onSubmit={this.onSubmit}>
                <Typography className={this.props.classes.header} variant="h1">Create a post</Typography>
                <TextField
                    label="Post title"
                    className={this.props.classes.input}
                    variant="outlined"
                    value={this.state.title}
                    onChange={this.onChange('title')}
                />
                <br />
                <TextField
                    label="Post content"
                    className={this.props.classes.input}
                    variant="outlined"
                    value={this.state.content}
                    onChange={this.onChange('content')}
                    multiline
                />
                <br />
                <TextField
                    label="Tags"
                    className={this.props.classes.input}
                    variant="outlined"
                    value={this.state.tagInput}
                    onChange={this.onChange('tagInput')}
                />
                <br />
                <Button
                    disabled={
                        !this.props.holochainConnected
                        || !this.state.title
                        || !this.state.content
                        || !this.state.tagInput.split(',').every(a => a.match(/^\d+$/))
                    }
                    type="submit"
                    className={this.props.classes.button}
                    variant="contained"
                    color="primary">
                    Submit
                </Button>
            </form>
        );
    }
}

ComposePost.propTypes = {
    classes: PropTypes.object.isRequired,
    createPost: PropTypes.func.isRequired,
    callZome: PropTypes.func,
    holochainConnected: PropTypes.bool.isRequired,
    postJustCreated: PropTypes.string,
    consumePostJustCreated: PropTypes.func.isRequired,
    history: PropTypes.object.isRequired,
};

const propsMap = state => ({
    holochainConnected: state.holochainConnected,
    callZome: state.callZome,
    postJustCreated: state.postJustCreated,
});

export default connect(propsMap, { createPost, consumePostJustCreated })(withStyles(styles)(withRouter(ComposePost)));
