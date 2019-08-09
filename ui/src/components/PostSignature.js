import React from 'react';
import PropTypes from 'prop-types';
import { Typography } from '@material-ui/core';
import TimeAgo from 'react-timeago';
import UsernameDisplay from './UsernameDisplay';

function PostSignature(props) {
    return (
        <Typography variant="subtitle2">
            Posted by
            {' '}
            <UsernameDisplay keyHash={props.post.key_hash} />
            {' '}
            <TimeAgo date={props.post.timestamp} />
        </Typography>
    );
}

PostSignature.propTypes = {
    post: PropTypes.object.isRequired,
}

export default PostSignature;
