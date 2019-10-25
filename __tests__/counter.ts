

import {model, createStore, Store} from 'reduite/model';
import {equals} from 'ramda';
import {createSelector} from 'reselect';


describe('test counter state', () => {

    interface State {
        value : number;
    }

    const initial : State = {value : 0};
    const counter = model('counter', initial).action({
        increase : (x : number) => x,
        decrease : (x : number) => x,
        reset : () => null,
    }).reducer({
        increase : (s, {payload : v}) => ({...s, value : s.value + v}),
        decrease : (s, {payload : v}) => ({...s, value : s.value - v}),
        reset : s => ({...s, value : 0}),
    }).selector(fetch => {
        return {value : createSelector(fetch, x => x.value)};
    }).leading((action, selector) => ({
        reset : function* () { console.log('reset'); },
    })).value();

    // const store = createStore([counter]);
    const {store} = Store.of([counter]).create();
    const getState = () : State => store.getState()['counter'];

    it('model name', () => {
        expect(!!getState());
    });

    it('initialize state', () => {
        expect(0 == getState().value);
    });

    it('action key wrapper', () => {
        expect(equals(
            {type : 'counter/increase', payload : 1},
            counter.action.increase(1)));
        expect(equals(
            {type : 'counter/decrease', payload : 1},
            counter.action.decrease(1)));
        expect(equals(
            {type : 'counter/reset', payload : null},
            counter.action.reset()));
    });

    it('dispatch increase', () => {
        store.dispatch(counter.action.increase(4));
        expect(4 === getState().value);
    });

    it('dispatch decrease', () => {
        store.dispatch(counter.action.decrease(2));
        expect(2 === getState().value);
    });

    it('dispatch reset', () => {
        store.dispatch(counter.action.reset());
        expect(0 === getState().value);
    });

    it('selector', () => {
        const state = getState();
        expect(equals(state, counter.fetch(store.getState())));
        expect(state.value === counter.selector.value(store.getState()));
    });

});
