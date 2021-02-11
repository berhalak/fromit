import { AEnumerable, AFrom } from "./async";

type Selector<T, M> = (item: T) => M;
type Matcher<T> = (item: T) => boolean;

abstract class Enumerable<T> implements Iterable<T> {

	abstract [Symbol.iterator](): IterableIterator<T>;

	async() {
		const self = this;
		async function* gen() {
			for(const i of self) {
				yield i;
			}
		}
		return from(gen());
	}

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

	filter(matcher: Matcher<T>): Enumerable<T> {
		return new Filter(this, matcher);
	}

	skip(size: number): Enumerable<T> {
		return new Skip(this, size);
	}

	take(size: number): Enumerable<T> {
		return new Take(this, size);
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

class Skip<T> extends Enumerable<T> {

	constructor(private list: Iterable<T>, private size: number) {
		super();
	}

	*[Symbol.iterator]() {
		let iter = -1;
		for (let item of this.list) {
			iter++;
			if (iter >= this.size) {
				yield item;
			}
		}
	}
}

class Take<T> extends Enumerable<T> {

	constructor(private list: Iterable<T>, private size: number) {
		super();
	}

	*[Symbol.iterator]() {
		let iter = -1;
		for (let item of this.list) {
			iter++;
			if (iter < this.size) {
				yield item;
			} else {
				break;
			}
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



function from<T>(arg: Iterable<T>): Enumerable<T>
function from<T>(arg: AsyncIterable<T>): AEnumerable<T>
function from<T>(arg: any): any {
	//Symbol.asyncIterator
	//Symbol.iterator
	if (Symbol.asyncIterator in arg) {
		return new AFrom(arg as AsyncIterable<T>);
	}
	return new From(arg as Iterable<T>);
}

export {
	from
}