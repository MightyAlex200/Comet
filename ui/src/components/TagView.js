import React from 'react';
import PropTypes from 'prop-types';
import {
    Link,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    TextField
} from '@material-ui/core';
import { Link as RouterLink } from 'react-router-dom';
import { connect } from 'react-redux';
import { tagNameDelete, tagNameUpdate } from '../actions';

class TagView extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            dialogOpen: false,
            tagNameContent: props.tagNames[this.props.tag],
        };
    }

    handleClick = () => {
        this.setState(state => ({ ...state, tagNameContent: this.props.tagNames[this.props.tag] || '', dialogOpen: true }));
    }

    onClose = () => {
        this.setState(state => ({ ...state, dialogOpen: false }));
    }

    onChange = event => {
        const val = event.target.value;
        this.setState(state => ({ ...state, tagNameContent: val }));
    }

    saveTagName = () => {
        if (this.state.tagNameContent.trim() !== '') {
            this.props.tagNameUpdate(this.props.tag, this.state.tagNameContent.trim());
        } else {
            this.props.tagNameDelete(this.props.tag);
        }
        this.onClose();
    }

    getTagName() {
        return this.props.tagNames[this.props.tag.toString()] || `unnamed tag #${this.props.tag}`;
    }

    render() {
        return (
            <>
                <Link component="button" onClick={this.handleClick}>
                    {this.getTagName()}
                </Link>
                <Dialog
                    open={this.state.dialogOpen}
                    onClose={this.onClose}
                >
                    <DialogTitle>{this.getTagName()}
                        <br />
                        <Link variant="subtitle1" component={RouterLink} to={`/search/${this.props.tag}`}>
                            (click to search for this tag)
                        </Link>
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Enter new name of tag:
                        </DialogContentText>
                        <TextField
                            autoFocus
                            label="Tag name"
                            fullWidth
                            value={this.state.tagNameContent}
                            onChange={this.onChange}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.onClose}>
                            Cancel
                        </Button>
                        <Button onClick={this.saveTagName}>
                            Save
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    }
}

TagView.propTypes = {
    tag: PropTypes.number.isRequired,
    tagNames: PropTypes.object.isRequired,
    tagNameUpdate: PropTypes.func.isRequired,
    tagNameDelete: PropTypes.func.isRequired,
};

const propsMap = props => ({
    tagNames: props.tagNames,
});

export default connect(propsMap, { tagNameUpdate, tagNameDelete })(TagView);
