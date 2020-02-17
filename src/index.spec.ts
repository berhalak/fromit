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
