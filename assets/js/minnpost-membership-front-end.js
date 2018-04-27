'use strict';

// plugin
;(function ($, window, document, undefined) {

	// Create the defaults once
	var pluginName = 'minnpostMembership',
	    defaults = {
		'debug': false, // this can be set to true on page level options
		'amount_selector_standalone': '#amount-item #amount',
		'frequency_selector_standalone': '.m-membership-fast-select input[type="radio"]',
		'amount_viewer': '.amount h3',
		'frequency_selector_in_levels': '.a-form-item-membership-frequency',
		'frequency_selector_in_levels_type': 'select',
		'levels_container': '.o-membership-member-levels',
		'single_level_container': '.m-membership-member-level',
		'single_level_summary_selector': '.m-member-level-brief',
		'flipped_items': 'div.amount, div.enter',
		'level_frequency_text_selector': '.show-frequency',
		'choose_amount_selector_in_levels': '.amount .a-button-flip',
		'amount_selector_in_levels': '.enter input.amount-entry'
	}; // end defaults

	// The actual plugin constructor
	function Plugin(element, options) {

		this.element = element;

		// jQuery has an extend method which merges the contents of two or
		// more objects, storing the result in the first object. The first object
		// is generally empty as we don't want to alter the default options for
		// future instances of the plugin
		this.options = $.extend({}, defaults, options);

		this._defaults = defaults;
		this._name = pluginName;

		this.init();
	} // end constructor

	Plugin.prototype = {

		init: function init(reset, amount) {
			// Place initialization logic here
			// You already have access to the DOM element and
			// the options via the instance, e.g. this.element
			// and this.options
			// you can add more functions like the one below and
			// call them like so: this.yourOtherFunction(this.element, this.options).
			this.catchHashLinks(this.element, this.options);
			this.levelFlipper(this.element, this.options);
			this.startLevelClick(this.element, this.options);
		},

		catchHashLinks: function catchHashLinks(element, options) {
			$('a[href*="#"]:not([href="#"])', element).click(function (e) {
				var target = $(e.target);
				if (target.parent('.comment-title').length == 0 && location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
					var target = $(this.hash);
					target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
					if (target.length) {
						$('html,body').animate({
							scrollTop: target.offset().top
						}, 1000);
						return false;
					}
				}
			});
		}, // end catchLinks

		levelFlipper: function levelFlipper(element, options) {
			var that = this;
			var previous_amount = '';
			var amount = 0;
			var level = '';
			var level_number = 0;
			var frequency_string = '';
			var frequency = '';
			var frequency_name = '';
			if (typeof minnpost_membership_data !== 'undefined') {
				previous_amount = minnpost_membership_data.current_user.previous_amount;
			}
			if ($(options.amount_selector_standalone).length > 0) {
				amount = $(options.amount_selector_standalone).val();
				frequency_string = $(options.frequency_selector_standalone + ':checked').val();
				frequency = frequency_string.split(' - ')[1];
				frequency_name = frequency_string.split(' - ')[0];
				console.log('there is an amount field. value is ' + amount);
				level = that.checkLevel(amount, frequency, frequency_string, previous_amount, element, options);
				console.log('initial level is ' + level);
				$(options.frequency_selector_standalone).change(function () {
					level = that.checkLevel($(options.amount_selector_standalone).val(), $(options.frequency_selector_standalone + ':checked').attr('data-year-frequency'), $(options.frequency_selector_standalone + ':checked').val(), previous_amount, element, options);
					console.log('input radio change level is ' + level);
				});

				$(options.amount_selector_standalone).bind('keyup mouseup', function () {
					if ($(this).data('last-value') != $(this).val()) {
						$(this).data('last-value', $(this).val());
						level = that.checkLevel($(options.amount_selector_standalone).val(), $(options.frequency_selector_standalone + ':checked').attr('data-year-frequency'), $(options.frequency_selector_standalone + ':checked').val(), previous_amount, element, options);
						console.log('input text change level is ' + level);
					};
				});
			}
			if ($(options.levels_container).length > 0) {
				$(options.single_level_summary_selector, element).each(function () {
					$(options.flipped_items, $(this)).wrapAll('<div class="flipper"/>');
				});
				$(options.frequency_selector_in_levels, element).on('focusout change', function (event) {
					level_number = $(this).data('member-level-number');
					frequency_string = $(this).val();
					frequency = frequency_string.split(' - ')[1];
					frequency_name = frequency_string.split(' - ')[0];
					if (typeof level_number !== 'undefined') {
						amount = $(options.amount_selector_in_levels + '[data-member-level-number="' + level_number + '"]').val();
						$(options.single_level_summary_selector, element).removeClass('flipped');
						$(options.single_level_container, element).removeClass('active');
						$(event.target).closest(options.single_level_summary_selector).addClass('flipped');
						level = that.checkLevel(amount, frequency, frequency_string, previous_amount, element, options);
						that.changeFrequency(frequency_string, level, element, options);

						if (frequency == 1) {
							$(options.amount_selector_in_levels).val($(options.amount_viewer, $(options.single_level_container + '-' + level_number)).data('default-yearly'));
						} else if (frequency == 12) {
							$(options.amount_selector_in_levels).val($(options.amount_viewer, $(options.single_level_container + '-' + level_number)).data('default-monthly'));
						}
					} else if ($(options.level_frequency_text_selector).length > 0) {
						$(options.level_frequency_text_selector, element).text(frequency_name);
						$(options.single_level_container).each(function () {
							level_number = $(options.amount_selector_in_levels, $(this)).data('member-level-number');
							if (typeof level_number !== 'undefined') {
								amount = $(options.amount_selector_in_levels, $(this)).val();
								level = that.checkLevel(amount, frequency, frequency_string, previous_amount, element, options);
							}
						});
					}

					that.changeAmountPreview(frequency_string, level, element, options);
				});
			}
			if ($(options.choose_amount_selector_in_levels).length > 0) {
				$(options.choose_amount_selector_in_levels, element).click(function (event) {
					level_number = $(options.frequency_selector_in_levels, element).data('member-level-number');
					$(options.single_level_summary_selector, element).removeClass('flipped');
					$(options.single_level_container, element).removeClass('active');
					$(event.target).closest(options.single_level_summary_selector).addClass('flipped');
					frequency_string = $(options.frequency_selector_in_levels, $(this).parent()).val();
					frequency = frequency_string.split(' - ')[1];
					amount = $(options.amount_selector_in_levels + '[data-member-level-number="' + level_number + '"]').val();
					level = that.checkLevel(amount, frequency, frequency_string, previous_amount, element, options);
					event.preventDefault();
				});
			}
		}, // end levelFlipper

		checkLevel: function checkLevel(amount, frequency, type, previous_amount, element, options) {
			var thisyear = amount * frequency;
			var level = '';
			var level_number = '';

			if (typeof previous_amount !== 'undefined' && previous_amount !== '') {
				var prior_year_amount = previous_amount.prior_year_amount;
				var coming_year_amount = previous_amount.coming_year_amount;
				var annual_recurring_amount = previous_amount.annual_recurring_amount;

				// calculate member level formula
				if (type === 'one-time') {
					prior_year_amount += thisyear;
				} else {
					annual_recurring_amount += thisyear;
				}

				thisyear = Math.max(prior_year_amount, coming_year_amount, annual_recurring_amount);
			}

			if (thisyear > 0 && thisyear < 60) {
				level = 'Bronze';
				level_number = 1;
			} else if (thisyear > 59 && thisyear < 120) {
				level = 'Silver';
				level_number = 2;
			} else if (thisyear > 119 && thisyear < 240) {
				level = 'Gold';
				level_number = 3;
			} else if (thisyear > 239) {
				level = 'Platinum';
				level_number = 4;
			}
			//console.log('level is ' + level + ' and amount is ' + thisyear);
			$('.fast-select .level').text(level);
			$('.fast-select .show-level').attr('class', 'show-level ' + level_number);

			if ($('.current-level').length > 0) {
				//console.dir('compare ' + $('.current-level').text().replace(/(<([^>]+)>)/ig,'') + ' to ' + $('.new-level').text().replace(/(<([^>]+)>)/ig,''));
				if ($('.current-level').text().replace(/(<([^>]+)>)/ig, '') != $('.new-level').text().replace(/(<([^>]+)>)/ig, '')) {
					$('.show-level .change').show();
					$('.show-level .nochange').hide();
				} else {
					$('.show-level .change').hide();
					$('.show-level .nochange').show();
				}
			}

			$('h2', options.single_level_summary_selector).each(function () {
				//console.log('this text is ' + $(this).text() + ' and the level is ' + level);
				if ($(this).text() == level) {
					$(options.single_level_container, element).removeClass('active');
					//var parent = $(this).parent().parent().addClass( 'active' );
				}
			});
			return level.toLowerCase();
		}, // end checkLevel

		changeFrequency: function changeFrequency(selected, level, element, options) {
			$(options.single_level_summary_selector).each(function () {
				var range = $(options.amount_viewer, $(this)).text();
				var month_value = $(options.amount_viewer, $(this)).data('month');
				var year_value = $(options.amount_viewer, $(this)).data('year');
				var once_value = $(options.amount_viewer, $(this)).data('one-time');
				var frequency_name = selected.split(' - ')[0];
				var frequency = parseInt(selected.split(' - ')[1]);

				$(options.frequency_selector_in_levels).val(selected);
				$(options.frequency_selector_in_levels).prop('selected', selected);

				if (frequency_name == 'per month') {
					range = month_value;
					$(options.amount_viewer, $(this)).removeClass('smaller');
				} else if (frequency_name == 'per year') {
					range = year_value;
					$(options.amount_viewer, $(this)).addClass('smaller');
				} else if (frequency_name == 'one-time') {
					range = once_value;
					$(options.amount_viewer, $(this)).addClass('smaller');
				}

				$(options.amount_viewer, $(this)).text(range);
				$(options.frequency_selector_in_levels, $(this)).data('frequency', frequency);
			});
		}, // end changeFrequency

		changeAmountPreview: function changeAmountPreview(selected, level, element, options) {
			$(options.single_level_summary_selector).each(function () {
				var range = $(options.amount_viewer, $(this)).text();
				var month_value = $(options.amount_viewer, $(this)).data('month');
				var year_value = $(options.amount_viewer, $(this)).data('year');
				var once_value = $(options.amount_viewer, $(this)).data('one-time');
				var frequency_name = selected.split(' - ')[0];

				if (frequency_name == 'per month') {
					range = month_value;
					$(options.amount_viewer, $(this)).removeClass('smaller');
				} else if (frequency_name == 'per year') {
					range = year_value;
					$(options.amount_viewer, $(this)).addClass('smaller');
				} else if (frequency_name == 'one-time') {
					range = once_value;
					$(options.amount_viewer, $(this)).addClass('smaller');
				}

				$(options.amount_viewer, $(this)).text(range);
			});
		}, // end changeAmountPreview

		startLevelClick: function startLevelClick(element, options) {
			$('.start-level').click(function () {
				var level_class = $(this).prop('class');
				var level_number = level_class[level_class.length - 1];
				$(options.single_level_summary_selector, element).removeClass('flipped');
				$(options.single_level_container, element).removeClass('active');
				$(options.single_level_container + '-' + level_number, element).addClass('active');
				$(options.single_level_container + '-' + level_number + ' ' + options.single_level_summary_selector).addClass('flipped');
			});
		} // end startLevelClick

	}; // end Plugin.prototype

	// A really lightweight plugin wrapper around the constructor,
	// preventing against multiple instantiations
	$.fn[pluginName] = function (options) {
		return this.each(function () {
			if (!$.data(this, 'plugin_' + pluginName)) {
				$.data(this, 'plugin_' + pluginName, new Plugin(this, options));
			}
		});
	};
})(jQuery, window, document);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1lbWJlci1sZXZlbHMuanMiXSwibmFtZXMiOlsiJCIsIndpbmRvdyIsImRvY3VtZW50IiwidW5kZWZpbmVkIiwicGx1Z2luTmFtZSIsImRlZmF1bHRzIiwiUGx1Z2luIiwiZWxlbWVudCIsIm9wdGlvbnMiLCJleHRlbmQiLCJfZGVmYXVsdHMiLCJfbmFtZSIsImluaXQiLCJwcm90b3R5cGUiLCJyZXNldCIsImFtb3VudCIsImNhdGNoSGFzaExpbmtzIiwibGV2ZWxGbGlwcGVyIiwic3RhcnRMZXZlbENsaWNrIiwiY2xpY2siLCJlIiwidGFyZ2V0IiwicGFyZW50IiwibGVuZ3RoIiwibG9jYXRpb24iLCJwYXRobmFtZSIsInJlcGxhY2UiLCJob3N0bmFtZSIsImhhc2giLCJzbGljZSIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiLCJ0aGF0IiwicHJldmlvdXNfYW1vdW50IiwibGV2ZWwiLCJsZXZlbF9udW1iZXIiLCJmcmVxdWVuY3lfc3RyaW5nIiwiZnJlcXVlbmN5IiwiZnJlcXVlbmN5X25hbWUiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEiLCJjdXJyZW50X3VzZXIiLCJhbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSIsInZhbCIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lIiwic3BsaXQiLCJjb25zb2xlIiwibG9nIiwiY2hlY2tMZXZlbCIsImNoYW5nZSIsImF0dHIiLCJiaW5kIiwiZGF0YSIsImxldmVsc19jb250YWluZXIiLCJzaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciIsImVhY2giLCJmbGlwcGVkX2l0ZW1zIiwid3JhcEFsbCIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJvbiIsImV2ZW50IiwiYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsInJlbW92ZUNsYXNzIiwic2luZ2xlX2xldmVsX2NvbnRhaW5lciIsImNsb3Nlc3QiLCJhZGRDbGFzcyIsImNoYW5nZUZyZXF1ZW5jeSIsImFtb3VudF92aWV3ZXIiLCJsZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciIsInRleHQiLCJjaGFuZ2VBbW91bnRQcmV2aWV3IiwiY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJwcmV2ZW50RGVmYXVsdCIsInR5cGUiLCJ0aGlzeWVhciIsInByaW9yX3llYXJfYW1vdW50IiwiY29taW5nX3llYXJfYW1vdW50IiwiYW5udWFsX3JlY3VycmluZ19hbW91bnQiLCJNYXRoIiwibWF4Iiwic2hvdyIsImhpZGUiLCJ0b0xvd2VyQ2FzZSIsInNlbGVjdGVkIiwicmFuZ2UiLCJtb250aF92YWx1ZSIsInllYXJfdmFsdWUiLCJvbmNlX3ZhbHVlIiwicGFyc2VJbnQiLCJwcm9wIiwibGV2ZWxfY2xhc3MiLCJmbiIsImpRdWVyeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBLENBQUMsQ0FBQyxVQUFXQSxDQUFYLEVBQWNDLE1BQWQsRUFBc0JDLFFBQXRCLEVBQWdDQyxTQUFoQyxFQUE0Qzs7QUFFN0M7QUFDQSxLQUFJQyxhQUFhLHFCQUFqQjtBQUFBLEtBQ0FDLFdBQVc7QUFDVixXQUFVLEtBREEsRUFDTztBQUNqQixnQ0FBK0Isc0JBRnJCO0FBR1YsbUNBQWtDLCtDQUh4QjtBQUlWLG1CQUFrQixZQUpSO0FBS1Ysa0NBQWlDLG1DQUx2QjtBQU1WLHVDQUFzQyxRQU41QjtBQU9WLHNCQUFxQiw2QkFQWDtBQVFWLDRCQUEyQiw0QkFSakI7QUFTVixtQ0FBa0MsdUJBVHhCO0FBVVYsbUJBQWtCLHVCQVZSO0FBV1YsbUNBQWtDLGlCQVh4QjtBQVlWLHNDQUFxQyx3QkFaM0I7QUFhViwrQkFBOEI7QUFicEIsRUFEWCxDQUg2QyxDQWtCMUM7O0FBRUg7QUFDQSxVQUFTQyxNQUFULENBQWlCQyxPQUFqQixFQUEwQkMsT0FBMUIsRUFBb0M7O0FBRW5DLE9BQUtELE9BQUwsR0FBZUEsT0FBZjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQUtDLE9BQUwsR0FBZVIsRUFBRVMsTUFBRixDQUFVLEVBQVYs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QUNIL0QsTUFBR1EsUUFBUXdELHNCQUFYLEVBQW1DekQsT0FBbkMsRUFBNEN3RCxXQUE1QyxDQUF5RCxRQUF6RDtBQUNHL0QsTUFBR1EsUUFBUXdELHNCQUFSLEdBQWlDLEdBQWpDLEdBQXVDM0IsWUFBMUMsRUFBd0Q5QixPQUF4RCxFQUFrRTJELFFBQWxFLENBQTRFLFFBQTVFO0FBQ0FsRSxNQUFHUSxRQUFRd0Qsc0JBQVIsR0FBaUMsR0FBakMsR0FBdUMzQixZQUF2QyxHQUFzRCxHQUF0RCxHQUE0RDdCLFFBQVErQyw2QkFBdkUsRUFBdUdXLFFBQXZHLENBQWlILFNBQWpIO0FBQ0QsSUFQSDtBQVFBLEdBL09pQixDQStPZjs7QUEvT2UsRUFBbkIsQ0FyQzZDLENBc1IxQzs7QUFFSDtBQUNBO0FBQ0FsRSxHQUFFNEYsRUFBRixDQUFLeEYsVUFBTCxJQUFtQixVQUFXSSxPQUFYLEVBQXFCO0FBQ3ZDLFNBQU8sS0FBS2dELElBQUwsQ0FBVSxZQUFZO0FBQzVCLE9BQUssQ0FBRXhELEVBQUVxRCxJQUFGLENBQVEsSUFBUixFQUFjLFlBQVlqRCxVQUExQixDQUFQLEVBQWdEO0FBQy9DSixNQUFFcUQsSUFBRixDQUFRLElBQVIsRUFBYyxZQUFZakQsVUFBMUIsRUFBc0MsSUFBSUUsTUFBSixDQUFZLElBQVosRUFBa0JFLE9BQWxCLENBQXRDO0FBQ0E7QUFDRCxHQUpNLENBQVA7QUFLQSxFQU5EO0FBUUEsQ0FsU0EsRUFrU0dxRixNQWxTSCxFQWtTVzVGLE1BbFNYLEVBa1NtQkMsUUFsU25CIiwiZmlsZSI6Im1pbm5wb3N0LW1lbWJlcnNoaXAtZnJvbnQtZW5kLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gcGx1Z2luXG47KGZ1bmN0aW9uICggJCwgd2luZG93LCBkb2N1bWVudCwgdW5kZWZpbmVkICkge1xuXG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdF9tZW1iZXJzaGlwJyxcblx0ZGVmYXVsdHMgPSB7XG5cdFx0J2RlYnVnJyA6IGZhbHNlLCAvLyB0aGlzIGNhbiBiZSBzZXQgdG8gdHJ1ZSBvbiBwYWdlIGxldmVsIG9wdGlvbnNcblx0XHQnYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUnIDogJyNhbW91bnQtaXRlbSAjYW1vdW50Jyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUnIDogJy5tLW1lbWJlcnNoaXAtZmFzdC1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHQnYW1vdW50X3ZpZXdlcicgOiAnLmFtb3VudCBoMycsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5hLWZvcm0taXRlbS1tZW1iZXJzaGlwLWZyZXF1ZW5jeScsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHNfdHlwZScgOiAnc2VsZWN0Jyxcblx0XHQnbGV2ZWxzX2NvbnRhaW5lcicgOiAnLm8tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWxzJyxcblx0XHQnc2luZ2xlX2xldmVsX2NvbnRhaW5lcicgOiAnLm0tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWwnLFxuXHRcdCdzaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcicgOiAnLm0tbWVtYmVyLWxldmVsLWJyaWVmJyxcblx0XHQnZmxpcHBlZF9pdGVtcycgOiAnZGl2LmFtb3VudCwgZGl2LmVudGVyJyxcblx0XHQnbGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3InIDogJy5zaG93LWZyZXF1ZW5jeScsXG5cdFx0J2Nob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuYW1vdW50IC5hLWJ1dHRvbi1mbGlwJyxcblx0XHQnYW1vdW50X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmVudGVyIGlucHV0LmFtb3VudC1lbnRyeScsXG5cdH07IC8vIGVuZCBkZWZhdWx0c1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblxuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCgge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblxuXHRcdGluaXQ6IGZ1bmN0aW9uKCByZXNldCwgYW1vdW50ICkge1xuXHRcdFx0Ly8gUGxhY2UgaW5pdGlhbGl6YXRpb24gbG9naWMgaGVyZVxuXHRcdFx0Ly8gWW91IGFscmVhZHkgaGF2ZSBhY2Nlc3MgdG8gdGhlIERPTSBlbGVtZW50IGFuZFxuXHRcdFx0Ly8gdGhlIG9wdGlvbnMgdmlhIHRoZSBpbnN0YW5jZSwgZS5nLiB0aGlzLmVsZW1lbnRcblx0XHRcdC8vIGFuZCB0aGlzLm9wdGlvbnNcblx0XHRcdC8vIHlvdSBjYW4gYWRkIG1vcmUgZnVuY3Rpb25zIGxpa2UgdGhlIG9uZSBiZWxvdyBhbmRcblx0XHRcdC8vIGNhbGwgdGhlbSBsaWtlIHNvOiB0aGlzLnlvdXJPdGhlckZ1bmN0aW9uKHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKS5cblx0XHRcdHRoaXMuY2F0Y2hIYXNoTGlua3MoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKTtcblx0XHRcdHRoaXMubGV2ZWxGbGlwcGVyKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdFx0dGhpcy5zdGFydExldmVsQ2xpY2soIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cblx0XHR9LFxuXG5cdFx0Y2F0Y2hIYXNoTGlua3M6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnYVtocmVmKj1cIiNcIl06bm90KFtocmVmPVwiI1wiXSknLCBlbGVtZW50KS5jbGljayhmdW5jdGlvbihlKSB7XG5cdFx0XHQgICAgdmFyIHRhcmdldCA9ICQoZS50YXJnZXQpO1xuXHRcdFx0ICAgIGlmICh0YXJnZXQucGFyZW50KCcuY29tbWVudC10aXRsZScpLmxlbmd0aCA9PSAwICYmIGxvY2F0aW9uLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCcnKSA9PSB0aGlzLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCcnKSAmJiBsb2NhdGlvbi5ob3N0bmFtZSA9PSB0aGlzLmhvc3RuYW1lKSB7XG5cdFx0XHRcdCAgICB2YXIgdGFyZ2V0ID0gJCh0aGlzLmhhc2gpO1xuXHRcdFx0XHQgICAgdGFyZ2V0ID0gdGFyZ2V0Lmxlbmd0aCA/IHRhcmdldCA6ICQoJ1tuYW1lPScgKyB0aGlzLmhhc2guc2xpY2UoMSkgKyddJyk7XG5cdFx0XHRcdFx0aWYgKHRhcmdldC5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdCQoJ2h0bWwsYm9keScpLmFuaW1hdGUoe1xuXHRcdFx0XHRcdFx0XHRzY3JvbGxUb3A6IHRhcmdldC5vZmZzZXQoKS50b3Bcblx0XHRcdFx0XHRcdH0sIDEwMDApO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIGNhdGNoTGlua3NcblxuXHRcdGxldmVsRmxpcHBlcjogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR2YXIgcHJldmlvdXNfYW1vdW50ID0gJyc7XG5cdFx0XHR2YXIgYW1vdW50ID0gMDtcblx0XHRcdHZhciBsZXZlbCA9ICcnO1xuXHRcdFx0dmFyIGxldmVsX251bWJlciA9IDA7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X3N0cmluZyA9ICcnO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeSA9ICcnO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9uYW1lID0gJyc7XG5cdFx0XHRpZiAoIHR5cGVvZiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRwcmV2aW91c19hbW91bnQgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLnByZXZpb3VzX2Ftb3VudDtcblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS52YWwoKTtcblx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcpLnZhbCgpO1xuXHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdFx0Y29uc29sZS5sb2coICd0aGVyZSBpcyBhbiBhbW91bnQgZmllbGQuIHZhbHVlIGlzICcgKyBhbW91bnQgKTtcblx0XHRcdCAgICBsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9zdHJpbmcsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0ICAgIGNvbnNvbGUubG9nKCdpbml0aWFsIGxldmVsIGlzICcgKyBsZXZlbCk7XG5cdFx0XHQgICAgJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lKS5jaGFuZ2UoIGZ1bmN0aW9uKCkge1xuXHRcdFx0ICAgICAgbGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS52YWwoKSwgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcgKS5hdHRyKCAnZGF0YS15ZWFyLWZyZXF1ZW5jeScgKSwgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcgKS52YWwoKSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHQgICAgICBjb25zb2xlLmxvZygnaW5wdXQgcmFkaW8gY2hhbmdlIGxldmVsIGlzICcgKyBsZXZlbCk7XG5cdFx0XHQgICAgfSk7XG5cblx0XHRcdCAgICAkKG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUpLmJpbmQoJ2tleXVwIG1vdXNldXAnLCBmdW5jdGlvbigpIHtcblx0XHRcdCAgICAgIGlmKCQodGhpcykuZGF0YSgnbGFzdC12YWx1ZScpICE9ICQodGhpcykudmFsKCkpIHtcblx0XHRcdCAgICAgICAgJCh0aGlzKS5kYXRhKCdsYXN0LXZhbHVlJywgJCh0aGlzKS52YWwoKSk7XG5cdFx0XHQgICAgICAgIGxldmVsID0gdGhhdC5jaGVja0xldmVsKCAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lICkudmFsKCksICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnICkuYXR0ciggJ2RhdGEteWVhci1mcmVxdWVuY3knICksICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnKS52YWwoKSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHQgICAgICAgIGNvbnNvbGUubG9nKCdpbnB1dCB0ZXh0IGNoYW5nZSBsZXZlbCBpcyAnICsgbGV2ZWwpO1xuXHRcdFx0ICAgICAgfTtcblx0XHRcdCAgICB9KTtcblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5sZXZlbHNfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCApLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5mbGlwcGVkX2l0ZW1zLCAkKHRoaXMpICkud3JhcEFsbCggJzxkaXYgY2xhc3M9XCJmbGlwcGVyXCIvPicgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLm9uKCdmb2N1c291dCBjaGFuZ2UnLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKHRoaXMpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJCh0aGlzKS52YWwoKTtcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0XHQgICAgaWYgKCB0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArICdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArIGxldmVsX251bWJlciArICdcIl0nKS52YWwoKTtcblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0XHQkKCBldmVudC50YXJnZXQgKS5jbG9zZXN0KCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfc3RyaW5nLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRcdHRoYXQuY2hhbmdlRnJlcXVlbmN5KCBmcmVxdWVuY3lfc3RyaW5nLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdFx0XHRpZiAoIGZyZXF1ZW5jeSA9PSAxICkge1xuXHRcdFx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMpLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQteWVhcmx5JyApICk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3kgPT0gMTIgKSB7XG5cdFx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscykudmFsKCAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkuZGF0YSgnZGVmYXVsdC1tb250aGx5JyApICk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR9IGVsc2UgaWYgKCAkKCBvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRcdCQob3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciwgZWxlbWVudCkudGV4dChmcmVxdWVuY3lfbmFtZSk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJChvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRcdFx0aWYgKCB0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykgKS52YWwoKTtcblx0XHRcdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9zdHJpbmcsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR0aGF0LmNoYW5nZUFtb3VudFByZXZpZXcoIGZyZXF1ZW5jeV9zdHJpbmcsIGxldmVsLCBlbGVtZW50LCBvcHRpb25zICk7XG5cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoICQoIG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHQkKCBvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykucGFyZW50KCkgKS52YWwoKTtcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKyAnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgKyBsZXZlbF9udW1iZXIgKyAnXCJdJykudmFsKCk7XG5cdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfc3RyaW5nLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgbGV2ZWxGbGlwcGVyXG5cblx0XHRjaGVja0xldmVsOiBmdW5jdGlvbiggYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHQgIHZhciB0aGlzeWVhciA9IGFtb3VudCAqIGZyZXF1ZW5jeTtcblx0XHQgIHZhciBsZXZlbCA9ICcnO1xuXHRcdCAgdmFyIGxldmVsX251bWJlciA9ICcnO1xuXG5cdFx0ICBpZiAoIHR5cGVvZiBwcmV2aW91c19hbW91bnQgIT09ICd1bmRlZmluZWQnICYmIHByZXZpb3VzX2Ftb3VudCAhPT0gJycgKSB7XG5cdFx0ICAgIHZhciBwcmlvcl95ZWFyX2Ftb3VudCA9IHByZXZpb3VzX2Ftb3VudC5wcmlvcl95ZWFyX2Ftb3VudDtcblx0XHQgICAgdmFyIGNvbWluZ195ZWFyX2Ftb3VudCA9IHByZXZpb3VzX2Ftb3VudC5jb21pbmdfeWVhcl9hbW91bnQ7XG5cdFx0ICAgIHZhciBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCA9IHByZXZpb3VzX2Ftb3VudC5hbm51YWxfcmVjdXJyaW5nX2Ftb3VudDtcblxuXHRcdCAgICAvLyBjYWxjdWxhdGUgbWVtYmVyIGxldmVsIGZvcm11bGFcblx0XHQgICAgaWYgKCB0eXBlID09PSAnb25lLXRpbWUnICkge1xuXHRcdCAgICAgIHByaW9yX3llYXJfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdCAgICB9IGVsc2Uge1xuXHRcdCAgICAgIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdCAgICB9XG5cblx0XHQgICAgdGhpc3llYXIgPSBNYXRoLm1heCggcHJpb3JfeWVhcl9hbW91bnQsIGNvbWluZ195ZWFyX2Ftb3VudCwgYW5udWFsX3JlY3VycmluZ19hbW91bnQgKTtcblx0XHQgIH1cblxuXHRcdCAgaWYgKCB0aGlzeWVhciA+IDAgJiYgdGhpc3llYXIgPCA2MCApIHtcblx0XHQgICAgbGV2ZWwgPSAnQnJvbnplJztcblx0XHQgICAgbGV2ZWxfbnVtYmVyID0gMTtcblx0XHQgIH1cblx0XHQgIGVsc2UgaWYgKHRoaXN5ZWFyID4gNTkgJiYgdGhpc3llYXIgPCAxMjApIHtcblx0XHQgICAgbGV2ZWwgPSAnU2lsdmVyJztcblx0XHQgICAgbGV2ZWxfbnVtYmVyID0gMjtcblx0XHQgIH0gZWxzZSBpZiAodGhpc3llYXIgPiAxMTkgJiYgdGhpc3llYXIgPCAyNDApIHtcblx0XHQgICAgbGV2ZWwgPSAnR29sZCc7XG5cdFx0ICAgIGxldmVsX251bWJlciA9IDM7XG5cdFx0ICB9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMjM5KSB7XG5cdFx0ICAgIGxldmVsID0gJ1BsYXRpbnVtJztcblx0XHQgICAgbGV2ZWxfbnVtYmVyID0gNDtcblx0XHQgIH1cblx0XHQgIC8vY29uc29sZS5sb2coJ2xldmVsIGlzICcgKyBsZXZlbCArICcgYW5kIGFtb3VudCBpcyAnICsgdGhpc3llYXIpO1xuXHRcdCAgJCgnLmZhc3Qtc2VsZWN0IC5sZXZlbCcpLnRleHQobGV2ZWwpO1xuXHRcdCAgJCgnLmZhc3Qtc2VsZWN0IC5zaG93LWxldmVsJykuYXR0cignY2xhc3MnLCAnc2hvdy1sZXZlbCAnICsgbGV2ZWxfbnVtYmVyKTtcblxuXHRcdCAgaWYgKCAkKCAnLmN1cnJlbnQtbGV2ZWwnICkubGVuZ3RoID4gMCApIHtcblx0XHQgICAgLy9jb25zb2xlLmRpcignY29tcGFyZSAnICsgJCgnLmN1cnJlbnQtbGV2ZWwnKS50ZXh0KCkucmVwbGFjZSgvKDwoW14+XSspPikvaWcsJycpICsgJyB0byAnICsgJCgnLm5ldy1sZXZlbCcpLnRleHQoKS5yZXBsYWNlKC8oPChbXj5dKyk+KS9pZywnJykpO1xuXHRcdCAgICBpZiAoICQoJy5jdXJyZW50LWxldmVsJykudGV4dCgpLnJlcGxhY2UoLyg8KFtePl0rKT4pL2lnLCcnKSAhPSAkKCcubmV3LWxldmVsJykudGV4dCgpLnJlcGxhY2UoLyg8KFtePl0rKT4pL2lnLCcnKSApIHtcblx0XHQgICAgICAkKCcuc2hvdy1sZXZlbCAuY2hhbmdlJykuc2hvdygpO1xuXHRcdCAgICAgICQoJy5zaG93LWxldmVsIC5ub2NoYW5nZScpLmhpZGUoKTtcblx0XHQgICAgfSBlbHNlIHtcblx0XHQgICAgICAkKCcuc2hvdy1sZXZlbCAuY2hhbmdlJykuaGlkZSgpO1xuXHRcdCAgICAgICQoJy5zaG93LWxldmVsIC5ub2NoYW5nZScpLnNob3coKTtcblx0XHQgICAgfVxuXHRcdCAgfVxuXG5cdFx0ICAkKCdoMicsIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IpLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdCAgICAvL2NvbnNvbGUubG9nKCd0aGlzIHRleHQgaXMgJyArICQodGhpcykudGV4dCgpICsgJyBhbmQgdGhlIGxldmVsIGlzICcgKyBsZXZlbCk7XG5cdFx0ICAgIGlmICggJCh0aGlzKS50ZXh0KCkgPT0gbGV2ZWwgKSB7XG5cdFx0ICAgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHQgICAgICAvL3ZhciBwYXJlbnQgPSAkKHRoaXMpLnBhcmVudCgpLnBhcmVudCgpLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdCAgICB9XG5cdFx0ICB9ICk7XG5cdFx0ICByZXR1cm4gbGV2ZWwudG9Mb3dlckNhc2UoKTtcblxuXHRcdH0sIC8vIGVuZCBjaGVja0xldmVsXG5cblx0XHRjaGFuZ2VGcmVxdWVuY3k6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdCAgICB2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHQgICAgdmFyIG9uY2VfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnb25lLXRpbWUnKTtcblx0XHRcdCAgICB2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHQgICAgdmFyIGZyZXF1ZW5jeSAgICAgID0gcGFyc2VJbnQoIHNlbGVjdGVkLnNwbGl0KCcgLSAnKVsxXSApO1xuXG5cdFx0XHQgICAgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzICkudmFsKCBzZWxlY3RlZCApO1xuICAgIFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyApLnByb3AoICdzZWxlY3RlZCcsIHNlbGVjdGVkICk7XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcbiAgICBcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykgKS5kYXRhKCAnZnJlcXVlbmN5JywgZnJlcXVlbmN5ICk7XG5cblx0XHRcdH0gKTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlRnJlcXVlbmN5XG5cblx0XHRjaGFuZ2VBbW91bnRQcmV2aWV3OiBmdW5jdGlvbiggc2VsZWN0ZWQsIGxldmVsLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcmFuZ2UgICAgICAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCk7XG5cdFx0XHRcdHZhciBtb250aF92YWx1ZSAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ21vbnRoJyk7XG5cdFx0XHQgICAgdmFyIHllYXJfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgneWVhcicpO1xuXHRcdFx0ICAgIHZhciBvbmNlX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ29uZS10aW1lJyk7XG5cdFx0XHQgICAgdmFyIGZyZXF1ZW5jeV9uYW1lID0gc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHRcdGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciBtb250aCcgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5yZW1vdmVDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgeWVhcicgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gb25jZV92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcygnc21hbGxlcicgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoIHJhbmdlICk7XG5cblx0XHRcdH0gKTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlQW1vdW50UHJldmlld1xuXG5cdFx0c3RhcnRMZXZlbENsaWNrOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoJy5zdGFydC1sZXZlbCcpLmNsaWNrKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgbGV2ZWxfY2xhc3MgPSAkKCB0aGlzICkucHJvcCggJ2NsYXNzJyApO1xuXHRcdFx0XHR2YXIgbGV2ZWxfbnVtYmVyID0gbGV2ZWxfY2xhc3NbbGV2ZWxfY2xhc3MubGVuZ3RoIC0xXTtcblx0XHRcdCAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyLCBlbGVtZW50ICkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICsgJyAnICsgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdCAgfSk7XG5cdFx0fSwgLy8gZW5kIHN0YXJ0TGV2ZWxDbGlja1xuXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblx0Ly8gQSByZWFsbHkgbGlnaHR3ZWlnaHQgcGx1Z2luIHdyYXBwZXIgYXJvdW5kIHRoZSBjb25zdHJ1Y3Rvcixcblx0Ly8gcHJldmVudGluZyBhZ2FpbnN0IG11bHRpcGxlIGluc3RhbnRpYXRpb25zXG5cdCQuZm5bcGx1Z2luTmFtZV0gPSBmdW5jdGlvbiAoIG9wdGlvbnMgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoICEgJC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lICkgKSB7XG5cdFx0XHRcdCQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSwgbmV3IFBsdWdpbiggdGhpcywgb3B0aW9ucyApICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG5cbn0pKCBqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQgKTtcbiJdfQ==
