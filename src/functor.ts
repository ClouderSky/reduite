

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


export class Maybe<T = any> {

    static of = <T>(x : T) => new Maybe<T>(x);

    __value : T;

    constructor (x : T) {
        this.__value = x;
    }

    inspect = () => `Maybe(${inspect(this.__value)})`;

    isNothing = () => null === this.__value || undefined === this.__value;

    map = <R>(f : Mapper<NonNullable<T>, R>)
            : Maybe<T extends null | undefined ? R | null : R> =>
        this.isNothing() ? this as any : Maybe.of(f(this.__value as NonNullable<T>));

    chain = <R>(f : Mapper<NonNullable<T>, Maybe<R>>)
            : Maybe<T extends null | undefined ? R | null : R> =>
        this.isNothing() ? this as any : this.map(f).join();

    join = () => this.__value;

}

export const maybe = <T, R>(
    x : any, f : Mapper<NonNullable<T>, R>, m : Maybe<T>,
) => m.isNothing() ? x : f(m.__value as NonNullable<T>);


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

    chain = <R>(f : (x : T) => IO<R>) => new IO(() => this.map(f).join().join());

    ap = <P>(a : IO<P>) : T extends (x : P) => infer R ? IO<R> : IO<unknown> =>
        (this.chain as any)(a.map);

}
