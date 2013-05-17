/*
 * breach: term_spec.js
 *
 * Copyright (c) 2013, Stanislas Polu. All rights reserved.
 * (see LICENSE file)
 *
 * @log
 * - 20130517 @spolu    Creation
 */
'use strict';

var events = require('events');

describe('term', function() {
  /****************************************************************************/
  /*                           UTILITY FUNCTIONS                              */
  /****************************************************************************/
  var line_to_string = function(line) {
    var str = '';
    line.forEach(function(glyph) {
      str += glyph[1];
    });
    return str;
  };


  /****************************************************************************/
  /*                             INITIALIZATION                               */
  /****************************************************************************/
  var term, pty;

  beforeEach(function(done) {
    pty = new events.EventEmitter();
    term = require('../../lib/term.js').term({
      pty: pty,
      cols: 40,
      rows: 24
    });

    return done();
  });

  /****************************************************************************/
  /*                                CLEAN-UP                                  */
  /****************************************************************************/
  afterEach(function(done) {
    return done();
  });

  /****************************************************************************/
  /*                                  TESTS                                   */
  /****************************************************************************/
  it('should correctly print characters', function(done) {
    term.on('refresh', function() {
      var l = line_to_string(term.buffer()[0]);
      expect(l.length).toEqual(40);
      expect(l.substr(0, 4)).toEqual('test');
      return done();
    });
    pty.emit('data', 'test');
  });

  it('should correctly wrap the line', function(done) {
    term.on('refresh', function() {
      var l0 = line_to_string(term.buffer()[0]);
      var l1 = line_to_string(term.buffer()[1]);
      expect(l0).toEqual('EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE');
      expect(l1.substr(0, 10)).toEqual('EEEEEEEEEE');
      expect(l1.substr(10, 1)).toEqual(' ');
      return done();
    });
    var data = '';
    for(var i = 0; i < 50; i ++) data += 'E';
    pty.emit('data', data);
  });
  
});
