import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@material-ui/core';
import { Link as RouterLink } from 'react-router-dom';
import { connect } from 'react-redux';
import { getUsername } from '../actions';

class UsernameDisplay extends React.Component {
    componentDidMount() {
        const usernameResolved = this.props.holochainConnected && this.props.usernames[this.props.keyHash];
        if (this.props.holochainConnected && !usernameResolved) {
            this.fetchUsername();
        }
    }

    componentDidUpdate(prevProps) {
        const holochainJustConnected = prevProps.holochainConnected !== this.props.holochainConnected;
        const keyHashChanged = prevProps.keyHash !== this.props.keyHash;
        const usernameResolved = this.props.holochainConnected && this.props.usernames[this.props.keyHash];
        if (this.props.holochainConnected && (keyHashChanged || holochainJustConnected) && !usernameResolved) {
            this.fetchUsername();
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
}

const propsMap = (props, myProps) => ({
    usernames: props.usernames,
    holochainConnected: props.holochainConnected,
    callZome: props.callZome,
});

export default connect(propsMap, { getUsername })(UsernameDisplay);
