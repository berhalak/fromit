
type Selector<T, M> = (item: T) => M;
type Filter<T> = (item: T) => boolean;

abstract class Enumerable<T> implements Iterable<T> {

    abstract [Symbol.iterator](): IterableIterator<T>;

    iterator(): IterableIterator<T> {
        return this[Symbol.iterator]();
    }

    orderBy(selector: (arg: T) => any): Enumerable<T> {
        return new Ordered(this, selector);
    }

    orderByDesc(selector: (arg: T) => any): Enumerable<T> {
        return new OrderedDesc(this, selector);
    }

    map<M>(selector: Selector<T, M>): Enumerable<M> {
        return new Mapped(this, selector);
    }

    groupBy<M>(selector: Selector<T, M>): GroupedEnumerable<T, M> {
        return new GroupedEnumerable<T, M>(this, selector);
    }

    where(filter: Filter<T>): Enumerable<T> {
        return new Where(this, filter);
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

    sum(selector?: Selector<T, number>) {
        let sum = 0;
        for (let item of this) {
            if (selector) {
                sum += selector(item);
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

    intersect(iter: Iterable<T>): Enumerable<T> {
        return new Intersect(this, iter);
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
        // we expect list to be ordered - for perfomence reason
        // as this should be as fast as possible
        let last: K = null;
        let has = false;
        let buffer: V[] = [];
        for (let item of this.list) {
            has = true;
            if (last === null) {
                last = this.selector(item);
                buffer.push(item);
                continue;
            }
            let current = this.selector(item);
            if (current != last) {
                yield new Group<V, K>(last, buffer);
                buffer = [item];
                last = current;
                continue;
            }
            buffer.push(item);
        }
        if (has) {
            yield new Group<V, K>(last, buffer);
        }
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

class Where<T> extends Enumerable<T> {

    constructor(private list: Iterable<T>, private filter: Filter<T>) {
        super();
    }

    *[Symbol.iterator]() {
        for (let item of this.list) {
            if (this.filter(item)) {
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
        for (let item of this.list) {
            const sub = this.selector(item);
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
            const valA = this.selector(a);
            const valB = this.selector(b);
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
            const valA = this.selector(a);
            const valB = this.selector(b);
            if (valA < valB) return 1;
            if (valA > valB) return -1;
            return 0;
        })
        for (let item of all) {
            yield item;
        }
    }
}



class Mapped<T, M> extends Enumerable<M> {

    constructor(private list: Iterable<T>, private selector: Selector<T, M>) {
        super();
    }

    *[Symbol.iterator]() {
        for (let item of this.list) {
            yield this.selector(item);
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


function from<T>(arg: Iterable<T>): Enumerable<T> {
    return new From(arg);
}

export {
    from
}