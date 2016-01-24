angular.module('myApp', [])

  .constant('COMBINATIONS', {
    aer: [],
    alienis: ['vacuos', 'tenebrae'],
    aqua: [],
    auram: ['potentia', 'aer'],
    aversio: ['spiritus', 'perditio'],
    bestia: ['motus', 'victus'],
    cognitio: ['ignis', 'spiritus'],
    desiderium: ['spiritus', 'vacuos'],
    exanimis: ['motus', 'mortuus'],
    fabrico: ['permutatio', 'instrumentum'],
    gelum: ['ignis', 'perditio'],
    herba: ['victus', 'terra'],
    humanus: ['spiritus', 'victus'],
    ignis: [],
    instrumentum: ['metallum', 'potentia'],
    lux: ['aer', 'ignis'],
    machina: ['motus', 'instrumentum'],
    metallum: ['terra', 'ordo'],
    mortuus: ['aqua', 'perditio'],
    motus: ['aer', 'ordo'],
    ordo: [],
    perditio: [],
    permutatio: ['perditio', 'ordo'],
    potentia: ['ordo', 'ignis'],
    praemunio: ['spiritus', 'terra'],
    sensus: ['aer', 'spiritus'],
    spiritus: ['victus', 'mortuus'],
    tenebrae: ['vacuos', 'lux'],
    terra: [],
    vacuos: ['aer', 'perditio'],
    victus: ['terra', 'aqua'],
    vinculum: ['motus', 'perditio'],
    vitium: ['perditio', 'potentia'],
    vitreus: ['terra', 'aer'],
    volatus: ['aer', 'motus']
  })

  .factory('Aspect', function(COMBINATIONS) {
    var keys = _.keys(COMBINATIONS);
    var combinations = _.map(keys, function(a1) {
      return _.map(COMBINATIONS[a1], function(a2) {
        return _.indexOf(keys, a2);
      }).sort();
    });
    var primals = _.filter(_.range(keys.length), function(a) {
      return combinations[a].length === 0;
    });
    var hasCompound = function(aspects) {
      return _.some(aspects, function(a) {
        return !_.includes(primals, a);
      });
    };
    var costs = _.map(combinations, function(c) {
      if (c.length === 0) {
        return 1;
      }
      var aspects = _.concat(c);
      while (hasCompound(aspects)) {
        aspects = _.transform(aspects, function(arr, a) {
          if (_.includes(primals, a)) {
            arr.push(a);
          } else {
            _.each(combinations[a], function(a) {
              arr.push(a);
            });
          }
        });
      }
      return aspects.length;
    });
    var closes = _.map(combinations, function(c1, a1) {
      var close = _.concat(c1);
      _.each(combinations, function(c2, a2) {
        if (_.includes(c2, a1)) {
          close.push(a2);
        }
      });
      return _.sortBy(close, function(a) {
        return costs[a];
      });
    });

    return {
      names: keys,
      combinations: combinations,
      costs: costs,
      closes: closes
    };
  })

  .factory('search', function($q, Aspect) {
    return function(from, to, step) {
      var dfd = $q.defer();
      var stack = [{
        path: [from],
        cost: Aspect.costs[from]
      }];
      var paths = [];
      var betterCost = Infinity;

      async.whilst(function() {
        return stack.length > 0;
      }, function(done) {
        var path = stack.pop();
        var last = _.last(path.path);
        if (path.path.length >= step) {
          if (last === to) {
            paths.splice(_.sortedIndexBy(paths, path, 'cost'), 0, path);
            dfd.notify(paths);
            betterCost = Math.max(betterCost, path.cost);
          }
          return done();
        }
        if (path.cost + step - path.path.length > betterCost) {
          console.info('cut by cost', path);
          return done();
        }
        _.each(Aspect.closes[last].reverse(), function(a) {
          stack.push({
            path: _.concat(path.path, [a]),
            cost: path.cost + Aspect.costs[a]
          });
        });
        done();
      }, function() {
        dfd.resolve(paths);
      });

      return dfd.promise;
    };
  })

  .directive("aspect", function(Aspect) {
    return {
      restrict: 'E',
      scope: {
        number: '='
      },
      template: '<img class="aspect" ng-src="aspects/{{ names[number] }}.png" title="{{ names[number] }}">',
      link: function(scope) {
        scope.names = Aspect.names;
      }
    }
  })

  .controller('MainCtrl', function($scope, Aspect, search) {
    $scope.names = Aspect.names;
    $scope.combinations = Aspect.combinations;
    $scope.from = $scope.to = Aspect.names[0];
    $scope.step = 3;
    $scope.searching = false;

    $scope.search = function() {
      var from = _.indexOf(Aspect.names, $scope.from);
      var to = _.indexOf(Aspect.names, $scope.to);
      $scope.searching = true;
      $scope.paths = [];
      search(from, to, $scope.step).then(function(paths) {
        $scope.searching = false;
        $scope.paths = paths;
      }, null, function(paths) {
        $scope.paths = paths;
      });
    };
  });