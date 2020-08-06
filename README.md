[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-Ready--to--Code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/berhalak/linq) 

# linq

Linq style using generators

npm install fromit

``` ts
const list = new Set([1, 2, 3]);
expect(from(list).where(x => x > 2).first()).toBe(3);

const a = [1, 2, 3];
const b = [3, 4, 5];
let r = from(a).intersect(b);
expect(r.count()).toBe(1);
```

