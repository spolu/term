/*
 * breach: session.js
 *
 * Copyright (c) 2013, Stanislas Polu. All rights reserved.
 * (see LICENSE file)
 *
 * @log
 * - 20130601 @spolu    Creation
 */
'use strict';

var common = require('./common.js');
var events = require('events');
var util = require('util');
var factory = common.factory;

//
// ## Session
//
// This is the central instance representing a session associated with one or
// multiple users (or screens)
//
// The session is an ordered list of `vt.js` terminals, an active terminal and
// a ui in charge of drawing 
