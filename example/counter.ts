
import {
    Model, Fetch, ReducerMap, SagaCreator, identityFunc, createStore,
} from 'reduite';
import { createSelector } from 'reselect';
import { select, put } from 'redux-saga/effects';


void function () {

    interface IState {
        counter : number;
    };

    const initialState : IState = { counter : 0 };

    const actionMap = {
        increase : identityFunc<number>(),
        decrease : identityFunc<number>(),
    };

    const selectorMap = (fetch : Fetch<IState>) => ({
        counter : createSelector(fetch, state => state.counter),
    });

    const reducerMap : ReducerMap<IState, typeof actionMap> = {
        increase : (state, { payload }) => ({
            ...state, counter : state.counter + payload,
        }),
        decrease : (state, { payload }) => ({
            ...state, counter : state.counter - payload,
        }),
    };

    const sagaCreator : SagaCreator<typeof actionMap> = action => ({
        increase : function* ({ payload }) {
            console.log('add with :', payload);

            // warning : model is a global variable
            const selector = model.selector.counter;
            console.log('current counter :', selector(yield select()));

            console.log('now decrease counter back');
            yield put(action.decrease(payload));

            console.log('current counter :', selector(yield select()))
        },
    });

    const model = Model.create('counter', initialState, actionMap, selectorMap)
                       .reducer(reducerMap).latest(sagaCreator).value();
    const store = createStore([model]);
    console.log('current counter :', model.selector.counter(store.getState()));
    store.dispatch(model.action.increase(1));

}();

/**
 * console output :
 * [1] current counter : 0
 * [2] add with : 1
 * [3] current counter : 1
 * [4] now decrease counter back
 * [5] current counter : 0
 */

void function () {

    interface IState {
        counter : number;
    };

    const initialState : IState = { counter : 0 };

    const model = Model.create('counter', initialState, {
        increase : identityFunc<number>(),
        decrease : identityFunc<number>(),
    }, fetch => ({
        counter : createSelector(fetch, state => state.counter),
    })).reducer({
        increase : (state, { payload }) => ({
            ...state, counter : state.counter + payload,
        }),
        decrease : (state, { payload }) => ({
            ...state, counter : state.counter - payload,
        }),
    }).latest(action => ({
        increase : function* ({ payload }) {
            console.log('add with :', payload);

            // warning : model is a global variable
            const selector = model.selector.counter;
            console.log('current counter :', selector(yield select()));

            console.log('now decrease counter back');
            yield put(action.decrease(payload));

            console.log('current counter :', selector(yield select()))
        },
    })).value();

}();
