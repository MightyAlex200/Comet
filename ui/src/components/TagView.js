import React from 'react';
import PropTypes from 'prop-types';
import { Link as RouterLink } from 'react-router-dom';
import { Link } from '@material-ui/core';
import { connect } from 'react-redux';

class TagView extends React.Component {
    render() {
        return (
            <Link component={RouterLink} to={`/search/${this.props.tag}`}>
                {this.props.tagNames[this.props.tag.toString()] || this.props.tag}
            </Link>
        );
    }
}

TagView.propTypes = {
    tag: PropTypes.number.isRequired,
};

const propsMap = props => ({
    tagNames: props.tagNames,
});

export default connect(propsMap)(TagView);
