import React from 'react';
import { Provider } from 'react-redux';
import store from './store';
import ConnectHolochain from './components/ConnectHolochain';

import PostView from './components/PostView';

class App extends React.Component {
  render() {
    return (
      <div className="App">
        <Provider store={store}>
          <ConnectHolochain />
          <PostView address="QmNcHhjyvecWK97vZkPZzv6KNNffM1EMcVAW4mpHSbFhH4" />
        </Provider>
      </div>
    );
  }
}

export default App;
