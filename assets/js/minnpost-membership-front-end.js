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
			$('.m-benefit-message').removeClass('m-benefit-message-visible m-benefit-message-error m-benefit-message-info m-benefit-message-success');
			if ($($button).hasClass('a-button-disabled')) {
				//thisMessage.html( thisMessage.data( 'message-all-claimed' ) );
				//thisMessage.fadeIn( 'slow' );
			} else {
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
							$status.text(response.data.message).addClass('m-benefit-message-visible ' + response.data.message_class);
						} else {
							//console.dir(response);
							$button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
							$status.text(response.data.message).addClass('m-benefit-message-visible ' + response.data.message_class);
						}
					});
				}
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJlbmVmaXRzLmpzIiwibWVtYmVyLWxldmVscy5qcyJdLCJuYW1lcyI6WyIkIiwiYmVuZWZpdEZvcm0iLCJyZW1vdmVBdHRyIiwiY2xpY2siLCJldmVudCIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsIiRzdGF0dXMiLCJwYXJlbnQiLCJzZXR0aW5ncyIsIm1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3MiLCJyZW1vdmVDbGFzcyIsImhhc0NsYXNzIiwidGV4dCIsImFkZENsYXNzIiwiZGF0YSIsImJlbmVmaXRUeXBlIiwidmFsIiwicG9zdCIsImFqYXh1cmwiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJidXR0b25fdmFsdWUiLCJidXR0b25fbGFiZWwiLCJidXR0b25fY2xhc3MiLCJwcm9wIiwiYnV0dG9uX2F0dHIiLCJtZXNzYWdlIiwibWVzc2FnZV9jbGFzcyIsImRvY3VtZW50IiwicmVhZHkiLCJsZW5ndGgiLCJqUXVlcnkiLCJ3aW5kb3ciLCJ1bmRlZmluZWQiLCJwbHVnaW5OYW1lIiwiZGVmYXVsdHMiLCJQbHVnaW4iLCJlbGVtZW50Iiwib3B0aW9ucyIsImV4dGVuZCIsIl9kZWZhdWx0cyIsIl9uYW1lIiwiaW5pdCIsInByb3RvdHlwZSIsInJlc2V0IiwiYW1vdW50IiwiY2F0Y2hIYXNoTGlua3MiLCJsZXZlbEZsaXBwZXIiLCJzdGFydExldmVsQ2xpY2siLCJzdWJtaXRGb3JtIiwiYW5hbHl0aWNzRXZlbnRUcmFjayIsInR5cGUiLCJjYXRlZ29yeSIsImFjdGlvbiIsImxhYmVsIiwidmFsdWUiLCJnYSIsImUiLCJ0YXJnZXQiLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwicmVwbGFjZSIsImhvc3RuYW1lIiwiaGFzaCIsInNsaWNlIiwiYW5pbWF0ZSIsInNjcm9sbFRvcCIsIm9mZnNldCIsInRvcCIsInRoYXQiLCJwcmV2aW91c19hbW91bnQiLCJsZXZlbCIsImxldmVsX251bWJlciIsImZyZXF1ZW5jeV9zdHJpbmciLCJmcmVxdWVuY3kiLCJmcmVxdWVuY3lfbmFtZSIsIm1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSIsInVzZXJfY3VycmVudF9sZXZlbCIsImN1cnJlbnRfdXNlciIsImFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lIiwiZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUiLCJzcGxpdCIsImNoZWNrTGV2ZWwiLCJzaG93TmV3TGV2ZWwiLCJjaGFuZ2UiLCJhdHRyIiwiYmluZCIsImxldmVsc19jb250YWluZXIiLCJzaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciIsImVhY2giLCJmbGlwcGVkX2l0ZW1zIiwid3JhcEFsbCIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJvbiIsInNpbmdsZV9sZXZlbF9jb250YWluZXIiLCJjbG9zZXN0IiwiYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsImFtb3VudF92aWV3ZXIiLCJjaGFuZ2VGcmVxdWVuY3kiLCJsZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciIsImNoYW5nZUFtb3VudFByZXZpZXciLCJjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsInRoaXN5ZWFyIiwicGFyc2VJbnQiLCJwcmlvcl95ZWFyX2Ftb3VudCIsInByaW9yX3llYXJfY29udHJpYnV0aW9ucyIsImNvbWluZ195ZWFyX2Ftb3VudCIsImNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMiLCJhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCIsIk1hdGgiLCJtYXgiLCJnZXRMZXZlbCIsIm1lbWJlcl9sZXZlbF9wcmVmaXgiLCJvbGRfbGV2ZWwiLCJsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yIiwibGV2ZWxfdmlld2VyX2NvbnRhaW5lciIsImRlY29kZUh0bWxFbnRpdHkiLCJzdHIiLCJtYXRjaCIsImRlYyIsIlN0cmluZyIsImZyb21DaGFyQ29kZSIsInRvTG93ZXJDYXNlIiwibWVtYmVyX2xldmVsIiwiaHRtbCIsImxldmVsX25hbWUiLCJzZWxlY3RlZCIsInJhbmdlIiwibW9u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TUE1VkgsRUE0VldDLE1BNVZYLEVBNFZtQkosUUE1Vm5CIiwiZmlsZSI6Im1pbm5wb3N0LW1lbWJlcnNoaXAtZnJvbnQtZW5kLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKCBmdW5jdGlvbiggJCApIHtcblxuXHRmdW5jdGlvbiBiZW5lZml0Rm9ybSgpIHtcblx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24uYS1idXR0b24tZGlzYWJsZWQnICkucmVtb3ZlQXR0ciggJ2Rpc2FibGVkJyApO1xuXHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHZhciAkYnV0dG9uICA9ICQoIHRoaXMgKTtcblx0XHRcdHZhciAkc3RhdHVzICA9ICQoICcubS1iZW5lZml0LW1lc3NhZ2UnLCAkKCB0aGlzICkucGFyZW50KCkgKTtcblx0XHRcdHZhciBzZXR0aW5ncyA9IG1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3M7XG5cdFx0XHQvLyByZXNldCB0aGUgbWVzc2FnZSBmb3IgY3VycmVudCBzdGF0dXNcblx0XHRcdCQoICcubS1iZW5lZml0LW1lc3NhZ2UnICkucmVtb3ZlQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlIG0tYmVuZWZpdC1tZXNzYWdlLWVycm9yIG0tYmVuZWZpdC1tZXNzYWdlLWluZm8gbS1iZW5lZml0LW1lc3NhZ2Utc3VjY2VzcycgKTtcblx0XHRcdGlmICggJCggJGJ1dHRvbiApLmhhc0NsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICkgKSB7XG5cdFx0XHRcdC8vdGhpc01lc3NhZ2UuaHRtbCggdGhpc01lc3NhZ2UuZGF0YSggJ21lc3NhZ2UtYWxsLWNsYWltZWQnICkgKTtcblx0XHRcdFx0Ly90aGlzTWVzc2FnZS5mYWRlSW4oICdzbG93JyApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gc2V0IGJ1dHRvbiB0byBwcm9jZXNzaW5nXG5cdFx0XHRcdCRidXR0b24udGV4dCggJ1Byb2Nlc3NpbmcnICkuYWRkQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblx0XHRcdFx0Ly8gc2V0IGFqYXggZGF0YVxuXHRcdFx0XHR2YXIgZGF0YSA9IHt9O1xuXHRcdFx0XHR2YXIgYmVuZWZpdFR5cGUgPSAkKCAnaW5wdXRbbmFtZT1cImJlbmVmaXQtbmFtZVwiXScgKS52YWwoKTtcblx0XHRcdFx0aWYgKCAncGFydG5lci1vZmZlcnMnID09PSBiZW5lZml0VHlwZSApIHtcblx0XHRcdFx0ICAgIGRhdGEgPSB7XG5cdFx0XHRcdCAgICAgICAgJ2FjdGlvbicgOiAnYmVuZWZpdF9mb3JtX3N1Ym1pdCcsXG5cdFx0XHRcdCAgICAgICAgJ21pbm5wb3N0X21lbWJlcnNoaXBfYmVuZWZpdF9mb3JtX25vbmNlJyA6ICRidXR0b24uZGF0YSggJ2JlbmVmaXQtbm9uY2UnICksXG5cdFx0XHRcdCAgICAgICAgJ2N1cnJlbnRfdXJsJyA6ICQoICdpbnB1dFtuYW1lPVwiY3VycmVudF91cmxcIl0nKS52YWwoKSxcblx0XHRcdFx0ICAgICAgICAnYmVuZWZpdC1uYW1lJzogJCggJ2lucHV0W25hbWU9XCJiZW5lZml0LW5hbWVcIl0nKS52YWwoKSxcblx0XHRcdFx0ICAgICAgICAnaW5zdGFuY2VfaWQnIDogJCggJ2lucHV0W25hbWU9XCJpbnN0YW5jZS1pZC0nICsgJGJ1dHRvbi52YWwoKSArICdcIl0nICkudmFsKCksXG5cdFx0XHRcdCAgICAgICAgJ3Bvc3RfaWQnIDogJGJ1dHRvbi52YWwoKSxcblx0XHRcdFx0ICAgICAgICAnaXNfYWpheCcgOiAnMScsXG5cdFx0XHRcdCAgICB9O1xuXHRcdFx0XHQgICAgJC5wb3N0KCBzZXR0aW5ncy5hamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdFx0ICAgIGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHQgICAgXHQvL2NvbnNvbGUuZGlyKHJlc3BvbnNlKTtcblx0XHRcdFx0XHQgICAgXHQkYnV0dG9uLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS50ZXh0KCByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICkuYWRkQ2xhc3MoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzICkucHJvcCggcmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSApO1xuXHRcdFx0XHRcdCAgICBcdCRzdGF0dXMudGV4dCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuYWRkQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlICcgKyByZXNwb25zZS5kYXRhLm1lc3NhZ2VfY2xhc3MgKTtcblx0XHRcdFx0XHQgICAgfSBlbHNlIHtcblx0XHRcdFx0XHQgICAgXHQvL2NvbnNvbGUuZGlyKHJlc3BvbnNlKTtcblx0XHRcdFx0XHQgICAgXHQkYnV0dG9uLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS50ZXh0KCByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICkuYWRkQ2xhc3MoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzICkucHJvcCggcmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSApO1xuXHRcdFx0XHRcdCAgICBcdCRzdGF0dXMudGV4dCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuYWRkQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlICcgKyByZXNwb25zZS5kYXRhLm1lc3NhZ2VfY2xhc3MgKTtcblx0XHRcdFx0XHQgICAgfVxuXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHQgICAgfVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0JCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCAwIDwgJCggJy5tLWZvcm0tbWVtYmVyc2hpcC1iZW5lZml0JyApLmxlbmd0aCApIHtcblx0XHRcdGJlbmVmaXRGb3JtKCk7XG5cdFx0fVxuXHR9KTtcblxufSApKCBqUXVlcnkgKTtcbiIsIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQsIHVuZGVmaW5lZCApIHtcblxuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0dmFyIHBsdWdpbk5hbWUgPSAnbWlubnBvc3RNZW1iZXJzaGlwJyxcblx0ZGVmYXVsdHMgPSB7XG5cdFx0J2RlYnVnJyA6IGZhbHNlLCAvLyB0aGlzIGNhbiBiZSBzZXQgdG8gdHJ1ZSBvbiBwYWdlIGxldmVsIG9wdGlvbnNcblx0XHQnYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUnIDogJyNhbW91bnQtaXRlbSAjYW1vdW50Jyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUnIDogJy5tLW1lbWJlcnNoaXAtZmFzdC1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHQnbGV2ZWxfdmlld2VyX2NvbnRhaW5lcicgOiAnLmEtc2hvdy1sZXZlbCcsXG5cdFx0J2xldmVsX25hbWUnIDogJy5hLWxldmVsJyxcblx0XHQndXNlcl9jdXJyZW50X2xldmVsJyA6ICcuYS1jdXJyZW50LWxldmVsJyxcblx0XHQndXNlcl9uZXdfbGV2ZWwnIDogJy5hLW5ldy1sZXZlbCcsXG5cdFx0J2Ftb3VudF92aWV3ZXInIDogJy5hbW91bnQgaDMnLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuYS1mb3JtLWl0ZW0tbWVtYmVyc2hpcC1mcmVxdWVuY3knLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzX3R5cGUnIDogJ3NlbGVjdCcsXG5cdFx0J2xldmVsc19jb250YWluZXInIDogJy5vLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVscycsXG5cdFx0J3NpbmdsZV9sZXZlbF9jb250YWluZXInIDogJy5tLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVsJyxcblx0XHQnc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3InIDogJy5tLW1lbWJlci1sZXZlbC1icmllZicsXG5cdFx0J2ZsaXBwZWRfaXRlbXMnIDogJ2Rpdi5hbW91bnQsIGRpdi5lbnRlcicsXG5cdFx0J2xldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yJyA6ICcuc2hvdy1mcmVxdWVuY3knLFxuXHRcdCdjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmFtb3VudCAuYS1idXR0b24tZmxpcCcsXG5cdFx0J2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5lbnRlciBpbnB1dC5hbW91bnQtZW50cnknLFxuXHR9OyAvLyBlbmQgZGVmYXVsdHNcblxuXHQvLyBUaGUgYWN0dWFsIHBsdWdpbiBjb25zdHJ1Y3RvclxuXHRmdW5jdGlvbiBQbHVnaW4oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cblx0XHRpbml0OiBmdW5jdGlvbiggcmVzZXQsIGFtb3VudCApIHtcblx0XHRcdC8vIFBsYWNlIGluaXRpYWxpemF0aW9uIGxvZ2ljIGhlcmVcblx0XHRcdC8vIFlvdSBhbHJlYWR5IGhhdmUgYWNjZXNzIHRvIHRoZSBET00gZWxlbWVudCBhbmRcblx0XHRcdC8vIHRoZSBvcHRpb25zIHZpYSB0aGUgaW5zdGFuY2UsIGUuZy4gdGhpcy5lbGVtZW50XG5cdFx0XHQvLyBhbmQgdGhpcy5vcHRpb25zXG5cdFx0XHQvLyB5b3UgY2FuIGFkZCBtb3JlIGZ1bmN0aW9ucyBsaWtlIHRoZSBvbmUgYmVsb3cgYW5kXG5cdFx0XHQvLyBjYWxsIHRoZW0gbGlrZSBzbzogdGhpcy55b3VyT3RoZXJGdW5jdGlvbih0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucykuXG5cdFx0XHR0aGlzLmNhdGNoSGFzaExpbmtzKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyk7XG5cdFx0XHR0aGlzLmxldmVsRmxpcHBlciggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHRcdHRoaXMuc3RhcnRMZXZlbENsaWNrKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdFx0dGhpcy5zdWJtaXRGb3JtKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdH0sXG5cblx0XHRhbmFseXRpY3NFdmVudFRyYWNrOiBmdW5jdGlvbiggdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICkge1xuXHRcdFx0aWYgKCB0eXBlb2YgZ2EgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRpZiAoIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwgKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBhbmFseXRpY3NFdmVudFRyYWNrXG5cblx0XHRjYXRjaEhhc2hMaW5rczogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCdhW2hyZWYqPVwiI1wiXTpub3QoW2hyZWY9XCIjXCJdKScsIGVsZW1lbnQpLmNsaWNrKGZ1bmN0aW9uKGUpIHtcblx0XHRcdCAgICB2YXIgdGFyZ2V0ID0gJChlLnRhcmdldCk7XG5cdFx0XHQgICAgaWYgKHRhcmdldC5wYXJlbnQoJy5jb21tZW50LXRpdGxlJykubGVuZ3RoID09IDAgJiYgbG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpID09IHRoaXMucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpICYmIGxvY2F0aW9uLmhvc3RuYW1lID09IHRoaXMuaG9zdG5hbWUpIHtcblx0XHRcdFx0ICAgIHZhciB0YXJnZXQgPSAkKHRoaXMuaGFzaCk7XG5cdFx0XHRcdCAgICB0YXJnZXQgPSB0YXJnZXQubGVuZ3RoID8gdGFyZ2V0IDogJCgnW25hbWU9JyArIHRoaXMuaGFzaC5zbGljZSgxKSArJ10nKTtcblx0XHRcdFx0XHRpZiAodGFyZ2V0Lmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0JCgnaHRtbCxib2R5JykuYW5pbWF0ZSh7XG5cdFx0XHRcdFx0XHRcdHNjcm9sbFRvcDogdGFyZ2V0Lm9mZnNldCgpLnRvcFxuXHRcdFx0XHRcdFx0fSwgMTAwMCk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgY2F0Y2hMaW5rc1xuXG5cdFx0bGV2ZWxGbGlwcGVyOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHZhciBwcmV2aW91c19hbW91bnQgPSAnJztcblx0XHRcdHZhciBhbW91bnQgPSAwO1xuXHRcdFx0dmFyIGxldmVsID0gJyc7XG5cdFx0XHR2YXIgbGV2ZWxfbnVtYmVyID0gMDtcblx0XHRcdHZhciBmcmVxdWVuY3lfc3RyaW5nID0gJyc7XG5cdFx0XHR2YXIgZnJlcXVlbmN5ID0gJyc7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSAnJztcblx0XHRcdGlmICggdHlwZW9mIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSAhPT0gJ3VuZGVmaW5lZCcgJiYgJCggb3B0aW9ucy51c2VyX2N1cnJlbnRfbGV2ZWwgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRwcmV2aW91c19hbW91bnQgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLnByZXZpb3VzX2Ftb3VudDtcblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS52YWwoKTtcblx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcpLnZhbCgpO1xuXHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0ICAgIGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0ICAgIHRoYXQuc2hvd05ld0xldmVsKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApO1xuXG5cdFx0XHQgICAgJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lKS5jaGFuZ2UoIGZ1bmN0aW9uKCkge1xuXG5cdFx0XHQgICAgXHRmcmVxdWVuY3lfc3RyaW5nID0gJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcpLnZhbCgpXG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0ICAgICAgbGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS52YWwoKSwgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcgKS5hdHRyKCAnZGF0YS15ZWFyLWZyZXF1ZW5jeScgKSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0ICAgICAgdGhhdC5zaG93TmV3TGV2ZWwoIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICk7XG5cdFx0XHQgICAgfSk7XG5cblx0XHRcdCAgICAkKG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUpLmJpbmQoJ2tleXVwIG1vdXNldXAnLCBmdW5jdGlvbigpIHtcblx0XHRcdCAgICBcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJykudmFsKClcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0ICAgICAgaWYoJCh0aGlzKS5kYXRhKCdsYXN0LXZhbHVlJykgIT0gJCh0aGlzKS52YWwoKSkge1xuXHRcdFx0ICAgICAgICAkKHRoaXMpLmRhdGEoJ2xhc3QtdmFsdWUnLCAkKHRoaXMpLnZhbCgpKTtcblx0XHRcdCAgICAgICAgbGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS52YWwoKSwgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcgKS5hdHRyKCAnZGF0YS15ZWFyLWZyZXF1ZW5jeScgKSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0ICAgICAgICB0aGF0LnNob3dOZXdMZXZlbCggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKTtcblx0XHRcdCAgICAgIH07XG5cdFx0XHQgICAgfSk7XG5cblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5sZXZlbHNfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCApLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5mbGlwcGVkX2l0ZW1zLCAkKHRoaXMpICkud3JhcEFsbCggJzxkaXYgY2xhc3M9XCJmbGlwcGVyXCIvPicgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKHRoaXMpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJCh0aGlzKS52YWwoKTtcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0XHQgICAgaWYgKCB0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJyApIHtcblxuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHRcdCQoIGV2ZW50LnRhcmdldCApLmNsb3Nlc3QoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cblx0XHRcdFx0XHRcdGlmICggZnJlcXVlbmN5ID09IDEgKSB7XG5cdFx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LXllYXJseScgKSApO1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5ID09IDEyICkge1xuXHRcdFx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkudmFsKCAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkuZGF0YSgnZGVmYXVsdC1tb250aGx5JyApICk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArICdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArIGxldmVsX251bWJlciArICdcIl0nKS52YWwoKTtcblxuXHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHR0aGF0LmNoYW5nZUZyZXF1ZW5jeSggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdFx0fSBlbHNlIGlmICggJCggb3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IsIGVsZW1lbnQpLnRleHQoZnJlcXVlbmN5X25hbWUpO1xuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQob3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0XHRcdGlmICggdHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkudmFsKCk7XG5cdFx0XHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHRoYXQuY2hhbmdlQW1vdW50UHJldmlldyggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0JCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdCQoIGV2ZW50LnRhcmdldCApLmNsb3Nlc3QoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpLnBhcmVudCgpICkudmFsKCk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBsZXZlbEZsaXBwZXJcblxuXHRcdGNoZWNrTGV2ZWw6IGZ1bmN0aW9uKCBhbW91bnQsIGZyZXF1ZW5jeSwgdHlwZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdCAgdmFyIHRoaXN5ZWFyID0gcGFyc2VJbnQoIGFtb3VudCApICogcGFyc2VJbnQoIGZyZXF1ZW5jeSApO1xuXHRcdCAgdmFyIGxldmVsID0gJyc7XG5cdFx0ICBpZiAoIHR5cGVvZiBwcmV2aW91c19hbW91bnQgIT09ICd1bmRlZmluZWQnICYmIHByZXZpb3VzX2Ftb3VudCAhPT0gJycgKSB7XG5cdFx0ICAgIHZhciBwcmlvcl95ZWFyX2Ftb3VudCA9IHBhcnNlSW50KCBwcmV2aW91c19hbW91bnQucHJpb3JfeWVhcl9jb250cmlidXRpb25zICk7XG5cdFx0ICAgIHZhciBjb21pbmdfeWVhcl9hbW91bnQgPSBwYXJzZUludCggcHJldmlvdXNfYW1vdW50LmNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMgKTtcblx0XHQgICAgdmFyIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ID0gcGFyc2VJbnQoIHByZXZpb3VzX2Ftb3VudC5hbm51YWxfcmVjdXJyaW5nX2Ftb3VudCApO1xuXHRcdCAgICAvLyBjYWxjdWxhdGUgbWVtYmVyIGxldmVsIGZvcm11bGFcblx0XHQgICAgaWYgKCB0eXBlID09PSAnb25lLXRpbWUnICkge1xuXHRcdCAgICAgIHByaW9yX3llYXJfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdCAgICB9IGVsc2Uge1xuXHRcdCAgICAgIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdCAgICB9XG5cblx0XHQgICAgdGhpc3llYXIgPSBNYXRoLm1heCggcHJpb3JfeWVhcl9hbW91bnQsIGNvbWluZ195ZWFyX2Ftb3VudCwgYW5udWFsX3JlY3VycmluZ19hbW91bnQgKTtcblx0XHQgIH1cblxuXHRcdCAgbGV2ZWwgPSB0aGlzLmdldExldmVsKCB0aGlzeWVhciApO1xuXG5cdFx0ICAkKCdoMicsIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IpLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdCAgICBpZiAoICQodGhpcykudGV4dCgpID09IGxldmVsWyduYW1lJ10gKSB7XG5cdFx0ICAgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHQgICAgICAkKHRoaXMpLnBhcmVudCgpLnBhcmVudCgpLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdCAgICB9XG5cdFx0ICB9ICk7XG5cdFx0ICByZXR1cm4gbGV2ZWw7XG5cblx0XHR9LCAvLyBlbmQgY2hlY2tMZXZlbFxuXG5cdFx0Z2V0TGV2ZWw6IGZ1bmN0aW9uKCB0aGlzeWVhciApIHtcblx0XHRcdHZhciBsZXZlbCA9IFtdO1xuXHRcdFx0aWYgKCB0aGlzeWVhciA+IDAgJiYgdGhpc3llYXIgPCA2MCApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdCcm9uemUnO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAxO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAodGhpc3llYXIgPiA1OSAmJiB0aGlzeWVhciA8IDEyMCkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ1NpbHZlcic7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDI7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMTE5ICYmIHRoaXN5ZWFyIDwgMjQwKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnR29sZCc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDM7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMjM5KSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnUGxhdGludW0nO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSA0O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGxldmVsO1xuXHRcdH0sIC8vIGVuZCBnZXRMZXZlbFxuXG5cdFx0c2hvd05ld0xldmVsOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKSB7XG5cdFx0XHR2YXIgbWVtYmVyX2xldmVsX3ByZWZpeCA9ICcnO1xuXHRcdFx0dmFyIG9sZF9sZXZlbCA9ICcnO1xuXHRcdFx0dmFyIGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgPSBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXI7IC8vIHRoaXMgc2hvdWxkIGNoYW5nZSB3aGVuIHdlIHJlcGxhY2UgdGhlIHRleHQsIGlmIHRoZXJlIGlzIGEgbGluayBpbnNpZGUgaXRcblx0XHRcdHZhciBkZWNvZGVIdG1sRW50aXR5ID0gZnVuY3Rpb24oIHN0ciApIHtcblx0XHRcdFx0cmV0dXJuIHN0ci5yZXBsYWNlKCAvJiMoXFxkKyk7L2csIGZ1bmN0aW9uKCBtYXRjaCwgZGVjICkge1xuXHRcdFx0XHRcdHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKCBkZWMgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9O1xuXHRcdFx0aWYgKCB0eXBlb2YgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0bWVtYmVyX2xldmVsX3ByZWZpeCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5tZW1iZXJfbGV2ZWxfcHJlZml4O1xuXHRcdFx0fVxuXG5cdFx0XHQkKG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lcikucHJvcCggJ2NsYXNzJywgJ2Etc2hvdy1sZXZlbCBhLXNob3ctbGV2ZWwtJyArIGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApO1xuXG5cdFx0XHRpZiAoICQoIG9wdGlvbnMudXNlcl9jdXJyZW50X2xldmVsICkubGVuZ3RoID4gMCAmJiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5sZW5ndGggPiAwICkge1xuXG5cdFx0XHRcdGlmICggJ2EnLCAkKCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRcdGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgPSBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKyAnIGEnO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0b2xkX2xldmVsID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwucmVwbGFjZSggbWVtYmVyX2xldmVsX3ByZWZpeCwgJycgKTtcblxuXHRcdFx0XHRpZiAoIG9sZF9sZXZlbCAhPT0gbGV2ZWxbJ25hbWUnXS50b0xvd2VyQ2FzZSgpICkge1xuXHRcdFx0XHRcdCQoIGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgKS5odG1sKCBkZWNvZGVIdG1sRW50aXR5KCAkKCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKS5kYXRhKCAnY2hhbmdlZCcgKSApICk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JCggbGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciApLmh0bWwoIGRlY29kZUh0bWxFbnRpdHkoICQoIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciApLmRhdGEoICdub3QtY2hhbmdlZCcgKSApICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0JChvcHRpb25zLmxldmVsX25hbWUsIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lcikudGV4dCggbGV2ZWxbJ25hbWUnXSApO1xuXG5cdFx0fSwgLy8gZW5kIHNob3dOZXdMZXZlbFxuXG5cdFx0Y2hhbmdlRnJlcXVlbmN5OiBmdW5jdGlvbiggc2VsZWN0ZWQsIGxldmVsLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcmFuZ2UgICAgICAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCk7XG5cdFx0XHRcdHZhciBtb250aF92YWx1ZSAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ21vbnRoJyk7XG5cdFx0XHQgICAgdmFyIHllYXJfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgneWVhcicpO1xuXHRcdFx0ICAgIHZhciBvbmNlX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ29uZS10aW1lJyk7XG5cdFx0XHQgICAgdmFyIGZyZXF1ZW5jeV9uYW1lID0gc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0ICAgIHZhciBmcmVxdWVuY3kgICAgICA9IHBhcnNlSW50KCBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMV0gKTtcblxuXHRcdFx0ICAgICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyApLnZhbCggc2VsZWN0ZWQgKTtcbiAgICBcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMgKS5wcm9wKCAnc2VsZWN0ZWQnLCBzZWxlY3RlZCApO1xuXG5cdFx0XHRcdGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciBtb250aCcgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5yZW1vdmVDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgeWVhcicgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gb25jZV92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcygnc21hbGxlcicgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoIHJhbmdlICk7XG4gICAgXHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkuZGF0YSggJ2ZyZXF1ZW5jeScsIGZyZXF1ZW5jeSApO1xuXG5cdFx0XHR9ICk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUZyZXF1ZW5jeVxuXG5cdFx0Y2hhbmdlQW1vdW50UHJldmlldzogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0ICAgIHZhciB5ZWFyX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ3llYXInKTtcblx0XHRcdCAgICB2YXIgb25jZV92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdvbmUtdGltZScpO1xuXHRcdFx0ICAgIHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuXG5cdFx0XHR9ICk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUFtb3VudFByZXZpZXdcblxuXHRcdHN0YXJ0TGV2ZWxDbGljazogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCcuc3RhcnQtbGV2ZWwnKS5jbGljayhmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGxldmVsX2NsYXNzID0gJCggdGhpcyApLnByb3AoICdjbGFzcycgKTtcblx0XHRcdFx0dmFyIGxldmVsX251bWJlciA9IGxldmVsX2NsYXNzW2xldmVsX2NsYXNzLmxlbmd0aCAtMV07XG5cdFx0XHQgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0ICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciwgZWxlbWVudCApLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0ICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciArICcgJyArIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHQgIH0pO1xuXHRcdH0sIC8vIGVuZCBzdGFydExldmVsQ2xpY2tcblxuXHRcdHN1Ym1pdEZvcm06IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0JCggZWxlbWVudCApLnN1Ym1pdCggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHR0aGF0LmFuYWx5dGljc0V2ZW50VHJhY2soICdldmVudCcsICdTdXBwb3J0IFVzJywgJ0JlY29tZSBBIE1lbWJlcicsIGxvY2F0aW9uLnBhdGhuYW1lICk7XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgc3VibWl0Rm9ybVxuXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblx0Ly8gQSByZWFsbHkgbGlnaHR3ZWlnaHQgcGx1Z2luIHdyYXBwZXIgYXJvdW5kIHRoZSBjb25zdHJ1Y3Rvcixcblx0Ly8gcHJldmVudGluZyBhZ2FpbnN0IG11bHRpcGxlIGluc3RhbnRpYXRpb25zXG5cdCQuZm5bcGx1Z2luTmFtZV0gPSBmdW5jdGlvbiAoIG9wdGlvbnMgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoICEgJC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lICkgKSB7XG5cdFx0XHRcdCQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSwgbmV3IFBsdWdpbiggdGhpcywgb3B0aW9ucyApICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG5cbn0pKCBqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQgKTtcbiJdfQ==
