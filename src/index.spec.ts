import { from } from "."

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

test("skip", async () => {
	const a = [3, 2, 1];
	expect(from(a).skip(1).first()).toBe(2);
	expect(from(a).take(2).last()).toBe(2);
});

test("groupBy", async () => {
	const a = [{ name: 'a', val: 10 }, { name: 'a', val: 20 }];

	const result = from(a).groupBy(a => a.name).toArray();

	expect(result.length).toBe(1);
	expect(result[0].count()).toBe(2);

	const sum = from(a).groupBy(a => a.name).map(x => x.sum(y => y.val)).sum(y => y);

	expect(sum).toBe(30);
});

test("groupBy", async () => {
	const a = [{ name: 'a', val: 10 }, { name: 'a', val: 20 }];

	const result = from(a).groupBy(a => a.name).toArray();

	expect(result.length).toBe(1);
	expect(result[0].count()).toBe(2);

	const sum = from(a).groupBy(a => a.name).map(x => x.sum(y => y.val)).sum(y => y);

	expect(sum).toBe(30);
});




test("async iterable", async () => {
	
	async function* generate() {
		yield 1
		yield 2
		yield 3
	}

	const result = await from(generate()).map(x => x + 1).toArray();

	expect(result).toStrictEqual([2,3,4]);

	const result2 = await from([1,2,3]).async().map(x=> x + 1).toArray();
	expect(result2).toStrictEqual([2,3,4]);
	
});