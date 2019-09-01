import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@material-ui/core';
import TagView from './TagView';

class TagsView extends React.Component {
    state = {
        tagsShown: false,
    }

    toggleTagsShown = () => {
        this.setState(state => ({ ...state, tagsShown: !state.tagsShown }));
    }

    renderTags(tags) {
        const children = [];
        const ubound = tags.length - 1;
        for (let i = 0; i < tags.length; i++) {
            children.push(
                <TagView key={`tag${tags[i]}`} tag={tags[i]} />
            );
            if (i !== ubound) { children.push(<React.Fragment key={`delim${i}`}>, </React.Fragment>); }
        }
        return <>{children}</>
    }

    render() {
        if (this.state.tagsShown) {
            const postTags = this.props.postTags ? this.props.postTags.Ok ? this.props.postTags.Ok.original_tags : null : null;
            return (
                <>
                    <Link component="button" onClick={this.toggleTagsShown}>
                        [hide]
                    </Link>

                    {' '}
                    {postTags ? <>Originally posted to {this.renderTags(postTags)}.</> : null}
                    {' '}
                    {this.props.inTermsOf ? <>Viewing in terms of {this.renderTags(this.props.inTermsOf)}.</> : null}
                    {' '}
                </>
            );
        } else {
            return (
                <Link component="button" onClick={this.toggleTagsShown} >[...]</Link>
            );
        }
    }
}

TagsView.propTypes = {
    postTags: PropTypes.object,
    inTermsOf: PropTypes.array,
};

export default TagsView;
