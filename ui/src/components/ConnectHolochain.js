import React from 'react';
import { connectToHolochain } from '../actions';
import { connect } from 'react-redux';
import { withSnackbar } from 'notistack';
import PropTypes from 'prop-types';

export class ConnectHolochain extends React.Component {
    state = {
        holochainConnected: false,
    }

    componentDidUpdate(oldProps) {
        if (!oldProps.holochainConnected && this.props.holochainConnected) {
            this.props.enqueueSnackbar('Connected to Holochain', { variant: 'success' });
        }
    }

    constructor(props) {
        super();
        props.enqueueSnackbar('Connecting to Holochain...', { variant: 'info' });
        props.connectToHolochain();
    }

    render() {
        return null;
    }
}

ConnectHolochain.propTypes = {
    connectToHolochain: PropTypes.func.isRequired,
    enqueueSnackbar: PropTypes.func.isRequired,
    holochainConnected: PropTypes.bool.isRequired,
}

const propsMap = props => ({
    holochainConnected: props.holochainConnected
});

export default withSnackbar(connect(propsMap, { connectToHolochain })(ConnectHolochain));
