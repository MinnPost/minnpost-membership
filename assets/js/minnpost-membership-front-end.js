'use strict';

// plugin
;(function ($, window, document, undefined) {

	// Create the defaults once
	var pluginName = 'minnpostMembership',
	    defaults = {
		'debug': false, // this can be set to true on page level options
		'amount_selector_standalone': '#amount-item #amount',
		'frequency_selector_standalone': '.m-membership-fast-select input[type="radio"]',
		'level_viewer_container': '.a-show-level',
		'level_name': '.a-level',
		'user_current_level': '.a-current-level',
		'user_new_level': '.a-new-level',
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

				level = that.checkLevel(amount, frequency, frequency_name, previous_amount, element, options);
				that.showNewLevel(element, options, level);

				$(options.frequency_selector_standalone).change(function () {

					frequency_string = $(options.frequency_selector_standalone + ':checked').val();
					frequency = frequency_string.split(' - ')[1];
					frequency_name = frequency_string.split(' - ')[0];

					level = that.checkLevel($(options.amount_selector_standalone).val(), $(options.frequency_selector_standalone + ':checked').attr('data-year-frequency'), frequency_name, previous_amount, element, options);
					that.showNewLevel(element, options, level);
				});

				$(options.amount_selector_standalone).bind('keyup mouseup', function () {
					frequency_string = $(options.frequency_selector_standalone + ':checked').val();
					frequency = frequency_string.split(' - ')[1];
					frequency_name = frequency_string.split(' - ')[0];
					if ($(this).data('last-value') != $(this).val()) {
						$(this).data('last-value', $(this).val());
						level = that.checkLevel($(options.amount_selector_standalone).val(), $(options.frequency_selector_standalone + ':checked').attr('data-year-frequency'), frequency_name, previous_amount, element, options);
						that.showNewLevel(element, options, level);
					};
				});
			}
			if ($(options.levels_container).length > 0) {
				$(options.single_level_summary_selector, element).each(function () {
					$(options.flipped_items, $(this)).wrapAll('<div class="flipper"/>');
				});
				$(options.frequency_selector_in_levels, element).on('change', function (event) {
					level_number = $(this).data('member-level-number');
					frequency_string = $(this).val();
					frequency = frequency_string.split(' - ')[1];
					frequency_name = frequency_string.split(' - ')[0];
					if (typeof level_number !== 'undefined') {

						$(options.single_level_summary_selector, element).removeClass('flipped');
						$(options.single_level_container, element).removeClass('active');
						$(event.target).closest(options.single_level_summary_selector).addClass('flipped');

						if (frequency == 1) {
							$(options.amount_selector_in_levels).val($(options.amount_viewer, $(options.single_level_container + '-' + level_number)).data('default-yearly'));
						} else if (frequency == 12) {
							$(options.amount_selector_in_levels).val($(options.amount_viewer, $(options.single_level_container + '-' + level_number)).data('default-monthly'));
						}

						amount = $(options.amount_selector_in_levels + '[data-member-level-number="' + level_number + '"]').val();

						level = that.checkLevel(amount, frequency, frequency_name, previous_amount, element, options);
						that.changeFrequency(frequency_string, level['name'], element, options);
					} else if ($(options.level_frequency_text_selector).length > 0) {
						$(options.level_frequency_text_selector, element).text(frequency_name);
						$(options.single_level_container).each(function () {
							level_number = $(options.amount_selector_in_levels, $(this)).data('member-level-number');
							if (typeof level_number !== 'undefined') {
								amount = $(options.amount_selector_in_levels, $(this)).val();
								level = that.checkLevel(amount, frequency, frequency_name, previous_amount, element, options);
							}
						});
					}

					that.changeAmountPreview(frequency_string, level['name'], element, options);
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
					level = that.checkLevel(amount, frequency, frequency_name, previous_amount, element, options);
					event.preventDefault();
				});
			}
		}, // end levelFlipper

		checkLevel: function checkLevel(amount, frequency, type, previous_amount, element, options) {
			var thisyear = parseInt(amount) * parseInt(frequency);
			var level = '';
			if (typeof previous_amount !== 'undefined' && previous_amount !== '') {
				var prior_year_amount = parseInt(previous_amount.prior_year_contributions);
				var coming_year_amount = parseInt(previous_amount.coming_year_contributions);
				var annual_recurring_amount = parseInt(previous_amount.annual_recurring_amount);
				// calculate member level formula
				if (type === 'one-time') {
					prior_year_amount += thisyear;
				} else {
					annual_recurring_amount += thisyear;
				}

				thisyear = Math.max(prior_year_amount, coming_year_amount, annual_recurring_amount);
			}

			level = this.getLevel(thisyear);

			$('h2', options.single_level_summary_selector).each(function () {
				if ($(this).text() == level['name']) {
					$(options.single_level_container, element).removeClass('active');
					$(this).parent().parent().addClass('active');
				}
			});
			return level;
		}, // end checkLevel

		getLevel: function getLevel(thisyear) {
			var level = [];
			if (thisyear > 0 && thisyear < 60) {
				level['name'] = 'Bronze';
				level['number'] = 1;
			} else if (thisyear > 59 && thisyear < 120) {
				level['name'] = 'Silver';
				level['number'] = 2;
			} else if (thisyear > 119 && thisyear < 240) {
				level['name'] = 'Gold';
				level['number'] = 3;
			} else if (thisyear > 239) {
				level['name'] = 'Platinum';
				level['number'] = 4;
			}
			return level;
		}, // end getLevel

		showNewLevel: function showNewLevel(element, options, level) {
			var member_level_prefix = '';
			var old_level = '';
			var level_viewer_container_selector = options.level_viewer_container; // this should change when we replace the text, if there is a link inside it
			var decodeHtmlEntity = function decodeHtmlEntity(str) {
				return str.replace(/&#(\d+);/g, function (match, dec) {
					return String.fromCharCode(dec);
				});
			};
			if (typeof minnpost_membership_data !== 'undefined') {
				member_level_prefix = minnpost_membership_data.member_level_prefix;
			}

			$(options.level_viewer_container).prop('class', 'a-show-level a-show-level-' + level['name'].toLowerCase());

			if (minnpost_membership_data.current_user.member_level.length > 0) {

				if ('a', $(options.level_viewer_container).length > 0) {
					level_viewer_container_selector = options.level_viewer_container + ' a';
				}

				old_level = minnpost_membership_data.current_user.member_level.replace(member_level_prefix, '');

				if (old_level !== level['name'].toLowerCase()) {
					$(level_viewer_container_selector).html(decodeHtmlEntity($(options.level_viewer_container).data('changed')));
				} else {
					$(level_viewer_container_selector).html(decodeHtmlEntity($(options.level_viewer_container).data('not-changed')));
				}
			}

			$(options.level_name, options.level_viewer_container).text(level['name']);
		}, // end showNewLevel

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1lbWJlci1sZXZlbHMuanMiXSwibmFtZXMiOlsiJCIsIndpbmRvdyIsImRvY3VtZW50IiwidW5kZWZpbmVkIiwicGx1Z2luTmFtZSIsImRlZmF1bHRzIiwiUGx1Z2luIiwiZWxlbWVudCIsIm9wdGlvbnMiLCJleHRlbmQiLCJfZGVmYXVsdHMiLCJfbmFtZSIsImluaXQiLCJwcm90b3R5cGUiLCJyZXNldCIsImFtb3VudCIsImNhdGNoSGFzaExpbmtzIiwibGV2ZWxGbGlwcGVyIiwic3RhcnRMZXZlbENsaWNrIiwiY2xpY2siLCJlIiwidGFyZ2V0IiwicGFyZW50IiwibGVuZ3RoIiwibG9jYXRpb24iLCJwYXRobmFtZSIsInJlcGxhY2UiLCJob3N0bmFtZSIsImhhc2giLCJzbGljZSIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiLCJ0aGF0IiwicHJldmlvdXNfYW1vdW50IiwibGV2ZWwiLCJsZXZlbF9udW1iZXIiLCJmcmVxdWVuY3lfc3RyaW5nIiwiZnJlcXVlbmN5IiwiZnJlcXVlbmN5X25hbWUiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEiLCJjdXJyZW50X3VzZXIiLCJhbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSIsInZhbCIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lIiwic3BsaXQiLCJjaGVja0xldmVsIiwic2hvd05ld0xldmVsIiwiY2hhbmdlIiwiYXR0ciIsImJpbmQiLCJkYXRhIiwibGV2ZWxzX2NvbnRhaW5lciIsInNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yIiwiZWFjaCIsImZsaXBwZWRfaXRlbXMiLCJ3cmFwQWxsIiwiZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyIsIm9uIiwiZXZlbnQiLCJyZW1vdmVDbGFzcyIsInNpbmdsZV9sZXZlbF9jb250YWluZXIiLCJjbG9zZXN0IiwiYWRkQ2xhc3MiLCJhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwiYW1vdW50X3ZpZXdlciIsImNoYW5nZUZyZXF1ZW5jeSIsImxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yIiwidGV4dCIsImNoYW5nZUFtb3VudFByZXZpZXciLCJjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsInByZXZlbnREZWZhdWx0IiwidHlwZSIsInRoaXN5ZWFyIiwicGFyc2VJbnQiLCJwcmlvcl95ZWFyX2Ftb3VudCIsInByaW9yX3llYXJfY29udHJpYnV0aW9ucyIsImNvbWluZ195ZWFyX2Ftb3VudCIsImNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMiLCJhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCIsIk1hdGgiLCJtYXgiLCJnZXRMZXZlbCIsIm1lbWJlcl9sZXZlbF9wcmVmaXgiLCJvbGRfbGV2ZWwiLCJsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yIiwibGV2ZWxfdmlld2VyX2NvbnRhaW5lciIsImRlY29kZUh0bWxFbnRpdHkiLCJzdHIiLCJtYXRjaCIsImRlYyIsIlN0cmluZyIsImZyb21DaGFyQ29kZSIsInByb3AiLCJ0b0xvd2VyQ2FzZSIsIm1lbWJlcl9sZXZlbCIsImh0bWwiLCJsZXZlbF9uYW1lIiwic2VsZWN0ZWQiLCJyYW5nZSIsIm1vbnRoX3ZhbHVlIiwieWVhcl92YWx1ZSIsIm9uY2VfdmFsdWUiLCJsZXZlbF9jbGFzcyIsImZuIiwialF1ZXJ5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0EsQ0FBQyxDQUFDLFVBQVdBLENBQVgsRUFBY0MsTUFBZCxFQUFzQkMsUUFBdEIsRUFBZ0NDLFNBQWhDLEVBQTRDOztBQUU3QztBQUNBLEtBQUlDLGFBQWEsb0JBQWpCO0FBQUEsS0FDQUMsV0FBVztBQUNWLFdBQVUsS0FEQSxFQUNPO0FBQ2pCLGdDQUErQixzQkFGckI7QUFHVixtQ0FBa0MsK0NBSHhCO0FBSVYsNEJBQTJCLGVBSmpCO0FBS1YsZ0JBQWUsVUFMTDtBQU1WLHdCQUF1QixrQkFOYjtBQU9WLG9CQUFtQixjQVBUO0FBUVYsbUJBQWtCLFlBUlI7QUFTVixrQ0FBaUMsbUNBVHZCO0FB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QTVFO0FBQ0FoRSxNQUFHUSxRQUFRc0Qsc0JBQVIsR0FBaUMsR0FBakMsR0FBdUN6QixZQUF2QyxHQUFzRCxHQUF0RCxHQUE0RDdCLFFBQVE4Qyw2QkFBdkUsRUFBdUdVLFFBQXZHLENBQWlILFNBQWpIO0FBQ0QsSUFQSDtBQVFBLEdBbFJpQixDQWtSZjs7QUFsUmUsRUFBbkIsQ0F6QzZDLENBNlQxQzs7QUFFSDtBQUNBO0FBQ0FoRSxHQUFFeUcsRUFBRixDQUFLckcsVUFBTCxJQUFtQixVQUFXSSxPQUFYLEVBQXFCO0FBQ3ZDLFNBQU8sS0FBSytDLElBQUwsQ0FBVSxZQUFZO0FBQzVCLE9BQUssQ0FBRXZELEVBQUVvRCxJQUFGLENBQVEsSUFBUixFQUFjLFlBQVloRCxVQUExQixDQUFQLEVBQWdEO0FBQy9DSixNQUFFb0QsSUFBRixDQUFRLElBQVIsRUFBYyxZQUFZaEQsVUFBMUIsRUFBc0MsSUFBSUUsTUFBSixDQUFZLElBQVosRUFBa0JFLE9BQWxCLENBQXRDO0FBQ0E7QUFDRCxHQUpNLENBQVA7QUFLQSxFQU5EO0FBUUEsQ0F6VUEsRUF5VUdrRyxNQXpVSCxFQXlVV3pHLE1BelVYLEVBeVVtQkMsUUF6VW5CIiwiZmlsZSI6Im1pbm5wb3N0LW1lbWJlcnNoaXAtZnJvbnQtZW5kLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gcGx1Z2luXG47KGZ1bmN0aW9uICggJCwgd2luZG93LCBkb2N1bWVudCwgdW5kZWZpbmVkICkge1xuXG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdE1lbWJlcnNoaXAnLFxuXHRkZWZhdWx0cyA9IHtcblx0XHQnZGVidWcnIDogZmFsc2UsIC8vIHRoaXMgY2FuIGJlIHNldCB0byB0cnVlIG9uIHBhZ2UgbGV2ZWwgb3B0aW9uc1xuXHRcdCdhbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZScgOiAnI2Ftb3VudC1pdGVtICNhbW91bnQnLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZScgOiAnLm0tbWVtYmVyc2hpcC1mYXN0LXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdCdsZXZlbF92aWV3ZXJfY29udGFpbmVyJyA6ICcuYS1zaG93LWxldmVsJyxcblx0XHQnbGV2ZWxfbmFtZScgOiAnLmEtbGV2ZWwnLFxuXHRcdCd1c2VyX2N1cnJlbnRfbGV2ZWwnIDogJy5hLWN1cnJlbnQtbGV2ZWwnLFxuXHRcdCd1c2VyX25ld19sZXZlbCcgOiAnLmEtbmV3LWxldmVsJyxcblx0XHQnYW1vdW50X3ZpZXdlcicgOiAnLmFtb3VudCBoMycsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5hLWZvcm0taXRlbS1tZW1iZXJzaGlwLWZyZXF1ZW5jeScsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHNfdHlwZScgOiAnc2VsZWN0Jyxcblx0XHQnbGV2ZWxzX2NvbnRhaW5lcicgOiAnLm8tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWxzJyxcblx0XHQnc2luZ2xlX2xldmVsX2NvbnRhaW5lcicgOiAnLm0tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWwnLFxuXHRcdCdzaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcicgOiAnLm0tbWVtYmVyLWxldmVsLWJyaWVmJyxcblx0XHQnZmxpcHBlZF9pdGVtcycgOiAnZGl2LmFtb3VudCwgZGl2LmVudGVyJyxcblx0XHQnbGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3InIDogJy5zaG93LWZyZXF1ZW5jeScsXG5cdFx0J2Nob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuYW1vdW50IC5hLWJ1dHRvbi1mbGlwJyxcblx0XHQnYW1vdW50X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmVudGVyIGlucHV0LmFtb3VudC1lbnRyeScsXG5cdH07IC8vIGVuZCBkZWZhdWx0c1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblxuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCgge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblxuXHRcdGluaXQ6IGZ1bmN0aW9uKCByZXNldCwgYW1vdW50ICkge1xuXHRcdFx0Ly8gUGxhY2UgaW5pdGlhbGl6YXRpb24gbG9naWMgaGVyZVxuXHRcdFx0Ly8gWW91IGFscmVhZHkgaGF2ZSBhY2Nlc3MgdG8gdGhlIERPTSBlbGVtZW50IGFuZFxuXHRcdFx0Ly8gdGhlIG9wdGlvbnMgdmlhIHRoZSBpbnN0YW5jZSwgZS5nLiB0aGlzLmVsZW1lbnRcblx0XHRcdC8vIGFuZCB0aGlzLm9wdGlvbnNcblx0XHRcdC8vIHlvdSBjYW4gYWRkIG1vcmUgZnVuY3Rpb25zIGxpa2UgdGhlIG9uZSBiZWxvdyBhbmRcblx0XHRcdC8vIGNhbGwgdGhlbSBsaWtlIHNvOiB0aGlzLnlvdXJPdGhlckZ1bmN0aW9uKHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKS5cblx0XHRcdHRoaXMuY2F0Y2hIYXNoTGlua3MoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKTtcblx0XHRcdHRoaXMubGV2ZWxGbGlwcGVyKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdFx0dGhpcy5zdGFydExldmVsQ2xpY2soIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cblx0XHR9LFxuXG5cdFx0Y2F0Y2hIYXNoTGlua3M6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnYVtocmVmKj1cIiNcIl06bm90KFtocmVmPVwiI1wiXSknLCBlbGVtZW50KS5jbGljayhmdW5jdGlvbihlKSB7XG5cdFx0XHQgICAgdmFyIHRhcmdldCA9ICQoZS50YXJnZXQpO1xuXHRcdFx0ICAgIGlmICh0YXJnZXQucGFyZW50KCcuY29tbWVudC10aXRsZScpLmxlbmd0aCA9PSAwICYmIGxvY2F0aW9uLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCcnKSA9PSB0aGlzLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCcnKSAmJiBsb2NhdGlvbi5ob3N0bmFtZSA9PSB0aGlzLmhvc3RuYW1lKSB7XG5cdFx0XHRcdCAgICB2YXIgdGFyZ2V0ID0gJCh0aGlzLmhhc2gpO1xuXHRcdFx0XHQgICAgdGFyZ2V0ID0gdGFyZ2V0Lmxlbmd0aCA/IHRhcmdldCA6ICQoJ1tuYW1lPScgKyB0aGlzLmhhc2guc2xpY2UoMSkgKyddJyk7XG5cdFx0XHRcdFx0aWYgKHRhcmdldC5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdCQoJ2h0bWwsYm9keScpLmFuaW1hdGUoe1xuXHRcdFx0XHRcdFx0XHRzY3JvbGxUb3A6IHRhcmdldC5vZmZzZXQoKS50b3Bcblx0XHRcdFx0XHRcdH0sIDEwMDApO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIGNhdGNoTGlua3NcblxuXHRcdGxldmVsRmxpcHBlcjogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR2YXIgcHJldmlvdXNfYW1vdW50ID0gJyc7XG5cdFx0XHR2YXIgYW1vdW50ID0gMDtcblx0XHRcdHZhciBsZXZlbCA9ICcnO1xuXHRcdFx0dmFyIGxldmVsX251bWJlciA9IDA7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X3N0cmluZyA9ICcnO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeSA9ICcnO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9uYW1lID0gJyc7XG5cdFx0XHRpZiAoIHR5cGVvZiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRwcmV2aW91c19hbW91bnQgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLnByZXZpb3VzX2Ftb3VudDtcblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS52YWwoKTtcblx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcpLnZhbCgpO1xuXHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0ICAgIGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0ICAgIHRoYXQuc2hvd05ld0xldmVsKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApO1xuXG5cdFx0XHQgICAgJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lKS5jaGFuZ2UoIGZ1bmN0aW9uKCkge1xuXG5cdFx0XHQgICAgXHRmcmVxdWVuY3lfc3RyaW5nID0gJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcpLnZhbCgpXG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0ICAgICAgbGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS52YWwoKSwgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcgKS5hdHRyKCAnZGF0YS15ZWFyLWZyZXF1ZW5jeScgKSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0ICAgICAgdGhhdC5zaG93TmV3TGV2ZWwoIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICk7XG5cdFx0XHQgICAgfSk7XG5cblx0XHRcdCAgICAkKG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUpLmJpbmQoJ2tleXVwIG1vdXNldXAnLCBmdW5jdGlvbigpIHtcblx0XHRcdCAgICBcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJykudmFsKClcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0ICAgICAgaWYoJCh0aGlzKS5kYXRhKCdsYXN0LXZhbHVlJykgIT0gJCh0aGlzKS52YWwoKSkge1xuXHRcdFx0ICAgICAgICAkKHRoaXMpLmRhdGEoJ2xhc3QtdmFsdWUnLCAkKHRoaXMpLnZhbCgpKTtcblx0XHRcdCAgICAgICAgbGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS52YWwoKSwgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcgKS5hdHRyKCAnZGF0YS15ZWFyLWZyZXF1ZW5jeScgKSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0ICAgICAgICB0aGF0LnNob3dOZXdMZXZlbCggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKTtcblx0XHRcdCAgICAgIH07XG5cdFx0XHQgICAgfSk7XG5cblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5sZXZlbHNfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCApLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5mbGlwcGVkX2l0ZW1zLCAkKHRoaXMpICkud3JhcEFsbCggJzxkaXYgY2xhc3M9XCJmbGlwcGVyXCIvPicgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKHRoaXMpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJCh0aGlzKS52YWwoKTtcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0XHQgICAgaWYgKCB0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJyApIHtcblxuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHRcdCQoIGV2ZW50LnRhcmdldCApLmNsb3Nlc3QoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cblx0XHRcdFx0XHRcdGlmICggZnJlcXVlbmN5ID09IDEgKSB7XG5cdFx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscykudmFsKCAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkuZGF0YSgnZGVmYXVsdC15ZWFybHknICkgKTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeSA9PSAxMiApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LW1vbnRobHknICkgKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXG5cdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRcdHRoYXQuY2hhbmdlRnJlcXVlbmN5KCBmcmVxdWVuY3lfc3RyaW5nLCBsZXZlbFsnbmFtZSddLCBlbGVtZW50LCBvcHRpb25zICk7XG5cblx0XHRcdFx0XHR9IGVsc2UgaWYgKCAkKCBvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRcdCQob3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciwgZWxlbWVudCkudGV4dChmcmVxdWVuY3lfbmFtZSk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJChvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRcdFx0aWYgKCB0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykgKS52YWwoKTtcblx0XHRcdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0dGhhdC5jaGFuZ2VBbW91bnRQcmV2aWV3KCBmcmVxdWVuY3lfc3RyaW5nLCBsZXZlbFsnbmFtZSddLCBlbGVtZW50LCBvcHRpb25zICk7XG5cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoICQoIG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHQkKCBvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykucGFyZW50KCkgKS52YWwoKTtcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKyAnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgKyBsZXZlbF9udW1iZXIgKyAnXCJdJykudmFsKCk7XG5cdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIGxldmVsRmxpcHBlclxuXG5cdFx0Y2hlY2tMZXZlbDogZnVuY3Rpb24oIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0ICB2YXIgdGhpc3llYXIgPSBwYXJzZUludCggYW1vdW50ICkgKiBwYXJzZUludCggZnJlcXVlbmN5ICk7XG5cdFx0ICB2YXIgbGV2ZWwgPSAnJztcblx0XHQgIGlmICggdHlwZW9mIHByZXZpb3VzX2Ftb3VudCAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJldmlvdXNfYW1vdW50ICE9PSAnJyApIHtcblx0XHQgICAgdmFyIHByaW9yX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoIHByZXZpb3VzX2Ftb3VudC5wcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMgKTtcblx0XHQgICAgdmFyIGNvbWluZ195ZWFyX2Ftb3VudCA9IHBhcnNlSW50KCBwcmV2aW91c19hbW91bnQuY29taW5nX3llYXJfY29udHJpYnV0aW9ucyApO1xuXHRcdCAgICB2YXIgYW5udWFsX3JlY3VycmluZ19hbW91bnQgPSBwYXJzZUludCggcHJldmlvdXNfYW1vdW50LmFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICk7XG5cdFx0ICAgIC8vIGNhbGN1bGF0ZSBtZW1iZXIgbGV2ZWwgZm9ybXVsYVxuXHRcdCAgICBpZiAoIHR5cGUgPT09ICdvbmUtdGltZScgKSB7XG5cdFx0ICAgICAgcHJpb3JfeWVhcl9hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0ICAgIH0gZWxzZSB7XG5cdFx0ICAgICAgYW5udWFsX3JlY3VycmluZ19hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0ICAgIH1cblxuXHRcdCAgICB0aGlzeWVhciA9IE1hdGgubWF4KCBwcmlvcl95ZWFyX2Ftb3VudCwgY29taW5nX3llYXJfYW1vdW50LCBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCApO1xuXHRcdCAgfVxuXG5cdFx0ICBsZXZlbCA9IHRoaXMuZ2V0TGV2ZWwoIHRoaXN5ZWFyICk7XG5cblx0XHQgICQoJ2gyJywgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcikuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0ICAgIGlmICggJCh0aGlzKS50ZXh0KCkgPT0gbGV2ZWxbJ25hbWUnXSApIHtcblx0XHQgICAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdCAgICAgICQodGhpcykucGFyZW50KCkucGFyZW50KCkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0ICAgIH1cblx0XHQgIH0gKTtcblx0XHQgIHJldHVybiBsZXZlbDtcblxuXHRcdH0sIC8vIGVuZCBjaGVja0xldmVsXG5cblx0XHRnZXRMZXZlbDogZnVuY3Rpb24oIHRoaXN5ZWFyICkge1xuXHRcdFx0dmFyIGxldmVsID0gW107XG5cdFx0XHRpZiAoIHRoaXN5ZWFyID4gMCAmJiB0aGlzeWVhciA8IDYwICkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ0Jyb256ZSc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDE7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmICh0aGlzeWVhciA+IDU5ICYmIHRoaXN5ZWFyIDwgMTIwKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnU2lsdmVyJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMjtcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAxMTkgJiYgdGhpc3llYXIgPCAyNDApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdHb2xkJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMztcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAyMzkpIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdQbGF0aW51bSc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDQ7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbGV2ZWw7XG5cdFx0fSwgLy8gZW5kIGdldExldmVsXG5cblx0XHRzaG93TmV3TGV2ZWw6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApIHtcblx0XHRcdHZhciBtZW1iZXJfbGV2ZWxfcHJlZml4ID0gJyc7XG5cdFx0XHR2YXIgb2xkX2xldmVsID0gJyc7XG5cdFx0XHR2YXIgbGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciA9IG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lcjsgLy8gdGhpcyBzaG91bGQgY2hhbmdlIHdoZW4gd2UgcmVwbGFjZSB0aGUgdGV4dCwgaWYgdGhlcmUgaXMgYSBsaW5rIGluc2lkZSBpdFxuXHRcdFx0dmFyIGRlY29kZUh0bWxFbnRpdHkgPSBmdW5jdGlvbiggc3RyICkge1xuXHRcdFx0XHRyZXR1cm4gc3RyLnJlcGxhY2UoIC8mIyhcXGQrKTsvZywgZnVuY3Rpb24oIG1hdGNoLCBkZWMgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoIGRlYyApO1xuXHRcdFx0XHR9KTtcblx0XHRcdH07XG5cdFx0XHRpZiAoIHR5cGVvZiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRtZW1iZXJfbGV2ZWxfcHJlZml4ID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLm1lbWJlcl9sZXZlbF9wcmVmaXg7XG5cdFx0XHR9XG5cblx0XHRcdCQob3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyKS5wcm9wKCAnY2xhc3MnLCAnYS1zaG93LWxldmVsIGEtc2hvdy1sZXZlbC0nICsgbGV2ZWxbJ25hbWUnXS50b0xvd2VyQ2FzZSgpICk7XG5cblx0XHRcdGlmICggbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwubGVuZ3RoID4gMCApIHtcblxuXHRcdFx0XHRpZiAoICdhJywgJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yID0gb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICsgJyBhJztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdG9sZF9sZXZlbCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLnJlcGxhY2UoIG1lbWJlcl9sZXZlbF9wcmVmaXgsICcnICk7XG5cblx0XHRcdFx0aWYgKCBvbGRfbGV2ZWwgIT09IGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApIHtcblx0XHRcdFx0XHQkKCBsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yICkuaHRtbCggZGVjb2RlSHRtbEVudGl0eSggJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkuZGF0YSggJ2NoYW5nZWQnICkgKSApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoIGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgKS5odG1sKCBkZWNvZGVIdG1sRW50aXR5KCAkKCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKS5kYXRhKCAnbm90LWNoYW5nZWQnICkgKSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdCQob3B0aW9ucy5sZXZlbF9uYW1lLCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIpLnRleHQoIGxldmVsWyduYW1lJ10gKTtcblxuXHRcdH0sIC8vIGVuZCBzaG93TmV3TGV2ZWxcblxuXHRcdGNoYW5nZUZyZXF1ZW5jeTogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0ICAgIHZhciB5ZWFyX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ3llYXInKTtcblx0XHRcdCAgICB2YXIgb25jZV92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdvbmUtdGltZScpO1xuXHRcdFx0ICAgIHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdCAgICB2YXIgZnJlcXVlbmN5ICAgICAgPSBwYXJzZUludCggc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzFdICk7XG5cblx0XHRcdCAgICAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMgKS52YWwoIHNlbGVjdGVkICk7XG4gICAgXHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzICkucHJvcCggJ3NlbGVjdGVkJywgc2VsZWN0ZWQgKTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuICAgIFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSApLmRhdGEoICdmcmVxdWVuY3knLCBmcmVxdWVuY3kgKTtcblxuXHRcdFx0fSApO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VGcmVxdWVuY3lcblxuXHRcdGNoYW5nZUFtb3VudFByZXZpZXc6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdCAgICB2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHQgICAgdmFyIG9uY2VfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnb25lLXRpbWUnKTtcblx0XHRcdCAgICB2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcblxuXHRcdFx0fSApO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VBbW91bnRQcmV2aWV3XG5cblx0XHRzdGFydExldmVsQ2xpY2s6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnLnN0YXJ0LWxldmVsJykuY2xpY2soZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBsZXZlbF9jbGFzcyA9ICQoIHRoaXMgKS5wcm9wKCAnY2xhc3MnICk7XG5cdFx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSBsZXZlbF9jbGFzc1tsZXZlbF9jbGFzcy5sZW5ndGggLTFdO1xuXHRcdFx0ICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIsIGVsZW1lbnQgKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKyAnICcgKyBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0ICB9KTtcblx0XHR9LCAvLyBlbmQgc3RhcnRMZXZlbENsaWNrXG5cblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcblxufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCApO1xuIl19
