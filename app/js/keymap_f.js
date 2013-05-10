/**
 * nvt: keymap_f.js
 *
 * Copyright (c) 2013, Stanislas Polu. All rights reserved.
 * (see LICENSE file)
 *
 * @log
 * - 20130510 @spolu    Creation
 */
'use strict';

//
// ### 'keymap'
// ```
// @key
angular.module('nvt.filters').
  filter('keymap', function($filter) {
    return function(evt, mode) {

      var TERM_MODE = {
        WRAP: 1,
        INSERT: 2,
        APPKEYPAD: 4,
        ALTSCREEN: 8,
        CRLF: 16,
        MOUSEBTN: 32,
        MOUSEMOTION: 64,
        MOUSE: 32|64,
        REVERSE: 128,
        KBDLOCK: 256,
        HIDE: 512,
        ECHO: 1024,
        APPCURSOR: 2048,
        MOUSESGR: 4096,
      };

      var ESC = '\x1b';
      var CSI = '\x1b[';
      var SS3 = '\x1bO';

      var mod = function(a, b) {
      };

      var map = {
        0:   ['[UNKNOWN]', '' ,                       '', '',          ''],

        27:  ['[ESC]',     ESC,                       '', '',          ''],
        112: ['[F1]',      mod(SS3 + 'Q', CSI + 'Q'), '', CSI + '24~', ''],
      };
    };
});
