

import {
    Middleware, AnyAction, Dispatch,
    combineReducers, applyMiddleware, compose,
    createStore as createReduxStore, bindActionCreators,
} from 'redux';
import { Action, createAction, handleActions } from 'redux-actions';
import createSagaMiddleware from 'redux-saga';
import {
    ForkEffect, takeEvery, takeLatest, takeLeading, all,
} from 'redux-saga/effects';
import { Selector } from 'reselect';


/**
 * 定义恒等函数与恒等函数生成器
 */
export const identity = <T>(x : T) => x;
export const identityFunc = <T>() => (x : T) => x;

// 获得函数类型的参数类型
type ArgsType<T> = T extends (...args : infer P) => any ? P : any[];


/**
 * 定义事件结构相关类型
 */
type ActionFactory<P extends any[], R> = (...args : P) => R;

type ActionMap = { [type : string] : ActionFactory<any[], any>; };

type ActionCreator<P extends any[], R> = (...args : P) => Action<R>;

type ActionCreatorMap<M extends ActionMap> = {
    [k in keyof M] : ActionCreator<ArgsType<M[k]>, ReturnType<M[k]>>;
};


/**
 * 定义事件处理函数相关类型
 */
export type Reducer<S, A> = (state : S, action : Action<A>) => S;

export type ReducerMap<S, M extends ActionMap> = {
    [k in keyof M] ?: Reducer<S, ReturnType<M[k]>>;
};

const isReducer = <S, M extends ActionMap>(
    reducer : ReducerMap<S, M> | Reducer<S, any>,
) : reducer is Reducer<S, any> => reducer instanceof Function;


/**
 * 定义事件异步处理函数相关类型
 */
type SagaTake = (pattern : string, worker : SagaFunc<any>) => ForkEffect;

type SagaFunc<A> = (action : Action<A>) => any;

type SagaMap<M extends ActionMap> = {
    [k in keyof M] : SagaFunc<ReturnType<M[k]>>;
};

export type SagaCreator<M extends ActionMap> =
    (action : ActionCreatorMap<M>) => Partial<SagaMap<M>>;


/**
 * 定义查询器相关类型
 */
export type Fetch<S> = Selector<any, S>;

type SelectorMap = { [k : string] : Selector<any, any>; };

type SelectorCreator<S, F extends SelectorMap> = (fetch : Fetch<S>) => F;


/**
 * 事件名称包裹函数
 * string => string => string
 */
const keyWraper = (name : string) => (key : string) => `${name}/${key}`;


/**
 * 定义模型对象接口与类
 */
interface ModelValue<
    S = any, M extends ActionMap = ActionMap,
    F extends SelectorMap = SelectorMap,
> {
    name : string;
    initialState : S;
    action : ActionCreatorMap<M>;
    fetch : Fetch<S>,
    selector : F;
    reducer ?: Reducer<S, any>;
    sagaTask ?: ForkEffect[];
};

export class Model<S, M extends ActionMap, F extends SelectorMap> {

    private _value : ModelValue<S, M, F>;
    private _keyWrap : (k : string) => string;

    constructor (value : ModelValue<S, M, F>) {
        this._value = value;
        this._keyWrap = keyWraper(this._value.name);
    }

    static of = <S, M extends ActionMap, F extends SelectorMap>(
        value : ModelValue<S, M, F>,
    ) => new Model(value);

    static create = <S, M extends ActionMap, F extends SelectorMap>(
        name : string, initialState : S, actionMap : M,
        selectorCreator ?: SelectorCreator<S, F>,
    ) => {
        // 构造事件生成器
        const keyWrap = keyWraper(name);
        const action = Object.entries(actionMap)
            .reduce((data, [key, value]) => {
                data[key] = createAction(keyWrap(key), value); return data;
            }, {} as ActionCreatorMap<M>);

        // 构造查询器
        const fetch = (s : any) => s[name] as S;
        const selector = selectorCreator ? selectorCreator(fetch) : {} as F;

        return Model.of<S, typeof actionMap, F>({
            name, initialState, action, fetch , selector,
        });
    };

    value = () => this._value;

    reducer = (reducerMap : ReducerMap<S, M> | Reducer<S, any>) => {
        const reducer : Reducer<S, any> =
            isReducer(reducerMap) ?
                (s = this._value.initialState, a) => reducerMap(s, a) :
                handleActions(
                    Object.entries(reducerMap).reduce((data, [key, value]) => {
                        data[this._keyWrap(key)] = value;
                        return data;
                    }, {} as any), this._value.initialState,
                );
        return Model.of<S, M, F>({ ...this._value, reducer });
    };

    private _saga = (take : SagaTake) => (sagaCreator : SagaCreator<M>) => {
        const sagaMap = sagaCreator(this._value.action) as SagaMap<M>;
        const sagaTask = Object.entries(sagaMap)
            .map(([key, saga]) => take(this._keyWrap(key), saga));
        return Model.of<S, M, F>({ ...this._value, sagaTask : [
            ...(this._value.sagaTask || []), ...sagaTask,
        ] });
    };

    every = this._saga(takeEvery);
    latest = this._saga(takeLatest);
    leading = this._saga(takeLeading);

};

export const createStore = (
    modelList : ModelValue<any, any>[],
    middlewareList : Middleware[] = [],
    sagaTask : ForkEffect[] = [],
) => {
    // 合并事件处理器
    const reducer = combineReducers(modelList.reduce((data, model) => {
        model.reducer && (data[model.name] = model.reducer);
        return data;
    }, {} as any));

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
    sagaMiddleware.run(function* () { yield all([
        ...sagaTask, ...modelList.reduce((data, item) => {
            return item.sagaTask ? [...data, ...item.sagaTask] : data;
        }, [] as any),
    ]); });

    return store;
};

// 封装组件绑定事件生成器的函数
export const bindActionMap = <M extends ActionCreatorMap<ActionMap>>(
    action : M,
) => (dispatch : Dispatch<AnyAction>) => bindActionCreators(action, dispatch);
