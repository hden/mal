// Node vs browser behavior
var mal = {}
if (typeof module === 'undefined') {
  var exports = mal
} else {
  var types = require('../deps/types')
  var reader = require('../deps/reader')
  var printer = require('../deps/printer')
  var Env = require('../deps/env').Env
  var core = require('../deps/core')
}

// read
function READ (str) {
  return reader.read_str(str)
}

// eval
function isPair (x) {
  return types._sequential_Q(x) && x.length > 0
}

function quasiquote (ast) {
  if (!isPair(ast)) {
    return [types._symbol('quote'), ast]
  } else if (types._symbol_Q(ast[0]) && ast[0].value === 'unquote') {
    return ast[1]
  } else if (isPair(ast[0]) && ast[0][0].value === 'splice-unquote') {
    return [types._symbol('concat'),
      ast[0][1],
      quasiquote(ast.slice(1))]
  } else {
    return [types._symbol('cons'),
      quasiquote(ast[0]),
      quasiquote(ast.slice(1))]
  }
}

function isMacroCall (ast, env) {
  return types._list_Q(ast) &&
           types._symbol_Q(ast[0]) &&
           env.find(ast[0]) &&
           env.get(ast[0])._ismacro_
}

function macroexpand (ast, env) {
  while (isMacroCall(ast, env)) {
    var mac = env.get(ast[0])
    ast = mac.apply(mac, ast.slice(1))
  }
  return ast
}

function evalAST (ast, env) {
  if (types._symbol_Q(ast)) {
    return env.get(ast)
  } else if (types._list_Q(ast)) {
    return ast.map(function (a) { return EVAL(a, env) })
  } else if (types._vector_Q(ast)) {
    var v = ast.map(function (a) { return EVAL(a, env) })
    v.__isvector__ = true
    return v
  } else if (types._hash_map_Q(ast)) {
    var newHM = {}
    var k
    for (k in ast) {
      newHM[EVAL(k, env)] = EVAL(ast[k], env)
    }
    return newHM
  } else {
    return ast
  }
}

function _EVAL (ast, env) {
  while (true) {
    // printer.println('EVAL:', printer._pr_str(ast, true))
    if (!types._list_Q(ast)) {
      return evalAST(ast, env)
    }

    // apply list
    ast = macroexpand(ast, env)
    if (!types._list_Q(ast)) {
      return evalAST(ast, env)
    }
    if (ast.length === 0) {
      return ast
    }

    var a0 = ast[0]
    var a1 = ast[1]
    var a2 = ast[2]
    var a3 = ast[3]
    switch (a0.value) {
      case 'def!':
        var res = EVAL(a2, env)
        return env.set(a1, res)
      case 'let*':
        var letEnv = new Env(env)
        for (var i = 0; i < a1.length; i += 2) {
          letEnv.set(a1[i], EVAL(a1[i + 1], letEnv))
        }
        ast = a2
        env = letEnv
        break
      case 'quote':
        return a1
      case 'quasiquote':
        ast = quasiquote(a1)
        break
      case 'defmacro!':
        var func = EVAL(a2, env)
        func._ismacro_ = true
        return env.set(a1, func)
      case 'macroexpand':
        return macroexpand(a1, env)
      case 'try*':
        try {
          return EVAL(a1, env)
        } catch (exc) {
          if (a2 && a2[0].value === 'catch*') {
            var msg = exc
            if (exc instanceof Error) { msg = exc.message }
            return EVAL(a2[2], new Env(env, [a2[1]], [msg]))
          } else {
            throw exc
          }
        }
      case 'do':
        evalAST(ast.slice(1, -1), env)
        ast = ast[ast.length - 1]
        break
      case 'if':
        var cond = EVAL(a1, env)
        if (cond === null || cond === false) {
          ast = (typeof a3 !== 'undefined') ? a3 : null
        } else {
          ast = a2
        }
        break
      case 'fn*':
        return types._function(EVAL, Env, a2, env, a1)
      default:
        var el = evalAST(ast, env)
        var f = el[0]
        if (f.__ast__) {
          ast = f.__ast__
          env = f.__gen_env__(el.slice(1))
        } else {
          return f.apply(f, el.slice(1))
        }
    }
  }
}

function EVAL (ast, env) {
  var result = _EVAL(ast, env)
  return (typeof result !== 'undefined') ? result : null
}

// print
function PRINT (exp) {
  return printer._pr_str(exp, true)
}

// repl
var replEnv = new Env()
var rep = exports.rep = function (str) { return PRINT(EVAL(READ(str), replEnv)) }

// core.js: defined using javascript
for (var n in core.ns) { replEnv.set(types._symbol(n), core.ns[n]) }
replEnv.set(types._symbol('eval'), function (ast) {
  return EVAL(ast, replEnv)
})
replEnv.set(types._symbol('*ARGV*'), [])

// core.mal: defined using the language itself
rep('(def! *host-language* "javascript")')
rep('(def! not (fn* (a) (if a false true)))')
rep("(defmacro! cond (fn* (& xs) (if (> (count xs) 0) (list 'if (first xs) (if (> (count xs) 1) (nth xs 1) (throw \"odd number of forms to cond\")) (cons 'cond (rest (rest xs)))))))")
rep('(def! *gensym-counter* (atom 0))')
rep('(def! gensym (fn* [] (symbol (str "G__" (swap! *gensym-counter* (fn* [x] (+ 1 x)))))))')
rep('(defmacro! or (fn* (& xs) (if (empty? xs) nil (if (= 1 (count xs)) (first xs) (let* (condvar (gensym)) `(let* (~condvar ~(first xs)) (if ~condvar ~condvar (or ~@(rest xs)))))))))')
rep('(def! reduce (fn* (f init xs) (if (> (count xs) 0) (reduce f (f init (first xs)) (rest xs)) init)))')

exports.apply = function (str, args) {
  var f = EVAL(READ(str), replEnv)
  return f.apply(f, args)
}
