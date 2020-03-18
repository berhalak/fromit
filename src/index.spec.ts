import { from } from "."

test("iterators", async () => {

	const t = from([1, 2, 3])
		.map(x => x + 1)
		.where(x => x > 2)
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
	expect(from(list).where(x => x > 2).first()).toBe(3);
});


test("intersect", async () => {
	const a = [1, 2, 3];
	const b = [3, 4, 5];
	let r = from(a).intersect(b);
	expect(r.count()).toBe(1);
	r = from(a).intersect(from(b));
	expect(r.count()).toBe(1);
});


test("except", async () => {
	const a = [1, 2, 3];
	const b = [3, 4, 5];
	let r = from(a).except(b);
	expect(r.count()).toBe(2);
	r = from(a).except(from(b));
	expect(r.count()).toBe(2);
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