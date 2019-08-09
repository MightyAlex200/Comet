import React from 'react';
import { Typography, Link } from '@material-ui/core';
import { Link as RouterLink } from 'react-router-dom';

function MainPage() {
    return (
        <React.Fragment>
            <Typography variant="h2">Main page</Typography>
            <Link component={RouterLink} to="/debug">Click here to go to the debug page</Link>
        </React.Fragment>
    );
}

export default MainPage;
