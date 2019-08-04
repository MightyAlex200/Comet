import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { readPost } from '../actions';

class PostView extends Component {
    componentDidUpdate(prevProps) {
        const holochainJustConnected = prevProps.holochainConnected !== this.props.holochainConnected;
        const addressChanged = prevProps.address !== this.props.address;
        if (this.props.holochainConnected && (addressChanged || holochainJustConnected)) {
            this.props.readPost(this.props.address, this.props.callZome);
        }
    }

    render() {
        const post = this.props.postsRead[this.props.address];
        if (post && post.Ok) {
            return (<div>
                <h2>{post.Ok.title}</h2>
                <p>{post.Ok.content}</p>
            </div>);
        } else if (post && post.Err) {
            return (<div>Failed to get post: {JSON.stringify(post.Err)}</div>)
        } else if (!this.props.holochainConnected) {
            return (<div>Connecting to Holochain...</div>);
        } else {
            return (<div>Loading post...</div>);
        }
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

export default connect(propsMap, { readPost })(PostView);
