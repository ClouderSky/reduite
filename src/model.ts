

import {
    mapObjIndexed, toPairs, filter, map, mergeAll, curry, __, concat,
} from 'ramda';
import {
    Middleware, combineReducers, applyMiddleware, compose,
    createStore as createReduxStore, bindActionCreators,
} from 'redux';
import {Action, createAction, handleActions} from 'redux-actions';
import {Selector} from 'reselect';
import {PersistConfig, persistStore, persistReducer} from 'redux-persist';
import createSagaMiddleware from 'redux-saga';
import {
    ForkEffect, takeEvery, takeLatest, takeLeading, all,
} from 'redux-saga/effects';

import {Identify} from './functor';


type Func0<R> = () => R;
type FuncN<P extends any[], R> = (...args : P) => R;

/**
 * 定义事件结构相关类型
 */
type ActionFunc<R> = Func0<R> | FuncN<any, R>;

interface ActionMap {
    [type : string] : ActionFunc<any>;
}

type ActionFuncMap<A extends ActionMap = ActionMap> = {
    [k in keyof A] : A[k] extends (...args : infer P) => any ?
        FuncN<P, Action<ReturnType<A[k]>>> :
        Func0<Action<ReturnType<A[k]>>>;
}

/**
 * 定义事件处理函数相关类型
 */
type Reducer<S, A> = (s : S, a : Action<A>) => S;

export type ReducerMap<S, A extends ActionMap> = {
    [k in keyof A] ?: Reducer<S, ReturnType<A[k]>>;
};

/**
 * 定义查询器相关类型
 */
interface SelectorMap {
    [name : string] : Selector<any, any>;
}

/**
 * 定义事件异步处理函数相关类型
 */
type SagaFunc<T> = (a : Action<T>) => any;

type SagaTake = (pattern : string, worker : SagaFunc<any>) => ForkEffect;

type SagaMap<A extends ActionMap> = {
    [k in keyof A] : SagaFunc<ReturnType<A[k]>>;
};

export type SagaCreator<A extends ActionMap> =
    (action : ActionFuncMap<A>) => Partial<SagaMap<A>>;

/**
 * 定义模型对象接口与类
 */
interface ModelValue<
    S = any,
    A extends ActionMap = ActionMap,
    F extends SelectorMap = SelectorMap,
> {
    name : string;
    initial : S;
    fetch : Selector<any, S>;
    action : ActionFuncMap<A>;
    selector : F;
    reducer : Reducer<S, any>;
    saga : ForkEffect[];
}


const isReducerMap = <S, A extends ActionMap>(
    r : Reducer<S, any> | ReducerMap<S, A>,
) : r is ReducerMap<S, A> => !(r instanceof Function);


class Model<S, A extends ActionMap, F extends SelectorMap> {

    static create = <S>(name : string, initial : S) => new Model({
        name, initial, fetch : (s : any) => s[name] as S,
        action : {}, selector : {}, reducer : (s = initial) => s, saga : [],
    });

    private _value : ModelValue<S, A, F>;
    private _wrapKey : (k : string) => string;

    constructor (value : ModelValue<S, A, F>) {
        this._value = value;
        this._wrapKey = (key : string) => `${this._value.name}/${key}`;
    }

    value = () => this._value;

    action = <AA extends ActionMap>(actionMap : AA) => {
        const action = mapObjIndexed(
            (v, k) => createAction(this._wrapKey(k), v), actionMap,
        ) as ActionFuncMap<AA>;
        return new Model({...this._value, action});
    };

    reducer = (reducerMap : Reducer<S, Action<any>> | ReducerMap<S, A>) => {
        const reducer : Reducer<S, any> = isReducerMap(reducerMap) ?
            Identify.of(reducerMap)
                .map(toPairs).map(filter(([_, v]) => !!v))
                .map(map(([k, v]) => ({[this._wrapKey(k)] : v})))
                .map(x => mergeAll(x))
                .map(x => handleActions(x as any, this._value.initial))
                .join() :
            (s = this._value.initial, a) => reducerMap(s, a);
        return new Model({...this._value, reducer});
    };

    selector = <FF extends SelectorMap>(
        creator : (f : Selector<any, S>) => FF,
    ) => {
        return new Model({
            ...this._value, selector : creator(this._value.fetch),
        });
    };

    private _saga = (take : SagaTake) => (creator : SagaCreator<A>) => {
        const sagaMap = creator(this._value.action) as SagaMap<A>;
        const saga = [
            ...(this._value.saga || []),
            ...toPairs(sagaMap).map(([k, v]) => take(this._wrapKey(k), v)),
        ];
        return new Model({...this._value, saga})
    };

    every = this._saga(takeEvery);
    latest = this._saga(takeLatest);
    leading = this._saga(takeLeading);

}

export const model = Model.create;


export class Store {

    static of = (modelList : ModelValue[], persistConfig ?: PersistConfig) =>
        new Store(modelList, persistConfig);

    private modelList : ModelValue[];
    private middlewareList : Middleware[] = [];
    private sagaTask : ForkEffect[] = [];

    private compose : typeof compose;
    private persistConfig ?: PersistConfig;

    constructor (modelList : ModelValue[], persistConfig ?: PersistConfig) {
        this.modelList = modelList;
        this.persistConfig = persistConfig;

        this.compose = 'object' === typeof window
            && 'development' === process.env.NODE_ENV
            && (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
            || compose;
    }

    addMiddleware = (middleware : Middleware) => {
        this.middlewareList.push(middleware);
        return this;
    };

    addSagaTask = (task : ForkEffect) => {
        this.sagaTask.push(task);
        return this;
    };

    create = () => {
        const {modelList, sagaTask} = this;

        // 合并事件处理器
        const reducer = combineReducers(Identify.of(modelList)
            .map(map(x => ({[x.name] : x.reducer})))
            .map(x => mergeAll(x))
            .join());
        const persistedReducer : typeof reducer = this.persistConfig ?
            persistReducer(this.persistConfig, reducer) as any : reducer;

        // 合并高阶函数
        const saga = createSagaMiddleware();
        const enhancer = this.compose(
            applyMiddleware(saga, ...this.middlewareList));

        // 创建数据仓库并启动事件异步处理
        const store = createReduxStore(persistedReducer, enhancer);
        const persistor = persistStore(store);

        saga.run(function* () {
            yield all(modelList.map(x => x.saga).reduce(concat, sagaTask));
        });

        return {store, persistor};
    };

}


export const createStore = (
    modelList : ModelValue[],
    middlewareList : Middleware[] = [],
    sagaTask : ForkEffect[] = [],
) => {
    // 合并事件处理器
    const reducer = combineReducers(Identify.of(modelList)
        .map(map(x => ({[x.name] : x.reducer})))
        .map(x => mergeAll(x))
        .join());

    // 合并高阶函数
    const sagaMiddleware = createSagaMiddleware();
    const composeEnhancer = 'object' === typeof window
        && 'development' === process.env.NODE_ENV
        && (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
        || compose;
    const enhancer = composeEnhancer(applyMiddleware(
        sagaMiddleware, ...middlewareList,
    ));

    // 创建数据仓库并启动事件异步处理
    const store = createReduxStore(reducer, enhancer);
    sagaMiddleware.run(function* () {
        yield all(modelList.map(x => x.saga).reduce(concat, sagaTask));
    });

    return store;
};


export const bindActionMap = curry(bindActionCreators);
