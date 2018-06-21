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
		$('.a-benefit-button.a-button-disabled').removeAttr('disabled');
		$('.a-benefit-button').click(function (event) {
			//$( '.m-benefit-message' ).hide();
			$('.m-benefit-message').removeClass();
			var thisMessage = $(this).parent().find('.m-benefit-message');
			if ($(this).hasClass('a-button-disabled')) {
				//thisMessage.html( thisMessage.data( 'message-all-claimed' ) );
				//thisMessage.fadeIn( 'slow' );
				event.preventDefault(); // this should go on enabled buttons too, but for now just here
			}
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJlbmVmaXRzLmpzIiwibWVtYmVyLWxldmVscy5qcyJdLCJuYW1lcyI6WyIkIiwiY2hlY2taaXBDb3VudHJ5IiwiY2l0eV9maWVsZCIsInN0YXRlX2ZpZWxkIiwiemlwX2ZpZWxkIiwiY291bnRyeV9maWVsZCIsImNvdW50cnkiLCJ2YWwiLCJ6aXAiLCJsb2NhdGlvbiIsInppcF9jb2RlIiwialF1ZXJ5IiwiYWpheCIsInR5cGUiLCJ1cmwiLCJ1c2VyX2FjY291bnRfbWFuYWdlbWVudF9yZXN0Iiwic2l0ZV91cmwiLCJyZXN0X25hbWVzcGFjZSIsImRhdGEiLCJkYXRhVHlwZSIsInN1Y2Nlc3MiLCJyZXNwb25zZSIsInN0YXR1cyIsImNpdHkiLCJzdGF0ZSIsInRleHQiLCJiZW5lZml0QnV0dG9uIiwicmVtb3ZlQXR0ciIsImNsaWNrIiwiZXZlbnQiLCJyZW1vdmVDbGFzcyIsInRoaXNNZXNzYWdlIiwicGFyZW50IiwiZmluZCIsImhhc0NsYXNzIiwicHJldmVudERlZmF1bHQiLCJkb2N1bWVudCIsInJlYWR5IiwibGVuZ3RoIiwid2luZG93IiwidW5kZWZpbmVkIiwicGx1Z2luTmFtZSIsImRlZmF1bHRzIiwiUGx1Z2luIiwiZWxlbWVudCIsIm9wdGlvbnMiLCJleHRlbmQiLCJfZGVmYXVsdHMiLCJfbmFtZSIsImluaXQiLCJwcm90b3R5cGUiLCJyZXNldCIsImFtb3VudCIsImNhdGNoSGFzaExpbmtzIiwibGV2ZWxGbGlwcGVyIiwic3RhcnRMZXZlbENsaWNrIiwic3VibWl0Rm9ybSIsImFuYWx5dGljc0V2ZW50VHJhY2siLCJjYXRlZ29yeSIsImFjdGlvbiIsImxhYmVsIiwidmFsdWUiLCJnYSIsImUiLCJ0YXJnZXQiLCJwYXRobmFtZSIsInJlcGxhY2UiLCJob3N0bmFtZSIsImhhc2giLCJzbGljZSIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiLCJ0aGF0IiwicHJldmlvdXNfYW1vdW50IiwibGV2ZWwiLCJsZXZlbF9udW1iZXIiLCJmcmVxdWVuY3lfc3RyaW5nIiwiZnJlcXVlbmN5IiwiZnJlcXVlbmN5X25hbWUiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEiLCJ1c2VyX2N1cnJlbnRfbGV2ZWwiLCJjdXJyZW50X3VzZXIiLCJhbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lIiwic3BsaXQiLCJjaGVja0xldmVsIiwic2hvd05ld0xldmVsIiwiY2hhbmdlIiwiYXR0ciIsImJpbmQiLCJsZXZlbHNfY29udGFpbmVyIiwic2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IiLCJlYWNoIiwiZmxpcHBlZF9pdGVtcyIsIndyYXBBbGwiLCJmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzIiwib24iLCJzaW5nbGVfbGV2ZWxfY29udGFpbmVyIiwiY2xvc2VzdCIsImFkZENsYXNzIiwiYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsImFtb3VudF92aWV3ZXIiLCJjaGFuZ2VGcmVxdWVuY3kiLCJsZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciIsImNoYW5nZUFtb3VudFByZXZpZXciLCJjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsInRoaXN5ZWFyIiwicGFyc2VJbnQiLCJwcmlvcl95ZWFyX2Ftb3VudCIsInByaW9yX3llYXJfY29udHJpYnV0aW9ucyIsImNvbWluZ195ZWFyX2Ftb3VudCIsImNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMiLCJhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCIsIk1hdGgiLCJtYXgiLCJnZXRMZXZlbCIsIm1lbWJlcl9sZXZlbF9wcmVmaXgiLCJvbGRfbGV2ZWwiLCJsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yIiwibGV2ZWxfdmlld2VyX2NvbnRhaW5lciIsImRlY29kZUh0bWxFbnRpdHkiLCJzdHIiLCJtYXRjaCIsImRlYyIsIlN0cmluZyIsImZyb21DaGFyQ29kZSIsInByb3AiLCJ0b0xvd2VyQ2FzZSIsIm1lbWJlcl9sZXZlbCIsImh0bWwiLCJsZXZlbF9uYW1lIiwic2VsZWN0ZWQiLCJyYW5nZSIsIm1vbnRoX3ZhbHVlIiwieWVhcl92YWx1ZSIsIm9uY2VfdmFsdWUiLCJsZXZlbF9jbGFzcyIsInN1Ym1pdCIsImZuIl0sIm1hcHBpbmdzIjoiOztBQUFBLENBQUUsVUFBVUEsQ0FBVixFQUFjOztBQUVmLFVBQVNDLGVBQVQsQ0FBeUJDLFVBQXpCLEVBQXFDQyxXQUFyQyxFQUFrREMsU0FBbEQsRUFBNkRDLGFBQTdELEVBQTRFOztBQUUzRSxNQUFJQyxVQUFVRCxjQUFjRSxHQUFkLEVBQWQ7QUFDQSxNQUFJRCxXQUFXLEVBQWYsRUFBbUI7QUFDbEJBLGFBQVUsSUFBVjtBQUNBRCxpQkFBY0UsR0FBZCxDQUFrQkQsT0FBbEI7QUFDQTtBQUNELE1BQUlFLE1BQU1KLFVBQVVHLEdBQVYsRUFBVjs7QUFFQSxNQUFJQyxRQUFRLEVBQVosRUFBZ0I7O0FBRWYsT0FBSUMsV0FBVztBQUNkQyxjQUFVRixHQURJO0FBRWRGLGFBQVNBO0FBRkssSUFBZjs7QUFLQUssVUFBT0MsSUFBUCxDQUFZO0FBQ0xDLFVBQU0sS0FERDtBQUVMQyxTQUFLQyw2QkFBNkJDLFFBQTdCLEdBQXdDRCw2QkFBNkJFLGNBQXJFLEdBQXNGLFlBRnRGO0FBR0xDLFVBQU1ULFFBSEQ7QUFJTFUsY0FBVSxNQUpMO0FBS0xDLGFBQVMsaUJBQVNDLFFBQVQsRUFBbUI7QUFDM0IsU0FBSUEsU0FBU0MsTUFBVCxLQUFvQixTQUF4QixFQUFtQztBQUN4QyxVQUFJYixXQUFXLEVBQWY7QUFDQUEsa0JBQVlZLFNBQVNFLElBQXJCO0FBQ0F2QixRQUFFRSxVQUFGLEVBQWNLLEdBQWQsQ0FBa0JjLFNBQVNFLElBQTNCO0FBQ0EsVUFBSUYsU0FBU0UsSUFBVCxLQUFrQkYsU0FBU0csS0FBL0IsRUFBc0M7QUFDckNmLG1CQUFZLE9BQU9ZLFNBQVNHLEtBQTVCO0FBQ0F4QixTQUFFRyxXQUFGLEVBQWVJLEdBQWYsQ0FBbUJjLFNBQVNHLEtBQTVCO0FBQ0E7QUFDRCxVQUFJ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aEMsUUFBUWdELDZCQUF2RSxFQUF1R1EsUUFBdkcsQ0FBaUgsU0FBakg7QUFDRCxJQVBIO0FBUUEsR0E5UmlCLEVBOFJmOztBQUVIN0MsY0FBWSxvQkFBVVosT0FBVixFQUFtQkMsT0FBbkIsRUFBNkI7QUFDeEMsT0FBSTZCLE9BQU8sSUFBWDtBQUNBMUUsS0FBRzRDLE9BQUgsRUFBYStGLE1BQWIsQ0FBcUIsVUFBVTlHLEtBQVYsRUFBa0I7QUFDdEM2QyxTQUFLakIsbUJBQUwsQ0FBMEIsT0FBMUIsRUFBbUMsWUFBbkMsRUFBaUQsaUJBQWpELEVBQW9FaEQsU0FBU3dELFFBQTdFO0FBQ0EsSUFGRDtBQUdBLEdBclNpQixDQXFTZjs7QUFyU2UsRUFBbkIsQ0F6QzZDLENBZ1YxQzs7QUFFSDtBQUNBO0FBQ0FqRSxHQUFFNEksRUFBRixDQUFLbkcsVUFBTCxJQUFtQixVQUFXSSxPQUFYLEVBQXFCO0FBQ3ZDLFNBQU8sS0FBS2lELElBQUwsQ0FBVSxZQUFZO0FBQzVCLE9BQUssQ0FBRTlGLEVBQUVrQixJQUFGLENBQVEsSUFBUixFQUFjLFlBQVl1QixVQUExQixDQUFQLEVBQWdEO0FBQy9DekMsTUFBRWtCLElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWXVCLFVBQTFCLEVBQXNDLElBQUlFLE1BQUosQ0FBWSxJQUFaLEVBQWtCRSxPQUFsQixDQUF0QztBQUNBO0FBQ0QsR0FKTSxDQUFQO0FBS0EsRUFORDtBQVFBLENBNVZBLEVBNFZHbEMsTUE1VkgsRUE0Vlc0QixNQTVWWCxFQTRWbUJILFFBNVZuQiIsImZpbGUiOiJtaW5ucG9zdC1tZW1iZXJzaGlwLWZyb250LWVuZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiggZnVuY3Rpb24oICQgKSB7XG5cblx0ZnVuY3Rpb24gY2hlY2taaXBDb3VudHJ5KGNpdHlfZmllbGQsIHN0YXRlX2ZpZWxkLCB6aXBfZmllbGQsIGNvdW50cnlfZmllbGQpIHtcblxuXHRcdHZhciBjb3VudHJ5ID0gY291bnRyeV9maWVsZC52YWwoKTtcblx0XHRpZiAoY291bnRyeSA9PSAnJykge1xuXHRcdFx0Y291bnRyeSA9ICdVUyc7XG5cdFx0XHRjb3VudHJ5X2ZpZWxkLnZhbChjb3VudHJ5KTtcblx0XHR9XG5cdFx0dmFyIHppcCA9IHppcF9maWVsZC52YWwoKTtcblxuXHRcdGlmICh6aXAgIT09ICcnKSB7XG5cblx0XHRcdHZhciBsb2NhdGlvbiA9IHtcblx0XHRcdFx0emlwX2NvZGU6IHppcCxcblx0XHRcdFx0Y291bnRyeTogY291bnRyeVxuXHRcdFx0fVxuXG5cdFx0XHRqUXVlcnkuYWpheCh7XG5cdFx0ICAgICAgICB0eXBlOiAnR0VUJyxcblx0XHQgICAgICAgIHVybDogdXNlcl9hY2NvdW50X21hbmFnZW1lbnRfcmVzdC5zaXRlX3VybCArIHVzZXJfYWNjb3VudF9tYW5hZ2VtZW50X3Jlc3QucmVzdF9uYW1lc3BhY2UgKyAnL2NoZWNrLXppcCcsXG5cdFx0ICAgICAgICBkYXRhOiBsb2NhdGlvbixcblx0XHQgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG5cdFx0ICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihyZXNwb25zZSkge1xuXHRcdCAgICAgICAgXHRpZiAocmVzcG9uc2Uuc3RhdHVzID09PSAnc3VjY2VzcycpIHtcblx0XHRcdFx0XHRcdHZhciBsb2NhdGlvbiA9ICcnO1xuXHRcdFx0XHRcdFx0bG9jYXRpb24gKz0gcmVzcG9uc2UuY2l0eTtcblx0XHRcdFx0XHRcdCQoY2l0eV9maWVsZCkudmFsKHJlc3BvbnNlLmNpdHkpO1xuXHRcdFx0XHRcdFx0aWYgKHJlc3BvbnNlLmNpdHkgIT09IHJlc3BvbnNlLnN0YXRlKSB7XG5cdFx0XHRcdFx0XHRcdGxvY2F0aW9uICs9ICcsICcgKyByZXNwb25zZS5zdGF0ZTtcblx0XHRcdFx0XHRcdFx0JChzdGF0ZV9maWVsZCkudmFsKHJlc3BvbnNlLnN0YXRlKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGlmIChjb3VudHJ5ICE9PSAnVVMnKSB7XG5cdFx0XHRcdFx0XHRcdGxvY2F0aW9uICs9ICcsICcgKyBjb3VudHJ5O1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0JCgnLmxvY2F0aW9uIHNtYWxsJykudGV4dChsb2NhdGlvbik7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoJy5sb2NhdGlvbiBzbWFsbCcpLnRleHQoJycpO1xuXHRcdFx0XHRcdH1cblx0XHQgICAgICAgIH1cblx0XHQgICAgfSk7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gYmVuZWZpdEJ1dHRvbigpIHtcblx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24uYS1idXR0b24tZGlzYWJsZWQnICkucmVtb3ZlQXR0ciggJ2Rpc2FibGVkJyApO1xuXHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0Ly8kKCAnLm0tYmVuZWZpdC1tZXNzYWdlJyApLmhpZGUoKTtcblx0XHRcdCQoICcubS1iZW5lZml0LW1lc3NhZ2UnICkucmVtb3ZlQ2xhc3MoKVxuXHRcdFx0dmFyIHRoaXNNZXNzYWdlID0gJCggdGhpcyApLnBhcmVudCgpLmZpbmQoICcubS1iZW5lZml0LW1lc3NhZ2UnICk7XG5cdFx0XHRpZiAoICQoIHRoaXMgKS5oYXNDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApICkge1xuXHRcdFx0XHQvL3RoaXNNZXNzYWdlLmh0bWwoIHRoaXNNZXNzYWdlLmRhdGEoICdtZXNzYWdlLWFsbC1jbGFpbWVkJyApICk7XG5cdFx0XHRcdC8vdGhpc01lc3NhZ2UuZmFkZUluKCAnc2xvdycgKTtcblx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTsgLy8gdGhpcyBzaG91bGQgZ28gb24gZW5hYmxlZCBidXR0b25zIHRvbywgYnV0IGZvciBub3cganVzdCBoZXJlXG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHQkKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblx0XHRpZiAoIDAgPCAkKCAnLmEtYmVuZWZpdC1idXR0b24nICkubGVuZ3RoICkge1xuXHRcdFx0YmVuZWZpdEJ1dHRvbigpO1xuXHRcdH1cblx0fSk7XG5cbn0gKSggalF1ZXJ5ICk7XG4iLCIvLyBwbHVnaW5cbjsoZnVuY3Rpb24gKCAkLCB3aW5kb3csIGRvY3VtZW50LCB1bmRlZmluZWQgKSB7XG5cblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdHZhciBwbHVnaW5OYW1lID0gJ21pbm5wb3N0TWVtYmVyc2hpcCcsXG5cdGRlZmF1bHRzID0ge1xuXHRcdCdkZWJ1ZycgOiBmYWxzZSwgLy8gdGhpcyBjYW4gYmUgc2V0IHRvIHRydWUgb24gcGFnZSBsZXZlbCBvcHRpb25zXG5cdFx0J2Ftb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lJyA6ICcjYW1vdW50LWl0ZW0gI2Ftb3VudCcsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lJyA6ICcubS1tZW1iZXJzaGlwLWZhc3Qtc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0J2xldmVsX3ZpZXdlcl9jb250YWluZXInIDogJy5hLXNob3ctbGV2ZWwnLFxuXHRcdCdsZXZlbF9uYW1lJyA6ICcuYS1sZXZlbCcsXG5cdFx0J3VzZXJfY3VycmVudF9sZXZlbCcgOiAnLmEtY3VycmVudC1sZXZlbCcsXG5cdFx0J3VzZXJfbmV3X2xldmVsJyA6ICcuYS1uZXctbGV2ZWwnLFxuXHRcdCdhbW91bnRfdmlld2VyJyA6ICcuYW1vdW50IGgzJyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmEtZm9ybS1pdGVtLW1lbWJlcnNoaXAtZnJlcXVlbmN5Jyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVsc190eXBlJyA6ICdzZWxlY3QnLFxuXHRcdCdsZXZlbHNfY29udGFpbmVyJyA6ICcuby1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbHMnLFxuXHRcdCdzaW5nbGVfbGV2ZWxfY29udGFpbmVyJyA6ICcubS1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbCcsXG5cdFx0J3NpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yJyA6ICcubS1tZW1iZXItbGV2ZWwtYnJpZWYnLFxuXHRcdCdmbGlwcGVkX2l0ZW1zJyA6ICdkaXYuYW1vdW50LCBkaXYuZW50ZXInLFxuXHRcdCdsZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvcicgOiAnLnNob3ctZnJlcXVlbmN5Jyxcblx0XHQnY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5hbW91bnQgLmEtYnV0dG9uLWZsaXAnLFxuXHRcdCdhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuZW50ZXIgaW5wdXQuYW1vdW50LWVudHJ5Jyxcblx0fTsgLy8gZW5kIGRlZmF1bHRzXG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblxuXHRcdC8vIGpRdWVyeSBoYXMgYW4gZXh0ZW5kIG1ldGhvZCB3aGljaCBtZXJnZXMgdGhlIGNvbnRlbnRzIG9mIHR3byBvclxuXHRcdC8vIG1vcmUgb2JqZWN0cywgc3RvcmluZyB0aGUgcmVzdWx0IGluIHRoZSBmaXJzdCBvYmplY3QuIFRoZSBmaXJzdCBvYmplY3Rcblx0XHQvLyBpcyBnZW5lcmFsbHkgZW1wdHkgYXMgd2UgZG9uJ3Qgd2FudCB0byBhbHRlciB0aGUgZGVmYXVsdCBvcHRpb25zIGZvclxuXHRcdC8vIGZ1dHVyZSBpbnN0YW5jZXMgb2YgdGhlIHBsdWdpblxuXHRcdHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMgKTtcblxuXHRcdHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XG5cdFx0dGhpcy5fbmFtZSA9IHBsdWdpbk5hbWU7XG5cblx0XHR0aGlzLmluaXQoKTtcblx0fSAvLyBlbmQgY29uc3RydWN0b3JcblxuXHRQbHVnaW4ucHJvdG90eXBlID0ge1xuXG5cdFx0aW5pdDogZnVuY3Rpb24oIHJlc2V0LCBhbW91bnQgKSB7XG5cdFx0XHQvLyBQbGFjZSBpbml0aWFsaXphdGlvbiBsb2dpYyBoZXJlXG5cdFx0XHQvLyBZb3UgYWxyZWFkeSBoYXZlIGFjY2VzcyB0byB0aGUgRE9NIGVsZW1lbnQgYW5kXG5cdFx0XHQvLyB0aGUgb3B0aW9ucyB2aWEgdGhlIGluc3RhbmNlLCBlLmcuIHRoaXMuZWxlbWVudFxuXHRcdFx0Ly8gYW5kIHRoaXMub3B0aW9uc1xuXHRcdFx0Ly8geW91IGNhbiBhZGQgbW9yZSBmdW5jdGlvbnMgbGlrZSB0aGUgb25lIGJlbG93IGFuZFxuXHRcdFx0Ly8gY2FsbCB0aGVtIGxpa2Ugc286IHRoaXMueW91ck90aGVyRnVuY3Rpb24odGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpLlxuXHRcdFx0dGhpcy5jYXRjaEhhc2hMaW5rcyggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpO1xuXHRcdFx0dGhpcy5sZXZlbEZsaXBwZXIoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0XHR0aGlzLnN0YXJ0TGV2ZWxDbGljayggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHRcdHRoaXMuc3VibWl0Rm9ybSggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHR9LFxuXG5cdFx0YW5hbHl0aWNzRXZlbnRUcmFjazogZnVuY3Rpb24oIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApIHtcblx0XHRcdGlmICggdHlwZW9mIGdhICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0aWYgKCB0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsICk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzRXZlbnRUcmFja1xuXG5cdFx0Y2F0Y2hIYXNoTGlua3M6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnYVtocmVmKj1cIiNcIl06bm90KFtocmVmPVwiI1wiXSknLCBlbGVtZW50KS5jbGljayhmdW5jdGlvbihlKSB7XG5cdFx0XHQgICAgdmFyIHRhcmdldCA9ICQoZS50YXJnZXQpO1xuXHRcdFx0ICAgIGlmICh0YXJnZXQucGFyZW50KCcuY29tbWVudC10aXRsZScpLmxlbmd0aCA9PSAwICYmIGxvY2F0aW9uLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCcnKSA9PSB0aGlzLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCcnKSAmJiBsb2NhdGlvbi5ob3N0bmFtZSA9PSB0aGlzLmhvc3RuYW1lKSB7XG5cdFx0XHRcdCAgICB2YXIgdGFyZ2V0ID0gJCh0aGlzLmhhc2gpO1xuXHRcdFx0XHQgICAgdGFyZ2V0ID0gdGFyZ2V0Lmxlbmd0aCA/IHRhcmdldCA6ICQoJ1tuYW1lPScgKyB0aGlzLmhhc2guc2xpY2UoMSkgKyddJyk7XG5cdFx0XHRcdFx0aWYgKHRhcmdldC5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdCQoJ2h0bWwsYm9keScpLmFuaW1hdGUoe1xuXHRcdFx0XHRcdFx0XHRzY3JvbGxUb3A6IHRhcmdldC5vZmZzZXQoKS50b3Bcblx0XHRcdFx0XHRcdH0sIDEwMDApO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIGNhdGNoTGlua3NcblxuXHRcdGxldmVsRmxpcHBlcjogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR2YXIgcHJldmlvdXNfYW1vdW50ID0gJyc7XG5cdFx0XHR2YXIgYW1vdW50ID0gMDtcblx0XHRcdHZhciBsZXZlbCA9ICcnO1xuXHRcdFx0dmFyIGxldmVsX251bWJlciA9IDA7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X3N0cmluZyA9ICcnO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeSA9ICcnO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9uYW1lID0gJyc7XG5cdFx0XHRpZiAoIHR5cGVvZiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEgIT09ICd1bmRlZmluZWQnICYmICQoIG9wdGlvbnMudXNlcl9jdXJyZW50X2xldmVsICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0cHJldmlvdXNfYW1vdW50ID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5wcmV2aW91c19hbW91bnQ7XG5cdFx0XHR9XG5cdFx0XHRpZiAoICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lICkudmFsKCk7XG5cdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnKS52YWwoKTtcblx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdCAgICBsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdCAgICB0aGF0LnNob3dOZXdMZXZlbCggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKTtcblxuXHRcdFx0ICAgICQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSkuY2hhbmdlKCBmdW5jdGlvbigpIHtcblxuXHRcdFx0ICAgIFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnKS52YWwoKVxuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdCAgICAgIGxldmVsID0gdGhhdC5jaGVja0xldmVsKCAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lICkudmFsKCksICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnICkuYXR0ciggJ2RhdGEteWVhci1mcmVxdWVuY3knICksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdCAgICAgIHRoYXQuc2hvd05ld0xldmVsKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApO1xuXHRcdFx0ICAgIH0pO1xuXG5cdFx0XHQgICAgJChvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lKS5iaW5kKCdrZXl1cCBtb3VzZXVwJywgZnVuY3Rpb24oKSB7XG5cdFx0XHQgICAgXHRmcmVxdWVuY3lfc3RyaW5nID0gJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcpLnZhbCgpXG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdCAgICAgIGlmKCQodGhpcykuZGF0YSgnbGFzdC12YWx1ZScpICE9ICQodGhpcykudmFsKCkpIHtcblx0XHRcdCAgICAgICAgJCh0aGlzKS5kYXRhKCdsYXN0LXZhbHVlJywgJCh0aGlzKS52YWwoKSk7XG5cdFx0XHQgICAgICAgIGxldmVsID0gdGhhdC5jaGVja0xldmVsKCAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lICkudmFsKCksICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnICkuYXR0ciggJ2RhdGEteWVhci1mcmVxdWVuY3knICksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdCAgICAgICAgdGhhdC5zaG93TmV3TGV2ZWwoIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICk7XG5cdFx0XHQgICAgICB9O1xuXHRcdFx0ICAgIH0pO1xuXG5cdFx0XHR9XG5cdFx0XHRpZiAoICQoIG9wdGlvbnMubGV2ZWxzX2NvbnRhaW5lciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQgKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuZmxpcHBlZF9pdGVtcywgJCh0aGlzKSApLndyYXBBbGwoICc8ZGl2IGNsYXNzPVwiZmxpcHBlclwiLz4nICk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCh0aGlzKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQodGhpcykudmFsKCk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdFx0ICAgIGlmICggdHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0XHQkKCBldmVudC50YXJnZXQgKS5jbG9zZXN0KCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXG5cdFx0XHRcdFx0XHRpZiAoIGZyZXF1ZW5jeSA9PSAxICkge1xuXHRcdFx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkudmFsKCAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkuZGF0YSgnZGVmYXVsdC15ZWFybHknICkgKTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeSA9PSAxMiApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQtbW9udGhseScgKSApO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKyAnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgKyBsZXZlbF9udW1iZXIgKyAnXCJdJykudmFsKCk7XG5cblx0XHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0dGhhdC5jaGFuZ2VGcmVxdWVuY3koIGZyZXF1ZW5jeV9zdHJpbmcsIGxldmVsWyduYW1lJ10sIGVsZW1lbnQsIG9wdGlvbnMgKTtcblxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoICQoIG9wdGlvbnMubGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRcdFx0JChvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yLCBlbGVtZW50KS50ZXh0KGZyZXF1ZW5jeV9uYW1lKTtcblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSkuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdFx0XHRpZiAoIHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSApLnZhbCgpO1xuXHRcdFx0XHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR0aGF0LmNoYW5nZUFtb3VudFByZXZpZXcoIGZyZXF1ZW5jeV9zdHJpbmcsIGxldmVsWyduYW1lJ10sIGVsZW1lbnQsIG9wdGlvbnMgKTtcblxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHQkKCBldmVudC50YXJnZXQgKS5jbG9zZXN0KCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKS5wYXJlbnQoKSApLnZhbCgpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArICdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArIGxldmVsX251bWJlciArICdcIl0nKS52YWwoKTtcblx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgbGV2ZWxGbGlwcGVyXG5cblx0XHRjaGVja0xldmVsOiBmdW5jdGlvbiggYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHQgIHZhciB0aGlzeWVhciA9IHBhcnNlSW50KCBhbW91bnQgKSAqIHBhcnNlSW50KCBmcmVxdWVuY3kgKTtcblx0XHQgIHZhciBsZXZlbCA9ICcnO1xuXHRcdCAgaWYgKCB0eXBlb2YgcHJldmlvdXNfYW1vdW50ICE9PSAndW5kZWZpbmVkJyAmJiBwcmV2aW91c19hbW91bnQgIT09ICcnICkge1xuXHRcdCAgICB2YXIgcHJpb3JfeWVhcl9hbW91bnQgPSBwYXJzZUludCggcHJldmlvdXNfYW1vdW50LnByaW9yX3llYXJfY29udHJpYnV0aW9ucyApO1xuXHRcdCAgICB2YXIgY29taW5nX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoIHByZXZpb3VzX2Ftb3VudC5jb21pbmdfeWVhcl9jb250cmlidXRpb25zICk7XG5cdFx0ICAgIHZhciBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCA9IHBhcnNlSW50KCBwcmV2aW91c19hbW91bnQuYW5udWFsX3JlY3VycmluZ19hbW91bnQgKTtcblx0XHQgICAgLy8gY2FsY3VsYXRlIG1lbWJlciBsZXZlbCBmb3JtdWxhXG5cdFx0ICAgIGlmICggdHlwZSA9PT0gJ29uZS10aW1lJyApIHtcblx0XHQgICAgICBwcmlvcl95ZWFyX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHQgICAgfSBlbHNlIHtcblx0XHQgICAgICBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHQgICAgfVxuXG5cdFx0ICAgIHRoaXN5ZWFyID0gTWF0aC5tYXgoIHByaW9yX3llYXJfYW1vdW50LCBjb21pbmdfeWVhcl9hbW91bnQsIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICk7XG5cdFx0ICB9XG5cblx0XHQgIGxldmVsID0gdGhpcy5nZXRMZXZlbCggdGhpc3llYXIgKTtcblxuXHRcdCAgJCgnaDInLCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHQgICAgaWYgKCAkKHRoaXMpLnRleHQoKSA9PSBsZXZlbFsnbmFtZSddICkge1xuXHRcdCAgICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0ICAgICAgJCh0aGlzKS5wYXJlbnQoKS5wYXJlbnQoKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHQgICAgfVxuXHRcdCAgfSApO1xuXHRcdCAgcmV0dXJuIGxldmVsO1xuXG5cdFx0fSwgLy8gZW5kIGNoZWNrTGV2ZWxcblxuXHRcdGdldExldmVsOiBmdW5jdGlvbiggdGhpc3llYXIgKSB7XG5cdFx0XHR2YXIgbGV2ZWwgPSBbXTtcblx0XHRcdGlmICggdGhpc3llYXIgPiAwICYmIHRoaXN5ZWFyIDwgNjAgKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnQnJvbnplJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKHRoaXN5ZWFyID4gNTkgJiYgdGhpc3llYXIgPCAxMjApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdTaWx2ZXInO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAyO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDExOSAmJiB0aGlzeWVhciA8IDI0MCkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ0dvbGQnO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAzO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDIzOSkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ1BsYXRpbnVtJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gNDtcblx0XHRcdH1cblx0XHRcdHJldHVybiBsZXZlbDtcblx0XHR9LCAvLyBlbmQgZ2V0TGV2ZWxcblxuXHRcdHNob3dOZXdMZXZlbDogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICkge1xuXHRcdFx0dmFyIG1lbWJlcl9sZXZlbF9wcmVmaXggPSAnJztcblx0XHRcdHZhciBvbGRfbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yID0gb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyOyAvLyB0aGlzIHNob3VsZCBjaGFuZ2Ugd2hlbiB3ZSByZXBsYWNlIHRoZSB0ZXh0LCBpZiB0aGVyZSBpcyBhIGxpbmsgaW5zaWRlIGl0XG5cdFx0XHR2YXIgZGVjb2RlSHRtbEVudGl0eSA9IGZ1bmN0aW9uKCBzdHIgKSB7XG5cdFx0XHRcdHJldHVybiBzdHIucmVwbGFjZSggLyYjKFxcZCspOy9nLCBmdW5jdGlvbiggbWF0Y2gsIGRlYyApIHtcblx0XHRcdFx0XHRyZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSggZGVjICk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fTtcblx0XHRcdGlmICggdHlwZW9mIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdG1lbWJlcl9sZXZlbF9wcmVmaXggPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEubWVtYmVyX2xldmVsX3ByZWZpeDtcblx0XHRcdH1cblxuXHRcdFx0JChvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIpLnByb3AoICdjbGFzcycsICdhLXNob3ctbGV2ZWwgYS1zaG93LWxldmVsLScgKyBsZXZlbFsnbmFtZSddLnRvTG93ZXJDYXNlKCkgKTtcblxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLnVzZXJfY3VycmVudF9sZXZlbCApLmxlbmd0aCA+IDAgJiYgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwubGVuZ3RoID4gMCApIHtcblxuXHRcdFx0XHRpZiAoICdhJywgJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yID0gb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICsgJyBhJztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdG9sZF9sZXZlbCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLnJlcGxhY2UoIG1lbWJlcl9sZXZlbF9wcmVmaXgsICcnICk7XG5cblx0XHRcdFx0aWYgKCBvbGRfbGV2ZWwgIT09IGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApIHtcblx0XHRcdFx0XHQkKCBsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yICkuaHRtbCggZGVjb2RlSHRtbEVudGl0eSggJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkuZGF0YSggJ2NoYW5nZWQnICkgKSApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoIGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgKS5odG1sKCBkZWNvZGVIdG1sRW50aXR5KCAkKCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKS5kYXRhKCAnbm90LWNoYW5nZWQnICkgKSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdCQob3B0aW9ucy5sZXZlbF9uYW1lLCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIpLnRleHQoIGxldmVsWyduYW1lJ10gKTtcblxuXHRcdH0sIC8vIGVuZCBzaG93TmV3TGV2ZWxcblxuXHRcdGNoYW5nZUZyZXF1ZW5jeTogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0ICAgIHZhciB5ZWFyX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ3llYXInKTtcblx0XHRcdCAgICB2YXIgb25jZV92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdvbmUtdGltZScpO1xuXHRcdFx0ICAgIHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdCAgICB2YXIgZnJlcXVlbmN5ICAgICAgPSBwYXJzZUludCggc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzFdICk7XG5cblx0XHRcdCAgICAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMgKS52YWwoIHNlbGVjdGVkICk7XG4gICAgXHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzICkucHJvcCggJ3NlbGVjdGVkJywgc2VsZWN0ZWQgKTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuICAgIFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSApLmRhdGEoICdmcmVxdWVuY3knLCBmcmVxdWVuY3kgKTtcblxuXHRcdFx0fSApO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VGcmVxdWVuY3lcblxuXHRcdGNoYW5nZUFtb3VudFByZXZpZXc6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdCAgICB2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHQgICAgdmFyIG9uY2VfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnb25lLXRpbWUnKTtcblx0XHRcdCAgICB2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcblxuXHRcdFx0fSApO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VBbW91bnRQcmV2aWV3XG5cblx0XHRzdGFydExldmVsQ2xpY2s6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnLnN0YXJ0LWxldmVsJykuY2xpY2soZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBsZXZlbF9jbGFzcyA9ICQoIHRoaXMgKS5wcm9wKCAnY2xhc3MnICk7XG5cdFx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSBsZXZlbF9jbGFzc1tsZXZlbF9jbGFzcy5sZW5ndGggLTFdO1xuXHRcdFx0ICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIsIGVsZW1lbnQgKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKyAnICcgKyBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0ICB9KTtcblx0XHR9LCAvLyBlbmQgc3RhcnRMZXZlbENsaWNrXG5cblx0XHRzdWJtaXRGb3JtOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdCQoIGVsZW1lbnQgKS5zdWJtaXQoIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0dGhhdC5hbmFseXRpY3NFdmVudFRyYWNrKCAnZXZlbnQnLCAnU3VwcG9ydCBVcycsICdCZWNvbWUgQSBNZW1iZXInLCBsb2NhdGlvbi5wYXRobmFtZSApO1xuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIHN1Ym1pdEZvcm1cblxuXHR9OyAvLyBlbmQgUGx1Z2luLnByb3RvdHlwZVxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKCBvcHRpb25zICkge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCAhICQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSApICkge1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4oIHRoaXMsIG9wdGlvbnMgKSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xuXG59KSggalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50ICk7XG4iXX0=
