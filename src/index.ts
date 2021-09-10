import {AEnumerable, AFrom} from "./async";

type Selector<T, M = any> = (value: T, index: number) => M;
type Matcher<T> = (item: T) => boolean;

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

  orderBy(selector: Selector<T>): Enumerable<T> {
    return new Ordered(this, selector);
  }

  chunk(size: number): Enumerable<Enumerable<T>> {
    return new Chunk(this, size);
  }

  orderByDesc(selector: Selector<T>): Enumerable<T> {
    return new OrderedDesc(this, selector);
  }

  map<M>(selector: Selector<T, M>): Enumerable<M> {
    return new Mapped(this, selector);
  }

  groupBy<M>(selector: Selector<T, M>): GroupedEnumerable<T, M> {
    return new GroupedEnumerable<T, M>(this, selector);
  }

  filter(matcher: Matcher<T>): Enumerable<T> {
    return new Filter(this, matcher);
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

  many<M>(selector: Selector<T, M[]>): Enumerable<M> {
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
    for (let item of this) {
      if (filter(item)) return item;
    }
    return undefined;
  }

  some(filter: Matcher<T>) {
    for (let item of this) {
      if (filter(item)) return true;
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

  forEach(handler: (element: T, index?: number) => void): void {
    let index = 0;
    for (let item of this) {
      handler(item, index++);
    }
  }

  except(iter: Iterable<T>): Enumerable<T> {
    return new Except(this, iter);
  }

  union(iter: Iterable<T>): Enumerable<T> {
    return new Union(this, iter);
  }

  distinct<M>(selector?: Selector<T, M>): Enumerable<T> {
    return new Distinct(this, selector);
  }

  intersect(iter: Iterable<T>): Enumerable<T> {
    return new Intersect(this, iter);
  }

  reverse(): Enumerable<T> {
    return new Reversed(this);
  }
}

class Group<V, K> extends Enumerable<V> {

  constructor(public key: K, private buffer: V[]) {
    super();
  }

  *[Symbol.iterator](): IterableIterator<V> {
    for (let item of this.buffer) {
      yield item;
    }
  }

}

class GroupedEnumerable<V, K> extends Enumerable<Group<V, K>> {

  constructor(private list: Enumerable<V>, private selector: Selector<V, K>) {
    super();
  }

  *[Symbol.iterator](): IterableIterator<Group<V, K>> {
    let last: K = null;
    let start = true;
    let buffer: V[] = [];
    let index = 0;
    for (let item of this.list.orderBy(this.selector)) {
      if (start) {
        start = false;
        last = this.selector(item, index++);
        buffer.push(item);
        continue;
      }
      let current = this.selector(item, index++);
      if (current !== last) {
        yield new Group<V, K>(last, buffer);
        buffer = [item];
        last = current;
        continue;
      }
      buffer.push(item);
    }
    if (buffer.length) {
      yield new Group<V, K>(last, buffer);
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

  constructor(private list: Iterable<T>, private other: Iterable<T>) {
    super();
  }

  *[Symbol.iterator]() {
    const hash = new Set<T>();
    for (let item of this.other) {
      hash.add(item);
    }
    for (let item of this.list) {
      if (!hash.has(item)) {
        yield item;
      }
    }
  }
}



class Union<T> extends Enumerable<T> {

  constructor(private list: Iterable<T>, private other: Iterable<T>) {
    super();
  }

  *[Symbol.iterator]() {
    const hash = new Set<T>();
    for (let item of this.list) {
      hash.add(item);
      yield item;
    }
    for (let item of this.other) {
      if (!hash.has(item)) {
        yield item;
      }
    }
  }
}

class Intersect<T> extends Enumerable<T> {

  constructor(private list: Iterable<T>, private other: Iterable<T>) {
    super();
  }

  *[Symbol.iterator]() {
    for (let item of this.list) {
      for (let o of this.other) {
        if (item == o) {
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

  constructor(list: Iterable<T>, matcher: Matcher<T>)
  constructor(list: Iterable<T>, size: number)
  constructor(protected list: Iterable<T>, arg: any) {
    super();
    if (typeof (arg) === 'number') {
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
      for (let item of this.list) {
        if (skip) {
          skip = this._matcher(item);
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
      let iter = -1;
      for (let item of this.list) {
        iter++;
        if (iter < this._size) {
          yield item;
        }

      }
    } else {
      for (let item of this.list) {
        if (!this._matcher(item)) {
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
    const selector = this.selector || ((x: any) => x)
    let index = 0;
    for (let item of this.list) {
      const value = selector(item, index++);
      if (hash.has(value)) continue;
      hash.add(value)
      yield value;
    }
  }
}

class Filter<T> extends Enumerable<T> {

  constructor(private list: Iterable<T>, private selector: Matcher<T>) {
    super();
  }

  *[Symbol.iterator]() {
    for (let item of this.list) {
      if (this.selector(item)) {
        yield item;
      }
    }
  }
}

class Many<T, M> extends Enumerable<M> {

  constructor(private list: Iterable<T>, private selector: Selector<T, M[]>) {
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
    })
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
    })
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
    let buff: T[] = []
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

function from(length: number): Enumerable<number>
function from(start: number, end: number): Enumerable<number>
function from(start: number, end: number, step: number): Enumerable<number>
function from<T>(arg: Promise<Iterable<T>>): AEnumerable<T>
function from<T>(arg: Iterable<T>): Enumerable<T>
function from<T>(arg: AsyncIterable<T>): AEnumerable<T>
function from<T>(...args: any[]): any {
  if (typeof args[0] === 'number') {
    if (args.length === 1) {
      return from(function*() {
        for (let i = 0; i < args[0]; i++) {
          yield i;
        }
      }());
    }
    if (args.length === 2) {
      if (args[0] < args[1]) {
        return from(function*() {
          for (let i = args[0]; i <= args[1]; i++) {
            yield i;
          }
        }());
      } else {
        return from(function*() {
          for (let i = args[0]; i >= args[1]; i--) {
            yield i;
          }
        }());
      }
    }
    if (args.length === 3) {
      if (args[0] < args[1]) {
        return from(function*() {
          for (let i = args[0]; i <= args[1]; i += args[2]) {
            yield i;
          }
        }());
      } else {
        return from(function*() {
          for (let i = args[0]; i >= args[1]; i -= args[2]) {
            yield i;
          }
        }());
      }
    }
  }
  const arg = args[0];
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
  return new From(arg as Iterable<T>);
}

export {
  from
}