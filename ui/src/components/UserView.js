import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { fetchUserPosts } from '../actions';
import { Typography, CircularProgress, withStyles, Box } from '@material-ui/core';
import UsernameDisplay from './UsernameDisplay';
import PostSummary from './PostSummary';

const styles = theme => ({
    root: {
        margin: theme.spacing(1),
    }
});

class UserView extends React.Component {
    state = {
        postsCached: false,
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

        if (!this.state.postsCached) {
            this.getUserPosts();
            this.setState(state => ({ ...state, postsCached: true }));
        }
    }

    invalidateCache(prevProps) {
        const posts = this.props.userPosts[this.props.keyHash];
        if (!posts && (this.props.keyHash !== prevProps.keyHash)) {
            this.setState(state => ({ ...state, postsCached: false }));
        }
    }

    getUserPosts() {
        this.props.fetchUserPosts(this.props.keyHash, this.props.callZome);
    }

    header() {
        return <Typography variant="h2">Post history: <UsernameDisplay keyHash={this.props.keyHash} /></Typography>;
    }

    render() {
        const posts = this.props.userPosts[this.props.keyHash];
        if (!posts) {
            return (
                <>
                    {this.header()}
                    <CircularProgress />
                </>
            );
        } else if (posts.Ok) {
            return (
                <Box>
                    {this.header()}
                    {posts.Ok.length === 0
                        ? <Typography variant="body1">User has no posts</Typography>
                        : posts.Ok
                            .reverse() // TODO: Actually order
                            .map(address => <Box className={this.props.classes.root} key={address}><PostSummary address={address} /></Box>)
                    }
                </Box>
            );
        } else {
            return this.header();
        };
    }
}

const propsMap = props => ({
    holochainConnected: props.holochainConnected,
    callZome: props.callZome,
    userPosts: props.userPosts,
});

UserView.propTypes = {
    holochainConnected: PropTypes.bool.isRequired,
    callZome: PropTypes.func,
    userPosts: PropTypes.object.isRequired,
    fetchUserPosts: PropTypes.func.isRequired,
    keyHash: PropTypes.string.isRequired,
    classes: PropTypes.object.isRequired,
};

export default connect(propsMap, { fetchUserPosts })(withStyles(styles)(UserView));
