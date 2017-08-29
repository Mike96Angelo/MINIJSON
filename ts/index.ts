const FUNC_OR_VOID = {}

const MININUM_TEST = /^(?:\-?[a-z0-9]+(?:.[a-z0-9]+)?(?:\^\-?[a-z0-9]+)?)|NaN$/
const MININUM = {
  test: (val: string) => MININUM_TEST.test(val),

  stringify(n: number) {
    let x = n.toPrecision().split(/[.]|e/).map(a => Number(a).toString(36))
    let str = 'NaN'
    if (x[0])
      str = x[0]
    if (x[1])
      str += `.${x[1]}`
    if (x[2])
      str += `^${x[2]}`
    return str
  },
  parse(n: string) {
    if (n === 'NaN') {
      return Number(n)
    }
    let x = n.split(/\.|\^/).map(a => parseInt(a, 36).toString(10))
    let str = 'NaN'
    if (x[0])
      str = x[0]
    if (x[1])
      str += `.${x[1]}`
    if (x[2])
      str += `e${x[2]}`
    return Number(str)
  }
}

const MINIBOOL_TEST = /^\+|\-$/
const MINIBOOL = {
  test: (val: string) => MINIBOOL_TEST.test(val),
  stringify(b: boolean) {
    return b ? '+' : '-'
  },
  parse(b: string) {
    return b == '+'
  }
}

const MINISTRING_TEST = /^%/
const MINISTRING = {
  test: (val: string) => MINISTRING_TEST.test(val),
  stringify(s: string) {
    return '%' + s.replace(/([|:\[\]\{\}])/g, '\\$1')
  },
  parse(s: string) {
    return s.slice(1).replace(/(\\[|:\[\]\{\}])/g, '$1')
  }
}

const MINIARRAY = {
  stringify(arr: any[], visited: any[]) {
    let str = '['
    let first = true
    for (let value of arr) {
      if (!first) {
        str += '|'
      }
      first = false
      let valuep = MINIANY.stringify(value, visited)
      if (valuep !== FUNC_OR_VOID) {
        str += valuep
      }
    }

    str += ']'
    return str
  }
}

const MINIOBJECT = {
  stringify(obj: {[key: string]: any}, visited: any[]) {
    let str = '{'
    let first = true
    for (let key in obj) {
      let value = obj[key]
      let keyp = MINISTRING.stringify(key).slice(1)
      let valuep = MINIANY.stringify(value, visited)
      if (valuep !== FUNC_OR_VOID) {
        if (!first) {
          str += '|'
        }
        first = false
        str += keyp + ':' + valuep
      }
    }

    str += '}'
    return str
  }
}

const MINIANY = {
  stringify(value: any, _visited: any[] = []) {
    let visited: any[] = ([] as any[]).concat(_visited)
    if (visited.indexOf(value) !== -1) {
      throw new TypeError('Converting circular structure to JSON')
    }
    switch (typeof value) {
    case 'string':
      return MINISTRING.stringify(value)
    case 'number':
      return MININUM.stringify(value)
    case 'boolean':
      return MINIBOOL.stringify(value)
    case 'object':
      if (value) {
        visited.push(value)
        if (Array.isArray(value)) {
          return MINIARRAY.stringify(value, visited)
        }
        return MINIOBJECT.stringify(value, visited)
      }
      break
    case 'function':
    case 'undefined':
      return FUNC_OR_VOID
    }
    return ''
  },
  parse(data: string) {
    if (MININUM.test(data)) {
      return MININUM.parse(data)
    }
    if (MINIBOOL.test(data)) {
      return MINIBOOL.parse(data)
    }
    if (MINISTRING.test(data)) {
      return MINISTRING.parse(data)
    }

    let stack: any[] = []
    let keySet = false
    let parentOpen = false;
    let key = ''
    let value: any

    let cursor = 0
    let parent: any = null

    for(let i = 0; i < data.length; i++) {
      let ch = data[i]

      if (ch === '{') {
        parentOpen = true
        let child = {}

        if (Array.isArray(parent)) {
          let arr = stack[stack.length - 1] as any[]
          arr.push(child)
        } else if (keySet && parent) {
          let obj = stack[stack.length - 1]
          obj[key] = child
        }

        key = '';
        keySet = false;
        value = null;

        stack.push(child)
        parent = child
        cursor = i + 1
        continue
      }

      if (ch === '[') {
        parentOpen = true
        let child: any[] = []

        if (Array.isArray(parent)) {
          let arr = stack[stack.length - 1] as any[]
          arr.push(child)
        } else if (keySet && parent) {
          let obj = stack[stack.length - 1]
          obj[key] = child
        }

        key = '';
        keySet = false;
        value = null;

        stack.push(child)
        parent = child
        cursor = i + 1
        continue
      }

      if (ch === ':') {
        key = MINISTRING.parse('%' + data.slice(cursor, i))
        keySet = true
        cursor = i + 1
        continue
      }

      let close = !/\\/.test(data[i - 1]) && /\]|\}/.test(ch)
      if ((ch === '|' || (!parentOpen && close)) && !/\]|\}|\\/.test(data[i - 1])) {
        value = MINIANY.parse(data.slice(cursor, i))

        if (Array.isArray(parent)) {
          let arr = stack[stack.length - 1] as any[]
          arr.push(value)
        } else if (keySet && parent) {
          let obj = stack[stack.length - 1]
          obj[key] = value
        }

        key = ''
        keySet = false
        value = null

        parentOpen = false;

        cursor = i + 1
      }

      if (close) {
        stack.pop()
        let p = stack[stack.length - 1]
        if (p) {
          parent = p
        }
        cursor = i + 1
      }
    }

    return parent
  }
}

export const MINIJSON = {
  stringify(val: any) {
    let data = MINIANY.stringify(val)

    if (data === FUNC_OR_VOID) {
      return null
    }

    return data
  },
  parse(val: any) {
    return MINIANY.parse(val)
  }
}
