import React from 'react';
import PropTypes from 'prop-types';
import { Typography } from '@material-ui/core';
import TimeAgo from 'react-timeago';
import UsernameDisplay from './UsernameDisplay';

function PostSignature(props) {
    return (
        <Typography style={{ display: 'inline' }} variant="subtitle2">
            Posted by
            {' '}
            <UsernameDisplay inTermsOf={props.inTermsOf} keyHash={props.post.key_hash} />
            {' '}
            <TimeAgo date={props.post.timestamp} />
        </Typography>
    );
}

PostSignature.propTypes = {
    post: PropTypes.object.isRequired,
    inTermsOf: PropTypes.array,
}

export default PostSignature;
