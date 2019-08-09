import React from 'react';
import { connect } from 'react-redux';
import { readPost } from '../actions';
import PropTypes from 'prop-types';
import { withStyles, Typography, Paper, Link } from '@material-ui/core';
import { Link as RouterLink } from 'react-router-dom';
import PostSignature from './PostSignature';

const styles = theme => ({
    root: {
        padding: theme.spacing(1),
    },
})

class PostSummary extends React.Component {
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

    render() {
        return (
            <Paper className={this.props.classes.root}>
                {this.renderInternal()}
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
}

const propsMap = (state, ownProps) => ({
    holochainConnected: state.holochainConnected,
    callZome: state.callZome,
    postsRead: state.postsRead,
});

export default connect(propsMap, { readPost })(withStyles(styles)(PostSummary));
