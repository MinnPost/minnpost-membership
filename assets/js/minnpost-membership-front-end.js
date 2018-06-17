'use strict';

(function ($) {

	function checkZipCountry(city_field, state_field, zip_field, country_field) {

		var country = country_field.val();
		if (country == '') {
			country = 'US';
			country_field.val(country);
		}
		var zip = zip_field.val();

		if (zip !== '') {

			var location = {
				zip_code: zip,
				country: country
			};

			jQuery.ajax({
				type: 'GET',
				url: user_account_management_rest.site_url + user_account_management_rest.rest_namespace + '/check-zip',
				data: location,
				dataType: 'json',
				success: function success(response) {
					if (response.status === 'success') {
						var location = '';
						location += response.city;
						$(city_field).val(response.city);
						if (response.city !== response.state) {
							location += ', ' + response.state;
							$(state_field).val(response.state);
						}
						if (country !== 'US') {
							location += ', ' + country;
						}
						$('.location small').text(location);
					} else {
						$('.location small').text('');
					}
				}
			});
		}
	}

	function benefitButton() {
		$('.m-benefit-message').hide();
		$('.a-benefit-button.a-button-disabled').removeAttr('disabled');
		$('.a-benefit-button').click(function (event) {
			$('.m-benefit-message').hide();
			var thisMessage = $(this).parent().find('.m-benefit-message');
			if ($(this).hasClass('a-button-disabled')) {
				thisMessage.html(thisMessage.data('message-all-claimed'));
				thisMessage.fadeIn('slow');
			}
			event.preventDefault();
		});
	}

	$(document).ready(function () {
		if (0 < $('.a-benefit-button').length) {
			benefitButton();
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJlbmVmaXRzLmpzIiwibWVtYmVyLWxldmVscy5qcyJdLCJuYW1lcyI6WyIkIiwiY2hlY2taaXBDb3VudHJ5IiwiY2l0eV9maWVsZCIsInN0YXRlX2ZpZWxkIiwiemlwX2ZpZWxkIiwiY291bnRyeV9maWVsZCIsImNvdW50cnkiLCJ2YWwiLCJ6aXAiLCJsb2NhdGlvbiIsInppcF9jb2RlIiwialF1ZXJ5IiwiYWpheCIsInR5cGUiLCJ1cmwiLCJ1c2VyX2FjY291bnRfbWFuYWdlbWVudF9yZXN0Iiwic2l0ZV91cmwiLCJyZXN0X25hbWVzcGFjZSIsImRhdGEiLCJkYXRhVHlwZSIsInN1Y2Nlc3MiLCJyZXNwb25zZSIsInN0YXR1cyIsImNpdHkiLCJzdGF0ZSIsInRleHQiLCJiZW5lZml0QnV0dG9uIiwiaGlkZSIsInJlbW92ZUF0dHIiLCJjbGljayIsImV2ZW50IiwidGhpc01lc3NhZ2UiLCJwYXJlbnQiLCJmaW5kIiwiaGFzQ2xhc3MiLCJodG1sIiwiZmFkZUluIiwicHJldmVudERlZmF1bHQiLCJkb2N1bWVudCIsInJlYWR5IiwibGVuZ3RoIiwid2luZG93IiwidW5kZWZpbmVkIiwicGx1Z2luTmFtZSIsImRlZmF1bHRzIiwiUGx1Z2luIiwiZWxlbWVudCIsIm9wdGlvbnMiLCJleHRlbmQiLCJfZGVmYXVsdHMiLCJfbmFtZSIsImluaXQiLCJwcm90b3R5cGUiLCJyZXNldCIsImFtb3VudCIsImNhdGNoSGFzaExpbmtzIiwibGV2ZWxGbGlwcGVyIiwic3RhcnRMZXZlbENsaWNrIiwic3VibWl0Rm9ybSIsImFuYWx5dGljc0V2ZW50VHJhY2siLCJjYXRlZ29yeSIsImFjdGlvbiIsImxhYmVsIiwidmFsdWUiLCJnYSIsImUiLCJ0YXJnZXQiLCJwYXRobmFtZSIsInJlcGxhY2UiLCJob3N0bmFtZSIsImhhc2giLCJzbGljZSIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiLCJ0aGF0IiwicHJldmlvdXNfYW1vdW50IiwibGV2ZWwiLCJsZXZlbF9udW1iZXIiLCJmcmVxdWVuY3lfc3RyaW5nIiwiZnJlcXVlbmN5IiwiZnJlcXVlbmN5X25hbWUiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEiLCJ1c2VyX2N1cnJlbnRfbGV2ZWwiLCJjdXJyZW50X3VzZXIiLCJhbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lIiwic3BsaXQiLCJjaGVja0xldmVsIiwic2hvd05ld0xldmVsIiwiY2hhbmdlIiwiYXR0ciIsImJpbmQiLCJsZXZlbHNfY29udGFpbmVyIiwic2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IiLCJlYWNoIiwiZmxpcHBlZF9pdGVtcyIsIndyYXBBbGwiLCJmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzIiwib24iLCJyZW1vdmVDbGFzcyIsInNpbmdsZV9sZXZlbF9jb250YWluZXIiLCJjbG9zZXN0IiwiYWRkQ2xhc3MiLCJhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwiYW1vdW50X3ZpZXdlciIsImNoYW5nZUZyZXF1ZW5jeSIsImxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yIiwiY2hhbmdlQW1vdW50UHJldmlldyIsImNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwidGhpc3llYXIiLCJwYXJzZUludCIsInByaW9yX3llYXJfYW1vdW50IiwicHJpb3JfeWVhcl9jb250cmlidXRpb25zIiwiY29taW5nX3llYXJfYW1vdW50IiwiY29taW5nX3llYXJfY29udHJpYnV0aW9ucyIsImFubnVhbF9yZWN1cnJpbmdfYW1vdW50IiwiTWF0aCIsIm1heCIsImdldExldmVsIiwibWVtYmVyX2xldmVsX3ByZWZpeCIsIm9sZF9sZXZlbCIsImxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IiLCJsZXZlbF92aWV3ZXJfY29udGFpbmVyIiwiZGVjb2RlSHRtbEVudGl0eSIsInN0ciIsIm1hdGNoIiwiZGVjIiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwicHJvcCIsInRvTG93ZXJDYXNlIiwibWVtYmVyX2xldmVsIiwibGV2ZWxfbmFtZSIsInNlbGVjdGVkIiwicmFuZ2UiLCJtb250aF92YWx1ZSIsInllYXJfdmFsdWUiLCJvbmNlX3ZhbHVlIiwibGV2ZWxfY2xhc3MiLCJzdWJtaXQiLCJmbiJdLCJtYXBwaW5ncyI6Ijs7QUFBQSxDQUFFLFVBQVVBLENBQVYsRUFBYzs7QUFFZixVQUFTQyxlQUFULENBQXlCQyxVQUF6QixFQUFxQ0MsV0FBckMsRUFBa0RDLFNBQWxELEVBQTZEQyxhQUE3RCxFQUE0RTs7QUFFM0UsTUFBSUMsVUFBVUQsY0FBY0UsR0FBZCxFQUFkO0FBQ0EsTUFBSUQsV0FBVyxFQUFmLEVBQW1CO0FBQ2xCQSxhQUFVLElBQVY7QUFDQUQsaUJBQWNFLEdBQWQsQ0FBa0JELE9BQWxCO0FBQ0E7QUFDRCxNQUFJRSxNQUFNSixVQUFVRyxHQUFWLEVBQVY7O0FBRUEsTUFBSUMsUUFBUSxFQUFaLEVBQWdCOztBQUVmLE9BQUlDLFdBQVc7QUFDZEMsY0FBVUYsR0FESTtBQUVkRixhQUFTQTtBQUZLLElBQWY7O0FBS0FLLFVBQU9DLElBQVAsQ0FBWTtBQUNMQyxVQUFNLEtBREQ7QUFFTEMsU0FBS0MsNkJBQTZCQyxRQUE3QixHQUF3Q0QsNkJBQTZCRSxjQUFyRSxHQUFzRixZQUZ0RjtBQUdMQyxVQUFNVCxRQUhEO0FBSUxVLGNBQVUsTUFKTDtBQUtMQyxhQUFTLGlCQUFTQyxRQUFULEVBQW1CO0FBQzNCLFNBQUlBLFNBQVNDLE1BQVQsS0FBb0IsU0FBeEIsRUFBbUM7QUFDeEMsVUFBSWIsV0FBVyxFQUFmO0FBQ0FBLGtCQUFZWSxTQUFTRSxJQUFyQjtBQUNBdkIsUUFBRUUsVUFBRixFQUFjSyxHQUFkLENBQWtCYyxTQUFTRSxJQUEzQjtBQUNBLFVBQUlGLFNBQVNFLElBQVQsS0FBa0JGLFNBQVNHLEtBQS9CLEVBQXNDO0FBQ3JDZixtQkFBWSxPQUFPWSxTQUFTRyxLQUE1QjtBQUNBeEIsU0FBRUcsV0FBRixFQUFlSSxHQUFmLENBQW1CYyxTQUFTRyxLQUE1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WUFBMUMsRUFBd0RqQyxPQUF4RCxFQUFrRTBELFFBQWxFLENBQTRFLFFBQTVFO0FBQ0F4RyxNQUFHK0MsUUFBUXVELHNCQUFSLEdBQWlDLEdBQWpDLEdBQXVDdkIsWUFBdkMsR0FBc0QsR0FBdEQsR0FBNERoQyxRQUFRZ0QsNkJBQXZFLEVBQXVHUyxRQUF2RyxDQUFpSCxTQUFqSDtBQUNELElBUEg7QUFRQSxHQTlSaUIsRUE4UmY7O0FBRUg5QyxjQUFZLG9CQUFVWixPQUFWLEVBQW1CQyxPQUFuQixFQUE2QjtBQUN4QyxPQUFJNkIsT0FBTyxJQUFYO0FBQ0E1RSxLQUFHOEMsT0FBSCxFQUFhK0YsTUFBYixDQUFxQixVQUFVL0csS0FBVixFQUFrQjtBQUN0QzhDLFNBQUtqQixtQkFBTCxDQUEwQixPQUExQixFQUFtQyxZQUFuQyxFQUFpRCxpQkFBakQsRUFBb0VsRCxTQUFTMEQsUUFBN0U7QUFDQSxJQUZEO0FBR0EsR0FyU2lCLENBcVNmOztBQXJTZSxFQUFuQixDQXpDNkMsQ0FnVjFDOztBQUVIO0FBQ0E7QUFDQW5FLEdBQUU4SSxFQUFGLENBQUtuRyxVQUFMLElBQW1CLFVBQVdJLE9BQVgsRUFBcUI7QUFDdkMsU0FBTyxLQUFLaUQsSUFBTCxDQUFVLFlBQVk7QUFDNUIsT0FBSyxDQUFFaEcsRUFBRWtCLElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWXlCLFVBQTFCLENBQVAsRUFBZ0Q7QUFDL0MzQyxNQUFFa0IsSUFBRixDQUFRLElBQVIsRUFBYyxZQUFZeUIsVUFBMUIsRUFBc0MsSUFBSUUsTUFBSixDQUFZLElBQVosRUFBa0JFLE9BQWxCLENBQXRDO0FBQ0E7QUFDRCxHQUpNLENBQVA7QUFLQSxFQU5EO0FBUUEsQ0E1VkEsRUE0VkdwQyxNQTVWSCxFQTRWVzhCLE1BNVZYLEVBNFZtQkgsUUE1Vm5CIiwiZmlsZSI6Im1pbm5wb3N0LW1lbWJlcnNoaXAtZnJvbnQtZW5kLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKCBmdW5jdGlvbiggJCApIHtcblxuXHRmdW5jdGlvbiBjaGVja1ppcENvdW50cnkoY2l0eV9maWVsZCwgc3RhdGVfZmllbGQsIHppcF9maWVsZCwgY291bnRyeV9maWVsZCkge1xuXG5cdFx0dmFyIGNvdW50cnkgPSBjb3VudHJ5X2ZpZWxkLnZhbCgpO1xuXHRcdGlmIChjb3VudHJ5ID09ICcnKSB7XG5cdFx0XHRjb3VudHJ5ID0gJ1VTJztcblx0XHRcdGNvdW50cnlfZmllbGQudmFsKGNvdW50cnkpO1xuXHRcdH1cblx0XHR2YXIgemlwID0gemlwX2ZpZWxkLnZhbCgpO1xuXG5cdFx0aWYgKHppcCAhPT0gJycpIHtcblxuXHRcdFx0dmFyIGxvY2F0aW9uID0ge1xuXHRcdFx0XHR6aXBfY29kZTogemlwLFxuXHRcdFx0XHRjb3VudHJ5OiBjb3VudHJ5XG5cdFx0XHR9XG5cblx0XHRcdGpRdWVyeS5hamF4KHtcblx0XHQgICAgICAgIHR5cGU6ICdHRVQnLFxuXHRcdCAgICAgICAgdXJsOiB1c2VyX2FjY291bnRfbWFuYWdlbWVudF9yZXN0LnNpdGVfdXJsICsgdXNlcl9hY2NvdW50X21hbmFnZW1lbnRfcmVzdC5yZXN0X25hbWVzcGFjZSArICcvY2hlY2stemlwJyxcblx0XHQgICAgICAgIGRhdGE6IGxvY2F0aW9uLFxuXHRcdCAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcblx0XHQgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG5cdFx0ICAgICAgICBcdGlmIChyZXNwb25zZS5zdGF0dXMgPT09ICdzdWNjZXNzJykge1xuXHRcdFx0XHRcdFx0dmFyIGxvY2F0aW9uID0gJyc7XG5cdFx0XHRcdFx0XHRsb2NhdGlvbiArPSByZXNwb25zZS5jaXR5O1xuXHRcdFx0XHRcdFx0JChjaXR5X2ZpZWxkKS52YWwocmVzcG9uc2UuY2l0eSk7XG5cdFx0XHRcdFx0XHRpZiAocmVzcG9uc2UuY2l0eSAhPT0gcmVzcG9uc2Uuc3RhdGUpIHtcblx0XHRcdFx0XHRcdFx0bG9jYXRpb24gKz0gJywgJyArIHJlc3BvbnNlLnN0YXRlO1xuXHRcdFx0XHRcdFx0XHQkKHN0YXRlX2ZpZWxkKS52YWwocmVzcG9uc2Uuc3RhdGUpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKGNvdW50cnkgIT09ICdVUycpIHtcblx0XHRcdFx0XHRcdFx0bG9jYXRpb24gKz0gJywgJyArIGNvdW50cnk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQkKCcubG9jYXRpb24gc21hbGwnKS50ZXh0KGxvY2F0aW9uKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCgnLmxvY2F0aW9uIHNtYWxsJykudGV4dCgnJyk7XG5cdFx0XHRcdFx0fVxuXHRcdCAgICAgICAgfVxuXHRcdCAgICB9KTtcblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiBiZW5lZml0QnV0dG9uKCkge1xuXHRcdCQoICcubS1iZW5lZml0LW1lc3NhZ2UnICkuaGlkZSgpO1xuXHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbi5hLWJ1dHRvbi1kaXNhYmxlZCcgKS5yZW1vdmVBdHRyKCAnZGlzYWJsZWQnICk7XG5cdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHQkKCAnLm0tYmVuZWZpdC1tZXNzYWdlJyApLmhpZGUoKTtcblx0XHRcdHZhciB0aGlzTWVzc2FnZSA9ICQoIHRoaXMgKS5wYXJlbnQoKS5maW5kKCAnLm0tYmVuZWZpdC1tZXNzYWdlJyApO1xuXHRcdFx0aWYgKCAkKCB0aGlzICkuaGFzQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKSApIHtcblx0XHRcdFx0dGhpc01lc3NhZ2UuaHRtbCggdGhpc01lc3NhZ2UuZGF0YSggJ21lc3NhZ2UtYWxsLWNsYWltZWQnICkgKTtcblx0XHRcdFx0dGhpc01lc3NhZ2UuZmFkZUluKCAnc2xvdycgKTtcblx0XHRcdH1cblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0fSk7XG5cdH1cblxuXHQkKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblx0XHRpZiAoIDAgPCAkKCAnLmEtYmVuZWZpdC1idXR0b24nICkubGVuZ3RoICkge1xuXHRcdFx0YmVuZWZpdEJ1dHRvbigpO1xuXHRcdH1cblx0fSk7XG5cbn0gKSggalF1ZXJ5ICk7XG4iLCIvLyBwbHVnaW5cbjsoZnVuY3Rpb24gKCAkLCB3aW5kb3csIGRvY3VtZW50LCB1bmRlZmluZWQgKSB7XG5cblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdHZhciBwbHVnaW5OYW1lID0gJ21pbm5wb3N0TWVtYmVyc2hpcCcsXG5cdGRlZmF1bHRzID0ge1xuXHRcdCdkZWJ1ZycgOiBmYWxzZSwgLy8gdGhpcyBjYW4gYmUgc2V0IHRvIHRydWUgb24gcGFnZSBsZXZlbCBvcHRpb25zXG5cdFx0J2Ftb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lJyA6ICcjYW1vdW50LWl0ZW0gI2Ftb3VudCcsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lJyA6ICcubS1tZW1iZXJzaGlwLWZhc3Qtc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0J2xldmVsX3ZpZXdlcl9jb250YWluZXInIDogJy5hLXNob3ctbGV2ZWwnLFxuXHRcdCdsZXZlbF9uYW1lJyA6ICcuYS1sZXZlbCcsXG5cdFx0J3VzZXJfY3VycmVudF9sZXZlbCcgOiAnLmEtY3VycmVudC1sZXZlbCcsXG5cdFx0J3VzZXJfbmV3X2xldmVsJyA6ICcuYS1uZXctbGV2ZWwnLFxuXHRcdCdhbW91bnRfdmlld2VyJyA6ICcuYW1vdW50IGgzJyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmEtZm9ybS1pdGVtLW1lbWJlcnNoaXAtZnJlcXVlbmN5Jyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVsc190eXBlJyA6ICdzZWxlY3QnLFxuXHRcdCdsZXZlbHNfY29udGFpbmVyJyA6ICcuby1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbHMnLFxuXHRcdCdzaW5nbGVfbGV2ZWxfY29udGFpbmVyJyA6ICcubS1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbCcsXG5cdFx0J3NpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yJyA6ICcubS1tZW1iZXItbGV2ZWwtYnJpZWYnLFxuXHRcdCdmbGlwcGVkX2l0ZW1zJyA6ICdkaXYuYW1vdW50LCBkaXYuZW50ZXInLFxuXHRcdCdsZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvcicgOiAnLnNob3ctZnJlcXVlbmN5Jyxcblx0XHQnY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5hbW91bnQgLmEtYnV0dG9uLWZsaXAnLFxuXHRcdCdhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuZW50ZXIgaW5wdXQuYW1vdW50LWVudHJ5Jyxcblx0fTsgLy8gZW5kIGRlZmF1bHRzXG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblxuXHRcdC8vIGpRdWVyeSBoYXMgYW4gZXh0ZW5kIG1ldGhvZCB3aGljaCBtZXJnZXMgdGhlIGNvbnRlbnRzIG9mIHR3byBvclxuXHRcdC8vIG1vcmUgb2JqZWN0cywgc3RvcmluZyB0aGUgcmVzdWx0IGluIHRoZSBmaXJzdCBvYmplY3QuIFRoZSBmaXJzdCBvYmplY3Rcblx0XHQvLyBpcyBnZW5lcmFsbHkgZW1wdHkgYXMgd2UgZG9uJ3Qgd2FudCB0byBhbHRlciB0aGUgZGVmYXVsdCBvcHRpb25zIGZvclxuXHRcdC8vIGZ1dHVyZSBpbnN0YW5jZXMgb2YgdGhlIHBsdWdpblxuXHRcdHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMgKTtcblxuXHRcdHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XG5cdFx0dGhpcy5fbmFtZSA9IHBsdWdpbk5hbWU7XG5cblx0XHR0aGlzLmluaXQoKTtcblx0fSAvLyBlbmQgY29uc3RydWN0b3JcblxuXHRQbHVnaW4ucHJvdG90eXBlID0ge1xuXG5cdFx0aW5pdDogZnVuY3Rpb24oIHJlc2V0LCBhbW91bnQgKSB7XG5cdFx0XHQvLyBQbGFjZSBpbml0aWFsaXphdGlvbiBsb2dpYyBoZXJlXG5cdFx0XHQvLyBZb3UgYWxyZWFkeSBoYXZlIGFjY2VzcyB0byB0aGUgRE9NIGVsZW1lbnQgYW5kXG5cdFx0XHQvLyB0aGUgb3B0aW9ucyB2aWEgdGhlIGluc3RhbmNlLCBlLmcuIHRoaXMuZWxlbWVudFxuXHRcdFx0Ly8gYW5kIHRoaXMub3B0aW9uc1xuXHRcdFx0Ly8geW91IGNhbiBhZGQgbW9yZSBmdW5jdGlvbnMgbGlrZSB0aGUgb25lIGJlbG93IGFuZFxuXHRcdFx0Ly8gY2FsbCB0aGVtIGxpa2Ugc286IHRoaXMueW91ck90aGVyRnVuY3Rpb24odGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpLlxuXHRcdFx0dGhpcy5jYXRjaEhhc2hMaW5rcyggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpO1xuXHRcdFx0dGhpcy5sZXZlbEZsaXBwZXIoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0XHR0aGlzLnN0YXJ0TGV2ZWxDbGljayggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHRcdHRoaXMuc3VibWl0Rm9ybSggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHR9LFxuXG5cdFx0YW5hbHl0aWNzRXZlbnRUcmFjazogZnVuY3Rpb24oIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApIHtcblx0XHRcdGlmICggdHlwZW9mIGdhICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0aWYgKCB0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsICk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzRXZlbnRUcmFja1xuXG5cdFx0Y2F0Y2hIYXNoTGlua3M6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnYVtocmVmKj1cIiNcIl06bm90KFtocmVmPVwiI1wiXSknLCBlbGVtZW50KS5jbGljayhmdW5jdGlvbihlKSB7XG5cdFx0XHQgICAgdmFyIHRhcmdldCA9ICQoZS50YXJnZXQpO1xuXHRcdFx0ICAgIGlmICh0YXJnZXQucGFyZW50KCcuY29tbWVudC10aXRsZScpLmxlbmd0aCA9PSAwICYmIGxvY2F0aW9uLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCcnKSA9PSB0aGlzLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCcnKSAmJiBsb2NhdGlvbi5ob3N0bmFtZSA9PSB0aGlzLmhvc3RuYW1lKSB7XG5cdFx0XHRcdCAgICB2YXIgdGFyZ2V0ID0gJCh0aGlzLmhhc2gpO1xuXHRcdFx0XHQgICAgdGFyZ2V0ID0gdGFyZ2V0Lmxlbmd0aCA/IHRhcmdldCA6ICQoJ1tuYW1lPScgKyB0aGlzLmhhc2guc2xpY2UoMSkgKyddJyk7XG5cdFx0XHRcdFx0aWYgKHRhcmdldC5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdCQoJ2h0bWwsYm9keScpLmFuaW1hdGUoe1xuXHRcdFx0XHRcdFx0XHRzY3JvbGxUb3A6IHRhcmdldC5vZmZzZXQoKS50b3Bcblx0XHRcdFx0XHRcdH0sIDEwMDApO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIGNhdGNoTGlua3NcblxuXHRcdGxldmVsRmxpcHBlcjogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR2YXIgcHJldmlvdXNfYW1vdW50ID0gJyc7XG5cdFx0XHR2YXIgYW1vdW50ID0gMDtcblx0XHRcdHZhciBsZXZlbCA9ICcnO1xuXHRcdFx0dmFyIGxldmVsX251bWJlciA9IDA7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X3N0cmluZyA9ICcnO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeSA9ICcnO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9uYW1lID0gJyc7XG5cdFx0XHRpZiAoIHR5cGVvZiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEgIT09ICd1bmRlZmluZWQnICYmICQoIG9wdGlvbnMudXNlcl9jdXJyZW50X2xldmVsICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0cHJldmlvdXNfYW1vdW50ID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5wcmV2aW91c19hbW91bnQ7XG5cdFx0XHR9XG5cdFx0XHRpZiAoICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lICkudmFsKCk7XG5cdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnKS52YWwoKTtcblx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdCAgICBsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdCAgICB0aGF0LnNob3dOZXdMZXZlbCggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKTtcblxuXHRcdFx0ICAgICQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSkuY2hhbmdlKCBmdW5jdGlvbigpIHtcblxuXHRcdFx0ICAgIFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnKS52YWwoKVxuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdCAgICAgIGxldmVsID0gdGhhdC5jaGVja0xldmVsKCAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lICkudmFsKCksICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnICkuYXR0ciggJ2RhdGEteWVhci1mcmVxdWVuY3knICksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdCAgICAgIHRoYXQuc2hvd05ld0xldmVsKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApO1xuXHRcdFx0ICAgIH0pO1xuXG5cdFx0XHQgICAgJChvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lKS5iaW5kKCdrZXl1cCBtb3VzZXVwJywgZnVuY3Rpb24oKSB7XG5cdFx0XHQgICAgXHRmcmVxdWVuY3lfc3RyaW5nID0gJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcpLnZhbCgpXG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdCAgICAgIGlmKCQodGhpcykuZGF0YSgnbGFzdC12YWx1ZScpICE9ICQodGhpcykudmFsKCkpIHtcblx0XHRcdCAgICAgICAgJCh0aGlzKS5kYXRhKCdsYXN0LXZhbHVlJywgJCh0aGlzKS52YWwoKSk7XG5cdFx0XHQgICAgICAgIGxldmVsID0gdGhhdC5jaGVja0xldmVsKCAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lICkudmFsKCksICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnICkuYXR0ciggJ2RhdGEteWVhci1mcmVxdWVuY3knICksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdCAgICAgICAgdGhhdC5zaG93TmV3TGV2ZWwoIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICk7XG5cdFx0XHQgICAgICB9O1xuXHRcdFx0ICAgIH0pO1xuXG5cdFx0XHR9XG5cdFx0XHRpZiAoICQoIG9wdGlvbnMubGV2ZWxzX2NvbnRhaW5lciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQgKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuZmxpcHBlZF9pdGVtcywgJCh0aGlzKSApLndyYXBBbGwoICc8ZGl2IGNsYXNzPVwiZmxpcHBlclwiLz4nICk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCh0aGlzKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQodGhpcykudmFsKCk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdFx0ICAgIGlmICggdHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0XHQkKCBldmVudC50YXJnZXQgKS5jbG9zZXN0KCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXG5cdFx0XHRcdFx0XHRpZiAoIGZyZXF1ZW5jeSA9PSAxICkge1xuXHRcdFx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkudmFsKCAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkuZGF0YSgnZGVmYXVsdC15ZWFybHknICkgKTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeSA9PSAxMiApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQtbW9udGhseScgKSApO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKyAnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgKyBsZXZlbF9udW1iZXIgKyAnXCJdJykudmFsKCk7XG5cblx0XHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0dGhhdC5jaGFuZ2VGcmVxdWVuY3koIGZyZXF1ZW5jeV9zdHJpbmcsIGxldmVsWyduYW1lJ10sIGVsZW1lbnQsIG9wdGlvbnMgKTtcblxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoICQoIG9wdGlvbnMubGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRcdFx0JChvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yLCBlbGVtZW50KS50ZXh0KGZyZXF1ZW5jeV9uYW1lKTtcblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSkuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdFx0XHRpZiAoIHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSApLnZhbCgpO1xuXHRcdFx0XHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR0aGF0LmNoYW5nZUFtb3VudFByZXZpZXcoIGZyZXF1ZW5jeV9zdHJpbmcsIGxldmVsWyduYW1lJ10sIGVsZW1lbnQsIG9wdGlvbnMgKTtcblxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHQkKCBldmVudC50YXJnZXQgKS5jbG9zZXN0KCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKS5wYXJlbnQoKSApLnZhbCgpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArICdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArIGxldmVsX251bWJlciArICdcIl0nKS52YWwoKTtcblx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgbGV2ZWxGbGlwcGVyXG5cblx0XHRjaGVja0xldmVsOiBmdW5jdGlvbiggYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHQgIHZhciB0aGlzeWVhciA9IHBhcnNlSW50KCBhbW91bnQgKSAqIHBhcnNlSW50KCBmcmVxdWVuY3kgKTtcblx0XHQgIHZhciBsZXZlbCA9ICcnO1xuXHRcdCAgaWYgKCB0eXBlb2YgcHJldmlvdXNfYW1vdW50ICE9PSAndW5kZWZpbmVkJyAmJiBwcmV2aW91c19hbW91bnQgIT09ICcnICkge1xuXHRcdCAgICB2YXIgcHJpb3JfeWVhcl9hbW91bnQgPSBwYXJzZUludCggcHJldmlvdXNfYW1vdW50LnByaW9yX3llYXJfY29udHJpYnV0aW9ucyApO1xuXHRcdCAgICB2YXIgY29taW5nX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoIHByZXZpb3VzX2Ftb3VudC5jb21pbmdfeWVhcl9jb250cmlidXRpb25zICk7XG5cdFx0ICAgIHZhciBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCA9IHBhcnNlSW50KCBwcmV2aW91c19hbW91bnQuYW5udWFsX3JlY3VycmluZ19hbW91bnQgKTtcblx0XHQgICAgLy8gY2FsY3VsYXRlIG1lbWJlciBsZXZlbCBmb3JtdWxhXG5cdFx0ICAgIGlmICggdHlwZSA9PT0gJ29uZS10aW1lJyApIHtcblx0XHQgICAgICBwcmlvcl95ZWFyX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHQgICAgfSBlbHNlIHtcblx0XHQgICAgICBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHQgICAgfVxuXG5cdFx0ICAgIHRoaXN5ZWFyID0gTWF0aC5tYXgoIHByaW9yX3llYXJfYW1vdW50LCBjb21pbmdfeWVhcl9hbW91bnQsIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICk7XG5cdFx0ICB9XG5cblx0XHQgIGxldmVsID0gdGhpcy5nZXRMZXZlbCggdGhpc3llYXIgKTtcblxuXHRcdCAgJCgnaDInLCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHQgICAgaWYgKCAkKHRoaXMpLnRleHQoKSA9PSBsZXZlbFsnbmFtZSddICkge1xuXHRcdCAgICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0ICAgICAgJCh0aGlzKS5wYXJlbnQoKS5wYXJlbnQoKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHQgICAgfVxuXHRcdCAgfSApO1xuXHRcdCAgcmV0dXJuIGxldmVsO1xuXG5cdFx0fSwgLy8gZW5kIGNoZWNrTGV2ZWxcblxuXHRcdGdldExldmVsOiBmdW5jdGlvbiggdGhpc3llYXIgKSB7XG5cdFx0XHR2YXIgbGV2ZWwgPSBbXTtcblx0XHRcdGlmICggdGhpc3llYXIgPiAwICYmIHRoaXN5ZWFyIDwgNjAgKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnQnJvbnplJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKHRoaXN5ZWFyID4gNTkgJiYgdGhpc3llYXIgPCAxMjApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdTaWx2ZXInO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAyO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDExOSAmJiB0aGlzeWVhciA8IDI0MCkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ0dvbGQnO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAzO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDIzOSkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ1BsYXRpbnVtJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gNDtcblx0XHRcdH1cblx0XHRcdHJldHVybiBsZXZlbDtcblx0XHR9LCAvLyBlbmQgZ2V0TGV2ZWxcblxuXHRcdHNob3dOZXdMZXZlbDogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICkge1xuXHRcdFx0dmFyIG1lbWJlcl9sZXZlbF9wcmVmaXggPSAnJztcblx0XHRcdHZhciBvbGRfbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yID0gb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyOyAvLyB0aGlzIHNob3VsZCBjaGFuZ2Ugd2hlbiB3ZSByZXBsYWNlIHRoZSB0ZXh0LCBpZiB0aGVyZSBpcyBhIGxpbmsgaW5zaWRlIGl0XG5cdFx0XHR2YXIgZGVjb2RlSHRtbEVudGl0eSA9IGZ1bmN0aW9uKCBzdHIgKSB7XG5cdFx0XHRcdHJldHVybiBzdHIucmVwbGFjZSggLyYjKFxcZCspOy9nLCBmdW5jdGlvbiggbWF0Y2gsIGRlYyApIHtcblx0XHRcdFx0XHRyZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSggZGVjICk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fTtcblx0XHRcdGlmICggdHlwZW9mIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdG1lbWJlcl9sZXZlbF9wcmVmaXggPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEubWVtYmVyX2xldmVsX3ByZWZpeDtcblx0XHRcdH1cblxuXHRcdFx0JChvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIpLnByb3AoICdjbGFzcycsICdhLXNob3ctbGV2ZWwgYS1zaG93LWxldmVsLScgKyBsZXZlbFsnbmFtZSddLnRvTG93ZXJDYXNlKCkgKTtcblxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLnVzZXJfY3VycmVudF9sZXZlbCApLmxlbmd0aCA+IDAgJiYgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwubGVuZ3RoID4gMCApIHtcblxuXHRcdFx0XHRpZiAoICdhJywgJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yID0gb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICsgJyBhJztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdG9sZF9sZXZlbCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLnJlcGxhY2UoIG1lbWJlcl9sZXZlbF9wcmVmaXgsICcnICk7XG5cblx0XHRcdFx0aWYgKCBvbGRfbGV2ZWwgIT09IGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApIHtcblx0XHRcdFx0XHQkKCBsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yICkuaHRtbCggZGVjb2RlSHRtbEVudGl0eSggJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkuZGF0YSggJ2NoYW5nZWQnICkgKSApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoIGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgKS5odG1sKCBkZWNvZGVIdG1sRW50aXR5KCAkKCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKS5kYXRhKCAnbm90LWNoYW5nZWQnICkgKSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdCQob3B0aW9ucy5sZXZlbF9uYW1lLCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIpLnRleHQoIGxldmVsWyduYW1lJ10gKTtcblxuXHRcdH0sIC8vIGVuZCBzaG93TmV3TGV2ZWxcblxuXHRcdGNoYW5nZUZyZXF1ZW5jeTogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0ICAgIHZhciB5ZWFyX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ3llYXInKTtcblx0XHRcdCAgICB2YXIgb25jZV92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdvbmUtdGltZScpO1xuXHRcdFx0ICAgIHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdCAgICB2YXIgZnJlcXVlbmN5ICAgICAgPSBwYXJzZUludCggc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzFdICk7XG5cblx0XHRcdCAgICAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMgKS52YWwoIHNlbGVjdGVkICk7XG4gICAgXHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzICkucHJvcCggJ3NlbGVjdGVkJywgc2VsZWN0ZWQgKTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuICAgIFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSApLmRhdGEoICdmcmVxdWVuY3knLCBmcmVxdWVuY3kgKTtcblxuXHRcdFx0fSApO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VGcmVxdWVuY3lcblxuXHRcdGNoYW5nZUFtb3VudFByZXZpZXc6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdCAgICB2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHQgICAgdmFyIG9uY2VfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnb25lLXRpbWUnKTtcblx0XHRcdCAgICB2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcblxuXHRcdFx0fSApO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VBbW91bnRQcmV2aWV3XG5cblx0XHRzdGFydExldmVsQ2xpY2s6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnLnN0YXJ0LWxldmVsJykuY2xpY2soZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBsZXZlbF9jbGFzcyA9ICQoIHRoaXMgKS5wcm9wKCAnY2xhc3MnICk7XG5cdFx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSBsZXZlbF9jbGFzc1tsZXZlbF9jbGFzcy5sZW5ndGggLTFdO1xuXHRcdFx0ICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIsIGVsZW1lbnQgKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKyAnICcgKyBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0ICB9KTtcblx0XHR9LCAvLyBlbmQgc3RhcnRMZXZlbENsaWNrXG5cblx0XHRzdWJtaXRGb3JtOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdCQoIGVsZW1lbnQgKS5zdWJtaXQoIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0dGhhdC5hbmFseXRpY3NFdmVudFRyYWNrKCAnZXZlbnQnLCAnU3VwcG9ydCBVcycsICdCZWNvbWUgQSBNZW1iZXInLCBsb2NhdGlvbi5wYXRobmFtZSApO1xuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIHN1Ym1pdEZvcm1cblxuXHR9OyAvLyBlbmQgUGx1Z2luLnByb3RvdHlwZVxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKCBvcHRpb25zICkge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCAhICQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSApICkge1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4oIHRoaXMsIG9wdGlvbnMgKSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xuXG59KSggalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50ICk7XG4iXX0=
