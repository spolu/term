/**
 * breach: breach.js
 *
 * Copyright (c) 2013, Stanislas Polu. All rights reserved.
 * (see LICENSE file)
 *
 * @log
 * - 20130602 spolu   Creation
 */
var util = require('util');
var events = require('events');
var common = require('./lib/common.js');

"use strict";

var _breach = {};

//
// ## Main executable
//
// This is the main executable for breach. It parses the command line and spawns
// a session and/or a screen according to the arguments:
//
// - `breach` spawns a new session and connect a screen to it
// - `breach --session` spawns a new session and exits
// - `breach <path>` or `breach <url>` connects to an existing session
// 


