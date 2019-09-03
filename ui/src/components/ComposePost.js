import React from 'react';
import { createPost, tagNameUpdate } from '../actions';
import { withStyles, Typography, TextField, Button, Link } from '@material-ui/core';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import util from '../util';

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
        submitted: false,
    };

    onChange = prop => event => {
        const val = event.target.value;
        this.setState(state => ({ ...state, [prop]: val }));
    }

    onSubmit = event => {
        event.preventDefault();
        this.props.createPost(this.getPost(util.getUtcUnixTime()), this.getTags().map(tagName => Number(this.props.nameTags[tagName])), this.props.callZome)
            .then(result => {
                if (result.Ok) {
                    this.props.history.push(`/post/${result.Ok}`);
                }
            });
        this.setState(state => ({ ...state, submitted: true }));
    }

    shouldSubmitBeDisabled = () => {
        return this.state.submitted
            || !this.props.holochainConnected
            || !this.state.title
            || !this.state.content
            || !this.areTagsValid();
    }

    getTags = () => {
        return this.state.tagInput.split(',').map(tag => tag.trim());
    }

    isTagValid = tag => this.props.nameTags[tag];

    areTagsValid = () => {
        return this.getTags().every(this.isTagValid);
    }

    getRandomTagNumber = () => {
        let n;
        do {
            n = Math.round(Math.random() * Number.MAX_SAFE_INTEGER);
        } while (this.props.tagNames[n]);
        return n;
    }

    createNewTags = () => {
        for (const tagName of this.getTags().filter(tag => !this.isTagValid(tag))) {
            this.props.tagNameUpdate(this.getRandomTagNumber(), tagName)
        }
    }

    getPost(utc_unix_time) {
        return {
            title: this.state.title,
            content: this.state.content,
            utc_unix_time,
        };
    }

    render() {
        const tagsError = !this.areTagsValid() && this.state.tagInput !== '';
        return (
            <form onSubmit={this.onSubmit}>
                <Typography className={this.props.classes.header} variant="h1">Create a post</Typography>
                <TextField
                    label="Post title"
                    className={this.props.classes.input}
                    variant="outlined"
                    value={this.state.title}
                    onChange={this.onChange('title')}
                    disabled={this.state.submitted}
                />
                <br />
                <TextField
                    label="Post content"
                    className={this.props.classes.input}
                    variant="outlined"
                    value={this.state.content}
                    onChange={this.onChange('content')}
                    disabled={this.state.submitted}
                    multiline
                />
                <br />
                <TextField
                    label="Tags"
                    className={this.props.classes.input}
                    variant="outlined"
                    value={this.state.tagInput}
                    onChange={this.onChange('tagInput')}
                    disabled={this.state.submitted}
                    error={tagsError}
                />
                {tagsError
                    ? <>
                        {`Error: tag(s) ${this.getTags().filter(tag => !this.isTagValid(tag)).map(tag => `"${tag}"`).join(', ')} not found`}
                        <br />
                        <Link component="button" onClick={this.createNewTags}>
                            Create them
                        </Link>
                    </>
                    : null
                }
                <br />
                <Button
                    disabled={this.shouldSubmitBeDisabled()}
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
    history: PropTypes.object.isRequired,
    nameTags: PropTypes.object.isRequired,
    tagNames: PropTypes.object.isRequired,
    tagNameUpdate: PropTypes.func.isRequired,
};

const propsMap = state => ({
    holochainConnected: state.holochainConnected,
    callZome: state.callZome,
    nameTags: state.nameTags,
    tagNames: state.tagNames,
});

export default connect(propsMap, { createPost, tagNameUpdate })(withStyles(styles)(withRouter(ComposePost)));
