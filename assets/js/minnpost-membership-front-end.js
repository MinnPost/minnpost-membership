'use strict';

(function ($) {

	function benefitForm() {
		$('.a-benefit-button.a-button-disabled').removeAttr('disabled');
		$('.a-benefit-button').click(function (event) {
			event.preventDefault();
			var $button = $(this);
			var $status = $('.m-benefit-message', $(this).parent());
			var settings = minnpost_membership_settings;
			// reset the message for current status
			if (!'.m-benefit-message-success') {
				$('.m-benefit-message').removeClass('m-benefit-message-visible m-benefit-message-error m-benefit-message-info');
			}
			// set button to processing
			$button.text('Processing').addClass('a-button-disabled');

			// disable all the other buttons
			$('.a-benefit-button').addClass('a-button-disabled');

			// set ajax data
			var data = {};
			var benefitType = $('input[name="benefit-name"]').val();
			if ('partner-offers' === benefitType) {
				data = {
					'action': 'benefit_form_submit',
					'minnpost_membership_benefit_form_nonce': $button.data('benefit-nonce'),
					'current_url': $('input[name="current_url"]').val(),
					'benefit-name': $('input[name="benefit-name"]').val(),
					'instance_id': $('input[name="instance-id-' + $button.val() + '"]').val(),
					'post_id': $button.val(),
					'is_ajax': '1'
				};
				$.post(settings.ajaxurl, data, function (response) {
					// success
					if (true === response.success) {
						//console.dir(response);
						$button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
						$status.html(response.data.message).addClass('m-benefit-message-visible ' + response.data.message_class);
					} else {
						// error
						//console.dir(response);
						if ('' !== response.data.button_label) {
							$button.show();
							$button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
						} else {
							$button.hide();
						}
						// re-enable all the other buttons
						$('.a-benefit-button').not($button).removeClass('a-button-disabled');
						$status.html(response.data.message).addClass('m-benefit-message-visible ' + response.data.message_class);
					}
				});
			}
		});
	}

	$(document).ready(function () {
		if (0 < $('.m-form-membership-benefit').length) {
			benefitForm();
		}
	});
})(jQuery);
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJlbmVmaXRzLmpzIiwibWVtYmVyLWxldmVscy5qcyJdLCJuYW1lcyI6WyIkIiwiYmVuZWZpdEZvcm0iLCJyZW1vdmVBdHRyIiwiY2xpY2siLCJldmVudCIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsIiRzdGF0dXMiLCJwYXJlbnQiLCJzZXR0aW5ncyIsIm1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3MiLCJyZW1vdmVDbGFzcyIsInRleHQiLCJhZGRDbGFzcyIsImRhdGEiLCJiZW5lZml0VHlwZSIsInZhbCIsInBvc3QiLCJhamF4dXJsIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwiYnV0dG9uX3ZhbHVlIiwiYnV0dG9uX2xhYmVsIiwiYnV0dG9uX2NsYXNzIiwicHJvcCIsImJ1dHRvbl9hdHRyIiwiaHRtbCIsIm1lc3NhZ2UiLCJtZXNzYWdlX2NsYXNzIiwic2hvdyIsImhpZGUiLCJub3QiLCJkb2N1bWVudCIsInJlYWR5IiwibGVuZ3RoIiwialF1ZXJ5Iiwid2luZG93IiwidW5kZWZpbmVkIiwicGx1Z2luTmFtZSIsImRlZmF1bHRzIiwiUGx1Z2luIiwiZWxlbWVudCIsIm9wdGlvbnMiLCJleHRlbmQiLCJfZGVmYXVsdHMiLCJfbmFtZSIsImluaXQiLCJwcm90b3R5cGUiLCJyZXNldCIsImFtb3VudCIsImNhdGNoSGFzaExpbmtzIiwibGV2ZWxGbGlwcGVyIiwic3RhcnRMZXZlbENsaWNrIiwic3VibWl0Rm9ybSIsImFuYWx5dGljc0V2ZW50VHJhY2siLCJ0eXBlIiwiY2F0ZWdvcnkiLCJhY3Rpb24iLCJsYWJlbCIsInZhbHVlIiwiZ2EiLCJlIiwidGFyZ2V0IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInJlcGxhY2UiLCJob3N0bmFtZSIsImhhc2giLCJzbGljZSIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiLCJ0aGF0IiwicHJldmlvdXNfYW1vdW50IiwibGV2ZWwiLCJsZXZlbF9udW1iZXIiLCJmcmVxdWVuY3lfc3RyaW5nIiwiZnJlcXVlbmN5IiwiZnJlcXVlbmN5X25hbWUiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEiLCJ1c2VyX2N1cnJlbnRfbGV2ZWwiLCJjdXJyZW50X3VzZXIiLCJhbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lIiwic3BsaXQiLCJjaGVja0xldmVsIiwic2hvd05ld0xldmVsIiwiY2hhbmdlIiwiYXR0ciIsImJpbmQiLCJsZXZlbHNfY29udGFpbmVyIiwic2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IiLCJlYWNoIiwiZmxpcHBlZF9pdGVtcyIsIndyYXBBbGwiLCJmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzIiwib24iLCJzaW5nbGVfbGV2ZWxfY29udGFpbmVyIiwiY2xvc2VzdCIsImFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJhbW91bnRfdmlld2VyIiwiY2hhbmdlRnJlcXVlbmN5IiwibGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IiLCJjaGFuZ2VBbW91bnRQcmV2aWV3IiwiY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJ0aGlzeWVhciIsInBhcnNlSW50IiwicHJpb3JfeWVhcl9hbW91bnQiLCJwcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMiLCJjb21pbmdfeWVhcl9hbW91bnQiLCJjb21pbmdfeWVhcl9jb250cmlidXRpb25zIiwiYW5udWFsX3JlY3VycmluZ19hbW91bnQiLCJNYXRoIiwibWF4IiwiZ2V0TGV2ZWwiLCJtZW1iZXJfbGV2ZWxfcHJlZml4Iiwib2xkX2xldmVsIiwibGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciIsImxldmVsX3ZpZXdlcl9jb250YWluZXIiLCJkZWNvZGVIdG1sRW50aXR5Iiwic3RyIiwibWF0Y2giLCJkZWMiLCJTdHJpbmciLCJmcm9tQ2hhckNvZGUiLCJ0b0xvd2VyQ2FzZSIsIm1lbWJlcl9sZXZlbCIsImxldmVsX25hbWUiLCJzZWxlY3RlZCIsInJhbmdlIiwibW9udGhfdmFsdWUiLCJ5ZWFyX3ZhbHVlIiwib25jZV92YWx1ZSIsImxldmVsX2NsYXNzIiwic3VibWl0IiwiZm4iXSwibWFwcGluZ3MiOiI7O0FBQUEsQ0FBRSxVQUFVQSxDQUFWLEVBQWM7O0FBRWYsVUFBU0MsV0FBVCxHQUF1QjtBQUN0QkQsSUFBRyxxQ0FBSCxFQUEyQ0UsVUFBM0MsQ0FBdUQsVUFBdkQ7QUFDQUYsSUFBRyxtQkFBSCxFQUF5QkcsS0FBekIsQ0FBZ0MsVUFBVUMsS0FBVixFQUFrQjtBQUNqREEsU0FBTUMsY0FBTjtBQUNBLE9BQUlDLFVBQVdOLEVBQUcsSUFBSCxDQUFmO0FBQ0EsT0FBSU8sVUFBV1AsRUFBRyxvQkFBSCxFQUF5QkEsRUFBRyxJQUFILEVBQVVRLE1BQVYsRUFBekIsQ0FBZjtBQUNBLE9BQUlDLFdBQVdDLDRCQUFmO0FBQ0E7QUFDQSxPQUFLLENBQUUsNEJBQVAsRUFBc0M7QUFDckNWLE1BQUcsb0JBQUgsRUFBMEJXLFdBQTFCLENBQXVDLDBFQUF2QztBQUNBO0FBQ0Q7QUFDQUwsV0FBUU0sSUFBUixDQUFjLFlBQWQsRUFBNkJDLFFBQTdCLENBQXVDLG1CQUF2Qzs7QUFFQTtBQUNBYixLQUFHLG1CQUFILEVBQXlCYSxRQUF6QixDQUFtQyxtQkFBbkM7O0FBRUE7QUFDQSxPQUFJQyxPQUFPLEVBQVg7QUFDQSxPQUFJQyxjQUFjZixFQUFHLDRCQUFILEVBQWtDZ0IsR0FBbEMsRUFBbEI7QUFDQSxPQUFLLHFCQUFxQkQsV0FBMUIsRUFBd0M7QUFDcENELFdBQU87QUFDSCxlQUFXLHFCQURSO0FBRUgsK0NBQTJDUixRQUFRUSxJQUFSLENBQWMsZUFBZCxDQUZ4QztBQUdILG9CQUFnQmQsRUFBRywyQkFBSCxFQUFnQ2dCLEdBQWhDLEVBSGI7QUFJSCxxQkFBZ0JoQixFQUFHLDRCQUFILEVBQWlDZ0IsR0FBakMsRUFKYjtBQUtILG9CQUFnQmhCLEVBQUcsNkJBQTZCTSxRQUFRVSxHQUFSLEVBQTdCLEdBQTZDLElBQWhELEVBQXVEQSxHQUF2RCxFQUxiO0FBTUgs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SyxDQUFFN0YsRUFBRWMsSUFBRixDQUFRLElBQVIsRUFBYyxZQUFZd0IsVUFBMUIsQ0FBUCxFQUFnRDtBQUMvQ3RDLE1BQUVjLElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWXdCLFVBQTFCLEVBQXNDLElBQUlFLE1BQUosQ0FBWSxJQUFaLEVBQWtCRSxPQUFsQixDQUF0QztBQUNBO0FBQ0QsR0FKTSxDQUFQO0FBS0EsRUFORDtBQVFBLENBNVZBLEVBNFZHUCxNQTVWSCxFQTRWV0MsTUE1VlgsRUE0Vm1CSixRQTVWbkIiLCJmaWxlIjoibWlubnBvc3QtbWVtYmVyc2hpcC1mcm9udC1lbmQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoIGZ1bmN0aW9uKCAkICkge1xuXG5cdGZ1bmN0aW9uIGJlbmVmaXRGb3JtKCkge1xuXHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbi5hLWJ1dHRvbi1kaXNhYmxlZCcgKS5yZW1vdmVBdHRyKCAnZGlzYWJsZWQnICk7XG5cdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0dmFyICRidXR0b24gID0gJCggdGhpcyApO1xuXHRcdFx0dmFyICRzdGF0dXMgID0gJCggJy5tLWJlbmVmaXQtbWVzc2FnZScsICQoIHRoaXMgKS5wYXJlbnQoKSApO1xuXHRcdFx0dmFyIHNldHRpbmdzID0gbWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5ncztcblx0XHRcdC8vIHJlc2V0IHRoZSBtZXNzYWdlIGZvciBjdXJyZW50IHN0YXR1c1xuXHRcdFx0aWYgKCAhICcubS1iZW5lZml0LW1lc3NhZ2Utc3VjY2VzcycgKSB7XG5cdFx0XHRcdCQoICcubS1iZW5lZml0LW1lc3NhZ2UnICkucmVtb3ZlQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlIG0tYmVuZWZpdC1tZXNzYWdlLWVycm9yIG0tYmVuZWZpdC1tZXNzYWdlLWluZm8nICk7XG5cdFx0XHR9XG5cdFx0XHQvLyBzZXQgYnV0dG9uIHRvIHByb2Nlc3Npbmdcblx0XHRcdCRidXR0b24udGV4dCggJ1Byb2Nlc3NpbmcnICkuYWRkQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblxuXHRcdFx0Ly8gZGlzYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5hZGRDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXG5cdFx0XHQvLyBzZXQgYWpheCBkYXRhXG5cdFx0XHR2YXIgZGF0YSA9IHt9O1xuXHRcdFx0dmFyIGJlbmVmaXRUeXBlID0gJCggJ2lucHV0W25hbWU9XCJiZW5lZml0LW5hbWVcIl0nICkudmFsKCk7XG5cdFx0XHRpZiAoICdwYXJ0bmVyLW9mZmVycycgPT09IGJlbmVmaXRUeXBlICkge1xuXHRcdFx0ICAgIGRhdGEgPSB7XG5cdFx0XHQgICAgICAgICdhY3Rpb24nIDogJ2JlbmVmaXRfZm9ybV9zdWJtaXQnLFxuXHRcdFx0ICAgICAgICAnbWlubnBvc3RfbWVtYmVyc2hpcF9iZW5lZml0X2Zvcm1fbm9uY2UnIDogJGJ1dHRvbi5kYXRhKCAnYmVuZWZpdC1ub25jZScgKSxcblx0XHRcdCAgICAgICAgJ2N1cnJlbnRfdXJsJyA6ICQoICdpbnB1dFtuYW1lPVwiY3VycmVudF91cmxcIl0nKS52YWwoKSxcblx0XHRcdCAgICAgICAgJ2JlbmVmaXQtbmFtZSc6ICQoICdpbnB1dFtuYW1lPVwiYmVuZWZpdC1uYW1lXCJdJykudmFsKCksXG5cdFx0XHQgICAgICAgICdpbnN0YW5jZV9pZCcgOiAkKCAnaW5wdXRbbmFtZT1cImluc3RhbmNlLWlkLScgKyAkYnV0dG9uLnZhbCgpICsgJ1wiXScgKS52YWwoKSxcblx0XHRcdCAgICAgICAgJ3Bvc3RfaWQnIDogJGJ1dHRvbi52YWwoKSxcblx0XHRcdCAgICAgICAgJ2lzX2FqYXgnIDogJzEnLFxuXHRcdFx0ICAgIH07XG5cdFx0XHQgICAgJC5wb3N0KCBzZXR0aW5ncy5hamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHQgICAgXHQvLyBzdWNjZXNzXG5cdFx0XHRcdCAgICBpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdCAgICBcdC8vY29uc29sZS5kaXIocmVzcG9uc2UpO1xuXHRcdFx0XHQgICAgXHQkYnV0dG9uLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS50ZXh0KCByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICkuYWRkQ2xhc3MoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzICkucHJvcCggcmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSApO1xuXHRcdFx0XHQgICAgXHQkc3RhdHVzLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmFkZENsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSAnICsgcmVzcG9uc2UuZGF0YS5tZXNzYWdlX2NsYXNzICk7XG5cdFx0XHRcdCAgICB9IGVsc2Uge1xuXHRcdFx0XHQgICAgXHQvLyBlcnJvclxuXHRcdFx0XHQgICAgXHQvL2NvbnNvbGUuZGlyKHJlc3BvbnNlKTtcblx0XHRcdFx0ICAgIFx0aWYgKCAnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKSB7XG5cdFx0XHRcdCAgICBcdFx0JGJ1dHRvbi5zaG93KCk7XG5cdFx0XHRcdCAgICBcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0ICAgIFx0fSBlbHNlIHtcblx0XHRcdFx0ICAgIFx0XHQkYnV0dG9uLmhpZGUoKTtcblx0XHRcdFx0ICAgIFx0fVxuXHRcdFx0XHQgICAgXHQvLyByZS1lbmFibGUgYWxsIHRoZSBvdGhlciBidXR0b25zXG5cdFx0XHRcdFx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkubm90KCAkYnV0dG9uICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblx0XHRcdFx0ICAgIFx0JHN0YXR1cy5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5hZGRDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzcyApO1xuXHRcdFx0XHQgICAgfVxuXG5cdFx0XHRcdH0pO1xuXHRcdCAgICB9XG5cdFx0fSk7XG5cdH1cblxuXHQkKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblx0XHRpZiAoIDAgPCAkKCAnLm0tZm9ybS1tZW1iZXJzaGlwLWJlbmVmaXQnICkubGVuZ3RoICkge1xuXHRcdFx0YmVuZWZpdEZvcm0oKTtcblx0XHR9XG5cdH0pO1xuXG59ICkoIGpRdWVyeSApO1xuIiwiLy8gcGx1Z2luXG47KGZ1bmN0aW9uICggJCwgd2luZG93LCBkb2N1bWVudCwgdW5kZWZpbmVkICkge1xuXG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdE1lbWJlcnNoaXAnLFxuXHRkZWZhdWx0cyA9IHtcblx0XHQnZGVidWcnIDogZmFsc2UsIC8vIHRoaXMgY2FuIGJlIHNldCB0byB0cnVlIG9uIHBhZ2UgbGV2ZWwgb3B0aW9uc1xuXHRcdCdhbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZScgOiAnI2Ftb3VudC1pdGVtICNhbW91bnQnLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZScgOiAnLm0tbWVtYmVyc2hpcC1mYXN0LXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdCdsZXZlbF92aWV3ZXJfY29udGFpbmVyJyA6ICcuYS1zaG93LWxldmVsJyxcblx0XHQnbGV2ZWxfbmFtZScgOiAnLmEtbGV2ZWwnLFxuXHRcdCd1c2VyX2N1cnJlbnRfbGV2ZWwnIDogJy5hLWN1cnJlbnQtbGV2ZWwnLFxuXHRcdCd1c2VyX25ld19sZXZlbCcgOiAnLmEtbmV3LWxldmVsJyxcblx0XHQnYW1vdW50X3ZpZXdlcicgOiAnLmFtb3VudCBoMycsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5hLWZvcm0taXRlbS1tZW1iZXJzaGlwLWZyZXF1ZW5jeScsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHNfdHlwZScgOiAnc2VsZWN0Jyxcblx0XHQnbGV2ZWxzX2NvbnRhaW5lcicgOiAnLm8tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWxzJyxcblx0XHQnc2luZ2xlX2xldmVsX2NvbnRhaW5lcicgOiAnLm0tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWwnLFxuXHRcdCdzaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcicgOiAnLm0tbWVtYmVyLWxldmVsLWJyaWVmJyxcblx0XHQnZmxpcHBlZF9pdGVtcycgOiAnZGl2LmFtb3VudCwgZGl2LmVudGVyJyxcblx0XHQnbGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3InIDogJy5zaG93LWZyZXF1ZW5jeScsXG5cdFx0J2Nob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuYW1vdW50IC5hLWJ1dHRvbi1mbGlwJyxcblx0XHQnYW1vdW50X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmVudGVyIGlucHV0LmFtb3VudC1lbnRyeScsXG5cdH07IC8vIGVuZCBkZWZhdWx0c1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblxuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCgge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblxuXHRcdGluaXQ6IGZ1bmN0aW9uKCByZXNldCwgYW1vdW50ICkge1xuXHRcdFx0Ly8gUGxhY2UgaW5pdGlhbGl6YXRpb24gbG9naWMgaGVyZVxuXHRcdFx0Ly8gWW91IGFscmVhZHkgaGF2ZSBhY2Nlc3MgdG8gdGhlIERPTSBlbGVtZW50IGFuZFxuXHRcdFx0Ly8gdGhlIG9wdGlvbnMgdmlhIHRoZSBpbnN0YW5jZSwgZS5nLiB0aGlzLmVsZW1lbnRcblx0XHRcdC8vIGFuZCB0aGlzLm9wdGlvbnNcblx0XHRcdC8vIHlvdSBjYW4gYWRkIG1vcmUgZnVuY3Rpb25zIGxpa2UgdGhlIG9uZSBiZWxvdyBhbmRcblx0XHRcdC8vIGNhbGwgdGhlbSBsaWtlIHNvOiB0aGlzLnlvdXJPdGhlckZ1bmN0aW9uKHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKS5cblx0XHRcdHRoaXMuY2F0Y2hIYXNoTGlua3MoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKTtcblx0XHRcdHRoaXMubGV2ZWxGbGlwcGVyKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdFx0dGhpcy5zdGFydExldmVsQ2xpY2soIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0XHR0aGlzLnN1Ym1pdEZvcm0oIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0fSxcblxuXHRcdGFuYWx5dGljc0V2ZW50VHJhY2s6IGZ1bmN0aW9uKCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKSB7XG5cdFx0XHRpZiAoIHR5cGVvZiBnYSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGlmICggdHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIGFuYWx5dGljc0V2ZW50VHJhY2tcblxuXHRcdGNhdGNoSGFzaExpbmtzOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoJ2FbaHJlZio9XCIjXCJdOm5vdChbaHJlZj1cIiNcIl0pJywgZWxlbWVudCkuY2xpY2soZnVuY3Rpb24oZSkge1xuXHRcdFx0ICAgIHZhciB0YXJnZXQgPSAkKGUudGFyZ2V0KTtcblx0XHRcdCAgICBpZiAodGFyZ2V0LnBhcmVudCgnLmNvbW1lbnQtdGl0bGUnKS5sZW5ndGggPT0gMCAmJiBsb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywnJykgPT0gdGhpcy5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywnJykgJiYgbG9jYXRpb24uaG9zdG5hbWUgPT0gdGhpcy5ob3N0bmFtZSkge1xuXHRcdFx0XHQgICAgdmFyIHRhcmdldCA9ICQodGhpcy5oYXNoKTtcblx0XHRcdFx0ICAgIHRhcmdldCA9IHRhcmdldC5sZW5ndGggPyB0YXJnZXQgOiAkKCdbbmFtZT0nICsgdGhpcy5oYXNoLnNsaWNlKDEpICsnXScpO1xuXHRcdFx0XHRcdGlmICh0YXJnZXQubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHQkKCdodG1sLGJvZHknKS5hbmltYXRlKHtcblx0XHRcdFx0XHRcdFx0c2Nyb2xsVG9wOiB0YXJnZXQub2Zmc2V0KCkudG9wXG5cdFx0XHRcdFx0XHR9LCAxMDAwKTtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBjYXRjaExpbmtzXG5cblx0XHRsZXZlbEZsaXBwZXI6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dmFyIHByZXZpb3VzX2Ftb3VudCA9ICcnO1xuXHRcdFx0dmFyIGFtb3VudCA9IDA7XG5cdFx0XHR2YXIgbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSAwO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9zdHJpbmcgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3kgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9ICcnO1xuXHRcdFx0aWYgKCB0eXBlb2YgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhICE9PSAndW5kZWZpbmVkJyAmJiAkKCBvcHRpb25zLnVzZXJfY3VycmVudF9sZXZlbCApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdHByZXZpb3VzX2Ftb3VudCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIucHJldmlvdXNfYW1vdW50O1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLnZhbCgpO1xuXHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJykudmFsKCk7XG5cdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHQgICAgbGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHQgICAgdGhhdC5zaG93TmV3TGV2ZWwoIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICk7XG5cblx0XHRcdCAgICAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUpLmNoYW5nZSggZnVuY3Rpb24oKSB7XG5cblx0XHRcdCAgICBcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJykudmFsKClcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHQgICAgICBsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLnZhbCgpLCAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJyApLmF0dHIoICdkYXRhLXllYXItZnJlcXVlbmN5JyApLCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHQgICAgICB0aGF0LnNob3dOZXdMZXZlbCggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKTtcblx0XHRcdCAgICB9KTtcblxuXHRcdFx0ICAgICQob3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSkuYmluZCgna2V5dXAgbW91c2V1cCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0ICAgIFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnKS52YWwoKVxuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHQgICAgICBpZigkKHRoaXMpLmRhdGEoJ2xhc3QtdmFsdWUnKSAhPSAkKHRoaXMpLnZhbCgpKSB7XG5cdFx0XHQgICAgICAgICQodGhpcykuZGF0YSgnbGFzdC12YWx1ZScsICQodGhpcykudmFsKCkpO1xuXHRcdFx0ICAgICAgICBsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLnZhbCgpLCAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJyApLmF0dHIoICdkYXRhLXllYXItZnJlcXVlbmN5JyApLCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHQgICAgICAgIHRoYXQuc2hvd05ld0xldmVsKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApO1xuXHRcdFx0ICAgICAgfTtcblx0XHRcdCAgICB9KTtcblxuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmxldmVsc19jb250YWluZXIgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50ICkuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmZsaXBwZWRfaXRlbXMsICQodGhpcykgKS53cmFwQWxsKCAnPGRpdiBjbGFzcz1cImZsaXBwZXJcIi8+JyApO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkub24oJ2NoYW5nZScsIGZ1bmN0aW9uIChldmVudCkge1xuXHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQodGhpcykuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKHRoaXMpLnZhbCgpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRcdCAgICBpZiAoIHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnICkge1xuXG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblxuXHRcdFx0XHRcdFx0aWYgKCBmcmVxdWVuY3kgPT0gMSApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQteWVhcmx5JyApICk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3kgPT0gMTIgKSB7XG5cdFx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LW1vbnRobHknICkgKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXG5cdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRcdHRoYXQuY2hhbmdlRnJlcXVlbmN5KCBmcmVxdWVuY3lfc3RyaW5nLCBsZXZlbFsnbmFtZSddLCBlbGVtZW50LCBvcHRpb25zICk7XG5cblx0XHRcdFx0XHR9IGVsc2UgaWYgKCAkKCBvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRcdCQob3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciwgZWxlbWVudCkudGV4dChmcmVxdWVuY3lfbmFtZSk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJChvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRcdFx0aWYgKCB0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykgKS52YWwoKTtcblx0XHRcdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0dGhhdC5jaGFuZ2VBbW91bnRQcmV2aWV3KCBmcmVxdWVuY3lfc3RyaW5nLCBsZXZlbFsnbmFtZSddLCBlbGVtZW50LCBvcHRpb25zICk7XG5cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoICQoIG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHQkKCBvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykucGFyZW50KCkgKS52YWwoKTtcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKyAnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgKyBsZXZlbF9udW1iZXIgKyAnXCJdJykudmFsKCk7XG5cdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIGxldmVsRmxpcHBlclxuXG5cdFx0Y2hlY2tMZXZlbDogZnVuY3Rpb24oIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0ICB2YXIgdGhpc3llYXIgPSBwYXJzZUludCggYW1vdW50ICkgKiBwYXJzZUludCggZnJlcXVlbmN5ICk7XG5cdFx0ICB2YXIgbGV2ZWwgPSAnJztcblx0XHQgIGlmICggdHlwZW9mIHByZXZpb3VzX2Ftb3VudCAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJldmlvdXNfYW1vdW50ICE9PSAnJyApIHtcblx0XHQgICAgdmFyIHByaW9yX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoIHByZXZpb3VzX2Ftb3VudC5wcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMgKTtcblx0XHQgICAgdmFyIGNvbWluZ195ZWFyX2Ftb3VudCA9IHBhcnNlSW50KCBwcmV2aW91c19hbW91bnQuY29taW5nX3llYXJfY29udHJpYnV0aW9ucyApO1xuXHRcdCAgICB2YXIgYW5udWFsX3JlY3VycmluZ19hbW91bnQgPSBwYXJzZUludCggcHJldmlvdXNfYW1vdW50LmFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICk7XG5cdFx0ICAgIC8vIGNhbGN1bGF0ZSBtZW1iZXIgbGV2ZWwgZm9ybXVsYVxuXHRcdCAgICBpZiAoIHR5cGUgPT09ICdvbmUtdGltZScgKSB7XG5cdFx0ICAgICAgcHJpb3JfeWVhcl9hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0ICAgIH0gZWxzZSB7XG5cdFx0ICAgICAgYW5udWFsX3JlY3VycmluZ19hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0ICAgIH1cblxuXHRcdCAgICB0aGlzeWVhciA9IE1hdGgubWF4KCBwcmlvcl95ZWFyX2Ftb3VudCwgY29taW5nX3llYXJfYW1vdW50LCBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCApO1xuXHRcdCAgfVxuXG5cdFx0ICBsZXZlbCA9IHRoaXMuZ2V0TGV2ZWwoIHRoaXN5ZWFyICk7XG5cblx0XHQgICQoJ2gyJywgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcikuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0ICAgIGlmICggJCh0aGlzKS50ZXh0KCkgPT0gbGV2ZWxbJ25hbWUnXSApIHtcblx0XHQgICAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdCAgICAgICQodGhpcykucGFyZW50KCkucGFyZW50KCkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0ICAgIH1cblx0XHQgIH0gKTtcblx0XHQgIHJldHVybiBsZXZlbDtcblxuXHRcdH0sIC8vIGVuZCBjaGVja0xldmVsXG5cblx0XHRnZXRMZXZlbDogZnVuY3Rpb24oIHRoaXN5ZWFyICkge1xuXHRcdFx0dmFyIGxldmVsID0gW107XG5cdFx0XHRpZiAoIHRoaXN5ZWFyID4gMCAmJiB0aGlzeWVhciA8IDYwICkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ0Jyb256ZSc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDE7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmICh0aGlzeWVhciA+IDU5ICYmIHRoaXN5ZWFyIDwgMTIwKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnU2lsdmVyJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMjtcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAxMTkgJiYgdGhpc3llYXIgPCAyNDApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdHb2xkJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMztcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAyMzkpIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdQbGF0aW51bSc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDQ7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbGV2ZWw7XG5cdFx0fSwgLy8gZW5kIGdldExldmVsXG5cblx0XHRzaG93TmV3TGV2ZWw6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApIHtcblx0XHRcdHZhciBtZW1iZXJfbGV2ZWxfcHJlZml4ID0gJyc7XG5cdFx0XHR2YXIgb2xkX2xldmVsID0gJyc7XG5cdFx0XHR2YXIgbGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciA9IG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lcjsgLy8gdGhpcyBzaG91bGQgY2hhbmdlIHdoZW4gd2UgcmVwbGFjZSB0aGUgdGV4dCwgaWYgdGhlcmUgaXMgYSBsaW5rIGluc2lkZSBpdFxuXHRcdFx0dmFyIGRlY29kZUh0bWxFbnRpdHkgPSBmdW5jdGlvbiggc3RyICkge1xuXHRcdFx0XHRyZXR1cm4gc3RyLnJlcGxhY2UoIC8mIyhcXGQrKTsvZywgZnVuY3Rpb24oIG1hdGNoLCBkZWMgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoIGRlYyApO1xuXHRcdFx0XHR9KTtcblx0XHRcdH07XG5cdFx0XHRpZiAoIHR5cGVvZiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRtZW1iZXJfbGV2ZWxfcHJlZml4ID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLm1lbWJlcl9sZXZlbF9wcmVmaXg7XG5cdFx0XHR9XG5cblx0XHRcdCQob3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyKS5wcm9wKCAnY2xhc3MnLCAnYS1zaG93LWxldmVsIGEtc2hvdy1sZXZlbC0nICsgbGV2ZWxbJ25hbWUnXS50b0xvd2VyQ2FzZSgpICk7XG5cblx0XHRcdGlmICggJCggb3B0aW9ucy51c2VyX2N1cnJlbnRfbGV2ZWwgKS5sZW5ndGggPiAwICYmIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLmxlbmd0aCA+IDAgKSB7XG5cblx0XHRcdFx0aWYgKCAnYScsICQoIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0bGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciA9IG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciArICcgYSc7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRvbGRfbGV2ZWwgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5yZXBsYWNlKCBtZW1iZXJfbGV2ZWxfcHJlZml4LCAnJyApO1xuXG5cdFx0XHRcdGlmICggb2xkX2xldmVsICE9PSBsZXZlbFsnbmFtZSddLnRvTG93ZXJDYXNlKCkgKSB7XG5cdFx0XHRcdFx0JCggbGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciApLmh0bWwoIGRlY29kZUh0bWxFbnRpdHkoICQoIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciApLmRhdGEoICdjaGFuZ2VkJyApICkgKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCBsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yICkuaHRtbCggZGVjb2RlSHRtbEVudGl0eSggJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkuZGF0YSggJ25vdC1jaGFuZ2VkJyApICkgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQkKG9wdGlvbnMubGV2ZWxfbmFtZSwgb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyKS50ZXh0KCBsZXZlbFsnbmFtZSddICk7XG5cblx0XHR9LCAvLyBlbmQgc2hvd05ld0xldmVsXG5cblx0XHRjaGFuZ2VGcmVxdWVuY3k6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdCAgICB2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHQgICAgdmFyIG9uY2VfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnb25lLXRpbWUnKTtcblx0XHRcdCAgICB2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHQgICAgdmFyIGZyZXF1ZW5jeSAgICAgID0gcGFyc2VJbnQoIHNlbGVjdGVkLnNwbGl0KCcgLSAnKVsxXSApO1xuXG5cdFx0XHQgICAgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzICkudmFsKCBzZWxlY3RlZCApO1xuICAgIFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyApLnByb3AoICdzZWxlY3RlZCcsIHNlbGVjdGVkICk7XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcbiAgICBcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykgKS5kYXRhKCAnZnJlcXVlbmN5JywgZnJlcXVlbmN5ICk7XG5cblx0XHRcdH0gKTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlRnJlcXVlbmN5XG5cblx0XHRjaGFuZ2VBbW91bnRQcmV2aWV3OiBmdW5jdGlvbiggc2VsZWN0ZWQsIGxldmVsLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcmFuZ2UgICAgICAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCk7XG5cdFx0XHRcdHZhciBtb250aF92YWx1ZSAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ21vbnRoJyk7XG5cdFx0XHQgICAgdmFyIHllYXJfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgneWVhcicpO1xuXHRcdFx0ICAgIHZhciBvbmNlX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ29uZS10aW1lJyk7XG5cdFx0XHQgICAgdmFyIGZyZXF1ZW5jeV9uYW1lID0gc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHRcdGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciBtb250aCcgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5yZW1vdmVDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgeWVhcicgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gb25jZV92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcygnc21hbGxlcicgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoIHJhbmdlICk7XG5cblx0XHRcdH0gKTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlQW1vdW50UHJldmlld1xuXG5cdFx0c3RhcnRMZXZlbENsaWNrOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoJy5zdGFydC1sZXZlbCcpLmNsaWNrKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgbGV2ZWxfY2xhc3MgPSAkKCB0aGlzICkucHJvcCggJ2NsYXNzJyApO1xuXHRcdFx0XHR2YXIgbGV2ZWxfbnVtYmVyID0gbGV2ZWxfY2xhc3NbbGV2ZWxfY2xhc3MubGVuZ3RoIC0xXTtcblx0XHRcdCAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyLCBlbGVtZW50ICkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICsgJyAnICsgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdCAgfSk7XG5cdFx0fSwgLy8gZW5kIHN0YXJ0TGV2ZWxDbGlja1xuXG5cdFx0c3VibWl0Rm9ybTogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHQkKCBlbGVtZW50ICkuc3VibWl0KCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdHRoYXQuYW5hbHl0aWNzRXZlbnRUcmFjayggJ2V2ZW50JywgJ1N1cHBvcnQgVXMnLCAnQmVjb21lIEEgTWVtYmVyJywgbG9jYXRpb24ucGF0aG5hbWUgKTtcblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBzdWJtaXRGb3JtXG5cblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcblxufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCApO1xuIl19
