
type Selector<T, M> = (item: T) => M;
type Filter<T> = (item: T) => boolean;

export interface Iter<T> {
    [Symbol.iterator](): IterableIterator<T>;
}

export abstract class Iterable<T> implements Iter<T> {

    abstract [Symbol.iterator]();

    map<M>(selector: Selector<T, M>): Iterable<M> {
        return new Mapped(this, selector);
    }

    where(filter: Filter<T>): Iterable<T> {
        return new Where(this, filter);
    }

    many<M>(selector: Selector<T, M[]>): Iterable<M> {
        return new Many(this, selector);
    }

    first() {
        for (let item of this) {
            return item;
        }
    }

    last() {
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


    except(iter: Iter<T>): Iterable<T> {
        return new Except(this, iter);
    }

    union(iter: Iter<T>): Iterable<T> {
        return new Union(this, iter);

    }

    intersect(iter: Iter<T>): Iterable<T> {
        return new Intersect(this, iter);
    }
}

class Except<T> extends Iterable<T> {

    constructor(private list: Iter<T>, private other: Iter<T>) {
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



class Union<T> extends Iterable<T> {

    constructor(private list: Iter<T>, private other: Iter<T>) {
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

class Intersect<T> extends Iterable<T> {

    constructor(private list: Iter<T>, private other: Iter<T>) {
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

class Where<T> extends Iterable<T> {

    constructor(private list: Iter<T>, private filter: Filter<T>) {
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

class Many<T, M> extends Iterable<M> {

    constructor(private list: Iter<T>, private selector: Selector<T, M[]>) {
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



class Mapped<T, M> extends Iterable<M> {

    constructor(private list: Iter<T>, private selector: Selector<T, M>) {
        super();
    }

    *[Symbol.iterator]() {
        for (let item of this.list) {
            yield this.selector(item);
        }
    }
}

class From<T> extends Iterable<T> {

    constructor(private list: T[]) {
        super();
    }

    *[Symbol.iterator]() {
        for (let item of this.list) {
            yield item;
        }
    }
}


function from<T>(arg: Iter<T>): Iterable<T>
function from<T>(arg: T[]): Iterable<T>
function from<T>(arg: any): Iterable<T> {
    return new From(arg);
}

export {
    from
}