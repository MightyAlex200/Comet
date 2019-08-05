import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { readPost } from '../actions';
import { Paper, Box, Typography, withStyles, Divider, Button } from '@material-ui/core';

const styles = {
    root: {
        padding: 8,
    },
};

class PostView extends Component {
    componentDidUpdate(prevProps) {
        const holochainJustConnected = prevProps.holochainConnected !== this.props.holochainConnected;
        const addressChanged = prevProps.address !== this.props.address;
        if (this.props.holochainConnected && (addressChanged || holochainJustConnected)) {
            this.props.readPost(this.props.address, this.props.callZome);
        }
    }

    renderPost() {
        const post = this.props.postsRead[this.props.address];
        if (post && post.Ok) {
            return (<Box>
                <Typography className={this.props.classes.root} variant="h4">{post.Ok.title}</Typography>
                <Typography className={this.props.classes.root} variant="subtitle2">
                    {`Submitted by ${post.Ok.key_hash}` /* TODO: Resolve name and make this a link */}
                </Typography>
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
};

const propsMap = (state, ownProps) => ({
    holochainConnected: state.holochainConnected,
    callZome: state.callZome,
    postsRead: state.postsRead,
});

export default connect(propsMap, { readPost })(withStyles(styles)(PostView));
