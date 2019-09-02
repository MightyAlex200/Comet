import React from 'react';
import PropTypes from 'prop-types';
import { Link, Typography } from '@material-ui/core';
import { Link as RouterLink } from 'react-router-dom';
import { connect } from 'react-redux';
import { getUsername } from '../actions';
import approx from 'approximate-number';
import VoteView from './VoteView';

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

    getKarma() {
        return VoteView.calculateWeight(this.props.keyHash, this.props.inTermsOf, this.props.karmaMap);
    }

    getKarmaString() {
        const karma = this.getKarma();
        let sign = karma >= 0 ? '+' : '-';
        return `[${sign}${approx(Math.abs(karma))}]`;
    }

    render() {
        return (
            <>
                <Link component={RouterLink} to={`/user/${this.props.keyHash}`}>{this.getUsername()}</Link>
                {' '}
                <Typography variant="caption">
                    {this.props.inTermsOf
                        ? this.getKarmaString()
                        : null
                    }
                </Typography>
            </>
        );
    }
}

UsernameDisplay.propTypes = {
    usernames: PropTypes.object.isRequired,
    keyHash: PropTypes.string.isRequired,
    holochainConnected: PropTypes.bool.isRequired,
    callZome: PropTypes.func,
    getUsername: PropTypes.func.isRequired,
    inTermsOf: PropTypes.array,
    karmaMap: PropTypes.object.isRequired,
}

const propsMap = (props, myProps) => ({
    usernames: props.usernames,
    holochainConnected: props.holochainConnected,
    callZome: props.callZome,
    karmaMap: props.karmaMap,
});

export default connect(propsMap, { getUsername })(UsernameDisplay);
