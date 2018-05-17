/**
 * callbag-for-each
 * ----------------
 *
 * Callbag sink that consume both pullable and listenable sources. When called
 * on a pullable source, it will iterate through its data. When called on a
 * listenable source, it will observe its data.
 *
 * `npm install callbag-for-each`
 *
 * Examples
 * --------
 *
 * Consume a pullable source:
 *
 *     const fromIter = require('callbag-from-iter');
 *     const forEach = require('callbag-for-each');
 *
 *     const source = fromIter([10,20,30,40])
 *
 *     forEach(x => console.log(x))(source); // 10
 *                                           // 20
 *                                           // 30
 *                                           // 40
 *
 * Consume a listenable source:
 *
 *     const interval = require('callbag-interval');
 *     const forEach = require('callbag-for-each');
 *
 *     const source = interval(1000);
 *
 *     forEach(x => console.log(x))(source); // 0
 *                                           // 1
 *                                           // 2
 *                                           // 3
 *                                           // ...
 */

var forEach = function forEach(operation) {
  return function (source) {
    var talkback = void 0;
    source(0, function (t, d) {
      if (t === 0) talkback = d;
      if (t === 1) operation(d);
      if (t === 1 || t === 0) talkback(1);
    });
  };
};

function symbolObservablePonyfill(root) {
	var result;
	var _Symbol = root.Symbol;

	if (typeof _Symbol === 'function') {
		if (_Symbol.observable) {
			result = _Symbol.observable;
		} else {
			result = _Symbol('observable');
			_Symbol.observable = result;
		}
	} else {
		result = '@@observable';
	}

	return result;
}

/* global window */
var root;

if (typeof self !== 'undefined') {
  root = self;
} else if (typeof window !== 'undefined') {
  root = window;
} else if (typeof global !== 'undefined') {
  root = global;
} else if (typeof module !== 'undefined') {
  root = module;
} else {
  root = Function('return this')();
}

var result = symbolObservablePonyfill(root);

/**
 * callbag-from-obs
 * --------------
 *
 * Convert an observable (or subscribable) to a callbag listenable source.
 *
 * `npm install callbag-from-obs`
 *
 * Example:
 *
 * Convert an RxJS Observable:
 *
 *     const Rx = require('rxjs');
 *     const fromObs = require('callbag-from-obs');
 *     const observe = require('callbag-observe');
 *
 *     const source = fromObs(Rx.Observable.interval(1000).take(4));
 *
 *     observe(x => console.log(x)(source); // 0
 *                                          // 1
 *                                          // 2
 *                                          // 3
 *
 * Convert anything that has the `.subscribe` method:
 *
 *     const fromObs = require('callbag-from-obs');
 *     const observe = require('callbag-observe');
 *
 *     const subscribable = {
 *       subscribe: (observer) => {
 *         let i = 0;
 *         setInterval(() => observer.next(i++), 1000);
 *       }
 *     };
 *
 *     const source = fromObs(subscribable);
 *
 *     observe(x => console.log(x))(source); // 0
 *                                           // 1
 *                                           // 2
 *                                           // 3
 *                                           // ...
 */

var fromObs = function fromObs(observable) {
  return function (start, sink) {
    if (start !== 0) return;
    var dispose = void 0;
    sink(0, function (t) {
      if (t === 2 && dispose) {
        if (dispose.unsubscribe) dispose.unsubscribe();else dispose();
      }
    });
    observable = observable[result] ? observable[result]() : observable;
    dispose = observable.subscribe({
      next: function next(x) {
        return sink(1, x);
      },
      error: function error(e) {
        return sink(2, e);
      },
      complete: function complete() {
        return sink(2);
      }
    });
  };
};

var fromIter = function fromIter(iter) {
  return function (start, sink) {
    if (start !== 0) return;
    var iterator = typeof Symbol !== 'undefined' && iter[Symbol.iterator] ? iter[Symbol.iterator]() : iter;
    var inloop = false;
    var got1 = false;
    var completed = false;
    var res = void 0;
    function loop() {
      inloop = true;
      while (got1 && !completed) {
        got1 = false;
        res = iterator.next();
        if (res.done) sink(2);else sink(1, res.value);
      }
      inloop = false;
    }
    sink(0, function (t) {
      if (completed) return;

      if (t === 1) {
        got1 = true;
        if (!inloop && !(res && res.done)) loop();
      } else if (t === 2) {
        completed = true;
      }
    });
  };
};

var fromEvent = function fromEvent(node, name) {
  return function (start, sink) {
    if (start !== 0) return;
    var handler = function handler(ev) {
      return sink(1, ev);
    };
    sink(0, function (t) {
      if (t === 2) node.removeEventListener(name, handler);
    });
    node.addEventListener(name, handler);
  };
};

var fromPromise = function fromPromise(promise) {
  return function (start, sink) {
    if (start !== 0) return;
    var ended = false;
    var onfulfilled = function onfulfilled(val) {
      if (ended) return;
      sink(1, val);
      sink(2);
    };
    var onrejected = function onrejected(err) {
      if (ended) return;
      sink(2, err);
    };
    promise.then(onfulfilled, onrejected);
    sink(0, function (t) {
      if (t === 2) ended = true;
    });
  };
};

var interval = function interval(period) {
  return function (start, sink) {
    if (start !== 0) return;
    var i = 0;
    var id = setInterval(function () {
      sink(1, i++);
    }, period);
    sink(0, function (t) {
      if (t === 2) clearInterval(id);
    });
  };
};

/**
 * callbag-map
 * -----------
 *
 * Callbag operator that applies a transformation on data passing through it.
 * Works on either pullable or listenable sources.
 *
 * `npm install callbag-map`
 *
 * Example:
 *
 *     const fromIter = require('callbag-from-iter');
 *     const iterate = require('callbag-iterate');
 *     const map = require('callbag-map');
 *
 *     const source = map(x => x * 0.1)(fromIter([10,20,30,40]));
 *
 *     iterate(x => console.log(x))(source); // 1
 *                                           // 2
 *                                           // 3
 *                                           // 4
 */

var map = function map(f) {
  return function (source) {
    return function (start, sink) {
      if (start !== 0) return;
      source(0, function (t, d) {
        sink(t, t === 1 ? f(d) : d);
      });
    };
  };
};

/**
 * callbag-scan
 * ------------
 *
 * Callbag operator that combines consecutive values from the same source.
 * It's essentially like array `.reduce`, but delivers a new accumulated value
 * for each value from the callbag source. Works on either pullable or
 * listenable sources.
 *
 * `npm install callbag-scan`
 *
 * Example:
 *
 *     const fromIter = require('callbag-from-iter');
 *     const iterate = require('callbag-iterate');
 *     const scan = require('callbag-scan');
 *
 *     const iterSource = fromIter([1,2,3,4,5]);
 *     const scanned = scan((prev, x) => prev + x, 0)(iterSource);
 *
 *     scanned(0, iterate(x => console.log(x))); // 1
 *                                               // 3
 *                                               // 6
 *                                               // 10
 *                                               // 15
 */

function scan(reducer, seed) {
  var hasAcc = arguments.length === 2;
  return function (source) {
    return function (start, sink) {
      if (start !== 0) return;
      var acc = seed;
      source(0, function (t, d) {
        if (t === 1) {
          acc = hasAcc ? reducer(acc, d) : (hasAcc = true, d);
          sink(1, acc);
        } else sink(t, d);
      });
    };
  };
}

var flatten = function flatten(source) {
  return function (start, sink) {
    if (start !== 0) return;
    var exists = function exists(x) {
      return typeof x !== 'undefined';
    };
    var absent = function absent(x) {
      return typeof x === 'undefined';
    };
    var noop = function noop() {};
    var outerEnded = false;
    var outerTalkback = void 0;
    var innerTalkback = void 0;
    function talkback(t, d) {
      if (t === 1) (innerTalkback || outerTalkback || noop)(1, d);
      if (t === 2) {
        innerTalkback && innerTalkback(2);
        outerTalkback && outerTalkback(2);
      }
    }
    source(0, function (T, D) {
      if (T === 0) {
        outerTalkback = D;
        sink(0, talkback);
      } else if (T === 1) {
        var innerSource = D;
        if (innerTalkback) innerTalkback(2);
        innerSource(0, function (t, d) {
          if (t === 0) {
            innerTalkback = d;
            innerTalkback(1);
          } else if (t === 1) sink(1, d);else if (t === 2 && absent(d)) {
            if (outerEnded) sink(2);else {
              innerTalkback = void 0;
              outerTalkback(1);
            }
          } else if (t === 2 && exists(d)) sink(2, d);
        });
      } else if (T === 2 && absent(D)) {
        if (!innerTalkback) sink(2);else outerEnded = true;
      } else if (T === 2 && exists(D)) sink(2, D);
    });
  };
};

var take = function take(max) {
  return function (source) {
    return function (start, sink) {
      if (start !== 0) return;
      var taken = 0;
      var sourceTalkback = void 0;
      function talkback(t, d) {
        if (taken < max) sourceTalkback(t, d);
      }
      source(0, function (t, d) {
        if (t === 0) {
          sourceTalkback = d;
          sink(0, talkback);
        } else if (t === 1) {
          if (taken < max) {
            taken++;
            sink(t, d);
            if (taken === max) {
              sink(2);
              sourceTalkback(2);
            }
          }
        } else {
          sink(t, d);
        }
      });
    };
  };
};

var skip = function skip(max) {
  return function (source) {
    return function (start, sink) {
      if (start !== 0) return;
      var skipped = 0;
      var talkback = void 0;
      source(0, function (t, d) {
        if (t === 0) {
          talkback = d;
          sink(t, d);
        } else if (t === 1) {
          if (skipped < max) {
            skipped++;
            talkback(1);
          } else sink(t, d);
        } else {
          sink(t, d);
        }
      });
    };
  };
};

/**
 * callbag-filter
 * --------------
 *
 * Callbag operator that conditionally lets data pass through. Works on either
 * pullable or listenable sources.
 *
 * `npm install callbag-filter`
 *
 * Example:
 *
 *     const fromIter = require('callbag-from-iter');
 *     const iterate = require('callbag-iterate');
 *     const filter = require('callbag-filter');
 *
 *     const source = filter(x => x % 2)(fromIter([1,2,3,4,5]));
 *
 *     iterate(x => console.log(x))(source); // 1
 *                                           // 3
 *                                           // 5
 */

var filter = function filter(condition) {
  return function (source) {
    return function (start, sink) {
      if (start !== 0) return;
      var talkback = void 0;
      source(0, function (t, d) {
        if (t === 0) {
          talkback = d;
          sink(t, d);
        } else if (t === 1) {
          if (condition(d)) sink(t, d);else talkback(1);
        } else sink(t, d);
      });
    };
  };
};

/**
 * callbag-merge
 * -------------
 *
 * Callbag factory that merges data from multiple callbag sources. Works well
 * with listenable sources, and while it may work for some pullable sources,
 * it is only designed for listenable sources.
 *
 * `npm install callbag-merge`
 *
 * Example:
 *
 *     const interval = require('callbag-interval');
 *     const forEach = require('callbag-for-each');
 *     const merge = require('callbag-merge');
 *
 *     const source = merge(interval(100), interval(350));
 *
 *     forEach(x => console.log(x))(source); // 0
 *                                           // 1
 *                                           // 2
 *                                           // 0
 *                                           // 3
 *                                           // 4
 *                                           // 5
 *                                           // ...
 */

function merge() {
  for (var _len = arguments.length, sources = Array(_len), _key = 0; _key < _len; _key++) {
    sources[_key] = arguments[_key];
  }

  return function (start, sink) {
    if (start !== 0) return;
    var n = sources.length;
    var sourceTalkbacks = new Array(n);
    var startCount = 0;
    var endCount = 0;
    var talkback = function talkback(t) {
      if (t === 0) return;
      for (var i = 0; i < n; i++) {
        sourceTalkbacks[i] && sourceTalkbacks[i](t);
      }
    };

    var _loop = function _loop(i) {
      sources[i](0, function (t, d) {
        if (t === 0) {
          sourceTalkbacks[i] = d;
          if (++startCount === 1) sink(0, talkback);
        } else if (t === 2) {
          sourceTalkbacks[i] = void 0;
          if (++endCount === n) sink(2);
        } else sink(t, d);
      });
    };

    for (var i = 0; i < n; i++) {
      _loop(i);
    }
  };
}

/**
 * callbag-concat
 * --------------
 *
 * Callbag factory that concatenates the data from multiple (2 or more)
 * callbag sources. It starts each source at a time: waits for the previous
 * source to end before starting the next source. Works with both pullable
 * and listenable sources.
 *
 * `npm install callbag-concat`
 *
 * Example:
 *
 *     const fromIter = require('callbag-from-iter');
 *     const iterate = require('callbag-iterate');
 *     const concat = require('callbag-concat');
 *
 *     const source = concat(fromIter([10,20,30]), fromIter(['a','b']));
 *
 *     iterate(x => console.log(x))(source); // 10
 *                                           // 20
 *                                           // 30
 *                                           // a
 *                                           // b
 */

var concat = function concat() {
  for (var _len = arguments.length, sources = Array(_len), _key = 0; _key < _len; _key++) {
    sources[_key] = arguments[_key];
  }

  return function (start, sink) {
    if (start !== 0) return;
    var n = sources.length;
    if (n === 0) {
      sink(0, function () {});
      sink(2);
      return;
    }
    var i = 0;
    var sourceTalkback = void 0;
    var talkback = function talkback(t, d) {
      if (t === 1 || t === 2) {
        sourceTalkback(t, d);
      }
    };
    (function next() {
      if (i === n) {
        sink(2);
        return;
      }
      sources[i](0, function (t, d) {
        if (t === 0) {
          sourceTalkback = d;
          if (i === 0) sink(0, talkback);else sourceTalkback(1);
        } else if (t === 1) {
          sink(1, d);
        } else if (t === 2) {
          i++;
          next();
        }
      });
    })();
  };
};

/**
 * callbag-combine
 * ---------------
 *
 * Callbag factory that combines the latest data points from multiple (2 or
 * more) callbag sources. It delivers those latest values as an array. Works
 * with both pullable and listenable sources.
 *
 * `npm install callbag-combine`
 *
 * Example:
 *
 *     const interval = require('callbag-interval');
 *     const observe = require('callbag-observe');
 *     const combine = require('callbag-combine');
 *
 *     const source = combine(interval(100), interval(350));
 *
 *     observe(x => console.log(x))(source); // [2,0]
 *                                           // [3,0]
 *                                           // [4,0]
 *                                           // [5,0]
 *                                           // [6,0]
 *                                           // [6,1]
 *                                           // [7,1]
 *                                           // [8,1]
 *                                           // ...
 */

var EMPTY = {};

var combine = function combine() {
  for (var _len = arguments.length, sources = Array(_len), _key = 0; _key < _len; _key++) {
    sources[_key] = arguments[_key];
  }

  return function (start, sink) {
    if (start !== 0) return;
    var n = sources.length;
    if (n === 0) {
      sink(0, function () {});
      sink(1, []);
      sink(2);
      return;
    }
    var Ns = n; // start counter
    var Nd = n; // data counter
    var Ne = n; // end counter
    var vals = new Array(n);
    var sourceTalkbacks = new Array(n);
    var talkback = function talkback(t, d) {
      if (t === 0) return;
      for (var i = 0; i < n; i++) {
        sourceTalkbacks[i](t, d);
      }
    };
    sources.forEach(function (source, i) {
      vals[i] = EMPTY;
      source(0, function (t, d) {
        if (t === 0) {
          sourceTalkbacks[i] = d;
          if (--Ns === 0) sink(0, talkback);
        } else if (t === 1) {
          var _Nd = !Nd ? 0 : vals[i] === EMPTY ? --Nd : Nd;
          vals[i] = d;
          if (_Nd === 0) {
            var arr = new Array(n);
            for (var j = 0; j < n; ++j) {
              arr[j] = vals[j];
            }sink(1, arr);
          }
        } else if (t === 2) {
          if (--Ne === 0) sink(2);
        } else {
          sink(t, d);
        }
      });
    });
  };
};

var share = function share(source) {
  var sinks = [];
  var sourceTalkback = void 0;
  return function shared(start, sink) {
    if (start !== 0) return;
    sinks.push(sink);
    if (sinks.length === 1) {
      source(0, function (t, d) {
        if (t === 0) sourceTalkback = d;else {
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = sinks.slice(0)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var s = _step.value;
              s(t, d);
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }
        }if (t === 2) sinks = [];
      });
    }
    sink(0, function (t, d) {
      if (t === 0) return;
      if (t === 2) {
        var i = sinks.indexOf(sink);
        if (i > -1) sinks.splice(i, 1);
        if (!sinks.length) sourceTalkback(2);
      } else {
        sourceTalkback(t, d);
      }
    });
  };
};

/**
 * callbag-pipe
 * ------------
 *
 * Utility function for plugging callbags together in chain. This utility
 * actually doesn't rely on Callbag specifics, and is basically the same as
 * Ramda's `pipe` or lodash's `flow`. Anyway, this exists just to play nicely
 * with the ecosystem, and to facilitate the import of the function.
 *
 * `npm install callbag-pipe`
 *
 * Example:
 *
 * Create a source with `pipe`, then pass it to a `forEach`:
 *
 *     const interval = require('callbag-interval');
 *     const forEach = require('callbag-for-each');
 *     const combine = require('callbag-combine');
 *     const pipe = require('callbag-pipe');
 *     const take = require('callbag-take');
 *     const map = require('callbag-map');
 *
 *     const source = pipe(
 *       combine(interval(100), interval(350)),
 *       map(([x, y]) => `X${x},Y${y}`),
 *       take(10)
 *     );
 *
 *     forEach(x => console.log(x))(source); // X2,Y0
 *                                           // X3,Y0
 *                                           // X4,Y0
 *                                           // X5,Y0
 *                                           // X6,Y0
 *                                           // X6,Y1
 *                                           // X7,Y1
 *                                           // X8,Y1
 *                                           // X9,Y1
 *                                           // X9,Y2
 *
 *
 * Or use `pipe` to go all the way from source to sink:
 *
 *     const interval = require('callbag-interval');
 *     const forEach = require('callbag-for-each');
 *     const combine = require('callbag-combine');
 *     const pipe = require('callbag-pipe');
 *     const take = require('callbag-take');
 *     const map = require('callbag-map');
 *
 *     pipe(
 *       combine(interval(100), interval(350)),
 *       map(([x, y]) => `X${x},Y${y}`),
 *       take(10),
 *       forEach(x => console.log(x))
 *     );
 *     // X2,Y0
 *     // X3,Y0
 *     // X4,Y0
 *     // X5,Y0
 *     // X6,Y0
 *     // X6,Y1
 *     // X7,Y1
 *     // X8,Y1
 *     // X9,Y1
 *     // X9,Y2
 *
 *
 * Nesting
 * -------
 *
 * To use pipe inside another pipe, you need to give the inner pipe an
 * argument, e.g. `s => pipe(s, ...`:
 *
 *     const interval = require('callbag-interval');
 *     const forEach = require('callbag-for-each');
 *     const combine = require('callbag-combine');
 *     const pipe = require('callbag-pipe');
 *     const take = require('callbag-take');
 *     const map = require('callbag-map');
 *
 *     pipe(
 *       combine(interval(100), interval(350)),
 *       s => pipe(s,
 *         map(([x, y]) => `X${x},Y${y}`),
 *         take(10)
 *       ),
 *       forEach(x => console.log(x))
 *     );
 *
 *
 * This means you can use pipe to create a new operator:
 *
 *     const mapThenTake = (f, amount) =>
 *       s => pipe(s, map(f), take(amount));
 *
 *     pipe(
 *       combine(interval(100), interval(350)),
 *       mapThenTake(([x, y]) => `X${x},Y${y}`, 10),
 *       forEach(x => console.log(x))
 *     );
 *
 */

function pipe() {
  for (var _len = arguments.length, cbs = Array(_len), _key = 0; _key < _len; _key++) {
    cbs[_key] = arguments[_key];
  }

  var res = cbs[0];
  for (var i = 1, n = cbs.length; i < n; i++) {
    res = cbs[i](res);
  }return res;
}

/**
 * Debounces the given listenable source
 *
 * @param {number} wait - The number of ms to wait before letting a value pass
 * @returns {Function}
 */
function debounce(wait) {
    return function (source) {
        return function (start, sink) {
            if (start !== 0) return;
            var timeout;
            source(0, function (t, d) {
                if (t === 1 || t === 2 && d === undefined) {
                    // t === 1 means the source is emitting a value
                    // t === 2 and d === undefined means the source emits a completion
                    if (!timeout && t === 2) {
                        return sink(t, d);
                    }
                    if (timeout) {
                        clearTimeout(timeout);
                    }
                    timeout = setTimeout(function () {
                        sink(t, d);
                        timeout = undefined;
                    }, wait);
                } else sink(t, d);
            });
        };
    };
}

var fromDelegatedEvent = function fromDelegatedEvent(root, sel, evt, between) {
  return filter(function (e) {
    if (between) {
      var at = e.target;
      while (at !== root) {
        if (at.matches(sel)) {
          e.matchedElement = at;
          return true;
        }
        at = at.parentElement;
      }
      return false;
    } else return e.target.matches(sel);
  })(fromEvent(root, evt));
};

var observe = function observe(operation) {
  return function (source) {
    source(0, function (t, d) {
      if (t === 1) operation(d);
    });
  };
};

function of() {
  for (var _len = arguments.length, values = new Array(_len), _key = 0; _key < _len; _key++) {
    values[_key] = arguments[_key];
  }

  return function (start, sink) {
    if (start !== 0) return;
    var disposed = false;
    sink(0, function (type, data) {
      if (type !== 2) return;
      disposed = true;
    });

    for (var _i = 0; _i < values.length; _i++) {
      var value = values[_i];
      if (disposed) break;
      sink(1, value);
    }

    if (!disposed) {
      sink(2);
    }
  };
}

var sample = function sample(pullable) {
  return function (listenable) {
    return function (start, sink) {
      if (start !== 0) return;
      var ltalkback = void 0;
      var ptalkback = void 0;
      listenable(0, function (lt, ld) {
        if (lt === 0) {
          ltalkback = ld;
          pullable(0, function (pt, pd) {
            if (pt === 0) ptalkback = pd;
            if (pt === 1) sink(1, pd);
            if (pt === 2) {
              ltalkback(2);
              sink(2);
            }
          });
          sink(0, function (t) {
            if (t === 2) {
              ltalkback(2);
              ptalkback(2);
            }
          });
        }
        if (lt === 1) ptalkback(1);
        if (lt === 2) {
          ptalkback(2);
          sink(2);
        }
      });
    };
  };
};

function sampleWhen(sampler) {
  return function (listenable) {
    return function (start, sink) {
      if (start !== 0) return;
      var inited = false;
      var value;
      var listenableTalkback;
      var samplerTalkback;
      listenable(0, function (type, data) {
        if (type === 0) {
          listenableTalkback = data;
          sampler(0, function (type, data) {
            if (type === 0) {
              samplerTalkback = data;
              return;
            }

            if (type === 1 && inited) {
              sink(1, value);
              return;
            }

            if (type === 2) {
              listenableTalkback(2);
              sink(2);
              return;
            }
          });
          sink(0, function (end) {
            if (end !== 2) return;
            listenableTalkback(2);
            samplerTalkback(2);
          });
          return;
        }

        if (type === 1) {
          inited = true;
          value = data;
          return;
        }

        if (type === 2) {
          samplerTalkback(2);
          sink(2);
          return;
        }
      });
    };
  };
}

var subscribe = function subscribe(_ref) {
  var next = _ref.next,
      error = _ref.error,
      complete = _ref.complete;
  return function (source) {
    var talkback = void 0;

    source(0, function (t, d) {
      if (t === 0) {
        talkback = d;
      }
      if (t === 1) next(d);
      if (t === 1 || t === 0) talkback(1); // Pull
      if (t === 2 && !d && complete) complete();
      if (t === 2 && !!d && error) error(d);
    });

    var dispose = function dispose() {
      if (talkback) talkback(2);
    };

    return dispose;
  };
};

var throttle = function throttle(milliseconds) {
  return function (source) {
    return function (start, sink) {
      if (start !== 0) {
        return;
      }
      var talkbackToSource = void 0;
      var sourceTerminated = false;
      var sinkTerminated = false;
      var timeout = void 0;
      sink(0, function (t, d) {
        if (t === 2) {
          sinkTerminated = true;
        }
      });
      source(0, function (t, d) {
        if (t === 0) {
          talkbackToSource = d;
          talkbackToSource(1);
        } else if (sinkTerminated) {
          return;
        } else if (t === 1) {
          if (!timeout) {
            sink(t, d);
            timeout = setTimeout(function () {
              timeout = undefined;
              // If we just got something from the source, that means it shouldn't be terminated but it might be buggy and
              // emitting even after it terminated, so we'll be defensive here.
              if (!sourceTerminated) {
                talkbackToSource(1);
              }
            }, milliseconds);
          }
        } else if (t === 2) {
          sourceTerminated = true;
          sink(t, d);
        }
      });
    };
  };
};

var withPrevious = function withPrevious(source) {
  return function (start, sink) {
    if (start !== 0) return;
    var hasPrevious = false;
    var previous = void 0;
    source(0, function (t, d) {
      var data = d;
      if (t === 1) {
        data = hasPrevious ? [d, previous] : [d, undefined, true];
        previous = d;
        hasPrevious = true;
      }
      sink(t, data);
    });
  };
};

export { forEach, fromObs, fromIter, fromEvent, fromPromise, interval, map, scan, flatten, take, skip, filter, merge, concat, combine, share, pipe, debounce, fromDelegatedEvent, observe, of, sample, sampleWhen, subscribe, throttle, withPrevious };
