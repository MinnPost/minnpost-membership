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
			this.submitForm(this.element, this.options);
		},

		analyticsEventTrack: function analyticsEventTrack(type, category, action, label, value) {
			if (typeof ga !== 'undefined') {
				if (typeof value === 'undefined') {
					ga('send', type, category, action, label);
				} else {
					ga('send', type, category, action, label, value);
				}
			} else {
				return;
			}
		}, // end analyticsEventTrack

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
			if (typeof minnpost_membership_data !== 'undefined' && $(options.user_current_level).length > 0) {
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
							$(options.amount_selector_in_levels, $(options.single_level_container + '-' + level_number)).val($(options.amount_viewer, $(options.single_level_container + '-' + level_number)).data('default-yearly'));
						} else if (frequency == 12) {
							$(options.amount_selector_in_levels, $(options.single_level_container + '-' + level_number)).val($(options.amount_viewer, $(options.single_level_container + '-' + level_number)).data('default-monthly'));
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
		}, // end startLevelClick

		submitForm: function submitForm(element, options) {
			var that = this;
			$(element).submit(function (event) {
				that.analyticsEventTrack('event', 'Support Us', 'Become A Member', location.pathname);
			});
		} // end submitForm

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1lbWJlci1sZXZlbHMuanMiXSwibmFtZXMiOlsiJCIsIndpbmRvdyIsImRvY3VtZW50IiwidW5kZWZpbmVkIiwicGx1Z2luTmFtZSIsImRlZmF1bHRzIiwiUGx1Z2luIiwiZWxlbWVudCIsIm9wdGlvbnMiLCJleHRlbmQiLCJfZGVmYXVsdHMiLCJfbmFtZSIsImluaXQiLCJwcm90b3R5cGUiLCJyZXNldCIsImFtb3VudCIsImNhdGNoSGFzaExpbmtzIiwibGV2ZWxGbGlwcGVyIiwic3RhcnRMZXZlbENsaWNrIiwic3VibWl0Rm9ybSIsImFuYWx5dGljc0V2ZW50VHJhY2siLCJ0eXBlIiwiY2F0ZWdvcnkiLCJhY3Rpb24iLCJsYWJlbCIsInZhbHVlIiwiZ2EiLCJjbGljayIsImUiLCJ0YXJnZXQiLCJwYXJlbnQiLCJsZW5ndGgiLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwicmVwbGFjZSIsImhvc3RuYW1lIiwiaGFzaCIsInNsaWNlIiwiYW5pbWF0ZSIsInNjcm9sbFRvcCIsIm9mZnNldCIsInRvcCIsInRoYXQiLCJwcmV2aW91c19hbW91bnQiLCJsZXZlbCIsImxldmVsX251bWJlciIsImZyZXF1ZW5jeV9zdHJpbmciLCJmcmVxdWVuY3kiLCJmcmVxdWVuY3lfbmFtZSIsIm1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSIsInVzZXJfY3VycmVudF9sZXZlbCIsImN1cnJlbnRfdXNlciIsImFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lIiwidmFsIiwiZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUiLCJzcGxpdCIsImNoZWNrTGV2ZWwiLCJzaG93TmV3TGV2ZWwiLCJjaGFuZ2UiLCJhdHRyIiwiYmluZCIsImRhdGEiLCJsZXZlbHNfY29udGFpbmVyIiwic2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IiLCJlYWNoIiwiZmxpcHBlZF9pdGVtcyIsIndyYXBBbGwiLCJmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzIiwib24iLCJldmVudCIsInJlbW92ZUNsYXNzIiwic2luZ2xlX2xldmVsX2NvbnRhaW5lciIsImNsb3Nlc3QiLCJhZGRDbGFzcyIsImFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJhbW91bnRfdmlld2VyIiwiY2hhbmdlRnJlcXVlbmN5IiwibGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IiLCJ0ZXh0IiwiY2hhbmdlQW1vdW50UHJldmlldyIsImNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwicHJldmVudERlZmF1bHQiLCJ0aGlzeWVhciIsInBhcnNlSW50IiwicHJpb3JfeWVhcl9hbW91bnQiLCJwcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMiLCJjb21pbmdfeWVhcl9hbW91bnQiLCJjb21pbmdfeWVhcl9jb250cmlidXRpb25zIiwiYW5udWFsX3JlY3VycmluZ19hbW91bnQiLCJNYXRoIiwibWF4IiwiZ2V0TGV2ZWwiLCJtZW1iZXJfbGV2ZWxfcHJlZml4Iiwib2xkX2xldmVsIiwibGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciIsImxldmVsX3ZpZXdlcl9jb250YWluZXIiLCJkZWNvZGVIdG1sRW50aXR5Iiwic3RyIiwibWF0Y2giLCJkZWMiLCJTdHJpbmciLCJmcm9tQ2hhckNvZGUiLCJwcm9wIiwidG9Mb3dlckNhc2UiLCJtZW1iZXJfbGV2ZWwiLCJodG1sIiwibGV2ZWxfbmFtZSIsInNlbGVjdGVkIiwicmFuZ2UiLCJtb250aF92YWx1ZSIsInllYXJfdmFsdWUiLCJvbmNlX3ZhbHVlIiwibGV2ZWxfY2xhc3MiLCJzdWJtaXQiLCJmbiIsImpRdWVyeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBLENBQUMsQ0FBQyxVQUFXQSxDQUFYLEVBQWNDLE1BQWQsRUFBc0JDLFFBQXRCLEVBQWdDQyxTQUFoQyxFQUE0Qzs7QUFFN0M7QUFDQSxLQUFJQyxhQUFhLG9CQUFqQjtBQUFBLEtBQ0FDLFdBQVc7QUFDVixXQUFVLEtBREEsRUFDTztBQUNqQixnQ0FBK0Isc0JBRnJCO0FBR1YsbUNBQWtDLCtDQUh4QjtB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UmY7O0FBRUh0RCxjQUFZLG9CQUFVWixPQUFWLEVBQW1CQyxPQUFuQixFQUE2QjtBQUN4QyxPQUFJa0MsT0FBTyxJQUFYO0FBQ0ExQyxLQUFHTyxPQUFILEVBQWEwRyxNQUFiLENBQXFCLFVBQVU1QyxLQUFWLEVBQWtCO0FBQ3RDM0IsU0FBS3RCLG1CQUFMLENBQTBCLE9BQTFCLEVBQW1DLFlBQW5DLEVBQWlELGlCQUFqRCxFQUFvRVksU0FBU0MsUUFBN0U7QUFDQSxJQUZEO0FBR0EsR0FyU2lCLENBcVNmOztBQXJTZSxFQUFuQixDQXpDNkMsQ0FnVjFDOztBQUVIO0FBQ0E7QUFDQWpDLEdBQUVrSCxFQUFGLENBQUs5RyxVQUFMLElBQW1CLFVBQVdJLE9BQVgsRUFBcUI7QUFDdkMsU0FBTyxLQUFLd0QsSUFBTCxDQUFVLFlBQVk7QUFDNUIsT0FBSyxDQUFFaEUsRUFBRTZELElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWXpELFVBQTFCLENBQVAsRUFBZ0Q7QUFDL0NKLE1BQUU2RCxJQUFGLENBQVEsSUFBUixFQUFjLFlBQVl6RCxVQUExQixFQUFzQyxJQUFJRSxNQUFKLENBQVksSUFBWixFQUFrQkUsT0FBbEIsQ0FBdEM7QUFDQTtBQUNELEdBSk0sQ0FBUDtBQUtBLEVBTkQ7QUFRQSxDQTVWQSxFQTRWRzJHLE1BNVZILEVBNFZXbEgsTUE1VlgsRUE0Vm1CQyxRQTVWbkIiLCJmaWxlIjoibWlubnBvc3QtbWVtYmVyc2hpcC1mcm9udC1lbmQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBwbHVnaW5cbjsoZnVuY3Rpb24gKCAkLCB3aW5kb3csIGRvY3VtZW50LCB1bmRlZmluZWQgKSB7XG5cblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdHZhciBwbHVnaW5OYW1lID0gJ21pbm5wb3N0TWVtYmVyc2hpcCcsXG5cdGRlZmF1bHRzID0ge1xuXHRcdCdkZWJ1ZycgOiBmYWxzZSwgLy8gdGhpcyBjYW4gYmUgc2V0IHRvIHRydWUgb24gcGFnZSBsZXZlbCBvcHRpb25zXG5cdFx0J2Ftb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lJyA6ICcjYW1vdW50LWl0ZW0gI2Ftb3VudCcsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lJyA6ICcubS1tZW1iZXJzaGlwLWZhc3Qtc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0J2xldmVsX3ZpZXdlcl9jb250YWluZXInIDogJy5hLXNob3ctbGV2ZWwnLFxuXHRcdCdsZXZlbF9uYW1lJyA6ICcuYS1sZXZlbCcsXG5cdFx0J3VzZXJfY3VycmVudF9sZXZlbCcgOiAnLmEtY3VycmVudC1sZXZlbCcsXG5cdFx0J3VzZXJfbmV3X2xldmVsJyA6ICcuYS1uZXctbGV2ZWwnLFxuXHRcdCdhbW91bnRfdmlld2VyJyA6ICcuYW1vdW50IGgzJyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmEtZm9ybS1pdGVtLW1lbWJlcnNoaXAtZnJlcXVlbmN5Jyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVsc190eXBlJyA6ICdzZWxlY3QnLFxuXHRcdCdsZXZlbHNfY29udGFpbmVyJyA6ICcuby1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbHMnLFxuXHRcdCdzaW5nbGVfbGV2ZWxfY29udGFpbmVyJyA6ICcubS1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbCcsXG5cdFx0J3NpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yJyA6ICcubS1tZW1iZXItbGV2ZWwtYnJpZWYnLFxuXHRcdCdmbGlwcGVkX2l0ZW1zJyA6ICdkaXYuYW1vdW50LCBkaXYuZW50ZXInLFxuXHRcdCdsZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvcicgOiAnLnNob3ctZnJlcXVlbmN5Jyxcblx0XHQnY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5hbW91bnQgLmEtYnV0dG9uLWZsaXAnLFxuXHRcdCdhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuZW50ZXIgaW5wdXQuYW1vdW50LWVudHJ5Jyxcblx0fTsgLy8gZW5kIGRlZmF1bHRzXG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblxuXHRcdC8vIGpRdWVyeSBoYXMgYW4gZXh0ZW5kIG1ldGhvZCB3aGljaCBtZXJnZXMgdGhlIGNvbnRlbnRzIG9mIHR3byBvclxuXHRcdC8vIG1vcmUgb2JqZWN0cywgc3RvcmluZyB0aGUgcmVzdWx0IGluIHRoZSBmaXJzdCBvYmplY3QuIFRoZSBmaXJzdCBvYmplY3Rcblx0XHQvLyBpcyBnZW5lcmFsbHkgZW1wdHkgYXMgd2UgZG9uJ3Qgd2FudCB0byBhbHRlciB0aGUgZGVmYXVsdCBvcHRpb25zIGZvclxuXHRcdC8vIGZ1dHVyZSBpbnN0YW5jZXMgb2YgdGhlIHBsdWdpblxuXHRcdHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMgKTtcblxuXHRcdHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XG5cdFx0dGhpcy5fbmFtZSA9IHBsdWdpbk5hbWU7XG5cblx0XHR0aGlzLmluaXQoKTtcblx0fSAvLyBlbmQgY29uc3RydWN0b3JcblxuXHRQbHVnaW4ucHJvdG90eXBlID0ge1xuXG5cdFx0aW5pdDogZnVuY3Rpb24oIHJlc2V0LCBhbW91bnQgKSB7XG5cdFx0XHQvLyBQbGFjZSBpbml0aWFsaXphdGlvbiBsb2dpYyBoZXJlXG5cdFx0XHQvLyBZb3UgYWxyZWFkeSBoYXZlIGFjY2VzcyB0byB0aGUgRE9NIGVsZW1lbnQgYW5kXG5cdFx0XHQvLyB0aGUgb3B0aW9ucyB2aWEgdGhlIGluc3RhbmNlLCBlLmcuIHRoaXMuZWxlbWVudFxuXHRcdFx0Ly8gYW5kIHRoaXMub3B0aW9uc1xuXHRcdFx0Ly8geW91IGNhbiBhZGQgbW9yZSBmdW5jdGlvbnMgbGlrZSB0aGUgb25lIGJlbG93IGFuZFxuXHRcdFx0Ly8gY2FsbCB0aGVtIGxpa2Ugc286IHRoaXMueW91ck90aGVyRnVuY3Rpb24odGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpLlxuXHRcdFx0dGhpcy5jYXRjaEhhc2hMaW5rcyggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpO1xuXHRcdFx0dGhpcy5sZXZlbEZsaXBwZXIoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0XHR0aGlzLnN0YXJ0TGV2ZWxDbGljayggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHRcdHRoaXMuc3VibWl0Rm9ybSggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHR9LFxuXG5cdFx0YW5hbHl0aWNzRXZlbnRUcmFjazogZnVuY3Rpb24oIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApIHtcblx0XHRcdGlmICggdHlwZW9mIGdhICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0aWYgKCB0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsICk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzRXZlbnRUcmFja1xuXG5cdFx0Y2F0Y2hIYXNoTGlua3M6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnYVtocmVmKj1cIiNcIl06bm90KFtocmVmPVwiI1wiXSknLCBlbGVtZW50KS5jbGljayhmdW5jdGlvbihlKSB7XG5cdFx0XHQgICAgdmFyIHRhcmdldCA9ICQoZS50YXJnZXQpO1xuXHRcdFx0ICAgIGlmICh0YXJnZXQucGFyZW50KCcuY29tbWVudC10aXRsZScpLmxlbmd0aCA9PSAwICYmIGxvY2F0aW9uLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCcnKSA9PSB0aGlzLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCcnKSAmJiBsb2NhdGlvbi5ob3N0bmFtZSA9PSB0aGlzLmhvc3RuYW1lKSB7XG5cdFx0XHRcdCAgICB2YXIgdGFyZ2V0ID0gJCh0aGlzLmhhc2gpO1xuXHRcdFx0XHQgICAgdGFyZ2V0ID0gdGFyZ2V0Lmxlbmd0aCA/IHRhcmdldCA6ICQoJ1tuYW1lPScgKyB0aGlzLmhhc2guc2xpY2UoMSkgKyddJyk7XG5cdFx0XHRcdFx0aWYgKHRhcmdldC5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdCQoJ2h0bWwsYm9keScpLmFuaW1hdGUoe1xuXHRcdFx0XHRcdFx0XHRzY3JvbGxUb3A6IHRhcmdldC5vZmZzZXQoKS50b3Bcblx0XHRcdFx0XHRcdH0sIDEwMDApO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIGNhdGNoTGlua3NcblxuXHRcdGxldmVsRmxpcHBlcjogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR2YXIgcHJldmlvdXNfYW1vdW50ID0gJyc7XG5cdFx0XHR2YXIgYW1vdW50ID0gMDtcblx0XHRcdHZhciBsZXZlbCA9ICcnO1xuXHRcdFx0dmFyIGxldmVsX251bWJlciA9IDA7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X3N0cmluZyA9ICcnO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeSA9ICcnO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9uYW1lID0gJyc7XG5cdFx0XHRpZiAoIHR5cGVvZiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEgIT09ICd1bmRlZmluZWQnICYmICQoIG9wdGlvbnMudXNlcl9jdXJyZW50X2xldmVsICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0cHJldmlvdXNfYW1vdW50ID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5wcmV2aW91c19hbW91bnQ7XG5cdFx0XHR9XG5cdFx0XHRpZiAoICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lICkudmFsKCk7XG5cdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnKS52YWwoKTtcblx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdCAgICBsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdCAgICB0aGF0LnNob3dOZXdMZXZlbCggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKTtcblxuXHRcdFx0ICAgICQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSkuY2hhbmdlKCBmdW5jdGlvbigpIHtcblxuXHRcdFx0ICAgIFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnKS52YWwoKVxuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdCAgICAgIGxldmVsID0gdGhhdC5jaGVja0xldmVsKCAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lICkudmFsKCksICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnICkuYXR0ciggJ2RhdGEteWVhci1mcmVxdWVuY3knICksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdCAgICAgIHRoYXQuc2hvd05ld0xldmVsKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApO1xuXHRcdFx0ICAgIH0pO1xuXG5cdFx0XHQgICAgJChvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lKS5iaW5kKCdrZXl1cCBtb3VzZXVwJywgZnVuY3Rpb24oKSB7XG5cdFx0XHQgICAgXHRmcmVxdWVuY3lfc3RyaW5nID0gJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcpLnZhbCgpXG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdCAgICAgIGlmKCQodGhpcykuZGF0YSgnbGFzdC12YWx1ZScpICE9ICQodGhpcykudmFsKCkpIHtcblx0XHRcdCAgICAgICAgJCh0aGlzKS5kYXRhKCdsYXN0LXZhbHVlJywgJCh0aGlzKS52YWwoKSk7XG5cdFx0XHQgICAgICAgIGxldmVsID0gdGhhdC5jaGVja0xldmVsKCAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lICkudmFsKCksICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnICkuYXR0ciggJ2RhdGEteWVhci1mcmVxdWVuY3knICksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdCAgICAgICAgdGhhdC5zaG93TmV3TGV2ZWwoIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICk7XG5cdFx0XHQgICAgICB9O1xuXHRcdFx0ICAgIH0pO1xuXG5cdFx0XHR9XG5cdFx0XHRpZiAoICQoIG9wdGlvbnMubGV2ZWxzX2NvbnRhaW5lciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQgKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuZmxpcHBlZF9pdGVtcywgJCh0aGlzKSApLndyYXBBbGwoICc8ZGl2IGNsYXNzPVwiZmxpcHBlclwiLz4nICk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCh0aGlzKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQodGhpcykudmFsKCk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdFx0ICAgIGlmICggdHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0XHQkKCBldmVudC50YXJnZXQgKS5jbG9zZXN0KCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXG5cdFx0XHRcdFx0XHRpZiAoIGZyZXF1ZW5jeSA9PSAxICkge1xuXHRcdFx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkudmFsKCAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkuZGF0YSgnZGVmYXVsdC15ZWFybHknICkgKTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeSA9PSAxMiApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQtbW9udGhseScgKSApO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKyAnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgKyBsZXZlbF9udW1iZXIgKyAnXCJdJykudmFsKCk7XG5cblx0XHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0dGhhdC5jaGFuZ2VGcmVxdWVuY3koIGZyZXF1ZW5jeV9zdHJpbmcsIGxldmVsWyduYW1lJ10sIGVsZW1lbnQsIG9wdGlvbnMgKTtcblxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoICQoIG9wdGlvbnMubGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRcdFx0JChvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yLCBlbGVtZW50KS50ZXh0KGZyZXF1ZW5jeV9uYW1lKTtcblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSkuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdFx0XHRpZiAoIHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSApLnZhbCgpO1xuXHRcdFx0XHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR0aGF0LmNoYW5nZUFtb3VudFByZXZpZXcoIGZyZXF1ZW5jeV9zdHJpbmcsIGxldmVsWyduYW1lJ10sIGVsZW1lbnQsIG9wdGlvbnMgKTtcblxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHQkKCBldmVudC50YXJnZXQgKS5jbG9zZXN0KCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKS5wYXJlbnQoKSApLnZhbCgpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArICdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArIGxldmVsX251bWJlciArICdcIl0nKS52YWwoKTtcblx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgbGV2ZWxGbGlwcGVyXG5cblx0XHRjaGVja0xldmVsOiBmdW5jdGlvbiggYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHQgIHZhciB0aGlzeWVhciA9IHBhcnNlSW50KCBhbW91bnQgKSAqIHBhcnNlSW50KCBmcmVxdWVuY3kgKTtcblx0XHQgIHZhciBsZXZlbCA9ICcnO1xuXHRcdCAgaWYgKCB0eXBlb2YgcHJldmlvdXNfYW1vdW50ICE9PSAndW5kZWZpbmVkJyAmJiBwcmV2aW91c19hbW91bnQgIT09ICcnICkge1xuXHRcdCAgICB2YXIgcHJpb3JfeWVhcl9hbW91bnQgPSBwYXJzZUludCggcHJldmlvdXNfYW1vdW50LnByaW9yX3llYXJfY29udHJpYnV0aW9ucyApO1xuXHRcdCAgICB2YXIgY29taW5nX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoIHByZXZpb3VzX2Ftb3VudC5jb21pbmdfeWVhcl9jb250cmlidXRpb25zICk7XG5cdFx0ICAgIHZhciBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCA9IHBhcnNlSW50KCBwcmV2aW91c19hbW91bnQuYW5udWFsX3JlY3VycmluZ19hbW91bnQgKTtcblx0XHQgICAgLy8gY2FsY3VsYXRlIG1lbWJlciBsZXZlbCBmb3JtdWxhXG5cdFx0ICAgIGlmICggdHlwZSA9PT0gJ29uZS10aW1lJyApIHtcblx0XHQgICAgICBwcmlvcl95ZWFyX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHQgICAgfSBlbHNlIHtcblx0XHQgICAgICBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHQgICAgfVxuXG5cdFx0ICAgIHRoaXN5ZWFyID0gTWF0aC5tYXgoIHByaW9yX3llYXJfYW1vdW50LCBjb21pbmdfeWVhcl9hbW91bnQsIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICk7XG5cdFx0ICB9XG5cblx0XHQgIGxldmVsID0gdGhpcy5nZXRMZXZlbCggdGhpc3llYXIgKTtcblxuXHRcdCAgJCgnaDInLCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHQgICAgaWYgKCAkKHRoaXMpLnRleHQoKSA9PSBsZXZlbFsnbmFtZSddICkge1xuXHRcdCAgICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0ICAgICAgJCh0aGlzKS5wYXJlbnQoKS5wYXJlbnQoKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHQgICAgfVxuXHRcdCAgfSApO1xuXHRcdCAgcmV0dXJuIGxldmVsO1xuXG5cdFx0fSwgLy8gZW5kIGNoZWNrTGV2ZWxcblxuXHRcdGdldExldmVsOiBmdW5jdGlvbiggdGhpc3llYXIgKSB7XG5cdFx0XHR2YXIgbGV2ZWwgPSBbXTtcblx0XHRcdGlmICggdGhpc3llYXIgPiAwICYmIHRoaXN5ZWFyIDwgNjAgKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnQnJvbnplJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKHRoaXN5ZWFyID4gNTkgJiYgdGhpc3llYXIgPCAxMjApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdTaWx2ZXInO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAyO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDExOSAmJiB0aGlzeWVhciA8IDI0MCkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ0dvbGQnO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAzO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDIzOSkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ1BsYXRpbnVtJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gNDtcblx0XHRcdH1cblx0XHRcdHJldHVybiBsZXZlbDtcblx0XHR9LCAvLyBlbmQgZ2V0TGV2ZWxcblxuXHRcdHNob3dOZXdMZXZlbDogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICkge1xuXHRcdFx0dmFyIG1lbWJlcl9sZXZlbF9wcmVmaXggPSAnJztcblx0XHRcdHZhciBvbGRfbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yID0gb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyOyAvLyB0aGlzIHNob3VsZCBjaGFuZ2Ugd2hlbiB3ZSByZXBsYWNlIHRoZSB0ZXh0LCBpZiB0aGVyZSBpcyBhIGxpbmsgaW5zaWRlIGl0XG5cdFx0XHR2YXIgZGVjb2RlSHRtbEVudGl0eSA9IGZ1bmN0aW9uKCBzdHIgKSB7XG5cdFx0XHRcdHJldHVybiBzdHIucmVwbGFjZSggLyYjKFxcZCspOy9nLCBmdW5jdGlvbiggbWF0Y2gsIGRlYyApIHtcblx0XHRcdFx0XHRyZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSggZGVjICk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fTtcblx0XHRcdGlmICggdHlwZW9mIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdG1lbWJlcl9sZXZlbF9wcmVmaXggPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEubWVtYmVyX2xldmVsX3ByZWZpeDtcblx0XHRcdH1cblxuXHRcdFx0JChvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIpLnByb3AoICdjbGFzcycsICdhLXNob3ctbGV2ZWwgYS1zaG93LWxldmVsLScgKyBsZXZlbFsnbmFtZSddLnRvTG93ZXJDYXNlKCkgKTtcblxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLnVzZXJfY3VycmVudF9sZXZlbCApLmxlbmd0aCA+IDAgJiYgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwubGVuZ3RoID4gMCApIHtcblxuXHRcdFx0XHRpZiAoICdhJywgJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yID0gb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICsgJyBhJztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdG9sZF9sZXZlbCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLnJlcGxhY2UoIG1lbWJlcl9sZXZlbF9wcmVmaXgsICcnICk7XG5cblx0XHRcdFx0aWYgKCBvbGRfbGV2ZWwgIT09IGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApIHtcblx0XHRcdFx0XHQkKCBsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yICkuaHRtbCggZGVjb2RlSHRtbEVudGl0eSggJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkuZGF0YSggJ2NoYW5nZWQnICkgKSApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoIGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgKS5odG1sKCBkZWNvZGVIdG1sRW50aXR5KCAkKCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKS5kYXRhKCAnbm90LWNoYW5nZWQnICkgKSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdCQob3B0aW9ucy5sZXZlbF9uYW1lLCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIpLnRleHQoIGxldmVsWyduYW1lJ10gKTtcblxuXHRcdH0sIC8vIGVuZCBzaG93TmV3TGV2ZWxcblxuXHRcdGNoYW5nZUZyZXF1ZW5jeTogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0ICAgIHZhciB5ZWFyX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ3llYXInKTtcblx0XHRcdCAgICB2YXIgb25jZV92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdvbmUtdGltZScpO1xuXHRcdFx0ICAgIHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdCAgICB2YXIgZnJlcXVlbmN5ICAgICAgPSBwYXJzZUludCggc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzFdICk7XG5cblx0XHRcdCAgICAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMgKS52YWwoIHNlbGVjdGVkICk7XG4gICAgXHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzICkucHJvcCggJ3NlbGVjdGVkJywgc2VsZWN0ZWQgKTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuICAgIFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSApLmRhdGEoICdmcmVxdWVuY3knLCBmcmVxdWVuY3kgKTtcblxuXHRcdFx0fSApO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VGcmVxdWVuY3lcblxuXHRcdGNoYW5nZUFtb3VudFByZXZpZXc6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdCAgICB2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHQgICAgdmFyIG9uY2VfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnb25lLXRpbWUnKTtcblx0XHRcdCAgICB2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcblxuXHRcdFx0fSApO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VBbW91bnRQcmV2aWV3XG5cblx0XHRzdGFydExldmVsQ2xpY2s6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnLnN0YXJ0LWxldmVsJykuY2xpY2soZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBsZXZlbF9jbGFzcyA9ICQoIHRoaXMgKS5wcm9wKCAnY2xhc3MnICk7XG5cdFx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSBsZXZlbF9jbGFzc1tsZXZlbF9jbGFzcy5sZW5ndGggLTFdO1xuXHRcdFx0ICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIsIGVsZW1lbnQgKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKyAnICcgKyBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0ICB9KTtcblx0XHR9LCAvLyBlbmQgc3RhcnRMZXZlbENsaWNrXG5cblx0XHRzdWJtaXRGb3JtOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdCQoIGVsZW1lbnQgKS5zdWJtaXQoIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0dGhhdC5hbmFseXRpY3NFdmVudFRyYWNrKCAnZXZlbnQnLCAnU3VwcG9ydCBVcycsICdCZWNvbWUgQSBNZW1iZXInLCBsb2NhdGlvbi5wYXRobmFtZSApO1xuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIHN1Ym1pdEZvcm1cblxuXHR9OyAvLyBlbmQgUGx1Z2luLnByb3RvdHlwZVxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKCBvcHRpb25zICkge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCAhICQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSApICkge1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4oIHRoaXMsIG9wdGlvbnMgKSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xuXG59KSggalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50ICk7XG4iXX0=
