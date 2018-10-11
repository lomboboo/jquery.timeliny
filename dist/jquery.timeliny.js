/**
 * A jQuery plugin for creating interactive year based timelines.
 * Author: Sylvain Simao - https://github.com/maoosi
 */

;(function ( $, window, document, undefined ) {

    "use strict";

	/**
	 * Plugin object constructor.
	 */
	function Plugin(element, options) {

		// References to DOM and jQuery versions of element.
		var el = element;
		var $el = $(element);
		var children = $el.children();

		// Extend default options with those supplied by user.
		options = $.extend({}, $.fn['timeliny'].defaults, options);
		/**
		 * Initialize plugin.
		 * @private
		 */
		function _init() {
			hook('onInit');

			_reorderElems();
			if (options.hideBlankYears === false) {
                _addGhostElems();
            }
			_createWrapper();
			_createDots();
			_fixBlockSizes();
			_clickBehavior();
      _setupItemsDistance();
      _arrowBehavior();
			_createVerticalLine();
			_updateTimelinePos();
			_resizeBehavior();
			_dragableTimeline();
			_loaded();
		}

		/**
		 * Reorder child elements according order option (uses data-year))
		 * @private
		 */
		function _reorderElems() {
			children.detach().sort(function(a, b) {
				return 	options.order === 'asc' ?
						$(a).data('year') - $(b).data('year') :
						$(b).data('year') - $(a).data('year');
			});

			$el.append(children);
		}

		/**
		 * Plugin is loaded
		 * @private
		 */
		function _loaded() {
			var currYear = $el.find('.' + options.className + '-timeblock.active').first().attr('data-year');
			hook('afterLoad', [currYear]);

      		$el.addClass('loaded');
		}

		/**
		 * Add ghost disabled elements for missing years
		 * @private
		 */
		function _addGhostElems() {
			var firstYear = parseInt(children.first().attr('data-year'));
			var lastYear = parseInt(children.last().attr('data-year'));

			if (options.order === 'asc') {
				for (var y=firstYear-options.boundaries; y<lastYear+options.boundaries +1; y++) {
					if ( children.parent().find('[data-year='+ y +']').length <= 0 ) {
						if (y > firstYear-options.boundaries) {
							children.parent().find('[data-year='+ (y - 1) +']').after('<div data-year="' + y + '" class="inactive"></div>');
						} else {
							children.first().before('<div data-year="' + y + '" class="inactive"></div>');
						}
					}
				}
			} else {
				for (var y=firstYear+options.boundaries; y>=lastYear-options.boundaries; y--) {
					if ( children.parent().find('[data-year='+ y +']').length <= 0 ) {
						if (y < firstYear+options.boundaries) {
							children.parent().find('[data-year=' + (y + 1) + ']').after('<div data-year="' + y + '" class="inactive"></div>');
						} else {
							children.first().before('<div data-year="' + y + '" class="inactive"></div>');
						}
					}
				}
			}

			children = $el.children();
		}

		/**
		 * Create wrapper
		 * @private
		 */
		function _createWrapper() {
			return $el.addClass(options.className).children().wrapAll( options.wrapper).wrapAll( '<div class="' + options.className + '-timeline"></div>' );
		}

		/**
		 * Fix sizes of timeline and timeblocks elements
		 * @private
		 */
		function _fixBlockSizes() {
			var timeBlockSize = $el.css('padding-top').replace('px', '') * 0.8;
			$el.find('.' + options.className + '-timeline').css('width', ''+ (children.length * timeBlockSize) +'px');
			$el.find('.' + options.className + '-timeliny-timeblock').css('width', '' + timeBlockSize + 'px');
		}

		/**
		 * Create html structure
		 * @private
		 */
		function _createDots() {
			children.each(function( index ) {
				var text = $(this).html();
				var year = $(this).attr('data-year');

				var dotHtml = '<a href="#' + year + '" class="' + options.className + '-dot" data-year="' + year + '" data-text="' + text + '"></a><span class="' + options.className + '-circle"></span>';

				$(this).addClass('' + options.className + '-timeblock').html(dotHtml);
			});
		}

		/**
		 * Create vertical line
		 * @private
		 */
		function _createVerticalLine() {
			var style = options.disableVerticalLine ? 'opacity: 0; position:absolute;z-index: -99999;' : '';
			$el.append('<div class="' + options.className + '-vertical-line" style="'+style+'"></div>');
		}

		/**
		 * Update the position of the timeline
		 * @private
		 */
		function _updateTimelinePos(callEvent) {
			var linePos = $el.find('.' + options.className + '-vertical-line').position().left;
			var activeDotPos = $el.find('.' + options.className + '-timeblock.active').position().left;
			var dotRadius = $el.find('.' + options.className + '-timeblock.active .' + options.className + '-dot').width() / 2;

			var diff = activeDotPos - linePos;
			var left;

			if (diff > 0) {
				left = '-' + (Math.abs(diff) + dotRadius + 1) +'';
			} else {
				left = '+' + (Math.abs(diff) - dotRadius - 1) +'';
			}

			$el.find('.' + options.className + '-timeline').animate({
				left: left
			}, options.animationSpeed, function() {
				if (typeof callEvent != 'undefined') {
					if (callEvent === 'click') {
						var currYear = $el.find('.' + options.className + '-timeblock.active').first().attr('data-year');
						hook('afterChange', [currYear]);
					}
					else if (callEvent === 'resize') hook('afterResize');
				}
			});
		}

		/**
		 * Listen for click event
		 * @private
		 */
		function _clickBehavior() {
			children.parent().find('.' + options.className + '-timeblock:not(.inactive) .' + options.className + '-dot').on('click touchstart', function(e) {
				e.preventDefault();

				var currYear = $(this).parent().parent().find('.' + options.className + '-timeblock.active').attr('data-year');
				var nextYear = $(this).attr('data-year');

				if (currYear != nextYear) {
					hook('onLeave', [currYear, nextYear]);

					children.removeClass('active');
					$(this).closest('.' + options.className + '-timeblock').addClass('active');
				}

				_updateTimelinePos('click');

				return false;
			});
		}

		/**
		 * Setup margins from element to element
		 * @private
		 */
		function _setupItemsDistance() {
			var distance = options.distance || 30;

			children.each(function(index) {
				var currYear = $(this).attr('data-year');
				var nextYear = $(this).next().attr('data-year');

        var margin = (parseInt(nextYear, 10) - parseInt(currYear, 10)) * distance;
        $(this).css('margin-right', margin);
			});
		}

		/**
		 * Arrow keys navigation
		 * @private
		 */
		function _arrowBehavior() {
			$('html').keydown(function (e) {

				if (e.which == 39) {
					var years = $(this).find('.' + options.className + '-timeblock:not(.inactive) .' + options.className + '-dot');
					var currYear = $(years).parent().parent().find('.' + options.className + '-timeblock.active').attr('data-year');
					var nextYear = $(years).parent().parent().find('.' + options.className + '-timeblock.active').next().attr('data-year');
					goToYear(nextYear);
				} else if (e.which == 37) {
					var years = $(this).find('.' + options.className + '-timeblock:not(.inactive) .' + options.className + '-dot');
					var currYear = $(years).parent().parent().find('.' + options.className + '-timeblock.active').attr('data-year');
					var prevYear = $(years).parent().parent().find('.' + options.className + '-timeblock.active').prev().attr('data-year');
					goToYear(prevYear);
				}

			});
		}

		/**
		 * Listen resize event
		 * @private
		 */
		function _resizeBehavior() {

			function debounce(callback, delay) {
				var timer;
				return function(){
					var args = arguments;
					var context = this;
					clearTimeout(timer);
					timer = setTimeout(function(){
						callback.apply(context, args);
					}, delay)
				}
			}

			$(window).on('resize.timeliny', debounce(function() {
				_updateTimelinePos('resize');
			}, 350));
		}

		/**
		 * Make the timeline draggable
		 * @private
		 */
		function _dragableTimeline() {

			var selected = null, x_pos = 0, x_elem = 0;
      var lastX;
      var directionRight = true;

			// Will be called when user starts dragging an element
			function _drag_init(elem, e) {
        if (e.targetTouches) {
          var touch = e.targetTouches[0];
          x_pos = touch.pageX;

          directionRight = undefined;
				}
				selected = elem;
				x_elem = x_pos - selected.offsetLeft;
			}

			// Will be called when user dragging an element
			function _move_elem(e) {
				/* if touch event / mobile */
				if (e.targetTouches) {
          var touch = e.targetTouches[0];
          x_pos = touch.pageX;
          selected.style.left = (touch.pageX - x_elem) + 'px';

          var currentX = e.originalEvent.touches[0].clientX;
          if(currentX > lastX){
            directionRight = false;
          }else if(currentX < lastX){
            directionRight = true;
          }
          lastX = currentX;
				} else {
          x_pos = document.all ? window.event.clientX : e.pageX;
          if (selected !== null) {
            selected.style.left = (x_pos - x_elem) + 'px';
          }
          var currentPageX = e.pageX;

          if(currentPageX > lastX){
            directionRight = false;
          } else if(currentPageX < lastX){
            directionRight = true;
          }

          lastX = currentPageX;

          var closestDotYearIndex = getClosestDotYearIndex(e, directionRight);
          var elements = $el.find('.' + options.className + '-dot');
          elements.removeClass('highlight');
          elements.eq(closestDotYearIndex).addClass('highlight');
				}
			}

			// Destroy the object when we are done
			function _stop_move(e) {
				if (selected) {
					var closestDotYearIndex = getClosestDotYearIndex(e, directionRight);
          var closestElement = $el.find('.' + options.className + '-dot').eq(closestDotYearIndex);
          closestElement.removeClass('highlight');
          closestElement.trigger('click');
					selected = null;
				}
			}

			// Bind the functions...
			if (options.draggedElement) {
        $(options.draggedElement).on('mousedown touchstart', function(e) {
          _drag_init($el.find('.'+ options.className +'-timeline')[0], e);
          return false;
        });

        $(options.draggedElement).on('mousemove touchmove', function(e) {
          _move_elem(e);
        });

        $(document).on('mouseup touchend', function(e) {
          _stop_move(e);
        });
			} else {
        $el.first().on('mousedown touchstart', function(e) {
          _drag_init($el.find('.'+ options.className +'-timeline')[0], e);
          return false;
        });
        $(document).on('mousemove.timeliny touchmove.timeliny', function(e) {
          _move_elem(e);
        });

        $(document).on('mouseup.timeliny touchend.timeliny', function(e) {
          _stop_move(e);
        });
			}
		}

		function getClosestDotYearIndex(e, directionRight) {
      // active the closest elem
			var distance = 0;
      var linePos = $el.find('.' + options.className + '-vertical-line').offset().left;
      var allDotsPos = [];

      children.parent().find('.' + options.className + '-timeblock:not(.inactive) .' + options.className + '-dot').each(function (index) {
        var currDotPos = $(this).offset().left;
        allDotsPos.push({ currDotPos: currDotPos, index: index });
      });

      if (e.targetTouches) {
      	var activeIndex = children.parent().find('.' + options.className + '-timeblock.active').index();
        return closestValue(linePos, allDotsPos, directionRight, distance, activeIndex);
      }

      return closestValue(linePos, allDotsPos, directionRight, distance);
		}

		/**
		 * Go to a particular year
		 * @public
		 */
		function goToYear(year) {
			var selector = $el.find('.' + options.className + '-timeblock[data-year=' + year + ']:not(.inactive) .' + options.className + '-dot').first();
			if (selector.length > 0) {
				selector.trigger('click');
			}
		}

    function closestValue(v, bandwidthSteps, directionRight, distance, activeIndex) {
      if (typeof activeIndex !== 'undefined') {
				var next = !bandwidthSteps[activeIndex + 1] ? activeIndex : activeIndex + 1;
				var prev = !bandwidthSteps[activeIndex - 1] ? activeIndex : activeIndex - 1;

				if (typeof directionRight === 'undefined') return activeIndex;

        return directionRight ? next : prev;
      }
      var value;

      bandwidthSteps.some(function (a, index, array) {
      	var nextEl = null;

				if (!array[index + 1]) {
					if (v >= a.currDotPos) {
            value = array[array.length - 1].index;
					} else {
            value = array[0].index;
					}

          return true;
				} else {
          nextEl = array[index + 1];
				}

        var delta = Math.abs(v - a.currDotPos);
        var diff = nextEl.currDotPos - a.currDotPos;
        var half = diff / 2;
        var velocity = directionRight ? half - half * distance : half + half * distance;
        var isBetween = a.currDotPos < v && v < nextEl.currDotPos;

        if (isBetween) {
        	if (delta >= velocity) {
            value = a.index + 1;
					} else {
            value = a.index;
					}

          return true;
        }
      });

      return value;
    }

		/**
		 * Get/set options.
		 * Get usage: $('#el').timeliny('option', 'key');
		 * Set usage: $('#el').timeliny('option', 'key', value);
		 */
		function option (key, val) {
			if (val) {
				options[key] = val;
			} else {
				return options[key];
			}
		}

		/**
		 * Destroy plugin.
		 * Usage: $('#el').timeliny('destroy');
		 */
		function destroy() {
			// Iterate over each matching element.
			$el.each(function() {
				var el = this;
				var $el = $(this);

				// Destroy completely the element and remove event listeners
				$(window).off('resize.timeliny');
				$el.find('.' + options.className + '-timeblock:not(.inactive) .' + options.className + '-dot').off('click');
				$(document).off('mousemove.timeliny');
				$(document).off('mouseup.timeliny');
				$el.first().off('mousedown');
				$el.remove();
				hook('onDestroy');

				// Remove Plugin instance from the element.
				$el.removeData('plugin_timeliny');
			});
		}

		/**
		 * Callback hooks.
		 */
		function hook(hookName, args) {
			if (options[hookName] !== undefined) {
				// Call the user defined function.
				// Scope is set to the jQuery element we are operating on.
				options[hookName].apply(el, args);
			}
		}

		// Initialize the plugin instance.
		_init();

		// Expose methods of Plugin we wish to be public.
		return {
			option: option,
			destroy: destroy,
			goToYear: goToYear
		};
	}

	/**
	 * Plugin definition.
	 */
	$.fn['timeliny'] = function(options) {
        console.log(options);
		// If the first parameter is a string, treat this as a call to
		// a public method.
		if (typeof arguments[0] === 'string') {
			var methodName = arguments[0];
			var args = Array.prototype.slice.call(arguments, 1);
			var returnVal;
			this.each(function() {
				// Check that the element has a plugin instance, and that
				// the requested public method exists.
				if ($.data(this, 'plugin_timeliny') && typeof $.data(this, 'plugin_timeliny')[methodName] === 'function') {
					// Call the method of the Plugin instance, and Pass it
					// the supplied arguments.
					returnVal = $.data(this, 'plugin_timeliny')[methodName].apply(this, args);
				} else {
					throw new Error('Method ' +  methodName + ' does not exist on jQuery.timeliny');
				}
			});
			if (returnVal !== undefined){
				// If the method returned a value, return the value.
				return returnVal;
			} else {
				// Otherwise, returning 'this' preserves chainability.
				return this;
			}
			// If the first parameter is an object (options), or was omitted,
			// instantiate a new instance of the plugin.
		} else if (typeof options === "object" || !options) {
			return this.each(function() {
				// Only allow the plugin to be instantiated once.
				if (!$.data(this, 'plugin_timeliny')) {
					// Pass options to Plugin constructor, and store Plugin
					// instance in the elements jQuery data object.
					$.data(this, 'plugin_timeliny', new Plugin(this, options));
				}
			});
		}
	};

	// Default plugin options.
	// Options can be overwritten when initializing plugin, by
	// passing an object literal, or after initialization:
	// $('#el').timeliny('option', 'key', value);
	$.fn['timeliny'].defaults = {
		order: 'asc',
		className: 'timeliny',
		wrapper: '<div class="timeliny-wrapper"></div>',
		boundaries: 2,
		animationSpeed: 250,
        hideBlankYears: false,
		onInit: function() {},
		onDestroy: function() {},
		afterLoad: function(currYear) {},
		onLeave: function(currYear, nextYear) {},
		afterChange: function(currYear) {},
		afterResize: function() {}
	};

})( jQuery, window, document );
