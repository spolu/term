/**
 * breach: term_d.js
 *
 * Copyright (c) 2013, Stanislas Polu. All rights reserved.
 * (see LICENSE file)
 *
 * @log
 * - 20130508 @spolu    Faster rendering using pure HTML
 * - 20130502 @spolu    Creation
 */
'use strict';

//
// ## TermCtrl
// `term` directive controller.
//
angular.module('breach.directives').
  controller('TermCtrl', function($scope, $element, $window, 
                                  _session, _colors) {

  //
  // ### glyph_style
  // ```
  // glyph {array} a glyph
  // ```
  // Computes the CSS style of a given glyph as an object
  //
  $scope.glyph_style = function(glyph) {
    var style = {};
    var bg = glyph[0] & 0x11f;
    style['background-color'] = _colors.palette[bg];
    var fg = (glyph[0] >> 9) & 0x11f;
    style['color'] = _colors.palette[fg];
    return style;
  };

  //
  // ### render_line
  // ```
  // @line {array} line of glyphs
  // @lnum {number} line number
  // ```
  // Renders a line of glyphs as div element
  //
  $scope.render_line = function(line, lnum) {
    var el = $(document.createElement('div'))
                .addClass('line')
                .attr('id', $scope.id + '-' + lnum);
    line.forEach(function(glyph) {
      el.append($(document.createElement('div'))
                  .addClass('glyph')
                  .css($scope.glyph_style(glyph))
                  .html(glyph[1]));
    });
    return el.get();
  };

  //
  // ### $on#refresh
  // ```
  // @evt {event} the event triggering this handler
  // @id  {string} the term id associated with this event
  // @dirty {array} the dirty region [first_line, last_line]
  // @slice {array} the slice of buffer to replace
  // ```
  // Handles a refresh event and refreshes the terminal if needed
  //
  $scope.$on('refresh', function(evt, id, dirty, slice) {
    if($scope.id === id) {
      for(var i = dirty[0]; i < dirty[1] + 1; i++) {
        var el = $scope.container.find('#' + $scope.id + '-' + i);
        if(el.length === 0) {
          if(slice[i - dirty[0]]) {
            /* df.appendChild($scope.render_line(slice[i - dirty[0]], i)[0]); */
            $scope.container.append($scope.render_line(slice[i - dirty[0]], i));
          }
        }
        else {
          if(slice[i - dirty[0]]) {
            var n = $scope.render_line(slice[i - dirty[0]], i);
            el.replaceWith(n);
            $(n).css({ 'font-style': 'bold' });
          }
          else {
            el.remove();
          }
        }
      }
    }
  });

  //
  // ### refresh_height
  // Sets the height of the term div according to the window height
  //
  $scope.refresh_height = function() {
    $($element).height($($window).height());
  };

  //
  // ### $window#resize
  //
  $($window).resize(function() {
    $scope.refresh_height();
  });


  //
  // #### _initialization_
  //
  $scope.container = $(document.createElement('div'))
                        .addClass('container');
  $($element).append($scope.container);

  $scope.refresh_height();

  $scope.buf = _session.terms($scope.id).buffer;
  var df = document.createDocumentFragment();
  for(var i = 0; i < $scope.buf.length; i ++) {
    df.appendChild($scope.render_line($scope.buf[i], i)[0]);
  }
  $scope.container.append(df);

});

//
// ## term
// ```
// @=id     {string} the term id to render (see session_s.js)
// ```
// The `term` directive renders a terminal buffer using `_session` data and row
// & cols sizes specification.
//
angular.module('breach.directives').
  directive('term', function() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      id: '=id'
    },
    template: '<div class="term"></div>',
    controller: 'TermCtrl'
  };
});
