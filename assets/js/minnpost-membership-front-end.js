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
					if (true === response.success) {
						//console.dir(response);
						$button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
						$status.html(response.data.message).addClass('m-benefit-message-visible ' + response.data.message_class);
					} else {
						//console.dir(response);
						if ('' !== response.data.button_label) {
							$button.show();
							$button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
						} else {
							$button.hide();
						}
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJlbmVmaXRzLmpzIiwibWVtYmVyLWxldmVscy5qcyJdLCJuYW1lcyI6WyIkIiwiYmVuZWZpdEZvcm0iLCJyZW1vdmVBdHRyIiwiY2xpY2siLCJldmVudCIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsIiRzdGF0dXMiLCJwYXJlbnQiLCJzZXR0aW5ncyIsIm1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3MiLCJyZW1vdmVDbGFzcyIsInRleHQiLCJhZGRDbGFzcyIsImRhdGEiLCJiZW5lZml0VHlwZSIsInZhbCIsInBvc3QiLCJhamF4dXJsIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwiYnV0dG9uX3ZhbHVlIiwiYnV0dG9uX2xhYmVsIiwiYnV0dG9uX2NsYXNzIiwicHJvcCIsImJ1dHRvbl9hdHRyIiwiaHRtbCIsIm1lc3NhZ2UiLCJtZXNzYWdlX2NsYXNzIiwic2hvdyIsImhpZGUiLCJkb2N1bWVudCIsInJlYWR5IiwibGVuZ3RoIiwialF1ZXJ5Iiwid2luZG93IiwidW5kZWZpbmVkIiwicGx1Z2luTmFtZSIsImRlZmF1bHRzIiwiUGx1Z2luIiwiZWxlbWVudCIsIm9wdGlvbnMiLCJleHRlbmQiLCJfZGVmYXVsdHMiLCJfbmFtZSIsImluaXQiLCJwcm90b3R5cGUiLCJyZXNldCIsImFtb3VudCIsImNhdGNoSGFzaExpbmtzIiwibGV2ZWxGbGlwcGVyIiwic3RhcnRMZXZlbENsaWNrIiwic3VibWl0Rm9ybSIsImFuYWx5dGljc0V2ZW50VHJhY2siLCJ0eXBlIiwiY2F0ZWdvcnkiLCJhY3Rpb24iLCJsYWJlbCIsInZhbHVlIiwiZ2EiLCJlIiwidGFyZ2V0IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInJlcGxhY2UiLCJob3N0bmFtZSIsImhhc2giLCJzbGljZSIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiLCJ0aGF0IiwicHJldmlvdXNfYW1vdW50IiwibGV2ZWwiLCJsZXZlbF9udW1iZXIiLCJmcmVxdWVuY3lfc3RyaW5nIiwiZnJlcXVlbmN5IiwiZnJlcXVlbmN5X25hbWUiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEiLCJ1c2VyX2N1cnJlbnRfbGV2ZWwiLCJjdXJyZW50X3VzZXIiLCJhbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lIiwic3BsaXQiLCJjaGVja0xldmVsIiwic2hvd05ld0xldmVsIiwiY2hhbmdlIiwiYXR0ciIsImJpbmQiLCJsZXZlbHNfY29udGFpbmVyIiwic2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IiLCJlYWNoIiwiZmxpcHBlZF9pdGVtcyIsIndyYXBBbGwiLCJmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzIiwib24iLCJzaW5nbGVfbGV2ZWxfY29udGFpbmVyIiwiY2xvc2VzdCIsImFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJhbW91bnRfdmlld2VyIiwiY2hhbmdlRnJlcXVlbmN5IiwibGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IiLCJjaGFuZ2VBbW91bnRQcmV2aWV3IiwiY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJ0aGlzeWVhciIsInBhcnNlSW50IiwicHJpb3JfeWVhcl9hbW91bnQiLCJwcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMiLCJjb21pbmdfeWVhcl9hbW91bnQiLCJjb21pbmdfeWVhcl9jb250cmlidXRpb25zIiwiYW5udWFsX3JlY3VycmluZ19hbW91bnQiLCJNYXRoIiwibWF4IiwiZ2V0TGV2ZWwiLCJtZW1iZXJfbGV2ZWxfcHJlZml4Iiwib2xkX2xldmVsIiwibGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciIsImxldmVsX3ZpZXdlcl9jb250YWluZXIiLCJkZWNvZGVIdG1sRW50aXR5Iiwic3RyIiwibWF0Y2giLCJkZWMiLCJTdHJpbmciLCJmcm9tQ2hhckNvZGUiLCJ0b0xvd2VyQ2FzZSIsIm1lbWJlcl9sZXZlbCIsImxldmVsX25hbWUiLCJzZWxlY3RlZCIsInJhbmdlIiwibW9udGhfdmFsdWUiLCJ5ZWFyX3ZhbHVlIiwib25jZV92YWx1ZSIsImxldmVsX2NsYXNzIiwic3VibWl0IiwiZm4iXSwibWFwcGluZ3MiOiI7O0FBQUEsQ0FBRSxVQUFVQSxDQUFWLEVBQWM7O0FBRWYsVUFBU0MsV0FBVCxHQUF1QjtBQUN0QkQsSUFBRyxxQ0FBSCxFQUEyQ0UsVUFBM0MsQ0FBdUQsVUFBdkQ7QUFDQUYsSUFBRyxtQkFBSCxFQUF5QkcsS0FBekIsQ0FBZ0MsVUFBVUMsS0FBVixFQUFrQjtBQUNqREEsU0FBTUMsY0FBTjtBQUNBLE9BQUlDLFVBQVdOLEVBQUcsSUFBSCxDQUFmO0FBQ0EsT0FBSU8sVUFBV1AsRUFBRyxvQkFBSCxFQUF5QkEsRUFBRyxJQUFILEVBQVVRLE1BQVYsRUFBekIsQ0FBZjtBQUNBLE9BQUlDLFdBQVdDLDRCQUFmO0FBQ0E7QUFDQSxPQUFLLENBQUUsNEJBQVAsRUFBc0M7QUFDckNWLE1BQUcsb0JBQUgsRUFBMEJXLFdBQTFCLENBQXVDLDBFQUF2QztBQUNBO0FBQ0Q7QUFDQUwsV0FBUU0sSUFBUixDQUFjLFlBQWQsRUFBNkJDLFFBQTdCLENBQXVDLG1CQUF2QztBQUNBO0FBQ0EsT0FBSUMsT0FBTyxFQUFYO0FBQ0EsT0FBSUMsY0FBY2YsRUFBRyw0QkFBSCxFQUFrQ2dCLEdBQWxDLEVBQWxCO0FBQ0EsT0FBSyxxQkFBcUJELFdBQTFCLEVBQXdDO0FBQ3BDRCxXQUFPO0FBQ0gsZUFBVyxxQkFEUjtBQUVILCtDQUEyQ1IsUUFBUVEsSUFBUixDQUFjLGVBQWQsQ0FGeEM7QUFHSCxvQkFBZ0JkLEVBQUcsMkJBQUgsRUFBZ0NnQixHQUFoQyxFQUhiO0FBSUgscUJBQWdCaEIsRUFBRyw0QkFBSCxFQUFpQ2dCLEdBQWpDLEVBSmI7QUFLSCxvQkFBZ0JoQixFQUFHLDZCQUE2Qk0sUUFBUVUsR0FBUixFQUE3QixHQUE2QyxJQUFoRCxFQUF1REEsR0FBdkQsRUFMYjtBQU1ILGdCQUFZVixRQUFRVSxHQUFSLEVBTlQ7QUFPSCxnQkFBWTtBQVBULEtBQVA7QUFTQWhCLE1BQUVp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QWxCLENBQXRDO0FBQ0E7QUFDRCxHQUpNLENBQVA7QUFLQSxFQU5EO0FBUUEsQ0E1VkEsRUE0VkdQLE1BNVZILEVBNFZXQyxNQTVWWCxFQTRWbUJKLFFBNVZuQiIsImZpbGUiOiJtaW5ucG9zdC1tZW1iZXJzaGlwLWZyb250LWVuZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiggZnVuY3Rpb24oICQgKSB7XG5cblx0ZnVuY3Rpb24gYmVuZWZpdEZvcm0oKSB7XG5cdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uLmEtYnV0dG9uLWRpc2FibGVkJyApLnJlbW92ZUF0dHIoICdkaXNhYmxlZCcgKTtcblx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR2YXIgJGJ1dHRvbiAgPSAkKCB0aGlzICk7XG5cdFx0XHR2YXIgJHN0YXR1cyAgPSAkKCAnLm0tYmVuZWZpdC1tZXNzYWdlJywgJCggdGhpcyApLnBhcmVudCgpICk7XG5cdFx0XHR2YXIgc2V0dGluZ3MgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzO1xuXHRcdFx0Ly8gcmVzZXQgdGhlIG1lc3NhZ2UgZm9yIGN1cnJlbnQgc3RhdHVzXG5cdFx0XHRpZiAoICEgJy5tLWJlbmVmaXQtbWVzc2FnZS1zdWNjZXNzJyApIHtcblx0XHRcdFx0JCggJy5tLWJlbmVmaXQtbWVzc2FnZScgKS5yZW1vdmVDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgbS1iZW5lZml0LW1lc3NhZ2UtZXJyb3IgbS1iZW5lZml0LW1lc3NhZ2UtaW5mbycgKTtcblx0XHRcdH1cblx0XHRcdC8vIHNldCBidXR0b24gdG8gcHJvY2Vzc2luZ1xuXHRcdFx0JGJ1dHRvbi50ZXh0KCAnUHJvY2Vzc2luZycgKS5hZGRDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXHRcdFx0Ly8gc2V0IGFqYXggZGF0YVxuXHRcdFx0dmFyIGRhdGEgPSB7fTtcblx0XHRcdHZhciBiZW5lZml0VHlwZSA9ICQoICdpbnB1dFtuYW1lPVwiYmVuZWZpdC1uYW1lXCJdJyApLnZhbCgpO1xuXHRcdFx0aWYgKCAncGFydG5lci1vZmZlcnMnID09PSBiZW5lZml0VHlwZSApIHtcblx0XHRcdCAgICBkYXRhID0ge1xuXHRcdFx0ICAgICAgICAnYWN0aW9uJyA6ICdiZW5lZml0X2Zvcm1fc3VibWl0Jyxcblx0XHRcdCAgICAgICAgJ21pbm5wb3N0X21lbWJlcnNoaXBfYmVuZWZpdF9mb3JtX25vbmNlJyA6ICRidXR0b24uZGF0YSggJ2JlbmVmaXQtbm9uY2UnICksXG5cdFx0XHQgICAgICAgICdjdXJyZW50X3VybCcgOiAkKCAnaW5wdXRbbmFtZT1cImN1cnJlbnRfdXJsXCJdJykudmFsKCksXG5cdFx0XHQgICAgICAgICdiZW5lZml0LW5hbWUnOiAkKCAnaW5wdXRbbmFtZT1cImJlbmVmaXQtbmFtZVwiXScpLnZhbCgpLFxuXHRcdFx0ICAgICAgICAnaW5zdGFuY2VfaWQnIDogJCggJ2lucHV0W25hbWU9XCJpbnN0YW5jZS1pZC0nICsgJGJ1dHRvbi52YWwoKSArICdcIl0nICkudmFsKCksXG5cdFx0XHQgICAgICAgICdwb3N0X2lkJyA6ICRidXR0b24udmFsKCksXG5cdFx0XHQgICAgICAgICdpc19hamF4JyA6ICcxJyxcblx0XHRcdCAgICB9O1xuXHRcdFx0ICAgICQucG9zdCggc2V0dGluZ3MuYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHQgICAgaWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHQgICAgXHQvL2NvbnNvbGUuZGlyKHJlc3BvbnNlKTtcblx0XHRcdFx0ICAgIFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0ICAgIFx0JHN0YXR1cy5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5hZGRDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzcyApO1xuXHRcdFx0XHQgICAgfSBlbHNlIHtcblx0XHRcdFx0ICAgIFx0Ly9jb25zb2xlLmRpcihyZXNwb25zZSk7XG5cdFx0XHRcdCAgICBcdGlmICggJycgIT09IHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkge1xuXHRcdFx0XHQgICAgXHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHQgICAgXHRcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdCAgICBcdH0gZWxzZSB7XG5cdFx0XHRcdCAgICBcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdCAgICBcdH1cblx0XHRcdFx0ICAgIFx0JHN0YXR1cy5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5hZGRDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzcyApO1xuXHRcdFx0XHQgICAgfVxuXG5cdFx0XHRcdH0pO1xuXHRcdCAgICB9XG5cdFx0fSk7XG5cdH1cblxuXHQkKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblx0XHRpZiAoIDAgPCAkKCAnLm0tZm9ybS1tZW1iZXJzaGlwLWJlbmVmaXQnICkubGVuZ3RoICkge1xuXHRcdFx0YmVuZWZpdEZvcm0oKTtcblx0XHR9XG5cdH0pO1xuXG59ICkoIGpRdWVyeSApO1xuIiwiLy8gcGx1Z2luXG47KGZ1bmN0aW9uICggJCwgd2luZG93LCBkb2N1bWVudCwgdW5kZWZpbmVkICkge1xuXG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdE1lbWJlcnNoaXAnLFxuXHRkZWZhdWx0cyA9IHtcblx0XHQnZGVidWcnIDogZmFsc2UsIC8vIHRoaXMgY2FuIGJlIHNldCB0byB0cnVlIG9uIHBhZ2UgbGV2ZWwgb3B0aW9uc1xuXHRcdCdhbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZScgOiAnI2Ftb3VudC1pdGVtICNhbW91bnQnLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZScgOiAnLm0tbWVtYmVyc2hpcC1mYXN0LXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdCdsZXZlbF92aWV3ZXJfY29udGFpbmVyJyA6ICcuYS1zaG93LWxldmVsJyxcblx0XHQnbGV2ZWxfbmFtZScgOiAnLmEtbGV2ZWwnLFxuXHRcdCd1c2VyX2N1cnJlbnRfbGV2ZWwnIDogJy5hLWN1cnJlbnQtbGV2ZWwnLFxuXHRcdCd1c2VyX25ld19sZXZlbCcgOiAnLmEtbmV3LWxldmVsJyxcblx0XHQnYW1vdW50X3ZpZXdlcicgOiAnLmFtb3VudCBoMycsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5hLWZvcm0taXRlbS1tZW1iZXJzaGlwLWZyZXF1ZW5jeScsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHNfdHlwZScgOiAnc2VsZWN0Jyxcblx0XHQnbGV2ZWxzX2NvbnRhaW5lcicgOiAnLm8tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWxzJyxcblx0XHQnc2luZ2xlX2xldmVsX2NvbnRhaW5lcicgOiAnLm0tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWwnLFxuXHRcdCdzaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcicgOiAnLm0tbWVtYmVyLWxldmVsLWJyaWVmJyxcblx0XHQnZmxpcHBlZF9pdGVtcycgOiAnZGl2LmFtb3VudCwgZGl2LmVudGVyJyxcblx0XHQnbGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3InIDogJy5zaG93LWZyZXF1ZW5jeScsXG5cdFx0J2Nob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuYW1vdW50IC5hLWJ1dHRvbi1mbGlwJyxcblx0XHQnYW1vdW50X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmVudGVyIGlucHV0LmFtb3VudC1lbnRyeScsXG5cdH07IC8vIGVuZCBkZWZhdWx0c1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblxuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCgge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblxuXHRcdGluaXQ6IGZ1bmN0aW9uKCByZXNldCwgYW1vdW50ICkge1xuXHRcdFx0Ly8gUGxhY2UgaW5pdGlhbGl6YXRpb24gbG9naWMgaGVyZVxuXHRcdFx0Ly8gWW91IGFscmVhZHkgaGF2ZSBhY2Nlc3MgdG8gdGhlIERPTSBlbGVtZW50IGFuZFxuXHRcdFx0Ly8gdGhlIG9wdGlvbnMgdmlhIHRoZSBpbnN0YW5jZSwgZS5nLiB0aGlzLmVsZW1lbnRcblx0XHRcdC8vIGFuZCB0aGlzLm9wdGlvbnNcblx0XHRcdC8vIHlvdSBjYW4gYWRkIG1vcmUgZnVuY3Rpb25zIGxpa2UgdGhlIG9uZSBiZWxvdyBhbmRcblx0XHRcdC8vIGNhbGwgdGhlbSBsaWtlIHNvOiB0aGlzLnlvdXJPdGhlckZ1bmN0aW9uKHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKS5cblx0XHRcdHRoaXMuY2F0Y2hIYXNoTGlua3MoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKTtcblx0XHRcdHRoaXMubGV2ZWxGbGlwcGVyKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdFx0dGhpcy5zdGFydExldmVsQ2xpY2soIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0XHR0aGlzLnN1Ym1pdEZvcm0oIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0fSxcblxuXHRcdGFuYWx5dGljc0V2ZW50VHJhY2s6IGZ1bmN0aW9uKCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKSB7XG5cdFx0XHRpZiAoIHR5cGVvZiBnYSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGlmICggdHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIGFuYWx5dGljc0V2ZW50VHJhY2tcblxuXHRcdGNhdGNoSGFzaExpbmtzOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoJ2FbaHJlZio9XCIjXCJdOm5vdChbaHJlZj1cIiNcIl0pJywgZWxlbWVudCkuY2xpY2soZnVuY3Rpb24oZSkge1xuXHRcdFx0ICAgIHZhciB0YXJnZXQgPSAkKGUudGFyZ2V0KTtcblx0XHRcdCAgICBpZiAodGFyZ2V0LnBhcmVudCgnLmNvbW1lbnQtdGl0bGUnKS5sZW5ndGggPT0gMCAmJiBsb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywnJykgPT0gdGhpcy5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywnJykgJiYgbG9jYXRpb24uaG9zdG5hbWUgPT0gdGhpcy5ob3N0bmFtZSkge1xuXHRcdFx0XHQgICAgdmFyIHRhcmdldCA9ICQodGhpcy5oYXNoKTtcblx0XHRcdFx0ICAgIHRhcmdldCA9IHRhcmdldC5sZW5ndGggPyB0YXJnZXQgOiAkKCdbbmFtZT0nICsgdGhpcy5oYXNoLnNsaWNlKDEpICsnXScpO1xuXHRcdFx0XHRcdGlmICh0YXJnZXQubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHQkKCdodG1sLGJvZHknKS5hbmltYXRlKHtcblx0XHRcdFx0XHRcdFx0c2Nyb2xsVG9wOiB0YXJnZXQub2Zmc2V0KCkudG9wXG5cdFx0XHRcdFx0XHR9LCAxMDAwKTtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBjYXRjaExpbmtzXG5cblx0XHRsZXZlbEZsaXBwZXI6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dmFyIHByZXZpb3VzX2Ftb3VudCA9ICcnO1xuXHRcdFx0dmFyIGFtb3VudCA9IDA7XG5cdFx0XHR2YXIgbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSAwO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9zdHJpbmcgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3kgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9ICcnO1xuXHRcdFx0aWYgKCB0eXBlb2YgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhICE9PSAndW5kZWZpbmVkJyAmJiAkKCBvcHRpb25zLnVzZXJfY3VycmVudF9sZXZlbCApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdHByZXZpb3VzX2Ftb3VudCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIucHJldmlvdXNfYW1vdW50O1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLnZhbCgpO1xuXHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJykudmFsKCk7XG5cdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHQgICAgbGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHQgICAgdGhhdC5zaG93TmV3TGV2ZWwoIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICk7XG5cblx0XHRcdCAgICAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUpLmNoYW5nZSggZnVuY3Rpb24oKSB7XG5cblx0XHRcdCAgICBcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJykudmFsKClcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHQgICAgICBsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLnZhbCgpLCAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJyApLmF0dHIoICdkYXRhLXllYXItZnJlcXVlbmN5JyApLCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHQgICAgICB0aGF0LnNob3dOZXdMZXZlbCggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKTtcblx0XHRcdCAgICB9KTtcblxuXHRcdFx0ICAgICQob3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSkuYmluZCgna2V5dXAgbW91c2V1cCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0ICAgIFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnKS52YWwoKVxuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHQgICAgICBpZigkKHRoaXMpLmRhdGEoJ2xhc3QtdmFsdWUnKSAhPSAkKHRoaXMpLnZhbCgpKSB7XG5cdFx0XHQgICAgICAgICQodGhpcykuZGF0YSgnbGFzdC12YWx1ZScsICQodGhpcykudmFsKCkpO1xuXHRcdFx0ICAgICAgICBsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLnZhbCgpLCAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJyApLmF0dHIoICdkYXRhLXllYXItZnJlcXVlbmN5JyApLCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHQgICAgICAgIHRoYXQuc2hvd05ld0xldmVsKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApO1xuXHRcdFx0ICAgICAgfTtcblx0XHRcdCAgICB9KTtcblxuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmxldmVsc19jb250YWluZXIgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50ICkuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmZsaXBwZWRfaXRlbXMsICQodGhpcykgKS53cmFwQWxsKCAnPGRpdiBjbGFzcz1cImZsaXBwZXJcIi8+JyApO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkub24oJ2NoYW5nZScsIGZ1bmN0aW9uIChldmVudCkge1xuXHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQodGhpcykuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKHRoaXMpLnZhbCgpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRcdCAgICBpZiAoIHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnICkge1xuXG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblxuXHRcdFx0XHRcdFx0aWYgKCBmcmVxdWVuY3kgPT0gMSApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQteWVhcmx5JyApICk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3kgPT0gMTIgKSB7XG5cdFx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LW1vbnRobHknICkgKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXG5cdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRcdHRoYXQuY2hhbmdlRnJlcXVlbmN5KCBmcmVxdWVuY3lfc3RyaW5nLCBsZXZlbFsnbmFtZSddLCBlbGVtZW50LCBvcHRpb25zICk7XG5cblx0XHRcdFx0XHR9IGVsc2UgaWYgKCAkKCBvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRcdCQob3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciwgZWxlbWVudCkudGV4dChmcmVxdWVuY3lfbmFtZSk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJChvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRcdFx0aWYgKCB0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykgKS52YWwoKTtcblx0XHRcdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0dGhhdC5jaGFuZ2VBbW91bnRQcmV2aWV3KCBmcmVxdWVuY3lfc3RyaW5nLCBsZXZlbFsnbmFtZSddLCBlbGVtZW50LCBvcHRpb25zICk7XG5cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoICQoIG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHQkKCBvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykucGFyZW50KCkgKS52YWwoKTtcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKyAnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgKyBsZXZlbF9udW1iZXIgKyAnXCJdJykudmFsKCk7XG5cdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIGxldmVsRmxpcHBlclxuXG5cdFx0Y2hlY2tMZXZlbDogZnVuY3Rpb24oIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0ICB2YXIgdGhpc3llYXIgPSBwYXJzZUludCggYW1vdW50ICkgKiBwYXJzZUludCggZnJlcXVlbmN5ICk7XG5cdFx0ICB2YXIgbGV2ZWwgPSAnJztcblx0XHQgIGlmICggdHlwZW9mIHByZXZpb3VzX2Ftb3VudCAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJldmlvdXNfYW1vdW50ICE9PSAnJyApIHtcblx0XHQgICAgdmFyIHByaW9yX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoIHByZXZpb3VzX2Ftb3VudC5wcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMgKTtcblx0XHQgICAgdmFyIGNvbWluZ195ZWFyX2Ftb3VudCA9IHBhcnNlSW50KCBwcmV2aW91c19hbW91bnQuY29taW5nX3llYXJfY29udHJpYnV0aW9ucyApO1xuXHRcdCAgICB2YXIgYW5udWFsX3JlY3VycmluZ19hbW91bnQgPSBwYXJzZUludCggcHJldmlvdXNfYW1vdW50LmFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICk7XG5cdFx0ICAgIC8vIGNhbGN1bGF0ZSBtZW1iZXIgbGV2ZWwgZm9ybXVsYVxuXHRcdCAgICBpZiAoIHR5cGUgPT09ICdvbmUtdGltZScgKSB7XG5cdFx0ICAgICAgcHJpb3JfeWVhcl9hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0ICAgIH0gZWxzZSB7XG5cdFx0ICAgICAgYW5udWFsX3JlY3VycmluZ19hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0ICAgIH1cblxuXHRcdCAgICB0aGlzeWVhciA9IE1hdGgubWF4KCBwcmlvcl95ZWFyX2Ftb3VudCwgY29taW5nX3llYXJfYW1vdW50LCBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCApO1xuXHRcdCAgfVxuXG5cdFx0ICBsZXZlbCA9IHRoaXMuZ2V0TGV2ZWwoIHRoaXN5ZWFyICk7XG5cblx0XHQgICQoJ2gyJywgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcikuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0ICAgIGlmICggJCh0aGlzKS50ZXh0KCkgPT0gbGV2ZWxbJ25hbWUnXSApIHtcblx0XHQgICAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdCAgICAgICQodGhpcykucGFyZW50KCkucGFyZW50KCkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0ICAgIH1cblx0XHQgIH0gKTtcblx0XHQgIHJldHVybiBsZXZlbDtcblxuXHRcdH0sIC8vIGVuZCBjaGVja0xldmVsXG5cblx0XHRnZXRMZXZlbDogZnVuY3Rpb24oIHRoaXN5ZWFyICkge1xuXHRcdFx0dmFyIGxldmVsID0gW107XG5cdFx0XHRpZiAoIHRoaXN5ZWFyID4gMCAmJiB0aGlzeWVhciA8IDYwICkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ0Jyb256ZSc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDE7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmICh0aGlzeWVhciA+IDU5ICYmIHRoaXN5ZWFyIDwgMTIwKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnU2lsdmVyJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMjtcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAxMTkgJiYgdGhpc3llYXIgPCAyNDApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdHb2xkJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMztcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAyMzkpIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdQbGF0aW51bSc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDQ7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbGV2ZWw7XG5cdFx0fSwgLy8gZW5kIGdldExldmVsXG5cblx0XHRzaG93TmV3TGV2ZWw6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApIHtcblx0XHRcdHZhciBtZW1iZXJfbGV2ZWxfcHJlZml4ID0gJyc7XG5cdFx0XHR2YXIgb2xkX2xldmVsID0gJyc7XG5cdFx0XHR2YXIgbGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciA9IG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lcjsgLy8gdGhpcyBzaG91bGQgY2hhbmdlIHdoZW4gd2UgcmVwbGFjZSB0aGUgdGV4dCwgaWYgdGhlcmUgaXMgYSBsaW5rIGluc2lkZSBpdFxuXHRcdFx0dmFyIGRlY29kZUh0bWxFbnRpdHkgPSBmdW5jdGlvbiggc3RyICkge1xuXHRcdFx0XHRyZXR1cm4gc3RyLnJlcGxhY2UoIC8mIyhcXGQrKTsvZywgZnVuY3Rpb24oIG1hdGNoLCBkZWMgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoIGRlYyApO1xuXHRcdFx0XHR9KTtcblx0XHRcdH07XG5cdFx0XHRpZiAoIHR5cGVvZiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRtZW1iZXJfbGV2ZWxfcHJlZml4ID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLm1lbWJlcl9sZXZlbF9wcmVmaXg7XG5cdFx0XHR9XG5cblx0XHRcdCQob3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyKS5wcm9wKCAnY2xhc3MnLCAnYS1zaG93LWxldmVsIGEtc2hvdy1sZXZlbC0nICsgbGV2ZWxbJ25hbWUnXS50b0xvd2VyQ2FzZSgpICk7XG5cblx0XHRcdGlmICggJCggb3B0aW9ucy51c2VyX2N1cnJlbnRfbGV2ZWwgKS5sZW5ndGggPiAwICYmIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLmxlbmd0aCA+IDAgKSB7XG5cblx0XHRcdFx0aWYgKCAnYScsICQoIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0bGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciA9IG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciArICcgYSc7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRvbGRfbGV2ZWwgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5yZXBsYWNlKCBtZW1iZXJfbGV2ZWxfcHJlZml4LCAnJyApO1xuXG5cdFx0XHRcdGlmICggb2xkX2xldmVsICE9PSBsZXZlbFsnbmFtZSddLnRvTG93ZXJDYXNlKCkgKSB7XG5cdFx0XHRcdFx0JCggbGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciApLmh0bWwoIGRlY29kZUh0bWxFbnRpdHkoICQoIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciApLmRhdGEoICdjaGFuZ2VkJyApICkgKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCBsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yICkuaHRtbCggZGVjb2RlSHRtbEVudGl0eSggJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkuZGF0YSggJ25vdC1jaGFuZ2VkJyApICkgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQkKG9wdGlvbnMubGV2ZWxfbmFtZSwgb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyKS50ZXh0KCBsZXZlbFsnbmFtZSddICk7XG5cblx0XHR9LCAvLyBlbmQgc2hvd05ld0xldmVsXG5cblx0XHRjaGFuZ2VGcmVxdWVuY3k6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdCAgICB2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHQgICAgdmFyIG9uY2VfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnb25lLXRpbWUnKTtcblx0XHRcdCAgICB2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHQgICAgdmFyIGZyZXF1ZW5jeSAgICAgID0gcGFyc2VJbnQoIHNlbGVjdGVkLnNwbGl0KCcgLSAnKVsxXSApO1xuXG5cdFx0XHQgICAgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzICkudmFsKCBzZWxlY3RlZCApO1xuICAgIFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyApLnByb3AoICdzZWxlY3RlZCcsIHNlbGVjdGVkICk7XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcbiAgICBcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykgKS5kYXRhKCAnZnJlcXVlbmN5JywgZnJlcXVlbmN5ICk7XG5cblx0XHRcdH0gKTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlRnJlcXVlbmN5XG5cblx0XHRjaGFuZ2VBbW91bnRQcmV2aWV3OiBmdW5jdGlvbiggc2VsZWN0ZWQsIGxldmVsLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcmFuZ2UgICAgICAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCk7XG5cdFx0XHRcdHZhciBtb250aF92YWx1ZSAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ21vbnRoJyk7XG5cdFx0XHQgICAgdmFyIHllYXJfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgneWVhcicpO1xuXHRcdFx0ICAgIHZhciBvbmNlX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ29uZS10aW1lJyk7XG5cdFx0XHQgICAgdmFyIGZyZXF1ZW5jeV9uYW1lID0gc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHRcdGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciBtb250aCcgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5yZW1vdmVDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgeWVhcicgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gb25jZV92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcygnc21hbGxlcicgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoIHJhbmdlICk7XG5cblx0XHRcdH0gKTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlQW1vdW50UHJldmlld1xuXG5cdFx0c3RhcnRMZXZlbENsaWNrOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoJy5zdGFydC1sZXZlbCcpLmNsaWNrKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgbGV2ZWxfY2xhc3MgPSAkKCB0aGlzICkucHJvcCggJ2NsYXNzJyApO1xuXHRcdFx0XHR2YXIgbGV2ZWxfbnVtYmVyID0gbGV2ZWxfY2xhc3NbbGV2ZWxfY2xhc3MubGVuZ3RoIC0xXTtcblx0XHRcdCAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyLCBlbGVtZW50ICkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICsgJyAnICsgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdCAgfSk7XG5cdFx0fSwgLy8gZW5kIHN0YXJ0TGV2ZWxDbGlja1xuXG5cdFx0c3VibWl0Rm9ybTogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHQkKCBlbGVtZW50ICkuc3VibWl0KCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdHRoYXQuYW5hbHl0aWNzRXZlbnRUcmFjayggJ2V2ZW50JywgJ1N1cHBvcnQgVXMnLCAnQmVjb21lIEEgTWVtYmVyJywgbG9jYXRpb24ucGF0aG5hbWUgKTtcblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBzdWJtaXRGb3JtXG5cblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcblxufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCApO1xuIl19
