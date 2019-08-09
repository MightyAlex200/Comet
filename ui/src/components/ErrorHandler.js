import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { withSnackbar } from 'notistack';

class ErrorHandler extends React.Component {
    state = {
        nextIndex: 0,
    }

    componentDidUpdate(oldProps) {
        if (this.props.errors.length <= this.state.nextIndex) {
            return;
        }

        const err = this.props.errors[this.state.nextIndex];
        console.log(err)
        console.error(`ErrorHandler: Got new error in func ${err.func}: ${JSON.stringify(err.error)}`);
        this.props.enqueueSnackbar(`Failed to ${err.failedAction}. See log for more details.`, { variant: 'error' });
        this.setState(state => ({ ...state, nextIndex: state.nextIndex + 1 }));
    }

    render() {
        return null;
    }
}

ErrorHandler.propTypes = {
    errors: PropTypes.array.isRequired,
    enqueueSnackbar: PropTypes.func.isRequired,
};

const propsMap = props => ({
    errors: props.errors
});

export default withSnackbar(connect(propsMap)(ErrorHandler));
