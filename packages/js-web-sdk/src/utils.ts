export function find<K>(arr: Array<K>, pred: (item: K) => boolean): K | undefined {
  for (let i = 0; i < arr.length; i++) {
    if (pred(arr[i])) {
      return arr[i]
    }
  }
  return undefined
}

export function isPlainObject(someValue: any): boolean {
  return someValue != null && Object.prototype.toString.call(someValue) === '[object Object]'
}

export function setInfiniteCookie(cname: string, cvalue: string): void {
  var expires = 'expires=Fri, 31 Dec 9999 23:59:59 GMT'
  document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/'
}

export function getCookie(cname: string): string {
  var name = cname + '='
  var decodedCookie = decodeURIComponent(document.cookie)
  var ca = decodedCookie.split(';')
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i]
    while (c.charAt(0) == ' ') {
      c = c.substring(1)
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length)
    }
  }
  return ''
}