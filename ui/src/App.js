import React from 'react';
import { Provider } from 'react-redux';
import store from './store';
import ConnectHolochain from './components/ConnectHolochain';
import CssBaseline from '@material-ui/core/CssBaseline';
import Container from '@material-ui/core/Container';
import 'typeface-roboto';

import PostView from './components/PostView';

class App extends React.Component {
  render() {
    return (
      <div className="App">
        <CssBaseline />
        <Provider store={store}>
          <ConnectHolochain />
          <Container fixed>
            <PostView address="QmQDwZ8XAMWsZKwWJH7yVj81hRFFC7QvQj3iHEseGsGvpR" />
          </Container>
        </Provider>
      </div>
    );
  }
}

export default App;
