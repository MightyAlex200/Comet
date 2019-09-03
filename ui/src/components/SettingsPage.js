import React from 'react';
import { Typography, Button, Switch, FormGroup, FormControlLabel, TextField, Dialog, DialogTitle, DialogActions, DialogContent } from '@material-ui/core';
import { withStyles } from '@material-ui/styles';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { setHidePosts, setHideComments, setHideThreshold, deleteKarmaMap } from '../actions';
import { withSnackbar } from 'notistack';

const styles = theme => ({
    formGroup: {
        marginBottom: theme.spacing(1),
    },
    thresholdInput: {
        marginLeft: theme.spacing(0.5),
    },
    dialogYes: {
        color: "red",
    }
});

class SettingsPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hidePosts: props.hidePosts,
            hideComments: props.hideComments,
            minimumScore: props.minimumScore,
            dialogOpen: false,
        };
    }

    handleChange = settingName => event => {
        const val = event.target.checked;
        this.setState(state => ({ ...state, [settingName]: val }));
    }

    handleNumberChange = settingName => event => {
        const val = Number(event.target.value);
        this.setState(state => ({ ...state, [settingName]: val }));
    }

    resetState = () => {
        this.setState(state => ({
            ...state,
            hidePosts: this.props.hidePosts,
            hideComments: this.props.hideComments,
            minimumScore: this.props.minimumScore,
        }));
    }

    saveState = () => {
        this.props.dispatchAction(setHidePosts(this.state.hidePosts));
        this.props.dispatchAction(setHideComments(this.state.hideComments));
        this.props.dispatchAction(setHideThreshold(this.state.minimumScore));
        this.props.enqueueSnackbar('Settings saved', { variant: 'success' });
    }

    openDialog = () => {
        this.setState(state => ({ ...state, dialogOpen: true }));
    }

    onDialogClose = () => {
        this.setState(state => ({ ...state, dialogOpen: false }));
    }

    deleteKarmaMap = () => {
        this.props.dispatchAction(deleteKarmaMap());
        this.onDialogClose();
    }

    render() {
        return (
            <>
                <Typography variant="h2">
                    Settings
                </Typography>
                <Typography variant="h4">
                    Basic settings
                </Typography>
                <FormGroup className={this.props.classes.formGroup}>
                    <FormControlLabel
                        control={<Switch checked={this.state.hidePosts} onChange={this.handleChange('hidePosts')} color="primary" />}
                        label="Hide posts with a score below the threshold."
                    />
                    <FormControlLabel
                        control={<Switch checked={this.state.hideComments} onChange={this.handleChange('hideComments')} color="primary" />}
                        label="Hide comments with a score below the threshold."
                    />
                    <FormControlLabel
                        className={this.props.classes.thresholdInput}
                        control={<TextField value={this.state.minimumScore} onChange={this.handleNumberChange('minimumScore')} type="number" label="Threshold" />}
                        label="Minimum score threshold for posts and comments."
                    />
                </FormGroup>
                <Button onClick={this.saveState} color="primary" variant="contained">Save</Button> <Button onClick={this.resetState}>Cancel</Button>
                <br />
                <Typography variant="h4">
                    Karma Map
                </Typography>
                <Typography variant="subtitle1">
                    Your Karma Map keeps a record of whose content you have upvoted and downvoted. Its contents determine how votes are scored in your instance of Comet.
                </Typography>
                <Typography variant="subtitle2">
                    Deleting it will reset the score of every post to 0.
                </Typography>
                <Button variant="contained" color="secondary" onClick={this.openDialog}>
                    Delete Karma Map
                </Button>
                <Dialog
                    open={this.state.dialogOpen}
                    onClose={this.onDialogClose}
                >
                    <DialogTitle>
                        Delete Karma Map?
                    </DialogTitle>
                    <DialogContent>
                        THIS ACTION IS IRREVERSABLE.
                        </DialogContent>
                    <DialogActions>
                        <Button className={this.props.classes.dialogYes} onClick={this.deleteKarmaMap}>
                            Yes
                        </Button>
                        <Button onClick={this.onDialogClose}>
                            No
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    }
}

SettingsPage.propTypes = {
    hidePosts: PropTypes.bool.isRequired,
    hideComments: PropTypes.bool.isRequired,
    minimumScore: PropTypes.number.isRequired,
    dispatchAction: PropTypes.func.isRequired,
    enqueueSnackbar: PropTypes.func.isRequired,
};

const propsMap = props => ({
    hidePosts: props.hidePosts,
    hideComments: props.hideComments,
    minimumScore: props.minimumScore,
});

export default withSnackbar(connect(propsMap, { dispatchAction: action => dispatch => dispatch(action) })(withStyles(styles)(SettingsPage)));
