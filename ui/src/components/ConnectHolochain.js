import React from 'react';
import { connectToHolochain, getAgentAddress } from '../actions';
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
            this.props.getAgentAddress(this.props.callZome);
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
    getAgentAddress: PropTypes.func.isRequired,
    callZome: PropTypes.func,
}

const propsMap = props => ({
    holochainConnected: props.holochainConnected,
    callZome: props.callZome,
});

export default withSnackbar(connect(propsMap, { connectToHolochain, getAgentAddress })(ConnectHolochain));
