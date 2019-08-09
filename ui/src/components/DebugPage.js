import React from 'react';
import { Box, Typography, withStyles, TextField, Button } from '@material-ui/core';
import { Link as RouterLink } from 'react-router-dom';
import PostSummary from './PostSummary';

const styles = theme => ({
    root: {
        paddingBottom: theme.spacing(1),
    },
});

function DebugPage(props) {
    const [state, setState] = React.useState({
        postViewAddress: '',
    });

    const onChange = name => event => {
        setState({ ...state, [name]: event.target.value });
    }

    return (
        <Box>
            <Typography className={props.classes.root} variant="h2">Debug page</Typography>
            <form>
                <TextField
                    label="Post Address"
                    value={state.postViewAddress}
                    onChange={onChange('postViewAddress')}
                    margin="normal"
                />
                <br />
                <Button component={RouterLink} to={`/post/${state.postViewAddress}`}>View post</Button>
                <Typography variant="body1">Preview will appear below</Typography>
                <PostSummary address={state.postViewAddress} />
            </form>
        </Box>
    );
}

export default withStyles(styles)(DebugPage);
