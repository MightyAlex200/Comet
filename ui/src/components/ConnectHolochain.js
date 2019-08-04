import React from 'react';
import { connectToHolochain } from '../actions';
import { connect } from 'react-redux';

export class ConnectHolochain extends React.Component {
    constructor(props) {
        super();
        props.connectToHolochain();
    }

    render() {
        return null;
    }
}

export default connect(null, { connectToHolochain })(ConnectHolochain);
