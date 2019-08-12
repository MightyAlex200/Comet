import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@material-ui/core';
import { Link as RouterLink } from 'react-router-dom';
import { connect } from 'react-redux';
import { getUsername } from '../actions';

class UsernameDisplay extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            usernameCache: props.usernames[props.keyHash] !== undefined,
        };
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

        if (!this.state.usernameCache) {
            this.fetchUsername();
            this.setState(state => ({ ...state, usernameCache: true }));
        }
    }

    invalidateCache(prevProps) {
        const username = this.props.usernames[this.props.keyHash];
        if (!username && (prevProps.keyHash !== this.props.keyHash)) {
            this.setState(state => ({ ...state, usernameCache: false }));
        }
    }

    fetchUsername() {
        this.props.getUsername(this.props.keyHash, this.props.callZome);
    }

    getUsername() {
        return this.props.usernames[this.props.keyHash] || this.props.keyHash;
    }

    render() {
        return <Link component={RouterLink} to={`/user/${this.props.keyHash}`}>{this.getUsername()}</Link>;
    }
}

UsernameDisplay.propTypes = {
    usernames: PropTypes.object.isRequired,
    keyHash: PropTypes.string.isRequired,
    holochainConnected: PropTypes.bool.isRequired,
    callZome: PropTypes.func,
    getUsername: PropTypes.func.isRequired,
}

const propsMap = (props, myProps) => ({
    usernames: props.usernames,
    holochainConnected: props.holochainConnected,
    callZome: props.callZome,
});

export default connect(propsMap, { getUsername })(UsernameDisplay);
