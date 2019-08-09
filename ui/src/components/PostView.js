import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { readPost } from '../actions';
import { Paper, Box, Typography, withStyles, Divider, Button } from '@material-ui/core';
import PostSignature from './PostSignature';

const styles = theme => ({
    root: {
        padding: theme.spacing(1),
    },
});

class PostView extends Component {
    componentDidMount() {
        const postRead = this.props.holochainConnected && this.props.postsRead[this.props.address];
        if (this.props.holochainConnected && !postRead) {
            this.getPost();
        }
    }

    componentDidUpdate(prevProps) {
        const holochainJustConnected = prevProps.holochainConnected !== this.props.holochainConnected;
        const addressChanged = prevProps.address !== this.props.address;
        const postRead = this.props.holochainConnected && this.props.postsRead[this.props.address];
        if (this.props.holochainConnected && (addressChanged || holochainJustConnected) && !postRead) {
            this.getPost();
        }
    }

    getPost() {
        this.props.readPost(this.props.address, this.props.callZome);
    }

    renderPost() {
        const post = this.props.postsRead[this.props.address];
        if (post && post.Ok) {
            return (<Box>
                <Typography className={this.props.classes.root} variant="h4">{post.Ok.title}</Typography>
                <Box className={this.props.classes.root}>
                    <PostSignature post={post.Ok} />
                </Box>
                <Divider></Divider>
                <Typography className={this.props.classes.root} variant="body1">{post.Ok.content}</Typography>
                <Button variant="outlined">Reply</Button>
            </Box>);
        } else if (post && post.Err) {
            return (<Typography variant="body1">Failed to get post: {JSON.stringify(post.Err)}</Typography>)
        } else if (!this.props.holochainConnected) {
            return (<Typography variant="body1">Connecting to Holochain...</Typography>);
        } else {
            return (<Typography variant="body1">Loading post...</Typography>);
        }
    }

    render() {
        return (
            <Paper className={this.props.classes.root}>
                {this.renderPost()}
            </Paper>
        );
    }
}

PostView.propTypes = {
    address: PropTypes.string.isRequired,
    holochainConnected: PropTypes.bool.isRequired,
    callZome: PropTypes.func,
    postsRead: PropTypes.object.isRequired,
    classes: PropTypes.object.isRequired,
};

const propsMap = (state, ownProps) => ({
    holochainConnected: state.holochainConnected,
    callZome: state.callZome,
    postsRead: state.postsRead,
});

export default connect(propsMap, { readPost })(withStyles(styles)(PostView));
