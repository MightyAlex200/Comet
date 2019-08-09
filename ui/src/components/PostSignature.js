import React from 'react';
import PropTypes from 'prop-types';
import { Typography } from '@material-ui/core';
import TimeAgo from 'react-timeago';

function PostSignature(props) {
    return (
        <Typography variant="subtitle2">
            {`Posted by ${props.post.key_hash} `} {/* TODO: Resolve name */}
            <TimeAgo date={props.post.timestamp} />
        </Typography>
    );
}

PostSignature.propTypes = {
    post: PropTypes.object.isRequired,
}

export default PostSignature;
