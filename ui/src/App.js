import React from 'react';
import { Provider } from 'react-redux';
import { store, persistor } from './store';
import ConnectHolochain from './components/ConnectHolochain';
import CssBaseline from '@material-ui/core/CssBaseline';
import Container from '@material-ui/core/Container';
import PropTypes from 'prop-types';
import 'typeface-roboto';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import { withStyles, ThemeProvider } from '@material-ui/styles';
import { Link, AppBar, Toolbar, Drawer, List, ListItem, ListItemText, ListItemIcon, Box, createMuiTheme } from '@material-ui/core';
import { Link as RouterLink } from 'react-router-dom';
import AccountCircleIcon from '@material-ui/icons/AccountCircle';
import deepOrange from '@material-ui/core/colors/deepOrange';
import blue from '@material-ui/core/colors/blue';
import { SnackbarProvider } from 'notistack';
import ErrorHandler from './components/ErrorHandler';
import { PersistGate } from 'redux-persist/integration/react';
import util from './util';

import MainPage from './components/MainPage';
import DebugPage from './components/DebugPage';
import PostView from './components/PostView';
import ComposePost from './components/ComposePost';
import UserView from './components/UserView';

const drawerWidth = 240;

const theme = createMuiTheme({
  palette: {
    primary: deepOrange,
    secondary: blue,
  }
});

const styles = {
  root: {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: drawerWidth,
  },
  content: {
    padding: 16,
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
  },
};

class App extends React.Component {
  render() {
    return (
      <div className="App">
        <CssBaseline />
        <Provider store={store}>
          <PersistGate persistor={persistor}>
            <SnackbarProvider>
              <ConnectHolochain />
              <ErrorHandler />
              <Router>
                <ThemeProvider theme={theme}>
                  <AppBar className={this.props.classes.root} position="relative">
                    <Toolbar>
                      <Link style={{ color: "inherit" }} component={RouterLink} to="/" variant="h6">Comet</Link>
                    </Toolbar>
                  </AppBar>
                  <Drawer variant="permanent" className={this.props.classes.drawer} classes={{ paper: this.props.classes.drawer }}>
                    <List>
                      <ListItem component={RouterLink} to="/my_profile" button>
                        <ListItemIcon>
                          <AccountCircleIcon />
                        </ListItemIcon>
                        <ListItemText primary="Profile" />
                      </ListItem>
                    </List>
                  </Drawer>
                  <Box className={this.props.classes.root}>
                    <Container fixed className={this.props.classes.content}>

                      <Route path="/" exact component={MainPage} />
                      <Route path="/debug" exact component={DebugPage} />
                      <Route path="/post/:address/:tags*"
                        render={({ match }) =>
                          <PostView inTermsOf={match.params.tags ? util.unique(match.params.tags.split(',').filter(tag => tag.match(/^\d+$/)).map(tag => +tag)) : null} address={match.params.address} />
                        }
                      />
                      <Route path="/compose_post" exact component={ComposePost} />
                      <Route path="/user/:keyHash" render={({ match }) => <UserView keyHash={match.params.keyHash} />} />

                    </Container>
                  </Box>
                </ThemeProvider>
              </Router>
            </SnackbarProvider>
          </PersistGate>
        </Provider>
      </div>
    );
  }
}

App.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(App);
