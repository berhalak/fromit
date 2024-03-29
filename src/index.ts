import {AEnumerable, AFrom} from './async';

type Selector<T, M = any> = (value: T, index: number) => M;
type Matcher<T> = (item: T, index: number) => boolean;
type Property<T> = keyof T;
const identity: Matcher<any> = x => !!x;
type FlatElement<Arr, Depth extends number> = {
  done: Arr;
  recur: Arr extends Iterable<infer InnerArr>
    ? FlatElement<InnerArr, [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20][Depth]>
    : Arr;
}[Depth extends 0 ? 'done' : 'recur'];
type Comparator<T> = (a: T, b: T) => number;

abstract class Enumerable<T> implements Iterable<T> {
  abstract [Symbol.iterator](): IterableIterator<T>;

  async() {
    const self = this;
    async function* gen() {
      for (const i of self) {
        yield i;
      }
    }
    return from(gen());
  }

  iterator(): IterableIterator<T> {
    return this[Symbol.iterator]();
  }

  sort(): Enumerable<T>;
  sort(comparator: Comparator<T>): Enumerable<T>;
  sort(comparator?: Comparator<T>): Enumerable<T> {
    return from(
      (function* (list) {
        yield* [...list].sort(comparator);
      })(this)
    );
  }

  orderBy(property: Property<T>): Enumerable<T>;
  orderBy(selector: Selector<T>): Enumerable<T>;
  orderBy(selector: Selector<T> | Property<T>): Enumerable<T> {
    if (!selector) {
      selector = x => x;
    }
    if (typeof selector !== 'function') {
      const key = selector as Property<T>;
      selector = (item: T) => item[key];
    }
    return new Ordered(this, selector);
  }

  chunk(size: number): Enumerable<Enumerable<T>> {
    return new Chunk(this, size);
  }

  orderByDesc(selector: Selector<T>): Enumerable<T> {
    return new OrderedDesc(this, selector);
  }

  map<K extends keyof T>(selector: K): Enumerable<T[K]>;
  map<M>(selector: Selector<T, M>): Enumerable<M>;
  map(selector: any) {
    if (typeof selector !== 'function') {
      const key = selector as Property<T>;
      selector = (item: T) => item[key];
    }
    return new Mapped(this, selector) as any;
  }

  groupBy<M>(selector: Selector<T, M>): GroupedEnumerable<T, M> {
    return new GroupedEnumerable<T, M>(this, selector);
  }

  filter(matcher?: Matcher<T>): Enumerable<T> {
    return new Filter(this, matcher ?? identity);
  }

  skip(size: number): Enumerable<T> {
    return new Skip(this, size);
  }

  skipWhile(matcher: Matcher<T>): Enumerable<T> {
    return new Skip(this, matcher);
  }

  take(size: number): Enumerable<T> {
    return new Take(this, size);
  }

  takeWhile(matcher: Matcher<T>): Enumerable<T> {
    return new Take(this, matcher);
  }

  many<M>(selector: Selector<T, Iterable<M>>): Enumerable<M> {
    return new Many(this, selector);
  }

  first(def?: T): T {
    for (let item of this) {
      return item;
    }
    return def;
  }

  last(def?: T): T {
    let last = null;
    for (let item of this) {
      last = item;
    }
    if (def !== undefined) {
      return def;
    }
    return last;
  }

  find(filter: Matcher<T>) {
    let index = 0;
    for (let item of this) {
      if (filter(item, index++)) return item;
    }
    return undefined;
  }

  some(filter: Matcher<T>) {
    let index = 0;
    for (let item of this) {
      if (filter(item, index++)) return true;
    }
    return false;
  }

  any() {
    for (let item of this) {
      return true;
    }
    return false;
  }

  count() {
    let count = 0;
    for (let item of this) {
      count++;
    }
    return count;
  }

  includes(element: T, comparer: (a: T, b: T) => boolean = (a, b) => a == b): boolean {
    for (const item of this) {
      if (comparer(item, element)) return true;
    }
    return false;
  }

  sum(selector?: Selector<T, number>) {
    let sum = 0;
    let index = 0;
    for (let item of this) {
      if (selector) {
        sum += selector(item, index++);
      } else {
        sum += item as any as number;
      }
    }
    return sum;
  }

  toArray(): T[] {
    return [...this];
  }

  forEach(handler: (element: T, index: number) => void) {
    let index = 0;
    for (let item of this) {
      handler(item, index++);
    }
    return this;
  }

  except(iter: Iterable<T>): Enumerable<T>;
  except<M = T>(iter: Iterable<T>, selector: Selector<T, M>): Enumerable<T>;
  except<M = T>(iter: Iterable<T>, selector?: Selector<T, M>): Enumerable<T> {
    return new Except(this, iter, selector);
  }

  union(iter: Iterable<T>): Enumerable<T> {
    return this.except(iter).concat(iter);
  }

  distinct<M>(selector?: Selector<T, M>): Enumerable<T> {
    return new Distinct(this, selector);
  }

  intersect(iter: Iterable<T>, selector?: Selector<T, any>): Enumerable<T> {
    return new Intersect(this, iter, selector);
  }

  reverse(): Enumerable<T> {
    return new Reversed(this);
  }

  flatDeep() {
    return this.flat(20);
  }

  flat<K extends number = 1>(depth?: K): Enumerable<FlatElement<T, K>> {
    return new Flatten(this, depth);
  }

  zip<K>(other: Iterable<K>): Enumerable<[T, K]> {
    const self = this;
    function* gen() {
      const first = self[Symbol.iterator]();
      const second = other[Symbol.iterator]();
      while (true) {
        const a = first.next();
        const b = second.next();
        if (a.done || b.done) break;
        yield [a.value, b.value];
      }
    }
    return from(gen()) as any;
  }

  concat<K>(iter: Iterable<K>): Enumerable<T | K> {
    const self = this;
    function* gen() {
      yield* self;
      yield* iter;
    }
    return from(gen()) as any;
  }

  diff(iter: Iterable<T>): Enumerable<T> {
    return this.except(iter).concat(from(iter).except(this));
  }

  lookup<M>(selector: Selector<T, M>): Map<M, T[]> {
    const map = new Map();
    for(const g of this.groupBy(selector)) {
      map.set(g.key, g.toArray());
    }
    return map;
  }

  join(separator?: string): string;
  join<M = T>(iter: Iterable<M>, left?: Selector<T, any>, right?: Selector<M, any>): Enumerable<[T, M[]]>;
  join(...args: any[]): any {
    if (!args.length || typeof args[0] === 'string') return this.toArray().join(args[0] || '');
    else {
      const other = args[0] as Iterable<any>;
      const left = args[1] as Selector<T, any> || ((x: any) => x);
      const right = args[2] as Selector<T, any> || left;
      const self = this;
      function* gen() {
        const grouped = from(other).lookup(right);
        let index = -1;
        for(const mine of self) {
          const myKey = left(mine, ++index);
          if (!grouped.has(myKey)) continue;
          yield [mine, grouped.get(myKey)];
        }
      }
      return from(gen()) as any;
    }
  }

  reduce<R = T>(reducer: (previousValue: R, currentValue: T, currentIndex: number) => R, initial?: R): R {
    let index = -1;
    for (const item of this) {
      index++;
      if (initial === undefined && index === 0) {
        initial = item as any;
        continue;
      }
      initial = reducer(initial, item, index);
    }
    return initial;
  }
}

class Group<V, K> extends Enumerable<V> {
  constructor(public key: K, private buffer: Enumerable<V>) {
    super();
  }

  *[Symbol.iterator](): IterableIterator<V> {
    for (let item of this.buffer) {
      yield item;
    }
  }
}

function isIterable(obj: any) {
  return obj !== null && obj !== undefined && typeof obj !== 'string' && obj[Symbol.iterator];
}

class Flatten<T, K extends number> extends Enumerable<FlatElement<T, K>> {
  constructor(private list: Enumerable<T>, private depth?: K) {
    super();
    this.depth = depth ?? (1 as any);
  }

  *[Symbol.iterator](): IterableIterator<FlatElement<T, K>> {
    for (const item of this.list) {
      if (isIterable(item)) {
        if (this.depth === 0) {
          yield item as any;
        } else {
          const sub = new Flatten(item as any, this.depth - 1);
          yield* sub as any;
        }
      } else {
        yield item as any;
      }
    }
  }
}

class GroupedEnumerable<V, K> extends Enumerable<Group<V, K>> {
  constructor(private list: Enumerable<V>, private selector: Selector<V, K>) {
    super();
  }

  *[Symbol.iterator](): IterableIterator<Group<V, K>> {
    const seen = new Set<K>;
    let index = -1;
    for(const item of this.list) {
      index++;
      const key = this.selector(item, index);
      if (seen.has(key)) continue;
      seen.add(key);
      yield new Group(key,
        from(this.list).skip(index)
        .filter((item, sub) => this.selector(item, index + sub) === key)
      );
    }    
  }
}

class Reversed<T> extends Enumerable<T> {
  constructor(private list: Iterable<T>) {
    super();
  }

  *[Symbol.iterator]() {
    yield* [...this.list].reverse();
  }
}

class Except<T> extends Enumerable<T> {
  constructor(private list: Iterable<T>, private other: Iterable<T>, private selector: Selector<T, any>) {
    super();
  }

  *[Symbol.iterator]() {
    const hash = new Set<T>();
    let index = 0;
    let oIndex = 0;
    for (let item of this.other) {
      const key = this.selector ? this.selector(item, oIndex++) : item;
      hash.add(key);
    }
    for (let item of this.list) {
      const key = this.selector ? this.selector(item, index++) : item;
      if (!hash.has(key)) {
        yield item;
      }
    }
  }
}

class Intersect<T> extends Enumerable<T> {
  constructor(private list: Iterable<T>, private other: Iterable<T>, private selector?: Selector<T>) {
    super();
    this.selector = selector ?? ((x: any) => x);
  }

  *[Symbol.iterator]() {
    let itemIndex = -1;
    for (let item of this.list) {
      itemIndex++;
      let otherIndex = -1;
      for (let o of this.other) {
        otherIndex++;
        if (this.selector(item, itemIndex) == this.selector(o, otherIndex)) {
          yield item;
          break;
        }
      }
    }
  }
}

class Skip<T> extends Enumerable<T> {
  protected _matcher: Matcher<T>;
  protected _size?: number;

  constructor(list: Iterable<T>, matcher: Matcher<T>);
  constructor(list: Iterable<T>, size: number);
  constructor(protected list: Iterable<T>, arg: any) {
    super();
    if (typeof arg === 'number') {
      this._size = arg;
    } else {
      this._matcher = arg;
    }
  }

  *[Symbol.iterator]() {
    if (this._size !== undefined) {
      let iter = -1;
      for (let item of this.list) {
        iter++;
        if (iter >= this._size) {
          yield item;
        }
      }
    } else {
      let skip = true;
      let index = -1;
      for (let item of this.list) {
        index++;
        if (skip) {
          skip = this._matcher(item, index);
        }
        if (!skip) {
          yield item;
        }
      }
    }
  }
}

class Take<T> extends Skip<T> {
  *[Symbol.iterator]() {
    if (this._size !== undefined) {
      let iter = 0;
      if (this._size <= 0) { return; }
      for (let item of this.list) {
        iter++;
        yield item;
        if (iter >= this._size) {
          break;
        }
      }
    } else {
      let index = -1;
      for (let item of this.list) {
        index++;
        if (!this._matcher(item, index)) {
          return;
        }
        yield item;
      }
    }
  }
}

class Distinct<T, M> extends Enumerable<T> {
  constructor(private list: Iterable<T>, private selector?: Selector<T, M>) {
    super();
  }

  *[Symbol.iterator]() {
    const hash = new Set();
    const selector = this.selector || ((x: any) => x);
    let index = 0;
    for (let item of this.list) {
      const value = selector(item, index++);
      if (hash.has(value)) continue;
      hash.add(value);
      yield item;
    }
  }
}

class Filter<T> extends Enumerable<T> {
  constructor(private list: Iterable<T>, private selector: Matcher<T>) {
    super();
  }

  *[Symbol.iterator]() {
    let index = 0;
    for (let item of this.list) {
      if (this.selector(item, index++)) {
        yield item;
      }
    }
  }
}

class Many<T, M> extends Enumerable<M> {
  constructor(private list: Iterable<T>, private selector: Selector<T, Iterable<M>>) {
    super();
  }

  *[Symbol.iterator]() {
    let index = 0;
    for (let item of this.list) {
      const sub = this.selector(item, index++);
      for (let subItem of sub) {
        yield subItem;
      }
    }
  }
}

class Ordered<T> extends Enumerable<T> {
  constructor(private list: Iterable<T>, private selector: Selector<T, any>) {
    super();
  }

  *[Symbol.iterator]() {
    let all = [...this.list];
    all.sort((a, b) => {
      const valA = this.selector(a, -1);
      const valB = this.selector(b, -1);
      if (valA < valB) return -1;
      if (valA > valB) return 1;
      return 0;
    });
    for (let item of all) {
      yield item;
    }
  }
}

class OrderedDesc<T> extends Enumerable<T> {
  constructor(private list: Iterable<T>, private selector: Selector<T, any>) {
    super();
  }

  *[Symbol.iterator]() {
    let all = [...this.list];
    all.sort((a, b) => {
      const valA = this.selector(a, -1);
      const valB = this.selector(b, -1);
      if (valA < valB) return 1;
      if (valA > valB) return -1;
      return 0;
    });
    for (let item of all) {
      yield item;
    }
  }
}

class Chunk<T> extends Enumerable<Enumerable<T>> {
  constructor(private list: Iterable<T>, private size: number) {
    super();
  }

  *[Symbol.iterator]() {
    let buff: T[] = [];
    for (const item of this.list) {
      if (buff.length === this.size) {
        yield from(buff);
        buff = [item];
      } else {
        buff.push(item);
      }
    }
    if (buff.length) {
      yield from(buff);
    }
  }
}

class Mapped<T, M> extends Enumerable<M> {
  constructor(private list: Iterable<T>, private selector: Selector<T, M>) {
    super();
  }

  *[Symbol.iterator]() {
    let index = 0;
    for (let item of this.list) {
      yield this.selector(item, index++);
    }
  }
}

class From<T> extends Enumerable<T> {
  constructor(private list: Iterable<T>) {
    super();
  }

  *[Symbol.iterator]() {
    for (let item of this.list) {
      yield item;
    }
  }
}

/**
 * Range from 0 to length - 1
 */
function from(length: number): Enumerable<number>;
function from(start: number, end: number): Enumerable<number>;
function from(start: number, end: number, step: number): Enumerable<number>;
function from<T>(arg: Promise<Iterable<T>>): AEnumerable<T>;
function from<T>(arg: Iterable<T>): Enumerable<T>;
function from<T>(arg: AsyncIterable<T>): AEnumerable<T>;
function from<T>(...args: any[]): any {
  if (typeof args[0] === 'number') {
    if (args.length === 1) {
      return from(
        (function* () {
          for (let i = 0; i < args[0]; i++) {
            yield i;
          }
        })()
      );
    }
    if (args.length === 2) {
      if (args[0] < args[1]) {
        return from(
          (function* () {
            for (let i = args[0]; i <= args[1]; i++) {
              yield i;
            }
          })()
        );
      } else {
        return from(
          (function* () {
            for (let i = args[0]; i >= args[1]; i--) {
              yield i;
            }
          })()
        );
      }
    }
    if (args.length === 3) {
      if (args[0] < args[1]) {
        return from(
          (function* () {
            for (let i = args[0]; i <= args[1]; i += args[2]) {
              yield i;
            }
          })()
        );
      } else {
        return from(
          (function* () {
            for (let i = args[0]; i >= args[1]; i -= args[2]) {
              yield i;
            }
          })()
        );
      }
    }
  }
  const arg = args[0];
  if (typeof arg === 'object') {
    if (Symbol.asyncIterator in arg) {
      return new AFrom(arg as AsyncIterable<T>);
    }
    if (typeof arg.then == 'function') {
      async function* generate() {
        const result = await arg;
        yield* result;
      }
      return new AFrom(generate());
    }
  }
  if (arg?.[Symbol.iterator]) {
    return new From(arg as Iterable<T>);
  } else {
    throw new Error(`Argument is not iterable`);
  }
}

export {from};
