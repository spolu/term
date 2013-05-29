var util = require('util');
var fs = require('fs');
var path = require('path');

var gui = require('nw.gui');
var common = require(path.join(process.cwd(), 'lib', 'common.js' ));
var factory = common.factory({ debug: false });

var _breach = _breach || {};

_breach.PACKAGE_JSON = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'package.json' ))
);


_breach.VERSION = _breach.PACKAGE_JSON.version;
_breach.LOGGING = true;
_breach.options = {};

_breach.intro = function() {
  factory.log().info('Welcome to Breach'); 
  factory.log().info('v' + _breach.VERSION);
  factory.log().info('');
}

_breach.commands = {
  'attach': null,
  'listen': null,
  'new': null
};

_breach.run = function() {
  _breach.exec(process.argv.splice(2), function(err) {
    if(err) {
      _breach.LOGGING = true;
      _breach.error(err);
    }
    else {
      factory.log().info('\nBreach OK');
    }
    process.exit(err ? 1 : 0);
  });
};

_breach.exec = function(commands, cb_) {
  try {
    for(var i = commands.length - 1; i >= 0; i --) {
      if(commands[i].substr(0,2) === '--') {
        var opt = commands.splice(i, 1)[0];
        _breach.options[opt.split('=')[0].substr(2)] = 
          opt.split('=', 2)[1] || true;
      }
    }

    var cmd = commands[0];
    var args = commands.splice(1);

    switch(cmd) {
      case 'attach':
      case 'listen':
      case 'new': {
        _breach.intro();
        _breach.commands[cmd]({
          options: _breach.options
        }).execute(args, cb_);
      }
      case 'help':
      {
        _breach.intro();
        if(args.length > 0) {
          _breach.commands[args[0]]({ 
            options: phl0cks.options,
          }).help(args.splice(1), cb_);
        }
        else {
          _breach.welcome(cb_);
        }
        break;
      }
      default: {
        _breach.intro();
        _breach.welcome(cb_);
      }
    }
  }
  catch(err) {
    return cb_(err);
  }
};

_breach.welcome = function(cb_) {
  factory.log().info('Breach Commands:');
  factory.log().info('');
  factory.log().info('To start a terminal:');
  factory.log().info('--------------------');
  factory.log().info('  breach [new]');
  factory.log().info('');
  factory.log().info('To start a session without attaching a screen:');
  factory.log().info('----------------------------------------------');
  factory.log().info('  breach listen [<port>] [--key=X]');
  factory.log().info('');
  factory.log().info('To attach to an existing session:');
  factory.log().info('---------------------------------');
  factory.log().info('  breach attach <url>');
  factory.log().info('');
  factory.log().info('To get help:');
  factory.log().info('------------');
  factory.log().info('  breach help [<command>]');
  return cb_();
};

_breach.run();

/*
var new_win = gui.Window.get(
  window.open('./screen/index.html')
);
*/

