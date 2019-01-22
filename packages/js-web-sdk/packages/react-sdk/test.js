class MyClass {
  constructor() {


  }

  test(a) {
    console.log(`test ${a}`)
  }
}

function createWrapper(instance) {
  return {
    ...instance,
    test(a) {
      return instance.test(a + 'foo')
    }
  }
}

const wrapper = createWrapper(new MyClass())

console.log(wrapper.test('jordan'))




