# Reduite

一个轻量的、函数式的Redux辅助库。

(A lightweight functional Redux helper.)

完全基于Typescript设计并实现的，充分考虑代码提示与类型检查。

(Design and implement by Typescript, for better autocomplete and type hint.)

### 安装

使用npm：

```shell
npm install --save reduite
```

或者使用yarn：

```shell
yarn add reduite
```

### 用例

创建一个计数器模型：(A counter model example :)

```typescript
import {model, createStore} from 'reduite';
import {createSelector} from 'reselect';
import {select, put} from 'redux-saga/effects';


void function () {

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

    const store = createStore([counter]);
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
```
