'use strict';

(function ($) {

	function benefitForm() {
		$('.a-benefit-button.a-button-disabled').removeAttr('disabled');
		$('.a-benefit-button').click(function (event) {
			event.preventDefault();
			var $button = $(this);
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
							console.log('woooo');
							$button.text('Claimed').removeClass('a-button-disabled').addClass('a-button-claimed').prop('disabled', true);
							// remove button and textarea
							//$button.remove();
							//$( '.report-a-bug-message' ).remove();

							// display success message
							//$( '.report-a-bug-response' ).html( response.data );
						} else {
							$button.removeClass('a-button-disabled');
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJlbmVmaXRzLmpzIiwibWVtYmVyLWxldmVscy5qcyJdLCJuYW1lcyI6WyIkIiwiYmVuZWZpdEZvcm0iLCJyZW1vdmVBdHRyIiwiY2xpY2siLCJldmVudCIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsInNldHRpbmdzIiwibWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5ncyIsInJlbW92ZUNsYXNzIiwiaGFzQ2xhc3MiLCJ0ZXh0IiwiYWRkQ2xhc3MiLCJkYXRhIiwiYmVuZWZpdFR5cGUiLCJ2YWwiLCJwb3N0IiwiYWpheHVybCIsInJlc3BvbnNlIiwic3VjY2VzcyIsImNvbnNvbGUiLCJsb2ciLCJwcm9wIiwiZG9jdW1lbnQiLCJyZWFkeSIsImxlbmd0aCIsImpRdWVyeSIsIndpbmRvdyIsInVuZGVmaW5lZCIsInBsdWdpbk5hbWUiLCJkZWZhdWx0cyIsIlBsdWdpbiIsImVsZW1lbnQiLCJvcHRpb25zIiwiZXh0ZW5kIiwiX2RlZmF1bHRzIiwiX25hbWUiLCJpbml0IiwicHJvdG90eXBlIiwicmVzZXQiLCJhbW91bnQiLCJjYXRjaEhhc2hMaW5rcyIsImxldmVsRmxpcHBlciIsInN0YXJ0TGV2ZWxDbGljayIsInN1Ym1pdEZvcm0iLCJhbmFseXRpY3NFdmVudFRyYWNrIiwidHlwZSIsImNhdGVnb3J5IiwiYWN0aW9uIiwibGFiZWwiLCJ2YWx1ZSIsImdhIiwiZSIsInRhcmdldCIsInBhcmVudCIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJyZXBsYWNlIiwiaG9zdG5hbWUiLCJoYXNoIiwic2xpY2UiLCJhbmltYXRlIiwic2Nyb2xsVG9wIiwib2Zmc2V0IiwidG9wIiwidGhhdCIsInByZXZpb3VzX2Ftb3VudCIsImxldmVsIiwibGV2ZWxfbnVtYmVyIiwiZnJlcXVlbmN5X3N0cmluZyIsImZyZXF1ZW5jeSIsImZyZXF1ZW5jeV9uYW1lIiwibWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhIiwidXNlcl9jdXJyZW50X2xldmVsIiwiY3VycmVudF91c2VyIiwiYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUiLCJmcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSIsInNwbGl0IiwiY2hlY2tMZXZlbCIsInNob3dOZXdMZXZlbCIsImNoYW5nZSIsImF0dHIiLCJiaW5kIiwibGV2ZWxzX2NvbnRhaW5lciIsInNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yIiwiZWFjaCIsImZsaXBwZWRfaXRlbXMiLCJ3cmFwQWxsIiwiZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyIsIm9uIiwic2luZ2xlX2xldmVsX2NvbnRhaW5lciIsImNsb3Nlc3QiLCJhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwiYW1vdW50X3ZpZXdlciIsImNoYW5nZUZyZXF1ZW5jeSIsImxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yIiwiY2hhbmdlQW1vdW50UHJldmlldyIsImNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwidGhpc3llYXIiLCJwYXJzZUludCIsInByaW9yX3llYXJfYW1vdW50IiwicHJpb3JfeWVhcl9jb250cmlidXRpb25zIiwiY29taW5nX3llYXJfYW1vdW50IiwiY29taW5nX3llYXJfY29udHJpYnV0aW9ucyIsImFubnVhbF9yZWN1cnJpbmdfYW1vdW50IiwiTWF0aCIsIm1heCIsImdldExldmVsIiwibWVtYmVyX2xldmVsX3ByZWZpeCIsIm9sZF9sZXZlbCIsImxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IiLCJsZXZlbF92aWV3ZXJfY29udGFpbmVyIiwiZGVjb2RlSHRtbEVudGl0eSIsInN0ciIsIm1hdGNoIiwiZGVjIiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwidG9Mb3dlckNhc2UiLCJtZW1iZXJfbGV2ZWwiLCJodG1sIiwibGV2ZWxfbmFtZSIsInNlbGVjdGVkIiwicmFuZ2UiLCJtb250aF92YWx1ZSIsInllYXJfdmFsdWUiLCJvbmNlX3ZhbHVlIiwibGV2ZWxfY2xhc3MiLCJzdWJtaXQiLCJmbiJdLCJtYXBwaW5ncyI6Ijs7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Qzs7QUFFSDtBQUNBO0FBQ0F4RCxHQUFFaUksRUFBRixDQUFLcEcsVUFBTCxJQUFtQixVQUFXSSxPQUFYLEVBQXFCO0FBQ3ZDLFNBQU8sS0FBS29ELElBQUwsQ0FBVSxZQUFZO0FBQzVCLE9BQUssQ0FBRXJGLEVBQUVhLElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWWdCLFVBQTFCLENBQVAsRUFBZ0Q7QUFDL0M3QixNQUFFYSxJQUFGLENBQVEsSUFBUixFQUFjLFlBQVlnQixVQUExQixFQUFzQyxJQUFJRSxNQUFKLENBQVksSUFBWixFQUFrQkUsT0FBbEIsQ0FBdEM7QUFDQTtBQUNELEdBSk0sQ0FBUDtBQUtBLEVBTkQ7QUFRQSxDQTVWQSxFQTRWR1AsTUE1VkgsRUE0VldDLE1BNVZYLEVBNFZtQkosUUE1Vm5CIiwiZmlsZSI6Im1pbm5wb3N0LW1lbWJlcnNoaXAtZnJvbnQtZW5kLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKCBmdW5jdGlvbiggJCApIHtcblxuXHRmdW5jdGlvbiBiZW5lZml0Rm9ybSgpIHtcblx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24uYS1idXR0b24tZGlzYWJsZWQnICkucmVtb3ZlQXR0ciggJ2Rpc2FibGVkJyApO1xuXHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHZhciAkYnV0dG9uICA9ICQoIHRoaXMgKTtcblx0XHRcdHZhciBzZXR0aW5ncyA9IG1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3M7XG5cdFx0XHQvLyByZXNldCB0aGUgbWVzc2FnZSBmb3IgY3VycmVudCBzdGF0dXNcblx0XHRcdCQoICcubS1iZW5lZml0LW1lc3NhZ2UnICkucmVtb3ZlQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlIG0tYmVuZWZpdC1tZXNzYWdlLWVycm9yIG0tYmVuZWZpdC1tZXNzYWdlLWluZm8gbS1iZW5lZml0LW1lc3NhZ2Utc3VjY2VzcycgKTtcblx0XHRcdGlmICggJCggJGJ1dHRvbiApLmhhc0NsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICkgKSB7XG5cdFx0XHRcdC8vdGhpc01lc3NhZ2UuaHRtbCggdGhpc01lc3NhZ2UuZGF0YSggJ21lc3NhZ2UtYWxsLWNsYWltZWQnICkgKTtcblx0XHRcdFx0Ly90aGlzTWVzc2FnZS5mYWRlSW4oICdzbG93JyApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gc2V0IGJ1dHRvbiB0byBwcm9jZXNzaW5nXG5cdFx0XHRcdCRidXR0b24udGV4dCggJ1Byb2Nlc3NpbmcnICkuYWRkQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblx0XHRcdFx0Ly8gc2V0IGFqYXggZGF0YVxuXHRcdFx0XHR2YXIgZGF0YSA9IHt9O1xuXHRcdFx0XHR2YXIgYmVuZWZpdFR5cGUgPSAkKCAnaW5wdXRbbmFtZT1cImJlbmVmaXQtbmFtZVwiXScgKS52YWwoKTtcblx0XHRcdFx0aWYgKCAncGFydG5lci1vZmZlcnMnID09PSBiZW5lZml0VHlwZSApIHtcblx0XHRcdFx0ICAgIGRhdGEgPSB7XG5cdFx0XHRcdCAgICAgICAgJ2FjdGlvbicgOiAnYmVuZWZpdF9mb3JtX3N1Ym1pdCcsXG5cdFx0XHRcdCAgICAgICAgJ21pbm5wb3N0X21lbWJlcnNoaXBfYmVuZWZpdF9mb3JtX25vbmNlJyA6ICRidXR0b24uZGF0YSggJ2JlbmVmaXQtbm9uY2UnICksXG5cdFx0XHRcdCAgICAgICAgJ2N1cnJlbnRfdXJsJyA6ICQoICdpbnB1dFtuYW1lPVwiY3VycmVudF91cmxcIl0nKS52YWwoKSxcblx0XHRcdFx0ICAgICAgICAnYmVuZWZpdC1uYW1lJzogJCggJ2lucHV0W25hbWU9XCJiZW5lZml0LW5hbWVcIl0nKS52YWwoKSxcblx0XHRcdFx0ICAgICAgICAnaW5zdGFuY2VfaWQnIDogJCggJ2lucHV0W25hbWU9XCJpbnN0YW5jZS1pZC0nICsgJGJ1dHRvbi52YWwoKSArICdcIl0nICkudmFsKCksXG5cdFx0XHRcdCAgICAgICAgJ3Bvc3RfaWQnIDogJGJ1dHRvbi52YWwoKSxcblx0XHRcdFx0ICAgICAgICAnaXNfYWpheCcgOiAnMScsXG5cdFx0XHRcdCAgICB9O1xuXHRcdFx0XHQgICAgJC5wb3N0KCBzZXR0aW5ncy5hamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdFx0ICAgIGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHQgICAgXHRjb25zb2xlLmxvZyggJ3dvb29vJyApO1xuXHRcdFx0XHRcdCAgICBcdCRidXR0b24udGV4dCggJ0NsYWltZWQnICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggJ2EtYnV0dG9uLWNsYWltZWQnICkucHJvcCggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHRcdFx0XHRcdCAgICAgICAgLy8gcmVtb3ZlIGJ1dHRvbiBhbmQgdGV4dGFyZWFcblx0XHRcdFx0XHQgICAgICAgIC8vJGJ1dHRvbi5yZW1vdmUoKTtcblx0XHRcdFx0XHQgICAgICAgIC8vJCggJy5yZXBvcnQtYS1idWctbWVzc2FnZScgKS5yZW1vdmUoKTtcblxuXHRcdFx0XHRcdCAgICAgICAgLy8gZGlzcGxheSBzdWNjZXNzIG1lc3NhZ2Vcblx0XHRcdFx0XHQgICAgICAgIC8vJCggJy5yZXBvcnQtYS1idWctcmVzcG9uc2UnICkuaHRtbCggcmVzcG9uc2UuZGF0YSApO1xuXHRcdFx0XHRcdCAgICB9IGVsc2Uge1xuXHRcdFx0XHRcdCAgICBcdCRidXR0b24ucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblx0XHRcdFx0XHQgICAgfVxuXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHQgICAgfVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0JCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCAwIDwgJCggJy5tLWZvcm0tbWVtYmVyc2hpcC1iZW5lZml0JyApLmxlbmd0aCApIHtcblx0XHRcdGJlbmVmaXRGb3JtKCk7XG5cdFx0fVxuXHR9KTtcblxufSApKCBqUXVlcnkgKTtcbiIsIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQsIHVuZGVmaW5lZCApIHtcblxuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0dmFyIHBsdWdpbk5hbWUgPSAnbWlubnBvc3RNZW1iZXJzaGlwJyxcblx0ZGVmYXVsdHMgPSB7XG5cdFx0J2RlYnVnJyA6IGZhbHNlLCAvLyB0aGlzIGNhbiBiZSBzZXQgdG8gdHJ1ZSBvbiBwYWdlIGxldmVsIG9wdGlvbnNcblx0XHQnYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUnIDogJyNhbW91bnQtaXRlbSAjYW1vdW50Jyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUnIDogJy5tLW1lbWJlcnNoaXAtZmFzdC1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHQnbGV2ZWxfdmlld2VyX2NvbnRhaW5lcicgOiAnLmEtc2hvdy1sZXZlbCcsXG5cdFx0J2xldmVsX25hbWUnIDogJy5hLWxldmVsJyxcblx0XHQndXNlcl9jdXJyZW50X2xldmVsJyA6ICcuYS1jdXJyZW50LWxldmVsJyxcblx0XHQndXNlcl9uZXdfbGV2ZWwnIDogJy5hLW5ldy1sZXZlbCcsXG5cdFx0J2Ftb3VudF92aWV3ZXInIDogJy5hbW91bnQgaDMnLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuYS1mb3JtLWl0ZW0tbWVtYmVyc2hpcC1mcmVxdWVuY3knLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzX3R5cGUnIDogJ3NlbGVjdCcsXG5cdFx0J2xldmVsc19jb250YWluZXInIDogJy5vLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVscycsXG5cdFx0J3NpbmdsZV9sZXZlbF9jb250YWluZXInIDogJy5tLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVsJyxcblx0XHQnc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3InIDogJy5tLW1lbWJlci1sZXZlbC1icmllZicsXG5cdFx0J2ZsaXBwZWRfaXRlbXMnIDogJ2Rpdi5hbW91bnQsIGRpdi5lbnRlcicsXG5cdFx0J2xldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yJyA6ICcuc2hvdy1mcmVxdWVuY3knLFxuXHRcdCdjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmFtb3VudCAuYS1idXR0b24tZmxpcCcsXG5cdFx0J2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5lbnRlciBpbnB1dC5hbW91bnQtZW50cnknLFxuXHR9OyAvLyBlbmQgZGVmYXVsdHNcblxuXHQvLyBUaGUgYWN0dWFsIHBsdWdpbiBjb25zdHJ1Y3RvclxuXHRmdW5jdGlvbiBQbHVnaW4oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cblx0XHRpbml0OiBmdW5jdGlvbiggcmVzZXQsIGFtb3VudCApIHtcblx0XHRcdC8vIFBsYWNlIGluaXRpYWxpemF0aW9uIGxvZ2ljIGhlcmVcblx0XHRcdC8vIFlvdSBhbHJlYWR5IGhhdmUgYWNjZXNzIHRvIHRoZSBET00gZWxlbWVudCBhbmRcblx0XHRcdC8vIHRoZSBvcHRpb25zIHZpYSB0aGUgaW5zdGFuY2UsIGUuZy4gdGhpcy5lbGVtZW50XG5cdFx0XHQvLyBhbmQgdGhpcy5vcHRpb25zXG5cdFx0XHQvLyB5b3UgY2FuIGFkZCBtb3JlIGZ1bmN0aW9ucyBsaWtlIHRoZSBvbmUgYmVsb3cgYW5kXG5cdFx0XHQvLyBjYWxsIHRoZW0gbGlrZSBzbzogdGhpcy55b3VyT3RoZXJGdW5jdGlvbih0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucykuXG5cdFx0XHR0aGlzLmNhdGNoSGFzaExpbmtzKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyk7XG5cdFx0XHR0aGlzLmxldmVsRmxpcHBlciggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHRcdHRoaXMuc3RhcnRMZXZlbENsaWNrKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdFx0dGhpcy5zdWJtaXRGb3JtKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdH0sXG5cblx0XHRhbmFseXRpY3NFdmVudFRyYWNrOiBmdW5jdGlvbiggdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICkge1xuXHRcdFx0aWYgKCB0eXBlb2YgZ2EgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRpZiAoIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwgKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBhbmFseXRpY3NFdmVudFRyYWNrXG5cblx0XHRjYXRjaEhhc2hMaW5rczogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCdhW2hyZWYqPVwiI1wiXTpub3QoW2hyZWY9XCIjXCJdKScsIGVsZW1lbnQpLmNsaWNrKGZ1bmN0aW9uKGUpIHtcblx0XHRcdCAgICB2YXIgdGFyZ2V0ID0gJChlLnRhcmdldCk7XG5cdFx0XHQgICAgaWYgKHRhcmdldC5wYXJlbnQoJy5jb21tZW50LXRpdGxlJykubGVuZ3RoID09IDAgJiYgbG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpID09IHRoaXMucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpICYmIGxvY2F0aW9uLmhvc3RuYW1lID09IHRoaXMuaG9zdG5hbWUpIHtcblx0XHRcdFx0ICAgIHZhciB0YXJnZXQgPSAkKHRoaXMuaGFzaCk7XG5cdFx0XHRcdCAgICB0YXJnZXQgPSB0YXJnZXQubGVuZ3RoID8gdGFyZ2V0IDogJCgnW25hbWU9JyArIHRoaXMuaGFzaC5zbGljZSgxKSArJ10nKTtcblx0XHRcdFx0XHRpZiAodGFyZ2V0Lmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0JCgnaHRtbCxib2R5JykuYW5pbWF0ZSh7XG5cdFx0XHRcdFx0XHRcdHNjcm9sbFRvcDogdGFyZ2V0Lm9mZnNldCgpLnRvcFxuXHRcdFx0XHRcdFx0fSwgMTAwMCk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgY2F0Y2hMaW5rc1xuXG5cdFx0bGV2ZWxGbGlwcGVyOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHZhciBwcmV2aW91c19hbW91bnQgPSAnJztcblx0XHRcdHZhciBhbW91bnQgPSAwO1xuXHRcdFx0dmFyIGxldmVsID0gJyc7XG5cdFx0XHR2YXIgbGV2ZWxfbnVtYmVyID0gMDtcblx0XHRcdHZhciBmcmVxdWVuY3lfc3RyaW5nID0gJyc7XG5cdFx0XHR2YXIgZnJlcXVlbmN5ID0gJyc7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSAnJztcblx0XHRcdGlmICggdHlwZW9mIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSAhPT0gJ3VuZGVmaW5lZCcgJiYgJCggb3B0aW9ucy51c2VyX2N1cnJlbnRfbGV2ZWwgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRwcmV2aW91c19hbW91bnQgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLnByZXZpb3VzX2Ftb3VudDtcblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS52YWwoKTtcblx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcpLnZhbCgpO1xuXHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0ICAgIGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0ICAgIHRoYXQuc2hvd05ld0xldmVsKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApO1xuXG5cdFx0XHQgICAgJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lKS5jaGFuZ2UoIGZ1bmN0aW9uKCkge1xuXG5cdFx0XHQgICAgXHRmcmVxdWVuY3lfc3RyaW5nID0gJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcpLnZhbCgpXG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0ICAgICAgbGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS52YWwoKSwgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcgKS5hdHRyKCAnZGF0YS15ZWFyLWZyZXF1ZW5jeScgKSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0ICAgICAgdGhhdC5zaG93TmV3TGV2ZWwoIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICk7XG5cdFx0XHQgICAgfSk7XG5cblx0XHRcdCAgICAkKG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUpLmJpbmQoJ2tleXVwIG1vdXNldXAnLCBmdW5jdGlvbigpIHtcblx0XHRcdCAgICBcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJykudmFsKClcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0ICAgICAgaWYoJCh0aGlzKS5kYXRhKCdsYXN0LXZhbHVlJykgIT0gJCh0aGlzKS52YWwoKSkge1xuXHRcdFx0ICAgICAgICAkKHRoaXMpLmRhdGEoJ2xhc3QtdmFsdWUnLCAkKHRoaXMpLnZhbCgpKTtcblx0XHRcdCAgICAgICAgbGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS52YWwoKSwgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcgKS5hdHRyKCAnZGF0YS15ZWFyLWZyZXF1ZW5jeScgKSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0ICAgICAgICB0aGF0LnNob3dOZXdMZXZlbCggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKTtcblx0XHRcdCAgICAgIH07XG5cdFx0XHQgICAgfSk7XG5cblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5sZXZlbHNfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCApLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5mbGlwcGVkX2l0ZW1zLCAkKHRoaXMpICkud3JhcEFsbCggJzxkaXYgY2xhc3M9XCJmbGlwcGVyXCIvPicgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKHRoaXMpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJCh0aGlzKS52YWwoKTtcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0XHQgICAgaWYgKCB0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJyApIHtcblxuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHRcdCQoIGV2ZW50LnRhcmdldCApLmNsb3Nlc3QoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cblx0XHRcdFx0XHRcdGlmICggZnJlcXVlbmN5ID09IDEgKSB7XG5cdFx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LXllYXJseScgKSApO1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5ID09IDEyICkge1xuXHRcdFx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkudmFsKCAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkuZGF0YSgnZGVmYXVsdC1tb250aGx5JyApICk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArICdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArIGxldmVsX251bWJlciArICdcIl0nKS52YWwoKTtcblxuXHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHR0aGF0LmNoYW5nZUZyZXF1ZW5jeSggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdFx0fSBlbHNlIGlmICggJCggb3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IsIGVsZW1lbnQpLnRleHQoZnJlcXVlbmN5X25hbWUpO1xuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQob3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0XHRcdGlmICggdHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkudmFsKCk7XG5cdFx0XHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHRoYXQuY2hhbmdlQW1vdW50UHJldmlldyggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0JCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdCQoIGV2ZW50LnRhcmdldCApLmNsb3Nlc3QoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpLnBhcmVudCgpICkudmFsKCk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBsZXZlbEZsaXBwZXJcblxuXHRcdGNoZWNrTGV2ZWw6IGZ1bmN0aW9uKCBhbW91bnQsIGZyZXF1ZW5jeSwgdHlwZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdCAgdmFyIHRoaXN5ZWFyID0gcGFyc2VJbnQoIGFtb3VudCApICogcGFyc2VJbnQoIGZyZXF1ZW5jeSApO1xuXHRcdCAgdmFyIGxldmVsID0gJyc7XG5cdFx0ICBpZiAoIHR5cGVvZiBwcmV2aW91c19hbW91bnQgIT09ICd1bmRlZmluZWQnICYmIHByZXZpb3VzX2Ftb3VudCAhPT0gJycgKSB7XG5cdFx0ICAgIHZhciBwcmlvcl95ZWFyX2Ftb3VudCA9IHBhcnNlSW50KCBwcmV2aW91c19hbW91bnQucHJpb3JfeWVhcl9jb250cmlidXRpb25zICk7XG5cdFx0ICAgIHZhciBjb21pbmdfeWVhcl9hbW91bnQgPSBwYXJzZUludCggcHJldmlvdXNfYW1vdW50LmNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMgKTtcblx0XHQgICAgdmFyIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ID0gcGFyc2VJbnQoIHByZXZpb3VzX2Ftb3VudC5hbm51YWxfcmVjdXJyaW5nX2Ftb3VudCApO1xuXHRcdCAgICAvLyBjYWxjdWxhdGUgbWVtYmVyIGxldmVsIGZvcm11bGFcblx0XHQgICAgaWYgKCB0eXBlID09PSAnb25lLXRpbWUnICkge1xuXHRcdCAgICAgIHByaW9yX3llYXJfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdCAgICB9IGVsc2Uge1xuXHRcdCAgICAgIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdCAgICB9XG5cblx0XHQgICAgdGhpc3llYXIgPSBNYXRoLm1heCggcHJpb3JfeWVhcl9hbW91bnQsIGNvbWluZ195ZWFyX2Ftb3VudCwgYW5udWFsX3JlY3VycmluZ19hbW91bnQgKTtcblx0XHQgIH1cblxuXHRcdCAgbGV2ZWwgPSB0aGlzLmdldExldmVsKCB0aGlzeWVhciApO1xuXG5cdFx0ICAkKCdoMicsIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IpLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdCAgICBpZiAoICQodGhpcykudGV4dCgpID09IGxldmVsWyduYW1lJ10gKSB7XG5cdFx0ICAgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHQgICAgICAkKHRoaXMpLnBhcmVudCgpLnBhcmVudCgpLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdCAgICB9XG5cdFx0ICB9ICk7XG5cdFx0ICByZXR1cm4gbGV2ZWw7XG5cblx0XHR9LCAvLyBlbmQgY2hlY2tMZXZlbFxuXG5cdFx0Z2V0TGV2ZWw6IGZ1bmN0aW9uKCB0aGlzeWVhciApIHtcblx0XHRcdHZhciBsZXZlbCA9IFtdO1xuXHRcdFx0aWYgKCB0aGlzeWVhciA+IDAgJiYgdGhpc3llYXIgPCA2MCApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdCcm9uemUnO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAxO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAodGhpc3llYXIgPiA1OSAmJiB0aGlzeWVhciA8IDEyMCkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ1NpbHZlcic7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDI7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMTE5ICYmIHRoaXN5ZWFyIDwgMjQwKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnR29sZCc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDM7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMjM5KSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnUGxhdGludW0nO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSA0O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGxldmVsO1xuXHRcdH0sIC8vIGVuZCBnZXRMZXZlbFxuXG5cdFx0c2hvd05ld0xldmVsOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKSB7XG5cdFx0XHR2YXIgbWVtYmVyX2xldmVsX3ByZWZpeCA9ICcnO1xuXHRcdFx0dmFyIG9sZF9sZXZlbCA9ICcnO1xuXHRcdFx0dmFyIGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgPSBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXI7IC8vIHRoaXMgc2hvdWxkIGNoYW5nZSB3aGVuIHdlIHJlcGxhY2UgdGhlIHRleHQsIGlmIHRoZXJlIGlzIGEgbGluayBpbnNpZGUgaXRcblx0XHRcdHZhciBkZWNvZGVIdG1sRW50aXR5ID0gZnVuY3Rpb24oIHN0ciApIHtcblx0XHRcdFx0cmV0dXJuIHN0ci5yZXBsYWNlKCAvJiMoXFxkKyk7L2csIGZ1bmN0aW9uKCBtYXRjaCwgZGVjICkge1xuXHRcdFx0XHRcdHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKCBkZWMgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9O1xuXHRcdFx0aWYgKCB0eXBlb2YgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0bWVtYmVyX2xldmVsX3ByZWZpeCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5tZW1iZXJfbGV2ZWxfcHJlZml4O1xuXHRcdFx0fVxuXG5cdFx0XHQkKG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lcikucHJvcCggJ2NsYXNzJywgJ2Etc2hvdy1sZXZlbCBhLXNob3ctbGV2ZWwtJyArIGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApO1xuXG5cdFx0XHRpZiAoICQoIG9wdGlvbnMudXNlcl9jdXJyZW50X2xldmVsICkubGVuZ3RoID4gMCAmJiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5sZW5ndGggPiAwICkge1xuXG5cdFx0XHRcdGlmICggJ2EnLCAkKCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRcdGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgPSBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKyAnIGEnO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0b2xkX2xldmVsID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwucmVwbGFjZSggbWVtYmVyX2xldmVsX3ByZWZpeCwgJycgKTtcblxuXHRcdFx0XHRpZiAoIG9sZF9sZXZlbCAhPT0gbGV2ZWxbJ25hbWUnXS50b0xvd2VyQ2FzZSgpICkge1xuXHRcdFx0XHRcdCQoIGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgKS5odG1sKCBkZWNvZGVIdG1sRW50aXR5KCAkKCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKS5kYXRhKCAnY2hhbmdlZCcgKSApICk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JCggbGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciApLmh0bWwoIGRlY29kZUh0bWxFbnRpdHkoICQoIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciApLmRhdGEoICdub3QtY2hhbmdlZCcgKSApICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0JChvcHRpb25zLmxldmVsX25hbWUsIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lcikudGV4dCggbGV2ZWxbJ25hbWUnXSApO1xuXG5cdFx0fSwgLy8gZW5kIHNob3dOZXdMZXZlbFxuXG5cdFx0Y2hhbmdlRnJlcXVlbmN5OiBmdW5jdGlvbiggc2VsZWN0ZWQsIGxldmVsLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcmFuZ2UgICAgICAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCk7XG5cdFx0XHRcdHZhciBtb250aF92YWx1ZSAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ21vbnRoJyk7XG5cdFx0XHQgICAgdmFyIHllYXJfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgneWVhcicpO1xuXHRcdFx0ICAgIHZhciBvbmNlX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ29uZS10aW1lJyk7XG5cdFx0XHQgICAgdmFyIGZyZXF1ZW5jeV9uYW1lID0gc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0ICAgIHZhciBmcmVxdWVuY3kgICAgICA9IHBhcnNlSW50KCBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMV0gKTtcblxuXHRcdFx0ICAgICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyApLnZhbCggc2VsZWN0ZWQgKTtcbiAgICBcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMgKS5wcm9wKCAnc2VsZWN0ZWQnLCBzZWxlY3RlZCApO1xuXG5cdFx0XHRcdGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciBtb250aCcgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5yZW1vdmVDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgeWVhcicgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gb25jZV92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcygnc21hbGxlcicgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoIHJhbmdlICk7XG4gICAgXHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkuZGF0YSggJ2ZyZXF1ZW5jeScsIGZyZXF1ZW5jeSApO1xuXG5cdFx0XHR9ICk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUZyZXF1ZW5jeVxuXG5cdFx0Y2hhbmdlQW1vdW50UHJldmlldzogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0ICAgIHZhciB5ZWFyX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ3llYXInKTtcblx0XHRcdCAgICB2YXIgb25jZV92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdvbmUtdGltZScpO1xuXHRcdFx0ICAgIHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuXG5cdFx0XHR9ICk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUFtb3VudFByZXZpZXdcblxuXHRcdHN0YXJ0TGV2ZWxDbGljazogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCcuc3RhcnQtbGV2ZWwnKS5jbGljayhmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGxldmVsX2NsYXNzID0gJCggdGhpcyApLnByb3AoICdjbGFzcycgKTtcblx0XHRcdFx0dmFyIGxldmVsX251bWJlciA9IGxldmVsX2NsYXNzW2xldmVsX2NsYXNzLmxlbmd0aCAtMV07XG5cdFx0XHQgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0ICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciwgZWxlbWVudCApLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0ICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciArICcgJyArIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHQgIH0pO1xuXHRcdH0sIC8vIGVuZCBzdGFydExldmVsQ2xpY2tcblxuXHRcdHN1Ym1pdEZvcm06IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0JCggZWxlbWVudCApLnN1Ym1pdCggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHR0aGF0LmFuYWx5dGljc0V2ZW50VHJhY2soICdldmVudCcsICdTdXBwb3J0IFVzJywgJ0JlY29tZSBBIE1lbWJlcicsIGxvY2F0aW9uLnBhdGhuYW1lICk7XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgc3VibWl0Rm9ybVxuXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblx0Ly8gQSByZWFsbHkgbGlnaHR3ZWlnaHQgcGx1Z2luIHdyYXBwZXIgYXJvdW5kIHRoZSBjb25zdHJ1Y3Rvcixcblx0Ly8gcHJldmVudGluZyBhZ2FpbnN0IG11bHRpcGxlIGluc3RhbnRpYXRpb25zXG5cdCQuZm5bcGx1Z2luTmFtZV0gPSBmdW5jdGlvbiAoIG9wdGlvbnMgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoICEgJC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lICkgKSB7XG5cdFx0XHRcdCQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSwgbmV3IFBsdWdpbiggdGhpcywgb3B0aW9ucyApICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG5cbn0pKCBqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQgKTtcbiJdfQ==
