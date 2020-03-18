
type Selector<T, M> = (item: T) => M;
type Filter<T> = (item: T) => boolean;

abstract class Enumerable<T> implements Iterable<T> {

    abstract [Symbol.iterator](): IterableIterator<T>;

    iterator(): IterableIterator<T> {
        return this[Symbol.iterator]();
    }

    map<M>(selector: Selector<T, M>): Enumerable<M> {
        return new Mapped(this, selector);
    }

    where(filter: Filter<T>): Enumerable<T> {
        return new Where(this, filter);
    }

    many<M>(selector: Selector<T, M[]>): Enumerable<M> {
        return new Many(this, selector);
    }

    first(): T {
        for (let item of this) {
            return item;
        }
    }

    last(): T {
        let last = null;
        for (let item of this) {
            last = item;
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

    sum() {
        let sum = 0;
        for (let item of this) {
            sum += item as any as number;
        }
        return sum;
    }

    toArray(): T[] {
        return [...this];
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