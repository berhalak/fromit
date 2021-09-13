
type Selector<T, M = any> = (item: T, index: number) => PromiseLike<M> | M;
type Matcher<T> = (item: T) => PromiseLike<boolean> | boolean
const identity: Matcher<any> = x => !!x;

export abstract class AEnumerable<T> implements AsyncIterable<T> {

  abstract [Symbol.asyncIterator](): AsyncIterator<T>;

  iterator(): AsyncIterator<T> {
    return this[Symbol.asyncIterator]();
  }

  async includes(element: T, comparer: (a: T, b: T) => boolean = (a, b) => a == b) {
    for await (const item of this) {
      if (comparer(item, element)) return true;
    }
    return false;
  }

  orderBy(selector: Selector<T>): AEnumerable<T> {
    return new Ordered(this, selector);
  }

  orderByDesc(selector: Selector<T>): AEnumerable<T> {
    return new OrderedDesc(this, selector);
  }

  map<M>(selector: Selector<T, M>): AEnumerable<M> {
    return new Mapped(this, selector);
  }

  groupBy<M>(selector: Selector<T, M>): GroupedEnumerable<T, M> {
    return new GroupedEnumerable<T, M>(this, selector);
  }

  filter(matcher?: Matcher<T>): AEnumerable<T> {
    return new Filter(this, matcher ?? identity);
  }

  skip(size: number): AEnumerable<T> {
    return new Skip(this, size);
  }

  skipWhile(matcher: Matcher<T>): AEnumerable<T> {
    return new Skip(this, matcher);
  }

  take(size: number): AEnumerable<T> {
    return new Take(this, size);
  }

  takeWhile(matcher: Matcher<T>): AEnumerable<T> {
    return new Take(this, matcher);
  }

  many<M>(selector: Selector<T, M[]>): AEnumerable<M> {
    return new Many(this, selector);
  }

  async first(def?: T) {
    for await (let item of this) {
      return item;
    }
    return def;
  }

  async last(def?: T) {
    let last = null;
    for await (let item of this) {
      last = item;
    }
    if (def !== undefined) {
      return def;
    }
    return last;
  }

  async find(filter: Matcher<T>) {
    for await (let item of this) {
      if (filter(item)) return item;
    }
    return undefined;
  }

  async some(filter: Matcher<T>) {
    for await (let item of this) {
      if (filter(item)) return true;
    }
    return false;
  }

  async any() {
    for await (let item of this) {
      return true;
    }
    return false;
  }

  async count() {
    let count = 0;
    for await (let item of this) {
      count++;
    }
    return count;
  }

  async sum(selector?: Selector<T, number>) {
    let sum = 0;
    let index = 0;
    for await (let item of this) {
      if (selector) {
        sum += await selector(item, index++);
      } else {
        sum += item as any as number;
      }
    }
    return sum;
  }

  async toArray(): Promise<T[]> {
    const result = [];
    for await (const i of this) result.push(i)
    return result;
  }

  async forEach(handler: (element: T, index?: number) => any): Promise<void> {
    let index = 0;
    for await (let item of this) {
      await handler(item, index++);
    }
  }

  except(iter: AsyncIterable<T>): AEnumerable<T> {
    return new Except(this, iter);
  }

  union(iter: AsyncIterable<T>): AEnumerable<T> {
    return new Union(this, iter);

  }

  intersect(iter: AsyncIterable<T>): AEnumerable<T> {
    return new Intersect(this, iter);
  }

  chunk(size:number): AEnumerable<AEnumerable<T>> {
    return new Chunk(this, size);
  }
}


class Chunk<T> extends AEnumerable<AEnumerable<T>> {

  constructor(private list: AsyncIterable<T>, private size: number) {
    super();
  }

  async *[Symbol.asyncIterator]() {
    let buff: T[] = []
    for await (const item of this.list) {
      if (buff.length === this.size) {
        yield new AList(buff);
        buff = [item];
      } else {
        buff.push(item);
      }
    }
    if (buff.length) {
      yield new AList(buff);
    }
  }
}

class Group<V, K> extends AEnumerable<V> {

  constructor(public key: K, private buffer: V[]) {
    super();
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<V> {
    for (let item of this.buffer) {
      yield item;
    }
  }

}

class GroupedEnumerable<V, K> extends AEnumerable<Group<V, K>> {

  constructor(private list: AEnumerable<V>, private selector: Selector<V, K>) {
    super();
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<Group<V, K>> {
    let last: K = null;
    let start = true;
    let buffer: V[] = [];
    let index = 0;
    for await (let item of this.list.orderBy(this.selector)) {
      if (start) {
        start = false;
        last = await this.selector(item, index++);
        buffer.push(item);
        continue;
      }
      let current = await this.selector(item, index++);
      if (current != last) {
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

class Except<T> extends AEnumerable<T> {

  constructor(private list: AsyncIterable<T>, private other: AsyncIterable<T>) {
    super();
  }

  async *[Symbol.asyncIterator]() {
    const hash = new Set<T>();
    for await (let item of this.other) {
      hash.add(item);
    }
    for await (let item of this.list) {
      if (!hash.has(item)) {
        yield item;
      }
    }
  }
}



class Union<T> extends AEnumerable<T> {

  constructor(private list: AsyncIterable<T>, private other: AsyncIterable<T>) {
    super();
  }

  async *[Symbol.asyncIterator]() {
    const hash = new Set<T>();
    for await (let item of this.list) {
      hash.add(item);
      yield item;
    }
    for await (let item of this.other) {
      if (!hash.has(item)) {
        yield item;
      }
    }
  }
}

class Intersect<T> extends AEnumerable<T> {

  constructor(private list: AsyncIterable<T>, private other: AsyncIterable<T>) {
    super();
  }

  async *[Symbol.asyncIterator]() {
    for await (let item of this.list) {
      for await (let o of this.other) {
        if (item == o) {
          yield item;
          break;
        }
      }
    }
  }
}

class Reversed<T> extends AEnumerable<T> {

  constructor(private list: AsyncIterable<T>) {
    super();
  }

  async *[Symbol.asyncIterator]() {
    const list = (await new AFrom(this.list).toArray()).reverse();
    yield *list;
  }
}


class Skip<T> extends AEnumerable<T> {

  protected _matcher: Matcher<T>;
  protected _size?: number;

  constructor(list: AsyncIterable<T>, matcher: Matcher<T>)
  constructor(list: AsyncIterable<T>, size: number)
  constructor(protected list: AsyncIterable<T>, arg: any) {
    super();
    if (typeof (arg) === 'number') {
      this._size = arg;
    } else {
      this._matcher = arg;
    }
  }

  async *[Symbol.asyncIterator]() {
    if (this._size !== undefined) {
      let iter = -1;
      for await (let item of this.list) {
        iter++;
        if (iter >= this._size) {
          yield item;
        }

      }
    } else {
      let skip = true;
      for await (let item of this.list) {
        if (skip) {
          skip = await this._matcher(item);
        }
        if (!skip) {
          yield item;
        }
      }
    }
  }
}

class Take<T> extends Skip<T> {
  async *[Symbol.asyncIterator]() {
    if (this._size !== undefined) {
      let iter = -1;
      for await (let item of this.list) {
        iter++;
        if (iter < this._size) {
          yield item;
        }

      }
    } else {
      for await (let item of this.list) {
        if (!(await this._matcher(item))) {
          return;
        }
        yield item;
      }
    }
  }
}

class Filter<T> extends AEnumerable<T> {

  constructor(private list: AsyncIterable<T>, private selector: Matcher<T>) {
    super();
  }

  async *[Symbol.asyncIterator]() {
    for await (let item of this.list) {
      if (this.selector(item)) {
        yield item;
      }
    }
  }
}

class Many<T, M> extends AEnumerable<M> {

  constructor(private list: AsyncIterable<T>, private selector: Selector<T, M[]>) {
    super();
  }

  async *[Symbol.asyncIterator]() {
    let index = 0;
    for await (let item of this.list) {
      const sub = await this.selector(item, index++);
      for (let subItem of sub) {
        yield subItem;
      }
    }
  }
}

class Ordered<T> extends AEnumerable<T> {

  constructor(private list: AsyncIterable<T>, private selector: Selector<T, any>) {
    super();
  }

  async *[Symbol.asyncIterator]() {
    let all = [];
    for await (const i of this.list) all.push(i);
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

class OrderedDesc<T> extends AEnumerable<T> {

  constructor(private list: AsyncIterable<T>, private selector: Selector<T>) {
    super();
  }

  async *[Symbol.asyncIterator]() {
    let all = [];
    for await (const i of this.list) all.push(i);
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

class Mapped<T, M> extends AEnumerable<M> {

  constructor(private list: AsyncIterable<T>, private selector: Selector<T, M>) {
    super();
  }

  async *[Symbol.asyncIterator]() {
    let index = 0;
    for await (let item of this.list) {
      yield this.selector(item, index++);
    }
  }
}

class AList<T> extends AEnumerable<T> {

  constructor(private list: T[]) {
    super();
  }

  async *[Symbol.asyncIterator]() {
    for (let item of this.list) {
      yield item;
    }
  }
}

export class AFrom<T> extends AEnumerable<T> {

  constructor(private list: AsyncIterable<T>) {
    super();
  }

  async *[Symbol.asyncIterator]() {
    for await (let item of this.list) {
      yield item;
    }
  }
}
