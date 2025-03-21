const foo = (a, fn) => {
  return a + fn();
}

const bar = foo(1, () => {
  return bar;
});

console.log(bar);
