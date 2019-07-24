

import * as _ from 'ramda';


const inspect = (x : any) => x && x.inspect ? x.inspect() : x;


type Mapper<P = any, R = any> = (x : P) => R;

export class Identify<T = any> {

    static of = <T>(x : T) => new Identify<T>(x);

    __value : T;

    constructor (x : T) {
        this.__value = x;
    }

    inspect = () => `Identify(${inspect(this.__value)})`;

    map = <R>(f : Mapper<T, R>) => Identify.of(f(this.__value));

    chain = <R>(f : (x : T) => R) => this.map(f).__value;

    join = () => this.__value;

}


export class Left<T = any> {

    static of = <T>(x : T) => new Left(x);

    __value : T;

    constructor (x : T) {
        this.__value = x;
    }

    inspect = () => `Left(${inspect(this.__value)})`;

    map = () => this;
    join = () => this;
    chain = () => this;
    ap = () => this;
    maybe = () => this;

}

export class Right<T = any> {

    static of = <T>(x : T) => new Right(x);

    __value : T;

    constructor (x : T) {
        this.__value = x;
    }

    inspect = () => `Right(${inspect(this.__value)})`;

    map = <R>(f : (x : T) => R) => Right.of(f(this.__value));

    join = () => this.__value;

    chain = <R>(f : (x : T) => R) => f(this.__value);

    ap = <P>(a : Right<P>)
            : T extends (x : P) => infer R ? Right<R> : Right<unknown> =>
        (this.chain as any)((f : any) => a.map(f));

    maybe = <E>(cond : (x : T) => boolean, error : E) =>
        cond(this.__value) ? this : Left.of(error);

}

export type Either<L, R> = Right<R> | Left<L>;

export const either = <L, F, R, G>(
    f : (x : L) => F, g : (x : R) => G, e : Either<L, R>,
) => e instanceof Left ? f(e.__value) : g(e.__value);


export class IO<T = any> {

    static of = <T>(x : T) => new IO(() => x);

    unsafePerformIO : () => T;

    constructor (f : () => T) {
        this.unsafePerformIO = f;
    }

    inspect = () => `IO(${inspect(this.unsafePerformIO)})`;

    map = <R>(f : (x : T) => R) => new IO(_.compose(f, this.unsafePerformIO));

    join = () => this.unsafePerformIO();

    chain = <R>(f : (x : T) => IO<R>) => this.map(f).join();

    ap = <P>(a : IO<P>) : T extends (x : P) => infer R ? IO<R> : IO<unknown> =>
        (this.chain as any)(a.map);

}
