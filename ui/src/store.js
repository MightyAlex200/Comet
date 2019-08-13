import { createStore, compose, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import rootReducer from './reducers'
import defaultState from './reducers/defaultState';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

const middleware = [thunk];

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const persistConfig = {
    key: 'root',
    storage,
    whitelist: ['karmaMap'],
};

export const store = createStore(persistReducer(persistConfig, rootReducer), defaultState, composeEnhancers(applyMiddleware(...middleware)));

export const persistor = persistStore(store);
