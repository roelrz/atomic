/*global asyncTest:true, ok:true, Atomic:true, start:true */
/*
 * @venus-library qunit
 * @venus-include ../_resources/jquery-1.9.1.min.js
 * @venus-include ../_resources/sinon.js
 * @venus-include ../../dist/recent/atomic.js
 */

var ATOMIC_LOAD_STUB;

// ======================================================================

module('creation of a component');

asyncTest('can create a component using factory method', 2, function() {
  var component = Atomic.Component({});
  ok(component, 'able to create a component');
  equal(typeof component, 'function', 'is a function');
  
  start();
});

// ======================================================================

module('managing this.elements', {
  setup: function() {
    ATOMIC_LOAD_STUB = sinon.stub(Atomic, 'load');
  },
  teardown: function() {
    Atomic.load.restore();
  }
});

asyncTest('can get a list of elements and assign them', 3, function() {
  var Component = Atomic.Component({
    elements: {
      'ONE': 'this is the description for item one',
      'TWO': 'item two has a decription listed here'
    }
  });

  var component = new Component();
  equal(typeof component.elements, 'function', 'is a callable function');
  equal(component.elements(component.elements.ONE), null, 'returns property in unresolved state');

  var el = document.createElement('div');
  component.assign(component.elements.ONE, el);
  equal(component.elements(component.elements.ONE), el, 'assigned element is the same');
  
  start();
});

// ======================================================================

module('managing this.depends', {
  setup: function() {
    var deferred = Atomic.deferred();
    deferred.resolve();

    ATOMIC_LOAD_STUB = sinon.stub(Atomic, 'load');
    ATOMIC_LOAD_STUB.returns(deferred.promise);
  },
  teardown: function() {
    Atomic.load.restore();
  }
});

asyncTest('can get a list of dependencies and they are loaded with atomic.load', 4, function() {
  var Component = Atomic.Component({
    depends: ['one', 'two']
  });

  var component = new Component();
  equal(typeof component.depends, 'function', 'is a callable function');

  equal(component.depends('one'), null, 'first dependency is unresolved');
  equal(component.depends('two'), null, 'second dependency is unresolved');

  var deferred = Atomic.deferred();
  deferred.resolve();
  ATOMIC_LOAD_STUB.withArgs('one', 'two').returns(deferred.promise);

  component.load();
  
  ok(ATOMIC_LOAD_STUB.withArgs('one', 'two').calledOnce, 'Atomic.load was called with one/two as arguments');
  start();
});

asyncTest('manually resolved dependencies are not passed to Atomic.load', 2, function() {
  var Component = Atomic.Component({
    depends: ['one', 'two']
  });
  
  var component = new Component();
  var oneDep = {};
  component.resolve('one', oneDep);
  
  equal(component.depends('one'), oneDep, 'first dependency is manually resolved');
  
  var deferred = Atomic.deferred();
  deferred.resolve();
  ATOMIC_LOAD_STUB.withArgs('two').returns(deferred.promise);
  
  component.load();
  
  ok(ATOMIC_LOAD_STUB.withArgs('two').calledOnce, 'Atomic.load was called with only the missing argument');
  
  start();
});

// ======================================================================

module('event API');
asyncTest('sanity test for on/off/emit', 2, function() {
  var callCount = 0;
  var Component = Atomic.Component({
    events: {
      'TEST': 'tests successfully'
    }
  });
  var component = new Component();
  
  var callCountUp = function() {
    callCount++;
    equal(callCount, 1, 'event fired successfully');
  };
  
  component.on(component.events.TEST, callCountUp);
  component.trigger(component.events.TEST);
  component.off(component.events.TEST, callCountUp);
  component.trigger(component.events.TEST);
  
  equal(callCount, 1, 'event triggered only once. does not re-fire after removed with off()');
  
  window.setTimeout(function() {
    // must be on next-tick
    start();
  });
  
});

// ======================================================================

module('verification of wiring functionality', {
  setup: function() {
    var deferred = Atomic.deferred();
    deferred.resolve();
    ATOMIC_LOAD_STUB = sinon.stub(Atomic, 'load');
    ATOMIC_LOAD_STUB.returns(deferred.promise);
  },
  teardown: function() {
    Atomic.load.restore();
  }
});

asyncTest('augmentation via wirings', 7, function() {
  var counter = 0;
  var Component = Atomic.Component({
    init: function() {
      ok(true, 'main init function called');
      counter++;
      equal(counter, 1, 'init chain: main init called in first slot');
    }
  });
  
  var component = new Component();
  component.wireIn({
    init: function() {
      ok(true, 'wiring init function called');
      counter++;
      equal(counter, 2, 'init chain: wiring init called in second slot');
    },
    events: {
      'NEW': 'this event did not exist before'
    },
    testMethod: function() {
      ok(true, 'test method exists and can be called');
    }
  });
  
  equal(typeof component.testMethod, 'function', 'wired in methods are immediately available');
  equal(typeof component.events.NEW, 'string', 'wired in events are immediately available');

  component.load()
  .then(function() {
    component.testMethod();
    start();
  });
});
