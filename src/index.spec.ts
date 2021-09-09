import { from } from "."
import { performance } from "perf_hooks"

test("iterators", async () => {

	const t = from([1, 2, 3])
		.map(x => x + 1)
		.filter(x => x > 2)
		.toArray();

	expect(t).toStrictEqual([3, 4]);

	const t2 = from([[1, 2]])
		.many(x => x)
		.toArray();

	expect(t2).toStrictEqual([1, 2]);

	const t3 = from([1, 2, 3])
		.first()

	expect(t3).toStrictEqual(1);


});

test("iterables", async () => {
	const list = new Set([1, 2, 3]);
	expect(from(list).filter(x => x > 2).first()).toBe(3);
});


test("intersect", async () => {
	const a = [1, 2, 3];
	const b = [3, 4, 5];
	let r = from(a).intersect(b);
	expect(r.count()).toBe(1);
	r = from(a).intersect(from(b));
	expect(r.count()).toBe(1);
});

test("iterator", async () => {
	const a = [1, 2, 3];
	const b = [...from(a)];

	expect(a).toStrictEqual(b);
});


test("except", async () => {
	const a = [1, 2, 3];
	const b = [3, 4, 5];
	let r = from(a).except(b);
	expect(r.count()).toBe(2);
	r = from(a).except(from(b));
	expect(r.count()).toBe(2);
	expect(r.any()).toBeTruthy();
	expect(from([]).any()).toBeFalsy();
});

test("union", async () => {
	const a = [1, 2, 3];
	const b = [3, 4, 5];
	let r = from(a).union(b);
	expect(r.count()).toBe(5);
	r = from(a).union(from(b));
	expect(r.count()).toBe(5);
});

test("last", async () => {
	const a = [1, 2, 3];
	expect(from(a).last()).toBe(3);
});

test("sum", async () => {
	const a = [1, 2, 3];
	expect(from(a).sum()).toBe(6);
});

test("foreach", async () => {
	const a = [1, 2, 3];
	let sum = 0;
	from(a).forEach(x => sum += x);
	expect(sum).toBe(6);
});

test("ordered", async () => {
	const a = [3, 2, 1];
	expect(from(a).orderBy(x => x).first()).toBe(1);
	expect(from(a).orderByDesc(x => x).first()).toBe(3);
	expect(from(a).orderBy(x => 3 - x).first()).toBe(3);
	expect(from(a).orderByDesc(x => 3 - x).first()).toBe(1);
});

test("normal order", async () => {
	const a = [2, 10];
	expect(from(a).orderBy(x => x).first()).toBe(2);
	expect(from(a).orderByDesc(x => x).first()).toBe(10);
});

test("skip", async () => {
	const a = [3, 2, 1];
	expect(from(a).skip(1).first()).toBe(2);
	expect(from(a).take(2).last()).toBe(2);
});

test("skipWhile", async () => {
	const a = [3, 2, 1];
	expect(from(a).skipWhile(x => x > 1).first()).toBe(1);
	expect(from(a).takeWhile(x => x > 1).last()).toBe(2);
});

test("groupBy", async () => {
	const a = [{ name: 'a', val: 10 }, { name: 'a', val: 20 }];

	const result = from(a).groupBy(a => a.name).toArray();

	expect(result.length).toBe(1);
	expect(result[0].count()).toBe(2);

	const sum = from(a).groupBy(a => a.name).map(x => x.sum(y => y.val)).sum(y => y);

	expect(sum).toBe(30);
});

test("distinct", async () => {
	expect(from(['a', 'a']).distinct().count()).toBe(1);
});

test("includes", async () => {
	expect(from(['a', 'b']).includes('b')).toBeTruthy();
});


test("groupBy", async () => {
	const a = [{ name: 'a', val: 10 }, { name: 'a', val: 20 }];

	const result = from(a).groupBy(a => a.name).toArray();

	expect(result.length).toBe(1);
	expect(result[0].count()).toBe(2);

	const sum = from(a).groupBy(a => a.name).map(x => x.sum(y => y.val)).sum(y => y);

	expect(sum).toBe(30);

  const b = [{ Name : 'John'}, { Name : 'John' }, {Name : 'Mary'}, { Undefined: true}, { Name : null}];
  const bG = from(b).groupBy(x=> x.Name).map(x=> x.key).toArray();
  expect(bG).toStrictEqual(['John', 'Mary', undefined, null]);
});


test("async from", async () => {
	async function* generator() {
		yield 1
		yield 2
		yield 3
	}

	async function promise() {
		return [1, 2, 3]
	}

	const result1 = from(generator());
	const result2 = from(promise());

	expect(await result1.toArray()).toStrictEqual(await result2.toArray());
});


test("async iterable", async () => {
	async function* generate() {
		yield 1
		yield 2
		yield 3
	}

	const result = await from(generate()).map(x => x + 1).toArray();

	expect(result).toStrictEqual([2, 3, 4]);

	const result2 = await from([1, 2, 3]).async().map(x => x + 1).toArray();
	expect(result2).toStrictEqual([2, 3, 4]);

	async function increment(n: number) {
		return ++n;
	}

	const result3 = await from(generate()).map(x => increment(x)).toArray();
	expect(result3).toStrictEqual([2, 3, 4]);
});


test("performance", async () => {
	const bigArray = new Float32Array(1_000_000);

  let start = performance.now();
  let result = bigArray.filter(x=> x == 0).map((x,i) => x + i).find(x => x == 3);
  let end = performance.now();
  expect(result).toBe(3);

  const arrayTime = end - start;

  start = performance.now();
  result = from(bigArray).filter(x=> x == 0).map((x,i) => x + i).find(x => x == 3);
  end = performance.now();
  expect(result).toBe(3);

  const fromTime = end - start;

  expect(fromTime).toBeLessThan(arrayTime);
});

test("range", async () => {
  expect(from(0).count()).toBe(0);
  expect(from(-1).count()).toBe(0);
  expect(from(1).count()).toBe(1);
  expect(from(20).count()).toBe(20);
  expect(from(2).sum()).toBe(1);
  expect(from(3).sum()).toBe(3);
  expect(from(0, 1).sum()).toBe(1);
  expect(from(0, 1).count()).toBe(2);
  expect(from(0, 2).count()).toBe(3);
  expect(from(0, 2).sum()).toBe(3);
  expect(from(0, -1).sum()).toBe(-1);
  expect(from(0, -1).count()).toBe(2);
  expect(from(0, 10, 2).count()).toBe(6);
  expect(from(0, 10, 5).sum()).toBe(15);
  expect(from(0, 10, 5).count()).toBe(3);
  expect(from(0, -10, 5).count()).toBe(3);
  expect(from(0, -10, 5).sum()).toBe(-15);
});