
type Selector<T, M> = (item: T) => M;
type Matcher<T> = (item: T) => boolean;

export abstract class AEnumerable<T> implements AsyncIterable<T> {

	abstract [Symbol.asyncIterator](): AsyncIterator<T>;

	iterator(): AsyncIterator<T> {
		return this[Symbol.asyncIterator]();
	}

	async includes(element: T, comparer : (a: T, b: T) => boolean = (a,b) => a == b ) {
		for await (const item of this) {
			if (comparer(item, element)) return true;
		}
		return false;
	}

	orderBy(selector: (arg: T) => any): AEnumerable<T> {
		return new Ordered(this, selector);
	}

	orderByDesc(selector: (arg: T) => any): AEnumerable<T> {
		return new OrderedDesc(this, selector);
	}

	map<M>(selector: Selector<T, M>): AEnumerable<M> {
		return new Mapped(this, selector);
	}

	groupBy<M>(selector: Selector<T, M>): GroupedEnumerable<T, M> {
		return new GroupedEnumerable<T, M>(this, selector);
	}

	filter(matcher: Matcher<T>): AEnumerable<T> {
		return new Filter(this, matcher);
	}

	skip(size: number): AEnumerable<T> {
		return new Skip(this, size);
	}

	take(size: number): AEnumerable<T> {
		return new Take(this, size);
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
		for await (let item of this) {
			if (selector) {
				sum += selector(item);
			} else {
				sum += item as any as number;
			}
		}
		return sum;
	}

	async toArray(): Promise<T[]> {
		const result = [];
		for await(const i of this) result.push(i)
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
		// we expect list to be ordered - for perfomence reason
		// as this should be as fast as possible
		let last: K = null;
		let has = false;
		let buffer: V[] = [];
		for await (let item of this.list) {
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

class Skip<T> extends AEnumerable<T> {

	constructor(private list: AsyncIterable<T>, private size: number) {
		super();
	}

	async *[Symbol.asyncIterator]() {
		let iter = -1;
		for await (let item of this.list) {
			iter++;
			if (iter >= this.size) {
				yield item;
			}
		}
	}
}

class Take<T> extends AEnumerable<T> {

	constructor(private list: AsyncIterable<T>, private size: number) {
		super();
	}

	async *[Symbol.asyncIterator]() {
		let iter = -1;
		for  await (let item of this.list) {
			iter++;
			if (iter < this.size) {
				yield item;
			} else {
				break;
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
		for await (let item of this.list) {
			const sub = this.selector(item);
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

class OrderedDesc<T> extends AEnumerable<T> {

	constructor(private list: AsyncIterable<T>, private selector: Selector<T, any>) {
		super();
	}

	async *[Symbol.asyncIterator]() {
		let all = [];
		for await (const i of this.list) all.push(i);
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



class Mapped<T, M> extends AEnumerable<M> {

	constructor(private list: AsyncIterable<T>, private selector: Selector<T, M>) {
		super();
	}

	async *[Symbol.asyncIterator]() {
		for await (let item of this.list) {
			yield this.selector(item);
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
