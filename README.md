[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-Ready--to--Code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/berhalak/linq) 

# fromit

Linq style (like in c#) using generators

npm install fromit

``` ts
const list = new Set([1, 2, 3]);
expect(from(list).filter(x => x > 2).first()).toBe(3);

const a = [1, 2, 3];
const b = [3, 4, 5];
let r = from(a).intersect(b);
expect(r.count()).toBe(1);

// used with async await

async function* generator() {
	yield 1
	yield 2
	yield 3
}

async function promise() : Promise<number[]> {
	return [1, 2, 3]
}

const result1 = from(generator());
const result2 = from(promise());

expect(await result1.toArray()).toStrictEqual(await result2.toArray());


```

