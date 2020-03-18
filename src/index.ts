
type Selector<T, M> = (item: T) => M;
type Filter<T> = (item: T) => boolean;

export abstract class Iter<T> {
    abstract iter(): Generator<T>;

    map<M>(selector: Selector<T, M>): Iter<M> {
        return new Mapped(this, selector);
    }

    where(filter: Filter<T>): Iter<T> {
        return new Where(this, filter);
    }

    many<M>(selector: Selector<T, M[]>): Iter<M> {
        return new Many(this, selector);
    }

    first() {
        for (let item of this.iter()) {
            return item;
        }
    }

    last() {
        let last = null;
        for (let item of this.iter()) {
            last = item;
        }
        return last;
    }

    any() {
        for (let item of this.iter()) {
            return true;
        }
        return false;
    }

    count() {
        let count = 0;
        for (let item of this.iter()) {
            count++;
        }
        return count;
    }

    sum() {
        let sum = 0;
        for (let item of this.iter()) {
            sum += item as any as number;
        }
        return sum;
    }

    toArray(): T[] {
        return [...this.iter()];
    }


    except(iter: T[]): Iter<T>
    except(iter: Iter<T>): Iter<T>
    except(any: any): Iter<T> {
        if (any instanceof Iter) {
            return new Except(this, any);
        } else {
            return new Except(this, from(any));
        }
    }

    union(iter: T[]): Iter<T>
    union(iter: Iter<T>): Iter<T>
    union(any: any): Iter<T> {
        if (any instanceof Iter) {
            return new Union(this, any);
        } else {
            return new Union(this, from(any));
        }
    }

    intersect(iter: T[]): Iter<T>
    intersect(iter: Iter<T>): Iter<T>
    intersect(any: any): Iter<T> {
        if (any instanceof Iter) {
            return new Intersect(this, any);
        } else {
            return new Intersect(this, from(any));
        }
    }
}

class Except<T> extends Iter<T> {

    constructor(private list: Iter<T>, private other: Iter<T>) {
        super();
    }

    *iter() {
        const hash = new Set<T>();
        for (let item of this.other.iter()) {
            hash.add(item);
        }
        for (let item of this.list.iter()) {
            if (!hash.has(item)) {
                yield item;
            }
        }
    }
}



class Union<T> extends Iter<T> {

    constructor(private list: Iter<T>, private other: Iter<T>) {
        super();
    }

    *iter() {
        const hash = new Set<T>();
        for (let item of this.list.iter()) {
            hash.add(item);
            yield item;
        }
        for (let item of this.other.iter()) {
            if (!hash.has(item)) {
                yield item;
            }
        }
    }
}

class Intersect<T> extends Iter<T> {

    constructor(private list: Iter<T>, private other: Iter<T>) {
        super();
    }

    *iter() {
        for (let item of this.list.iter()) {
            for (let o of this.other.iter()) {
                if (item == o) {
                    yield item;
                    break;
                }
            }
        }
    }
}

class Where<T> extends Iter<T> {

    constructor(private list: Iter<T>, private filter: Filter<T>) {
        super();
    }

    *iter() {
        for (let item of this.list.iter()) {
            if (this.filter(item)) {
                yield item;
            }
        }
    }
}

class Many<T, M> extends Iter<M> {

    constructor(private list: Iter<T>, private selector: Selector<T, M[]>) {
        super();
    }

    *iter() {
        for (let item of this.list.iter()) {
            const sub = this.selector(item);
            for (let subItem of sub) {
                yield subItem;
            }
        }
    }
}



class Mapped<T, M> extends Iter<M> {

    constructor(private list: Iter<T>, private selector: Selector<T, M>) {
        super();
    }

    *iter() {
        for (let item of this.list.iter()) {
            yield this.selector(item);
        }
    }
}

class From<T> extends Iter<T> {

    constructor(private list: T[]) {
        super();
    }

    *iter() {
        for (let item of this.list) {
            yield item;
        }
    }
}


function from<T>(arg: Iterable<T>): Iter<T>
function from<T>(arg: T[]): Iter<T>
function from<T>(arg: any): Iter<T> {
    return new From(arg);
}

export {
    from
}