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

    var aspects = _.mapValues(COMBINATIONS, function() {
      return {name: null, cost: 0, to: null, from: null};
    });

    _.each(aspects, function(aspect, k) {
      aspect.name = k;
      aspect.from = _.map(COMBINATIONS[k], _.propertyOf(aspects));
      aspect.to = _.concat(aspect.from);
    });

    _.each(aspects, function(aspect1, k) {
      _.each(aspect1.from, function(aspect2) {
        aspect2.to.push(aspect1);
      });
    });

    var calcCost = function() {
      var prev = {};
      var current = {};
      var froms = _.chain(aspects).mapValues('from').transform(function(obj, from, k) {
        if (from.length === 0) {
          aspects[k].cost = prev[k] = 1;
        } else {
          obj[k] = from;
        }
      }).value();

      while (_.size(froms) > 0) {
        froms = _.transform(froms, function(obj, from, k) {
          from = _.filter(from, function(aspect) {
            if (prev[aspect.name]) {
              aspects[k].cost += prev[aspect.name];
            } else {
              return true;
            }
          });
          if (from.length === 0) {
            current[k] = aspects[k].cost;
          } else {
            obj[k] = from;
          }
        });
        prev = current;
        current = {};
      }
    };
    calcCost();

    _.each(aspects, function(aspect) {
      aspect.from = _.sortBy(aspect.from, 'cost');
      aspect.to = _.sortBy(aspect.to, 'cost');
    });

    return {
      keys: keys,
      aspects: aspects
    };
  })

  .factory('search', function($q, Aspect) {
    return function(from, to, step) {
      var dfd = $q.defer();
      var stack = [[from]];
      var laterStack = [];
      var paths = [];

      var updatePaths = function(path) {
        path = {path: path, cost: _.sumBy(path, 'cost')};
        paths.splice(_.sortedIndexBy(paths, path, 'cost'), 0, path);
      };

      async.whilst(function() {
        if (stack.length === 0 && paths.length === 0) {
          stack = laterStack;
        }
        return stack.length > 0;
      }, function(done) {
        var path = stack.shift();
        var last = _.last(path);
        if (path.length >= step) {
          if (last === to) {
            updatePaths(path);
            dfd.notify(paths);
          }
          return done();
        }
        var minCost = last.to[0].cost;
        _.each(last.to, function(a) {
          if (a.cost <= minCost + 1) {
            stack.push(_.concat(path, [a]));
          } else {
            laterStack.push(_.concat(path, [a]));
          }
        });
        done();
      }, function() {
        dfd.resolve(paths);
      });

      return dfd.promise;
    };
  })

  .directive("aspect", function() {
    return {
      restrict: 'E',
      scope: {
        src: '='
      },
      template: '<img class="aspect" ng-src="aspects/{{ src.name }}.png" title="{{ src.name }}">'
    }
  })

  .controller('MainCtrl', function($scope, Aspect, search) {
    $scope.keys = Aspect.keys;
    $scope.aspects = Aspect.aspects;
    $scope.from = $scope.to = Aspect.aspects[Aspect.keys[0]];
    $scope.step = 3;
    $scope.searching = false;

    $scope.search = function() {
      $scope.searching = true;
      $scope.paths = [];
      search($scope.from, $scope.to, $scope.step).then(function(paths) {
        $scope.searching = false;
        $scope.paths = paths;
      }, null, function(paths) {
        $scope.paths = paths;
      });
    };
  });