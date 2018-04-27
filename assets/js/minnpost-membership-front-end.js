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

			if ($(options.user_current_level).length > 0 && minnpost_membership_data.current_user.member_level.length > 0) {

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1lbWJlci1sZXZlbHMuanMiXSwibmFtZXMiOlsiJCIsIndpbmRvdyIsImRvY3VtZW50IiwidW5kZWZpbmVkIiwicGx1Z2luTmFtZSIsImRlZmF1bHRzIiwiUGx1Z2luIiwiZWxlbWVudCIsIm9wdGlvbnMiLCJleHRlbmQiLCJfZGVmYXVsdHMiLCJfbmFtZSIsImluaXQiLCJwcm90b3R5cGUiLCJyZXNldCIsImFtb3VudCIsImNhdGNoSGFzaExpbmtzIiwibGV2ZWxGbGlwcGVyIiwic3RhcnRMZXZlbENsaWNrIiwiY2xpY2siLCJlIiwidGFyZ2V0IiwicGFyZW50IiwibGVuZ3RoIiwibG9jYXRpb24iLCJwYXRobmFtZSIsInJlcGxhY2UiLCJob3N0bmFtZSIsImhhc2giLCJzbGljZSIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiLCJ0aGF0IiwicHJldmlvdXNfYW1vdW50IiwibGV2ZWwiLCJsZXZlbF9udW1iZXIiLCJmcmVxdWVuY3lfc3RyaW5nIiwiZnJlcXVlbmN5IiwiZnJlcXVlbmN5X25hbWUiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEiLCJjdXJyZW50X3VzZXIiLCJhbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSIsInZhbCIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lIiwic3BsaXQiLCJjaGVja0xldmVsIiwic2hvd05ld0xldmVsIiwiY2hhbmdlIiwiYXR0ciIsImJpbmQiLCJkYXRhIiwibGV2ZWxzX2NvbnRhaW5lciIsInNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yIiwiZWFjaCIsImZsaXBwZWRfaXRlbXMiLCJ3cmFwQWxsIiwiZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyIsIm9uIiwiZXZlbnQiLCJyZW1vdmVDbGFzcyIsInNpbmdsZV9sZXZlbF9jb250YWluZXIiLCJjbG9zZXN0IiwiYWRkQ2xhc3MiLCJhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwiYW1vdW50X3ZpZXdlciIsImNoYW5nZUZyZXF1ZW5jeSIsImxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yIiwidGV4dCIsImNoYW5nZUFtb3VudFByZXZpZXciLCJjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsInByZXZlbnREZWZhdWx0IiwidHlwZSIsInRoaXN5ZWFyIiwicGFyc2VJbnQiLCJwcmlvcl95ZWFyX2Ftb3VudCIsInByaW9yX3llYXJfY29udHJpYnV0aW9ucyIsImNvbWluZ195ZWFyX2Ftb3VudCIsImNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMiLCJhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCIsIk1hdGgiLCJtYXgiLCJnZXRMZXZlbCIsIm1lbWJlcl9sZXZlbF9wcmVmaXgiLCJvbGRfbGV2ZWwiLCJsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yIiwibGV2ZWxfdmlld2VyX2NvbnRhaW5lciIsImRlY29kZUh0bWxFbnRpdHkiLCJzdHIiLCJtYXRjaCIsImRlYyIsIlN0cmluZyIsImZyb21DaGFyQ29kZSIsInByb3AiLCJ0b0xvd2VyQ2FzZSIsInVzZXJfY3VycmVudF9sZXZlbCIsIm1lbWJlcl9sZXZlbCIsImh0bWwiLCJsZXZlbF9uYW1lIiwic2VsZWN0ZWQiLCJyYW5nZSIsIm1vbnRoX3ZhbHVlIiwieWVhcl92YWx1ZSIsIm9uY2VfdmFsdWUiLCJsZXZlbF9jbGFzcyIsImZuIiwialF1ZXJ5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0EsQ0FBQyxDQUFDLFVBQVdBLENBQVgsRUFBY0MsTUFBZCxFQUFzQkMsUUFBdEIsRUFBZ0NDLFNBQWhDLEVBQTRDOztBQUU3QztBQUNBLEtBQUlDLGFBQWEsb0JBQWpCO0FBQUEsS0FDQUMsV0FBVztBQUNWLFdBQVUsS0FEQSxFQUNPO0FBQ2pCLGdDQUErQixzQkFGckI7QUFHVixtQ0FBa0MsK0NBSHhCO0FBSVYsNEJBQTJCLGVBSmpCO0FBS1YsZ0JBQWUsVUFMTDtBQU1WLHdCQUF1QixrQkFOYjtBQU9WLG9CQUFtQixjQVBUO0FBUVYsbUJBQWtCLFlBUlI7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QUFRc0Qsc0JBQVIsR0FBaUMsR0FBakMsR0FBdUN6QixZQUExQyxFQUF3RDlCLE9BQXhELEVBQWtFeUQsUUFBbEUsQ0FBNEUsUUFBNUU7QUFDQWhFLE1BQUdRLFFBQVFzRCxzQkFBUixHQUFpQyxHQUFqQyxHQUF1Q3pCLFlBQXZDLEdBQXNELEdBQXRELEdBQTREN0IsUUFBUThDLDZCQUF2RSxFQUF1R1UsUUFBdkcsQ0FBaUgsU0FBakg7QUFDRCxJQVBIO0FBUUEsR0FsUmlCLENBa1JmOztBQWxSZSxFQUFuQixDQXpDNkMsQ0E2VDFDOztBQUVIO0FBQ0E7QUFDQWhFLEdBQUUwRyxFQUFGLENBQUt0RyxVQUFMLElBQW1CLFVBQVdJLE9BQVgsRUFBcUI7QUFDdkMsU0FBTyxLQUFLK0MsSUFBTCxDQUFVLFlBQVk7QUFDNUIsT0FBSyxDQUFFdkQsRUFBRW9ELElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWWhELFVBQTFCLENBQVAsRUFBZ0Q7QUFDL0NKLE1BQUVvRCxJQUFGLENBQVEsSUFBUixFQUFjLFlBQVloRCxVQUExQixFQUFzQyxJQUFJRSxNQUFKLENBQVksSUFBWixFQUFrQkUsT0FBbEIsQ0FBdEM7QUFDQTtBQUNELEdBSk0sQ0FBUDtBQUtBLEVBTkQ7QUFRQSxDQXpVQSxFQXlVR21HLE1BelVILEVBeVVXMUcsTUF6VVgsRUF5VW1CQyxRQXpVbkIiLCJmaWxlIjoibWlubnBvc3QtbWVtYmVyc2hpcC1mcm9udC1lbmQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBwbHVnaW5cbjsoZnVuY3Rpb24gKCAkLCB3aW5kb3csIGRvY3VtZW50LCB1bmRlZmluZWQgKSB7XG5cblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdHZhciBwbHVnaW5OYW1lID0gJ21pbm5wb3N0TWVtYmVyc2hpcCcsXG5cdGRlZmF1bHRzID0ge1xuXHRcdCdkZWJ1ZycgOiBmYWxzZSwgLy8gdGhpcyBjYW4gYmUgc2V0IHRvIHRydWUgb24gcGFnZSBsZXZlbCBvcHRpb25zXG5cdFx0J2Ftb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lJyA6ICcjYW1vdW50LWl0ZW0gI2Ftb3VudCcsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lJyA6ICcubS1tZW1iZXJzaGlwLWZhc3Qtc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0J2xldmVsX3ZpZXdlcl9jb250YWluZXInIDogJy5hLXNob3ctbGV2ZWwnLFxuXHRcdCdsZXZlbF9uYW1lJyA6ICcuYS1sZXZlbCcsXG5cdFx0J3VzZXJfY3VycmVudF9sZXZlbCcgOiAnLmEtY3VycmVudC1sZXZlbCcsXG5cdFx0J3VzZXJfbmV3X2xldmVsJyA6ICcuYS1uZXctbGV2ZWwnLFxuXHRcdCdhbW91bnRfdmlld2VyJyA6ICcuYW1vdW50IGgzJyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmEtZm9ybS1pdGVtLW1lbWJlcnNoaXAtZnJlcXVlbmN5Jyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVsc190eXBlJyA6ICdzZWxlY3QnLFxuXHRcdCdsZXZlbHNfY29udGFpbmVyJyA6ICcuby1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbHMnLFxuXHRcdCdzaW5nbGVfbGV2ZWxfY29udGFpbmVyJyA6ICcubS1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbCcsXG5cdFx0J3NpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yJyA6ICcubS1tZW1iZXItbGV2ZWwtYnJpZWYnLFxuXHRcdCdmbGlwcGVkX2l0ZW1zJyA6ICdkaXYuYW1vdW50LCBkaXYuZW50ZXInLFxuXHRcdCdsZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvcicgOiAnLnNob3ctZnJlcXVlbmN5Jyxcblx0XHQnY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5hbW91bnQgLmEtYnV0dG9uLWZsaXAnLFxuXHRcdCdhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuZW50ZXIgaW5wdXQuYW1vdW50LWVudHJ5Jyxcblx0fTsgLy8gZW5kIGRlZmF1bHRzXG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblxuXHRcdC8vIGpRdWVyeSBoYXMgYW4gZXh0ZW5kIG1ldGhvZCB3aGljaCBtZXJnZXMgdGhlIGNvbnRlbnRzIG9mIHR3byBvclxuXHRcdC8vIG1vcmUgb2JqZWN0cywgc3RvcmluZyB0aGUgcmVzdWx0IGluIHRoZSBmaXJzdCBvYmplY3QuIFRoZSBmaXJzdCBvYmplY3Rcblx0XHQvLyBpcyBnZW5lcmFsbHkgZW1wdHkgYXMgd2UgZG9uJ3Qgd2FudCB0byBhbHRlciB0aGUgZGVmYXVsdCBvcHRpb25zIGZvclxuXHRcdC8vIGZ1dHVyZSBpbnN0YW5jZXMgb2YgdGhlIHBsdWdpblxuXHRcdHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMgKTtcblxuXHRcdHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XG5cdFx0dGhpcy5fbmFtZSA9IHBsdWdpbk5hbWU7XG5cblx0XHR0aGlzLmluaXQoKTtcblx0fSAvLyBlbmQgY29uc3RydWN0b3JcblxuXHRQbHVnaW4ucHJvdG90eXBlID0ge1xuXG5cdFx0aW5pdDogZnVuY3Rpb24oIHJlc2V0LCBhbW91bnQgKSB7XG5cdFx0XHQvLyBQbGFjZSBpbml0aWFsaXphdGlvbiBsb2dpYyBoZXJlXG5cdFx0XHQvLyBZb3UgYWxyZWFkeSBoYXZlIGFjY2VzcyB0byB0aGUgRE9NIGVsZW1lbnQgYW5kXG5cdFx0XHQvLyB0aGUgb3B0aW9ucyB2aWEgdGhlIGluc3RhbmNlLCBlLmcuIHRoaXMuZWxlbWVudFxuXHRcdFx0Ly8gYW5kIHRoaXMub3B0aW9uc1xuXHRcdFx0Ly8geW91IGNhbiBhZGQgbW9yZSBmdW5jdGlvbnMgbGlrZSB0aGUgb25lIGJlbG93IGFuZFxuXHRcdFx0Ly8gY2FsbCB0aGVtIGxpa2Ugc286IHRoaXMueW91ck90aGVyRnVuY3Rpb24odGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpLlxuXHRcdFx0dGhpcy5jYXRjaEhhc2hMaW5rcyggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpO1xuXHRcdFx0dGhpcy5sZXZlbEZsaXBwZXIoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0XHR0aGlzLnN0YXJ0TGV2ZWxDbGljayggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblxuXHRcdH0sXG5cblx0XHRjYXRjaEhhc2hMaW5rczogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCdhW2hyZWYqPVwiI1wiXTpub3QoW2hyZWY9XCIjXCJdKScsIGVsZW1lbnQpLmNsaWNrKGZ1bmN0aW9uKGUpIHtcblx0XHRcdCAgICB2YXIgdGFyZ2V0ID0gJChlLnRhcmdldCk7XG5cdFx0XHQgICAgaWYgKHRhcmdldC5wYXJlbnQoJy5jb21tZW50LXRpdGxlJykubGVuZ3RoID09IDAgJiYgbG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpID09IHRoaXMucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpICYmIGxvY2F0aW9uLmhvc3RuYW1lID09IHRoaXMuaG9zdG5hbWUpIHtcblx0XHRcdFx0ICAgIHZhciB0YXJnZXQgPSAkKHRoaXMuaGFzaCk7XG5cdFx0XHRcdCAgICB0YXJnZXQgPSB0YXJnZXQubGVuZ3RoID8gdGFyZ2V0IDogJCgnW25hbWU9JyArIHRoaXMuaGFzaC5zbGljZSgxKSArJ10nKTtcblx0XHRcdFx0XHRpZiAodGFyZ2V0Lmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0JCgnaHRtbCxib2R5JykuYW5pbWF0ZSh7XG5cdFx0XHRcdFx0XHRcdHNjcm9sbFRvcDogdGFyZ2V0Lm9mZnNldCgpLnRvcFxuXHRcdFx0XHRcdFx0fSwgMTAwMCk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgY2F0Y2hMaW5rc1xuXG5cdFx0bGV2ZWxGbGlwcGVyOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHZhciBwcmV2aW91c19hbW91bnQgPSAnJztcblx0XHRcdHZhciBhbW91bnQgPSAwO1xuXHRcdFx0dmFyIGxldmVsID0gJyc7XG5cdFx0XHR2YXIgbGV2ZWxfbnVtYmVyID0gMDtcblx0XHRcdHZhciBmcmVxdWVuY3lfc3RyaW5nID0gJyc7XG5cdFx0XHR2YXIgZnJlcXVlbmN5ID0gJyc7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSAnJztcblx0XHRcdGlmICggdHlwZW9mIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdHByZXZpb3VzX2Ftb3VudCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIucHJldmlvdXNfYW1vdW50O1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLnZhbCgpO1xuXHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJykudmFsKCk7XG5cdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHQgICAgbGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHQgICAgdGhhdC5zaG93TmV3TGV2ZWwoIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICk7XG5cblx0XHRcdCAgICAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUpLmNoYW5nZSggZnVuY3Rpb24oKSB7XG5cblx0XHRcdCAgICBcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJykudmFsKClcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHQgICAgICBsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLnZhbCgpLCAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJyApLmF0dHIoICdkYXRhLXllYXItZnJlcXVlbmN5JyApLCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHQgICAgICB0aGF0LnNob3dOZXdMZXZlbCggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKTtcblx0XHRcdCAgICB9KTtcblxuXHRcdFx0ICAgICQob3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSkuYmluZCgna2V5dXAgbW91c2V1cCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0ICAgIFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnKS52YWwoKVxuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHQgICAgICBpZigkKHRoaXMpLmRhdGEoJ2xhc3QtdmFsdWUnKSAhPSAkKHRoaXMpLnZhbCgpKSB7XG5cdFx0XHQgICAgICAgICQodGhpcykuZGF0YSgnbGFzdC12YWx1ZScsICQodGhpcykudmFsKCkpO1xuXHRcdFx0ICAgICAgICBsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLnZhbCgpLCAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJyApLmF0dHIoICdkYXRhLXllYXItZnJlcXVlbmN5JyApLCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHQgICAgICAgIHRoYXQuc2hvd05ld0xldmVsKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApO1xuXHRcdFx0ICAgICAgfTtcblx0XHRcdCAgICB9KTtcblxuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmxldmVsc19jb250YWluZXIgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50ICkuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmZsaXBwZWRfaXRlbXMsICQodGhpcykgKS53cmFwQWxsKCAnPGRpdiBjbGFzcz1cImZsaXBwZXJcIi8+JyApO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkub24oJ2NoYW5nZScsIGZ1bmN0aW9uIChldmVudCkge1xuXHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQodGhpcykuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKHRoaXMpLnZhbCgpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRcdCAgICBpZiAoIHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnICkge1xuXG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblxuXHRcdFx0XHRcdFx0aWYgKCBmcmVxdWVuY3kgPT0gMSApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LXllYXJseScgKSApO1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5ID09IDEyICkge1xuXHRcdFx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMpLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQtbW9udGhseScgKSApO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKyAnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgKyBsZXZlbF9udW1iZXIgKyAnXCJdJykudmFsKCk7XG5cblx0XHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0dGhhdC5jaGFuZ2VGcmVxdWVuY3koIGZyZXF1ZW5jeV9zdHJpbmcsIGxldmVsWyduYW1lJ10sIGVsZW1lbnQsIG9wdGlvbnMgKTtcblxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoICQoIG9wdGlvbnMubGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRcdFx0JChvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yLCBlbGVtZW50KS50ZXh0KGZyZXF1ZW5jeV9uYW1lKTtcblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSkuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdFx0XHRpZiAoIHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSApLnZhbCgpO1xuXHRcdFx0XHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR0aGF0LmNoYW5nZUFtb3VudFByZXZpZXcoIGZyZXF1ZW5jeV9zdHJpbmcsIGxldmVsWyduYW1lJ10sIGVsZW1lbnQsIG9wdGlvbnMgKTtcblxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHQkKCBldmVudC50YXJnZXQgKS5jbG9zZXN0KCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKS5wYXJlbnQoKSApLnZhbCgpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArICdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArIGxldmVsX251bWJlciArICdcIl0nKS52YWwoKTtcblx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgbGV2ZWxGbGlwcGVyXG5cblx0XHRjaGVja0xldmVsOiBmdW5jdGlvbiggYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHQgIHZhciB0aGlzeWVhciA9IHBhcnNlSW50KCBhbW91bnQgKSAqIHBhcnNlSW50KCBmcmVxdWVuY3kgKTtcblx0XHQgIHZhciBsZXZlbCA9ICcnO1xuXHRcdCAgaWYgKCB0eXBlb2YgcHJldmlvdXNfYW1vdW50ICE9PSAndW5kZWZpbmVkJyAmJiBwcmV2aW91c19hbW91bnQgIT09ICcnICkge1xuXHRcdCAgICB2YXIgcHJpb3JfeWVhcl9hbW91bnQgPSBwYXJzZUludCggcHJldmlvdXNfYW1vdW50LnByaW9yX3llYXJfY29udHJpYnV0aW9ucyApO1xuXHRcdCAgICB2YXIgY29taW5nX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoIHByZXZpb3VzX2Ftb3VudC5jb21pbmdfeWVhcl9jb250cmlidXRpb25zICk7XG5cdFx0ICAgIHZhciBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCA9IHBhcnNlSW50KCBwcmV2aW91c19hbW91bnQuYW5udWFsX3JlY3VycmluZ19hbW91bnQgKTtcblx0XHQgICAgLy8gY2FsY3VsYXRlIG1lbWJlciBsZXZlbCBmb3JtdWxhXG5cdFx0ICAgIGlmICggdHlwZSA9PT0gJ29uZS10aW1lJyApIHtcblx0XHQgICAgICBwcmlvcl95ZWFyX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHQgICAgfSBlbHNlIHtcblx0XHQgICAgICBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHQgICAgfVxuXG5cdFx0ICAgIHRoaXN5ZWFyID0gTWF0aC5tYXgoIHByaW9yX3llYXJfYW1vdW50LCBjb21pbmdfeWVhcl9hbW91bnQsIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICk7XG5cdFx0ICB9XG5cblx0XHQgIGxldmVsID0gdGhpcy5nZXRMZXZlbCggdGhpc3llYXIgKTtcblxuXHRcdCAgJCgnaDInLCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHQgICAgaWYgKCAkKHRoaXMpLnRleHQoKSA9PSBsZXZlbFsnbmFtZSddICkge1xuXHRcdCAgICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0ICAgICAgJCh0aGlzKS5wYXJlbnQoKS5wYXJlbnQoKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHQgICAgfVxuXHRcdCAgfSApO1xuXHRcdCAgcmV0dXJuIGxldmVsO1xuXG5cdFx0fSwgLy8gZW5kIGNoZWNrTGV2ZWxcblxuXHRcdGdldExldmVsOiBmdW5jdGlvbiggdGhpc3llYXIgKSB7XG5cdFx0XHR2YXIgbGV2ZWwgPSBbXTtcblx0XHRcdGlmICggdGhpc3llYXIgPiAwICYmIHRoaXN5ZWFyIDwgNjAgKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnQnJvbnplJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKHRoaXN5ZWFyID4gNTkgJiYgdGhpc3llYXIgPCAxMjApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdTaWx2ZXInO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAyO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDExOSAmJiB0aGlzeWVhciA8IDI0MCkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ0dvbGQnO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAzO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDIzOSkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ1BsYXRpbnVtJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gNDtcblx0XHRcdH1cblx0XHRcdHJldHVybiBsZXZlbDtcblx0XHR9LCAvLyBlbmQgZ2V0TGV2ZWxcblxuXHRcdHNob3dOZXdMZXZlbDogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICkge1xuXHRcdFx0dmFyIG1lbWJlcl9sZXZlbF9wcmVmaXggPSAnJztcblx0XHRcdHZhciBvbGRfbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yID0gb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyOyAvLyB0aGlzIHNob3VsZCBjaGFuZ2Ugd2hlbiB3ZSByZXBsYWNlIHRoZSB0ZXh0LCBpZiB0aGVyZSBpcyBhIGxpbmsgaW5zaWRlIGl0XG5cdFx0XHR2YXIgZGVjb2RlSHRtbEVudGl0eSA9IGZ1bmN0aW9uKCBzdHIgKSB7XG5cdFx0XHRcdHJldHVybiBzdHIucmVwbGFjZSggLyYjKFxcZCspOy9nLCBmdW5jdGlvbiggbWF0Y2gsIGRlYyApIHtcblx0XHRcdFx0XHRyZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSggZGVjICk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fTtcblx0XHRcdGlmICggdHlwZW9mIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdG1lbWJlcl9sZXZlbF9wcmVmaXggPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEubWVtYmVyX2xldmVsX3ByZWZpeDtcblx0XHRcdH1cblxuXHRcdFx0JChvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIpLnByb3AoICdjbGFzcycsICdhLXNob3ctbGV2ZWwgYS1zaG93LWxldmVsLScgKyBsZXZlbFsnbmFtZSddLnRvTG93ZXJDYXNlKCkgKTtcblxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLnVzZXJfY3VycmVudF9sZXZlbCApLmxlbmd0aCA+IDAgJiYgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwubGVuZ3RoID4gMCApIHtcblxuXHRcdFx0XHRpZiAoICdhJywgJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yID0gb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICsgJyBhJztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdG9sZF9sZXZlbCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLnJlcGxhY2UoIG1lbWJlcl9sZXZlbF9wcmVmaXgsICcnICk7XG5cblx0XHRcdFx0aWYgKCBvbGRfbGV2ZWwgIT09IGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApIHtcblx0XHRcdFx0XHQkKCBsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yICkuaHRtbCggZGVjb2RlSHRtbEVudGl0eSggJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkuZGF0YSggJ2NoYW5nZWQnICkgKSApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoIGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgKS5odG1sKCBkZWNvZGVIdG1sRW50aXR5KCAkKCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKS5kYXRhKCAnbm90LWNoYW5nZWQnICkgKSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdCQob3B0aW9ucy5sZXZlbF9uYW1lLCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIpLnRleHQoIGxldmVsWyduYW1lJ10gKTtcblxuXHRcdH0sIC8vIGVuZCBzaG93TmV3TGV2ZWxcblxuXHRcdGNoYW5nZUZyZXF1ZW5jeTogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0ICAgIHZhciB5ZWFyX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ3llYXInKTtcblx0XHRcdCAgICB2YXIgb25jZV92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdvbmUtdGltZScpO1xuXHRcdFx0ICAgIHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdCAgICB2YXIgZnJlcXVlbmN5ICAgICAgPSBwYXJzZUludCggc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzFdICk7XG5cblx0XHRcdCAgICAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMgKS52YWwoIHNlbGVjdGVkICk7XG4gICAgXHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzICkucHJvcCggJ3NlbGVjdGVkJywgc2VsZWN0ZWQgKTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuICAgIFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSApLmRhdGEoICdmcmVxdWVuY3knLCBmcmVxdWVuY3kgKTtcblxuXHRcdFx0fSApO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VGcmVxdWVuY3lcblxuXHRcdGNoYW5nZUFtb3VudFByZXZpZXc6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdCAgICB2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHQgICAgdmFyIG9uY2VfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnb25lLXRpbWUnKTtcblx0XHRcdCAgICB2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcblxuXHRcdFx0fSApO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VBbW91bnRQcmV2aWV3XG5cblx0XHRzdGFydExldmVsQ2xpY2s6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnLnN0YXJ0LWxldmVsJykuY2xpY2soZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBsZXZlbF9jbGFzcyA9ICQoIHRoaXMgKS5wcm9wKCAnY2xhc3MnICk7XG5cdFx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSBsZXZlbF9jbGFzc1tsZXZlbF9jbGFzcy5sZW5ndGggLTFdO1xuXHRcdFx0ICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIsIGVsZW1lbnQgKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKyAnICcgKyBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0ICB9KTtcblx0XHR9LCAvLyBlbmQgc3RhcnRMZXZlbENsaWNrXG5cblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcblxufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCApO1xuIl19
