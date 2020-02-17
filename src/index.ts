
type Selector<T, M> = (item: T) => M;
type Filter<T> = (item: T) => boolean;

export class Iter<T> {
    iter(): Generator<T> {
        throw new Error();
    }

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
}



export class Where<T> extends Iter<T> {

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

    toArray(): T[] {
        return [...this.iter()];
    }
}

export class Many<T, M> extends Iter<M> {

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



export class Mapped<T, M> extends Iter<M> {

    constructor(private list: Iter<T>, private selector: Selector<T, M>) {
        super();
    }

    *iter() {
        for (let item of this.list.iter()) {
            yield this.selector(item);
        }
    }
}

export class From<T> extends Iter<T> {

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