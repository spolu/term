/**
 * mt: factory.js
 *
 * Copyright (c) 2013, Stanislas Polu. All rights reserved.
 * (see LICENSE file)
 *
 */
var fwk = require('fwk');

 // Factory
 // -------
 //
 // Loads and manage all dependency for the `ntty` app.
 //
var factory = function(spec, my) {
  var _super = {};
  my = my || {};
  
  // Public methods.
  var config;
  var init;

  var that = fwk.factory(spec, my);


  // #### config
  // @return the config singleton
  config = function() {
    if(!my.cfg) {
      my.cfg = fwk.populateConfig(require("./config.js").config);
    }
    return my.cfg;
  };

  // #### init
  // Initialize modules that need to, like mongo.
  // @param cb_(err) callback
  init = function(cb_) {
    if(my.initialized)
      return cb_();

    my.initialized = true;
  };

  fwk.method(that, 'config', config, _super);
  fwk.method(that, 'init', init, _super);
  
  return that;
};

exports.factory = factory({ name: 'mt' });
