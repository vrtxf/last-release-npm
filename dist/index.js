'use strict';

var _error = require('@semantic-release/error');

var _error2 = _interopRequireDefault(_error);

var _npmRegistryClient = require('npm-registry-client');

var _npmRegistryClient2 = _interopRequireDefault(_npmRegistryClient);

var _npmlog = require('npmlog');

var _npmlog2 = _interopRequireDefault(_npmlog);

var _semver = require('semver');

var _semver2 = _interopRequireDefault(_semver);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function (pluginConfig, _ref, cb) {
  var pkg = _ref.pkg;
  var npm = _ref.npm;
  var plugins = _ref.plugins;
  var options = _ref.options;

  _npmlog2.default.level = npm.loglevel || 'warn';
  var clientConfig = { log: _npmlog2.default };
  // disable retries for tests
  if (pluginConfig && pluginConfig.retry) clientConfig.retry = pluginConfig.retry;
  var client = new _npmRegistryClient2.default(clientConfig);

  client.get('' + npm.registry + pkg.name.replace('/', '%2F'), {
    auth: npm.auth
  }, function (err, data) {
    if (err && (err.statusCode === 404 || /not found/i.test(err.message))) {
      return cb(null, {});
    }

    if (err) return cb(err);

    var version = data['dist-tags'][npm.tag];
    var unpublishedVersionsExist = false;
    var latestUnpublishedVersion = void 0;

    if (!version && options && options.fallbackTags && options.fallbackTags[npm.tag] && data['dist-tags'][options.fallbackTags[npm.tag]]) {
      version = data['dist-tags'][options.fallbackTags[npm.tag]];
    } else {
      (function () {
        var publishedLog = Object.keys(data.time).filter(_semver2.default.valid);
        var publishedVersions = Object.keys(data.versions).filter(_semver2.default.valid);
        var unpublishedVersions = publishedLog.filter(function (x) {
          return publishedVersions.indexOf(x) < 0;
        }).concat(publishedVersions.filter(function (x) {
          return publishedLog.indexOf(x) < 0;
        }));

        if (unpublishedVersions.length > 0) {
          unpublishedVersionsExist = true;

          if (unpublishedVersions.length === 1) {
            latestUnpublishedVersion = unpublishedVersions[0];
          } else {
            latestUnpublishedVersion = unpublishedVersions.reduce(function (prev, current) {
              return _semver2.default.gt(prev, current) ? prev : current;
            });

            unpublishedVersionsExist = _semver2.default.gt(latestUnpublishedVersion, version);
          }
        }
      })();
    }

    if (!version) {
      return cb(new _error2.default('There is no release with the dist-tag "' + npm.tag + '" yet.\nTag a version manually or define "fallbackTags".', 'ENODISTTAG'));
    }

    cb(null, {
      version: unpublishedVersionsExist ? latestUnpublishedVersion : version,
      gitHead: data.versions[version].gitHead,
      get tag() {
        _npmlog2.default.warn('deprecated', 'tag will be removed with the next major release');
        return npm.tag;
      }
    });
  });
};