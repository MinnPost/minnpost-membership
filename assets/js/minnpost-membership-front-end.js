'use strict';

(function ($) {

	function benefitForm() {
		if (2 === performance.navigation.type) {
			location.reload(true);
		}
		$('.a-benefit-button.a-button-disabled').removeAttr('disabled');
		$('.a-benefit-button').click(function (event) {
			event.preventDefault();
			var $button = $(this);
			var $status = $('.m-benefit-message', $(this).parent());
			var $select = $('select', $(this).parent());
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
					'instance_id': $('[name="instance-id-' + $button.val() + '"]').val(),
					'post_id': $button.val(),
					'is_ajax': '1'
				};
				$.post(settings.ajaxurl, data, function (response) {
					// success
					if (true === response.success) {
						//console.dir(response);
						$button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
						$status.html(response.data.message).addClass('m-benefit-message-visible ' + response.data.message_class);
						$('.a-benefit-button').not($button).val(response.data.button_value).attr('disabled', true);
					} else {
						// error
						//console.dir(response);
						if ('' !== response.data.button_label) {
							$button.show();
							$button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
						} else {
							$button.hide();
						}
						if (0 < response.data.remove_instance_value.length) {
							$('option', $select).each(function (i) {
								if ($(this).val() === response.data.remove_instance_value) {
									$(this).remove();
								}
							});
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

	$('.a-refresh-page').click(function (event) {
		event.preventDefault();
		location.reload();
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJlbmVmaXRzLmpzIiwibWVtYmVyLWxldmVscy5qcyJdLCJuYW1lcyI6WyIkIiwiYmVuZWZpdEZvcm0iLCJwZXJmb3JtYW5jZSIsIm5hdmlnYXRpb24iLCJ0eXBlIiwibG9jYXRpb24iLCJyZWxvYWQiLCJyZW1vdmVBdHRyIiwiY2xpY2siLCJldmVudCIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsIiRzdGF0dXMiLCJwYXJlbnQiLCIkc2VsZWN0Iiwic2V0dGluZ3MiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzIiwicmVtb3ZlQ2xhc3MiLCJ0ZXh0IiwiYWRkQ2xhc3MiLCJkYXRhIiwiYmVuZWZpdFR5cGUiLCJ2YWwiLCJwb3N0IiwiYWpheHVybCIsInJlc3BvbnNlIiwic3VjY2VzcyIsImJ1dHRvbl92YWx1ZSIsImJ1dHRvbl9sYWJlbCIsImJ1dHRvbl9jbGFzcyIsInByb3AiLCJidXR0b25fYXR0ciIsImh0bWwiLCJtZXNzYWdlIiwibWVzc2FnZV9jbGFzcyIsIm5vdCIsImF0dHIiLCJzaG93IiwiaGlkZSIsInJlbW92ZV9pbnN0YW5jZV92YWx1ZSIsImxlbmd0aCIsImVhY2giLCJpIiwicmVtb3ZlIiwiZG9jdW1lbnQiLCJyZWFkeSIsImpRdWVyeSIsIndpbmRvdyIsInVuZGVmaW5lZCIsInBsdWdpbk5hbWUiLCJkZWZhdWx0cyIsIlBsdWdpbiIsImVsZW1lbnQiLCJvcHRpb25zIiwiZXh0ZW5kIiwiX2RlZmF1bHRzIiwiX25hbWUiLCJpbml0IiwicHJvdG90eXBlIiwicmVzZXQiLCJhbW91bnQiLCJjYXRjaEhhc2hMaW5rcyIsImxldmVsRmxpcHBlciIsInN0YXJ0TGV2ZWxDbGljayIsInN1Ym1pdEZvcm0iLCJhbmFseXRpY3NFdmVudFRyYWNrIiwiY2F0ZWdvcnkiLCJhY3Rpb24iLCJsYWJlbCIsInZhbHVlIiwiZ2EiLCJlIiwidGFyZ2V0IiwicGF0aG5hbWUiLCJyZXBsYWNlIiwiaG9zdG5hbWUiLCJoYXNoIiwic2xpY2UiLCJhbmltYXRlIiwic2Nyb2xsVG9wIiwib2Zmc2V0IiwidG9wIiwidGhhdCIsInByZXZpb3VzX2Ftb3VudCIsImxldmVsIiwibGV2ZWxfbnVtYmVyIiwiZnJlcXVlbmN5X3N0cmluZyIsImZyZXF1ZW5jeSIsImZyZXF1ZW5jeV9uYW1lIiwibWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhIiwidXNlcl9jdXJyZW50X2xldmVsIiwiY3VycmVudF91c2VyIiwiYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUiLCJmcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSIsInNwbGl0IiwiY2hlY2tMZXZlbCIsInNob3dOZXdMZXZlbCIsImNoYW5nZSIsImJpbmQiLCJsZXZlbHNfY29udGFpbmVyIiwic2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IiLCJmbGlwcGVkX2l0ZW1zIiwid3JhcEFsbCIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJvbiIsInNpbmdsZV9sZXZlbF9jb250YWluZXIiLCJjbG9zZXN0IiwiYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsImFtb3VudF92aWV3ZXIiLCJjaGFuZ2VGcmVxdWVuY3kiLCJsZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciIsImNoYW5nZUFtb3VudFByZXZpZXciLCJjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsInRoaXN5ZWFyIiwicGFyc2VJbnQiLCJwcmlvcl95ZWFyX2Ftb3VudCIsInByaW9yX3llYXJfY29udHJpYnV0aW9ucyIsImNvbWluZ195ZWFyX2Ftb3VudCIsImNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMiLCJhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCIsIk1hdGgiLCJtYXgiLCJnZXRMZXZlbCIsIm1lbWJlcl9sZXZlbF9wcmVmaXgiLCJvbGRfbGV2ZWwiLCJsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yIiwibGV2ZWxfdmlld2VyX2NvbnRhaW5lciIsImRlY29kZUh0bWxFbnRpdHkiLCJzdHIiLCJtYXRjaCIsImRlYyIsIlN0cmluZyIsImZyb21DaGFyQ29kZSIsInRvTG93ZXJDYXNlIiwibWVtYmVyX2xldmVsIiwibGV2ZWxfbmFtZSIsInNlbGVjdGVkIiwicmFuZ2UiLCJtb250aF92YWx1ZSIsInllYXJfdmFsdWUiLCJvbmNlX3ZhbHVlIiwibGV2ZWxfY2xhc3MiLCJzdWJtaXQiLCJmbiJdLCJtYXBwaW5ncyI6Ijs7QUFBQSxDQUFFLFVBQVVBLENBQVYsRUFBYzs7QUFFZixVQUFTQyxXQUFULEdBQXVCO0FBQ3RCLE1BQUssTUFBTUMsWUFBWUMsVUFBWixDQUF1QkMsSUFBbEMsRUFBeUM7QUFDdENDLFlBQVNDLE1BQVQsQ0FBaUIsSUFBakI7QUFDRjtBQUNETixJQUFHLHFDQUFILEVBQTJDTyxVQUEzQyxDQUF1RCxVQUF2RDtBQUNBUCxJQUFHLG1CQUFILEVBQXlCUSxLQUF6QixDQUFnQyxVQUFVQyxLQUFWLEVBQWtCO0FBQ2pEQSxTQUFNQyxjQUFOO0FBQ0EsT0FBSUMsVUFBV1gsRUFBRyxJQUFILENBQWY7QUFDQSxPQUFJWSxVQUFXWixFQUFHLG9CQUFILEVBQXlCQSxFQUFHLElBQUgsRUFBVWEsTUFBVixFQUF6QixDQUFmO0FBQ0EsT0FBSUMsVUFBV2QsRUFBRyxRQUFILEVBQWFBLEVBQUcsSUFBSCxFQUFVYSxNQUFWLEVBQWIsQ0FBZjtBQUNBLE9BQUlFLFdBQVdDLDRCQUFmO0FBQ0E7QUFDQSxPQUFLLENBQUUsNEJBQVAsRUFBc0M7QUFDckNoQixNQUFHLG9CQUFILEVBQTBCaUIsV0FBMUIsQ0FBdUMsMEVBQXZDO0FBQ0E7QUFDRDtBQUNBTixXQUFRTyxJQUFSLENBQWMsWUFBZCxFQUE2QkMsUUFBN0IsQ0FBdUMsbUJBQXZDOztBQUVBO0FBQ0FuQixLQUFHLG1CQUFILEVBQXlCbUIsUUFBekIsQ0FBbUMsbUJBQW5DOztBQUVBO0FBQ0EsT0FBSUMsT0FBTyxFQUFYO0FBQ0EsT0FBSUMsY0FBY3JCLEVBQUcsNEJBQUgsRUFBa0NzQixHQUFsQyxFQUFsQjtBQUNBLE9BQUsscUJBQXFCRCxXQUExQixFQUF3QztBQUNwQ0QsV0FBTztBQUNILGVBQVcscUJBRFI7QUFFSCwrQ0FBMkNULFFBQVFTLElBQVIsQ0FBYyxlQUFkLENBRnhDO0FBR0gsb0JBQWdCcEIsRUFBRywyQkFBSCxFQUFnQ3NCLEdBQWhDLEVBSGI7QUFJSCxxQkFBZ0J0QixFQUFHLDRCQUFILEVBQWlDc0IsR0FBakMsRUFKYjtBQUtILG9CQUFnQnRCLEVBQUcsd0JBQXdCVyxRQUFRVyxHQUFSLEVBQXhCLEdBQXdDLElBQTNDLEVBQWtEQSxHQUFsRCxFQUxiO0FBTUgsZ0JBQVlYLFFBQVFXLEdBQVIsRUFOVDtBQU9ILGdCQUFZO0FBUFQsS0FBUDtBQVNBdEIsTUFBRXVCLElBQUYsQ0FBUVIsU0FBU1MsT0FBakIsRUFBMEJKLElBQTFCLEVBQWdDLFVBQVVLLFFBQVYsRUFBcUI7QUFDcEQ7QUFDQSxTQUFLLFNBQVNBLFNBQVNDLE9BQXZCLEVBQWlDO0FBQ2hDO0FBQ0FmLGNBQVFXLEdBQVIsQ0FBYUcsU0FBU0wsSUFBVCxDQUFjTyxZQUEzQixFQUEwQ1QsSUFBMUMsQ0FBZ0RPLFNBQVNMLElBQVQsQ0FBY1EsWUFBOUQsRUFBNkVYLFdBQTdFLENBQTBGLG1CQUExRixFQUFnSEUsUUFBaEgsQ0FBMEhNLFNBQVNMLElBQVQsQ0FBY1MsWUFBeEksRUFBdUpDLElBQXZKLENBQTZKTCxTQUFTTCxJQUFULENBQWNXLFdBQTNLLEVBQXdMLElBQXhMO0FBQ0FuQixjQUFRb0IsSUFBUixDQUFjUCxTQUFTTCxJQUFULENBQWNhLE9BQTVCLEVBQXNDZCxRQUF0QyxDQUFnRCwrQkFBK0JNLFNBQVNMLElBQVQsQ0FBY2MsYUFBN0Y7QUFDQWxDLFFBQUcsbUJBQUgsRUFBeUJtQyxHQUF6QixDQUE4QnhCLE9BQTlCLEVBQXdDVyxHQUF4QyxDQUE2Q0csU0FBU0wsSUFBVCxDQUFjTyxZQUEzRCxFQUEwRVMsSUFBMUUsQ0FBZ0YsVUFBaEYsRUFBNEYsSUFBNUY7QUFDQSxNQUxELE1BS087QUFDTjtBQUNBO0FBQ0EsVUFBSyxPQUFPWCxTQUFTTCxJQUFULENBQWNRLFlBQTFCLEVBQXlDO0FBQ3hDakIsZUFBUTBCLElBQVI7QUFDQTFCLGVBQVFXLEdBQVIsQ0FBYUcsU0FBU0wsSUFBVCxDQUFjTyxZQUEzQixFQUEwQ1QsSUFBMUMsQ0FBZ0RPLFNBQVNMLElBQVQsQ0FBY1EsWUFBOUQsRUFBNkVYLFdBQTdFLENBQTBGLG1CQUExRixFQUFnSEUsUUFBaEgsQ0FBMEhNLFNBQVNMLElBQVQsQ0FBY1MsWUFBeEksRUFBdUpDLElBQXZKLENBQTZKTCxTQUFTTCxJQUFULENBQWNXLFdBQTNLLEVBQXdMLElBQXhMO0FBQ0EsT0FIRCxNQUdPO0FBQ05wQixlQUFRMkIsSUFBUjtBQUNBO0FBQ0QsVUFBSyxJQUFJYixTQUFTTCxJQUFULENBQWNtQixxQkFBZCxDQUFvQ0MsTUFBN0MsRUFBc0Q7QUFDckR4QyxTQUFHLFFBQUgsRUFBYWMsT0FBYixFQUF1QjJCLElBQXZCLENBQTZCLFVBQVVDLENBQVYsRUFBYztBQUMxQyxZQUFLMUMsRUFBRyxJQUFILEVBQVVzQixHQUFWLE9BQW9CRyxTQUFTTCxJQUFULENBQWNtQixxQkFBdkMsRUFBK0Q7QUFDOUR2QyxXQUFHLElBQUgsRUFBVTJDLE1BQVY7QUFDQTtBQUVELFFBTEQ7QUFNQTtBQUNEO0FBQ0gzQyxRQUFHLG1CQUFILEVBQXlCbUMsR0FBekIsQ0FBOEJ4QixPQUE5QixFQUF3Q00sV0FBeEMsQ0FBcUQsbUJBQXJEO0FBQ0dMLGNBQVFvQixJQUFSLENBQWNQLFNBQVNMLElBQVQsQ0FBY2EsT0FBNUIsRUFBc0NkLFFBQXRDLENBQWdELCtCQUErQk0sU0FBU0wsSUFBVCxDQUFjYyxhQUE3RjtBQUNBO0FBRUosS0E3QkU7QUE4QkE7QUFDSixHQTVERDtBQTZEQTs7QUFFRGxDLEdBQUc0QyxRQUFILEVBQWNDLEtBQWQsQ0FBcUIsWUFBVztBQUMvQixNQUFLLElBQUk3QyxFQUFHLDRCQUFILEVBQWtDd0MsTUFBM0MsRUFBb0Q7QUFDbkR2QztBQUNBO0FBQ0QsRUFKRDs7QUFNQUQsR0FBRyxpQkFBSCxFQUF1QlEsS0FBdkIsQ0FBOEIsVUFBVUMsS0FBVixFQUFrQjtBQUMvQ0EsUUFBTUMsY0FBTjtBQUNBTCxXQUFTQyxNQUFUO0FBQ0EsRUFIRDtBQUtBLENBakZELEVBaUZLd0MsTUFqRkw7OztBQ0FBO0FBQ0EsQ0FBQyxDQUFDLFVBQVc5QyxDQUFYLEVBQWMrQyxNQUFkLEVBQXNCSCxRQUF0QixFQUFnQ0ksU0FBaEMsRUFBNEM7O0FBRTdDO0FBQ0EsS0FBSUMsYUFBYSxvQkFBakI7QUFBQSxLQUNBQyxXQUFXO0FBQ1YsV0FBVSxLQURBLEVBQ087QUFDakIsZ0NBQStCLHNCQUZyQjtBQUdWLG1DQUFrQywrQ0FIeEI7QUFJViw0QkFBMkIsZUFKakI7QUFLVixnQkFBZSxVQUxMO0FBTVYsd0JBQXVCLGtCQU5iO0FBT1Ysb0JBQW1CLGNBUFQ7QUFRVixtQkFBa0IsWUFSUjtBQVNWLGtDQUFpQyxtQ0FUdkI7QUFVVix1Q0FBc0MsUUFWNUI7QUFXVixzQkFBcUIsNkJBWFg7QUFZViw0QkFBMkIsNEJBWmpCO0FBYVYsbUNBQWtDLHVCQWJ4QjtBQWNWLG1CQUFrQix1QkFkUjtBQWVWLG1DQUFrQyxpQkFmeEI7QUFnQlYsc0NBQXFDLHdCQWhCM0I7QUFpQlYsK0JBQThCO0FBakJwQixFQURYLENBSDZDLENBc0IxQzs7QUFFSDtBQUNBLFVBQVNDLE1BQVQsQ0FBaUJDLE9BQWpCLEVBQTBCQyxPQUExQixFQUFvQzs7QUFFbkMsT0FBS0QsT0FBTCxHQUFlQSxPQUFmOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBS0MsT0FBTCxHQUFlckQsRUFBRXNELE1BQUYsQ0FBVSxFQUFWLEVBQWNKLFFBQWQsRUFBd0JHLE9BQXhCLENBQWY7O0FBRUEsT0FBS0UsU0FBTCxHQUFpQkwsUUFBakI7QUFDQSxPQUFLTSxLQUFMLEdBQWFQLFVBQWI7O0FBRUEsT0FBS1EsSUFBTDtBQUNBLEVBdkM0QyxDQXVDM0M7O0FBRUZOLFFBQU9PLFNBQVAsR0FBbUI7O0FBRWxCRCxRQUFNLGNBQVVFLEtBQVYsRUFBaUJDLE1BQWpCLEVBQTBCO0FBQy9CO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFFBQUtDLGNBQUwsQ0FBcUIsS0FBS1QsT0FBMUIsRUFBbUMsS0FBS0MsT0FBeEM7QUFDQSxRQUFLUyxZQUFMLENBQW1CLEtBQUtWLE9BQXhCLEVBQWlDLEtBQUtDLE9BQXRDO0FBQ0EsUUFBS1UsZUFBTCxDQUFzQixLQUFLWCxPQUEzQixFQUFvQyxLQUFLQyxPQUF6QztBQUNBLFFBQUtXLFVBQUwsQ0FBaUIsS0FBS1osT0FBdEIsRUFBK0IsS0FBS0MsT0FBcEM7QUFDQSxHQWJpQjs7QUFlbEJZLHVCQUFxQiw2QkFBVTdELElBQVYsRUFBZ0I4RCxRQUFoQixFQUEwQkMsTUFBMUIsRUFBa0NDLEtBQWxDLEVBQXlDQyxLQUF6QyxFQUFpRDtBQUNyRSxPQUFLLE9BQU9DLEVBQVAsS0FBYyxXQUFuQixFQUFpQztBQUNoQyxRQUFLLE9BQU9ELEtBQVAsS0FBaUIsV0FBdEIsRUFBb0M7QUFDbkNDLFFBQUksTUFBSixFQUFZbEUsSUFBWixFQUFrQjhELFFBQWxCLEVBQTRCQyxNQUE1QixFQUFvQ0MsS0FBcEM7QUFDQSxLQUZELE1BRU87QUFDTkUsUUFBSSxNQUFKLEVBQVlsRSxJQUFaLEVBQWtCOEQsUUFBbEIsRUFBNEJDLE1BQTVCLEVBQW9DQyxLQUFwQyxFQUEyQ0MsS0FBM0M7QUFDQTtBQUNELElBTkQsTUFNTztBQUNOO0FBQ0E7QUFDRCxHQXpCaUIsRUF5QmY7O0FBRUhSLGtCQUFnQix3QkFBVVQsT0FBVixFQUFtQkMsT0FBbkIsRUFBNkI7QUFDNUNyRCxLQUFFLDhCQUFGLEVBQWtDb0QsT0FBbEMsRUFBMkM1QyxLQUEzQyxDQUFpRCxVQUFTK0QsQ0FBVCxFQUFZO0FBQ3pELFFBQUlDLFNBQVN4RSxFQUFFdUUsRUFBRUMsTUFBSixDQUFiO0FBQ0EsUUFBSUEsT0FBTzNELE1BQVAsQ0FBYyxnQkFBZCxFQUFnQzJCLE1BQWhDLElBQTBDLENBQTFDLElBQStDbkMsU0FBU29FLFFBQVQsQ0FBa0JDLE9BQWxCLENBQTBCLEtBQTFCLEVBQWdDLEVBQWhDLEtBQXVDLEtBQUtELFFBQUwsQ0FBY0MsT0FBZCxDQUFzQixLQUF0QixFQUE0QixFQUE1QixDQUF0RixJQUF5SHJFLFNBQVNzRSxRQUFULElBQXFCLEtBQUtBLFFBQXZKLEVBQWlLO0FBQ2hLLFNBQUlILFNBQVN4RSxFQUFFLEtBQUs0RSxJQUFQLENBQWI7QUFDQUosY0FBU0EsT0FBT2hDLE1BQVAsR0FBZ0JnQyxNQUFoQixHQUF5QnhFLEVBQUUsV0FBVyxLQUFLNEUsSUFBTCxDQUFVQyxLQUFWLENBQWdCLENBQWhCLENBQVgsR0FBK0IsR0FBakMsQ0FBbEM7QUFDSCxTQUFJTCxPQUFPaEMsTUFBWCxFQUFtQjtBQUNsQnhDLFFBQUUsV0FBRixFQUFlOEUsT0FBZixDQUF1QjtBQUN0QkMsa0JBQVdQLE9BQU9RLE1BQVAsR0FBZ0JDO0FBREwsT0FBdkIsRUFFRyxJQUZIO0FBR0EsYUFBTyxLQUFQO0FBQ0E7QUFDRDtBQUNELElBWkQ7QUFhQSxHQXpDaUIsRUF5Q2Y7O0FBRUhuQixnQkFBYyxzQkFBVVYsT0FBVixFQUFtQkMsT0FBbkIsRUFBNkI7QUFDMUMsT0FBSTZCLE9BQU8sSUFBWDtBQUNBLE9BQUlDLGtCQUFrQixFQUF0QjtBQUNBLE9BQUl2QixTQUFTLENBQWI7QUFDQSxPQUFJd0IsUUFBUSxFQUFaO0FBQ0EsT0FBSUMsZUFBZSxDQUFuQjtBQUNBLE9BQUlDLG1CQUFtQixFQUF2QjtBQUNBLE9BQUlDLFlBQVksRUFBaEI7QUFDQSxPQUFJQyxpQkFBaUIsRUFBckI7QUFDQSxPQUFLLE9BQU9DLHdCQUFQLEtBQW9DLFdBQXBDLElBQW1EekYsRUFBR3FELFFBQVFxQyxrQkFBWCxFQUFnQ2xELE1BQWhDLEdBQXlDLENBQWpHLEVBQXFHO0FBQ3BHMkMsc0JBQWtCTSx5QkFBeUJFLFlBQXpCLENBQXNDUixlQUF4RDtBQUNBO0FBQ0QsT0FBS25GLEVBQUdxRCxRQUFRdUMsMEJBQVgsRUFBd0NwRCxNQUF4QyxHQUFpRCxDQUF0RCxFQUEwRDtBQUN6RG9CLGFBQVM1RCxFQUFHcUQsUUFBUXVDLDBCQUFYLEVBQXdDdEUsR0FBeEMsRUFBVDtBQUNBZ0UsdUJBQW1CdEYsRUFBRXFELFFBQVF3Qyw2QkFBUixHQUF3QyxVQUExQyxFQUFzRHZFLEdBQXRELEVBQW5CO0FBQ0FpRSxnQkFBWUQsaUJBQWlCUSxLQUFqQixDQUF1QixLQUF2QixFQUE4QixDQUE5QixDQUFaO0FBQ0FOLHFCQUFpQkYsaUJBQWlCUSxLQUFqQixDQUF1QixLQUF2QixFQUE4QixDQUE5QixDQUFqQjs7QUFFR1YsWUFBUUYsS0FBS2EsVUFBTCxDQUFpQm5DLE1BQWpCLEVBQXlCMkIsU0FBekIsRUFBb0NDLGNBQXBDLEVBQW9ETCxlQUFwRCxFQUFxRS9CLE9BQXJFLEVBQThFQyxPQUE5RSxDQUFSO0FBQ0E2QixTQUFLYyxZQUFMLENBQW1CNUMsT0FBbkIsRUFBNEJDLE9BQTVCLEVBQXFDK0IsS0FBckM7O0FBRUFwRixNQUFFcUQsUUFBUXdDLDZCQUFWLEVBQXlDSSxNQUF6QyxDQUFpRCxZQUFXOztBQUUzRFgsd0JBQW1CdEYsRUFBR3FELFFBQVF3Qyw2QkFBUixHQUF3QyxVQUEzQyxFQUF1RHZFLEdBQXZELEVBQW5CO0FBQ0hpRSxpQkFBWUQsaUJBQWlCUSxLQUFqQixDQUF1QixLQUF2QixFQUE4QixDQUE5QixDQUFaO0FBQ0FOLHNCQUFpQkYsaUJBQWlCUSxLQUFqQixDQUF1QixLQUF2QixFQUE4QixDQUE5QixDQUFqQjs7QUFFSVYsYUFBUUYsS0FBS2EsVUFBTCxDQUFpQi9GLEVBQUdxRCxRQUFRdUMsMEJBQVgsRUFBd0N0RSxHQUF4QyxFQUFqQixFQUFnRXRCLEVBQUdxRCxRQUFRd0MsNkJBQVIsR0FBd0MsVUFBM0MsRUFBd0R6RCxJQUF4RCxDQUE4RCxxQkFBOUQsQ0FBaEUsRUFBdUpvRCxjQUF2SixFQUF1S0wsZUFBdkssRUFBd0wvQixPQUF4TCxFQUFpTUMsT0FBak0sQ0FBUjtBQUNBNkIsVUFBS2MsWUFBTCxDQUFtQjVDLE9BQW5CLEVBQTRCQyxPQUE1QixFQUFxQytCLEtBQXJDO0FBQ0QsS0FSRDs7QUFVQXBGLE1BQUVxRCxRQUFRdUMsMEJBQVYsRUFBc0NNLElBQXRDLENBQTJDLGVBQTNDLEVBQTRELFlBQVc7QUFDdEVaLHdCQUFtQnRGLEVBQUdxRCxRQUFRd0MsNkJBQVIsR0FBd0MsVUFBM0MsRUFBdUR2RSxHQUF2RCxFQUFuQjtBQUNIaUUsaUJBQVlELGlCQUFpQlEsS0FBakIsQ0FBdUIsS0FBdkIsRUFBOEIsQ0FBOUIsQ0FBWjtBQUNBTixzQkFBaUJGLGlCQUFpQlEsS0FBakIsQ0FBdUIsS0FBdkIsRUFBOEIsQ0FBOUIsQ0FBakI7QUFDSSxTQUFHOUYsRUFBRSxJQUFGLEVBQVFvQixJQUFSLENBQWEsWUFBYixLQUE4QnBCLEVBQUUsSUFBRixFQUFRc0IsR0FBUixFQUFqQyxFQUFnRDtBQUM5Q3RCLFFBQUUsSUFBRixFQUFRb0IsSUFBUixDQUFhLFlBQWIsRUFBMkJwQixFQUFFLElBQUYsRUFBUXNCLEdBQVIsRUFBM0I7QUFDQThELGNBQVFGLEtBQUthLFVBQUwsQ0FBaUIvRixFQUFHcUQsUUFBUXVDLDBCQUFYLEVBQXdDdEUsR0FBeEMsRUFBakIsRUFBZ0V0QixFQUFHcUQsUUFBUXdDLDZCQUFSLEdBQXdDLFVBQTNDLEVBQXdEekQsSUFBeEQsQ0FBOEQscUJBQTlELENBQWhFLEVBQXVKb0QsY0FBdkosRUFBdUtMLGVBQXZLLEVBQXdML0IsT0FBeEwsRUFBaU1DLE9BQWpNLENBQVI7QUFDQTZCLFdBQUtjLFlBQUwsQ0FBbUI1QyxPQUFuQixFQUE0QkMsT0FBNUIsRUFBcUMrQixLQUFyQztBQUNEO0FBQ0YsS0FURDtBQVdIO0FBQ0QsT0FBS3BGLEVBQUdxRCxRQUFROEMsZ0JBQVgsRUFBOEIzRCxNQUE5QixHQUF1QyxDQUE1QyxFQUFnRDtBQUMvQ3hDLE1BQUdxRCxRQUFRK0MsNkJBQVgsRUFBMENoRCxPQUExQyxFQUFvRFgsSUFBcEQsQ0FBeUQsWUFBVztBQUNuRXpDLE9BQUdxRCxRQUFRZ0QsYUFBWCxFQUEwQnJHLEVBQUUsSUFBRixDQUExQixFQUFvQ3NHLE9BQXBDLENBQTZDLHdCQUE3QztBQUNBLEtBRkQ7QUFHQXRHLE1BQUdxRCxRQUFRa0QsNEJBQVgsRUFBeUNuRCxPQUF6QyxFQUFtRG9ELEVBQW5ELENBQXNELFFBQXRELEVBQWdFLFVBQVUvRixLQUFWLEVBQWlCO0FBQ2hGNEUsb0JBQWVyRixFQUFFLElBQUYsRUFBUW9CLElBQVIsQ0FBYSxxQkFBYixDQUFmO0FBQ0FrRSx3QkFBbUJ0RixFQUFFLElBQUYsRUFBUXNCLEdBQVIsRUFBbkI7QUFDQWlFLGlCQUFZRCxpQkFBaUJRLEtBQWpCLENBQXVCLEtBQXZCLEVBQThCLENBQTlCLENBQVo7QUFDQU4sc0JBQWlCRixpQkFBaUJRLEtBQWpCLENBQXVCLEtBQXZCLEVBQThCLENBQTlCLENBQWpCO0FBQ0csU0FBSyxPQUFPVCxZQUFQLEtBQXdCLFdBQTdCLEVBQTJDOztBQUU3Q3JGLFFBQUdxRCxRQUFRK0MsNkJBQVgsRUFBMENoRCxPQUExQyxFQUFtRG5DLFdBQW5ELENBQWdFLFNBQWhFO0FBQ0FqQixRQUFHcUQsUUFBUW9ELHNCQUFYLEVBQW1DckQsT0FBbkMsRUFBNENuQyxXQUE1QyxDQUF5RCxRQUF6RDtBQUNBakIsUUFBR1MsTUFBTStELE1BQVQsRUFBa0JrQyxPQUFsQixDQUEyQnJELFFBQVErQyw2QkFBbkMsRUFBbUVqRixRQUFuRSxDQUE2RSxTQUE3RTs7QUFFQSxVQUFLb0UsYUFBYSxDQUFsQixFQUFzQjtBQUNyQnZGLFNBQUdxRCxRQUFRc0QseUJBQVgsRUFBc0MzRyxFQUFHcUQsUUFBUW9ELHNCQUFSLEdBQWlDLEdBQWpDLEdBQXVDcEIsWUFBMUMsQ0FBdEMsRUFBaUcvRCxHQUFqRyxDQUFzR3RCLEVBQUdxRCxRQUFRdUQsYUFBWCxFQUEwQjVHLEVBQUdxRCxRQUFRb0Qsc0JBQVIsR0FBaUMsR0FBakMsR0FBdUNwQixZQUExQyxDQUExQixFQUFxRmpFLElBQXJGLENBQTBGLGdCQUExRixDQUF0RztBQUNBLE9BRkQsTUFFTyxJQUFLbUUsYUFBYSxFQUFsQixFQUF1QjtBQUM3QnZGLFNBQUdxRCxRQUFRc0QseUJBQVgsRUFBc0MzRyxFQUFHcUQsUUFBUW9ELHNCQUFSLEdBQWlDLEdBQWpDLEdBQXVDcEIsWUFBMUMsQ0FBdEMsRUFBaUcvRCxHQUFqRyxDQUFzR3RCLEVBQUdxRCxRQUFRdUQsYUFBWCxFQUEwQjVHLEVBQUdxRCxRQUFRb0Qsc0JBQVIsR0FBaUMsR0FBakMsR0FBdUNwQixZQUExQyxDQUExQixFQUFxRmpFLElBQXJGLENBQTBGLGlCQUExRixDQUF0RztBQUNBOztBQUVEd0MsZUFBUzVELEVBQUdxRCxRQUFRc0QseUJBQVIsR0FBb0MsNkJBQXBDLEdBQW9FdEIsWUFBcEUsR0FBbUYsSUFBdEYsRUFBNEYvRCxHQUE1RixFQUFUOztBQUVBOEQsY0FBUUYsS0FBS2EsVUFBTCxDQUFpQm5DLE1BQWpCLEVBQXlCMkIsU0FBekIsRUFBb0NDLGNBQXBDLEVBQW9ETCxlQUFwRCxFQUFxRS9CLE9BQXJFLEVBQThFQyxPQUE5RSxDQUFSO0FBQ0E2QixXQUFLMkIsZUFBTCxDQUFzQnZCLGdCQUF0QixFQUF3Q0YsTUFBTSxNQUFOLENBQXhDLEVBQXVEaEMsT0FBdkQsRUFBZ0VDLE9BQWhFO0FBRUEsTUFqQkUsTUFpQkksSUFBS3JELEVBQUdxRCxRQUFReUQsNkJBQVgsRUFBMkN0RSxNQUEzQyxHQUFvRCxDQUF6RCxFQUE2RDtBQUNuRXhDLFFBQUVxRCxRQUFReUQsNkJBQVYsRUFBeUMxRCxPQUF6QyxFQUFrRGxDLElBQWxELENBQXVEc0UsY0FBdkQ7QUFDQXhGLFFBQUdxRCxRQUFRb0Qsc0JBQVgsRUFBb0NoRSxJQUFwQyxDQUEwQyxZQUFXO0FBQ3BENEMsc0JBQWVyRixFQUFFcUQsUUFBUXNELHlCQUFWLEVBQXFDM0csRUFBRSxJQUFGLENBQXJDLEVBQThDb0IsSUFBOUMsQ0FBbUQscUJBQW5ELENBQWY7QUFDQSxXQUFLLE9BQU9pRSxZQUFQLEtBQXdCLFdBQTdCLEVBQTJDO0FBQzFDekIsaUJBQVM1RCxFQUFHcUQsUUFBUXNELHlCQUFYLEVBQXNDM0csRUFBRSxJQUFGLENBQXRDLEVBQWdEc0IsR0FBaEQsRUFBVDtBQUNBOEQsZ0JBQVFGLEtBQUthLFVBQUwsQ0FBaUJuQyxNQUFqQixFQUF5QjJCLFNBQXpCLEVBQW9DQyxjQUFwQyxFQUFvREwsZUFBcEQsRUFBcUUvQixPQUFyRSxFQUE4RUMsT0FBOUUsQ0FBUjtBQUNBO0FBQ0QsT0FORDtBQU9BOztBQUVENkIsVUFBSzZCLG1CQUFMLENBQTBCekIsZ0JBQTFCLEVBQTRDRixNQUFNLE1BQU4sQ0FBNUMsRUFBMkRoQyxPQUEzRCxFQUFvRUMsT0FBcEU7QUFFQSxLQW5DRDtBQW9DQTtBQUNELE9BQUtyRCxFQUFHcUQsUUFBUTJELGdDQUFYLEVBQThDeEUsTUFBOUMsR0FBdUQsQ0FBNUQsRUFBZ0U7QUFDL0R4QyxNQUFHcUQsUUFBUTJELGdDQUFYLEVBQTZDNUQsT0FBN0MsRUFBdUQ1QyxLQUF2RCxDQUE4RCxVQUFVQyxLQUFWLEVBQWtCO0FBQy9FNEUsb0JBQWVyRixFQUFHcUQsUUFBUWtELDRCQUFYLEVBQXlDbkQsT0FBekMsRUFBbURoQyxJQUFuRCxDQUF3RCxxQkFBeEQsQ0FBZjtBQUNBcEIsT0FBR3FELFFBQVErQyw2QkFBWCxFQUEwQ2hELE9BQTFDLEVBQW1EbkMsV0FBbkQsQ0FBZ0UsU0FBaEU7QUFDQWpCLE9BQUdxRCxRQUFRb0Qsc0JBQVgsRUFBbUNyRCxPQUFuQyxFQUE0Q25DLFdBQTVDLENBQXlELFFBQXpEO0FBQ0FqQixPQUFHUyxNQUFNK0QsTUFBVCxFQUFrQmtDLE9BQWxCLENBQTJCckQsUUFBUStDLDZCQUFuQyxFQUFtRWpGLFFBQW5FLENBQTZFLFNBQTdFO0FBQ0FtRSx3QkFBbUJ0RixFQUFFcUQsUUFBUWtELDRCQUFWLEVBQXdDdkcsRUFBRSxJQUFGLEVBQVFhLE1BQVIsRUFBeEMsRUFBMkRTLEdBQTNELEVBQW5CO0FBQ0FpRSxpQkFBWUQsaUJBQWlCUSxLQUFqQixDQUF1QixLQUF2QixFQUE4QixDQUE5QixDQUFaO0FBQ0FsQyxjQUFTNUQsRUFBR3FELFFBQVFzRCx5QkFBUixHQUFvQyw2QkFBcEMsR0FBb0V0QixZQUFwRSxHQUFtRixJQUF0RixFQUE0Ri9ELEdBQTVGLEVBQVQ7QUFDQThELGFBQVFGLEtBQUthLFVBQUwsQ0FBaUJuQyxNQUFqQixFQUF5QjJCLFNBQXpCLEVBQW9DQyxjQUFwQyxFQUFvREwsZUFBcEQsRUFBcUUvQixPQUFyRSxFQUE4RUMsT0FBOUUsQ0FBUjtBQUNBNUMsV0FBTUMsY0FBTjtBQUNBLEtBVkQ7QUFXQTtBQUNELEdBNUlpQixFQTRJZjs7QUFFSHFGLGNBQVksb0JBQVVuQyxNQUFWLEVBQWtCMkIsU0FBbEIsRUFBNkJuRixJQUE3QixFQUFtQytFLGVBQW5DLEVBQW9EL0IsT0FBcEQsRUFBNkRDLE9BQTdELEVBQXVFO0FBQ2pGLE9BQUk0RCxXQUFXQyxTQUFVdEQsTUFBVixJQUFxQnNELFNBQVUzQixTQUFWLENBQXBDO0FBQ0EsT0FBSUgsUUFBUSxFQUFaO0FBQ0EsT0FBSyxPQUFPRCxlQUFQLEtBQTJCLFdBQTNCLElBQTBDQSxvQkFBb0IsRUFBbkUsRUFBd0U7QUFDdEUsUUFBSWdDLG9CQUFvQkQsU0FBVS9CLGdCQUFnQmlDLHdCQUExQixDQUF4QjtBQUNBLFFBQUlDLHFCQUFxQkgsU0FBVS9CLGdCQUFnQm1DLHlCQUExQixDQUF6QjtBQUNBLFFBQUlDLDBCQUEwQkwsU0FBVS9CLGdCQUFnQm9DLHVCQUExQixDQUE5QjtBQUNBO0FBQ0EsUUFBS25ILFNBQVMsVUFBZCxFQUEyQjtBQUN6QitHLDBCQUFxQkYsUUFBckI7QUFDRCxLQUZELE1BRU87QUFDTE0sZ0NBQTJCTixRQUEzQjtBQUNEOztBQUVEQSxlQUFXTyxLQUFLQyxHQUFMLENBQVVOLGlCQUFWLEVBQTZCRSxrQkFBN0IsRUFBaURFLHVCQUFqRCxDQUFYO0FBQ0Q7O0FBRURuQyxXQUFRLEtBQUtzQyxRQUFMLENBQWVULFFBQWYsQ0FBUjs7QUFFQWpILEtBQUUsSUFBRixFQUFRcUQsUUFBUStDLDZCQUFoQixFQUErQzNELElBQS9DLENBQXFELFlBQVc7QUFDOUQsUUFBS3pDLEVBQUUsSUFBRixFQUFRa0IsSUFBUixNQUFrQmtFLE1BQU0sTUFBTixDQUF2QixFQUF1QztBQUNyQ3BGLE9BQUdxRCxRQUFRb0Qsc0JBQVgsRUFBbUNyRCxPQUFuQyxFQUE0Q25DLFdBQTVDLENBQXlELFFBQXpEO0FBQ0FqQixPQUFFLElBQUYsRUFBUWEsTUFBUixHQUFpQkEsTUFBakIsR0FBMEJNLFFBQTFCLENBQW9DLFFBQXBDO0FBQ0Q7QUFDRixJQUxEO0FBTUEsVUFBT2lFLEtBQVA7QUFFRCxHQXpLaUIsRUF5S2Y7O0FBRUhzQyxZQUFVLGtCQUFVVCxRQUFWLEVBQXFCO0FBQzlCLE9BQUk3QixRQUFRLEVBQVo7QUFDQSxPQUFLNkIsV0FBVyxDQUFYLElBQWdCQSxXQUFXLEVBQWhDLEVBQXFDO0FBQ3BDN0IsVUFBTSxNQUFOLElBQWdCLFFBQWhCO0FBQ0FBLFVBQU0sUUFBTixJQUFrQixDQUFsQjtBQUNBLElBSEQsTUFJSyxJQUFJNkIsV0FBVyxFQUFYLElBQWlCQSxXQUFXLEdBQWhDLEVBQXFDO0FBQ3pDN0IsVUFBTSxNQUFOLElBQWdCLFFBQWhCO0FBQ0FBLFVBQU0sUUFBTixJQUFrQixDQUFsQjtBQUNBLElBSEksTUFHRSxJQUFJNkIsV0FBVyxHQUFYLElBQWtCQSxXQUFXLEdBQWpDLEVBQXNDO0FBQzVDN0IsVUFBTSxNQUFOLElBQWdCLE1BQWhCO0FBQ0FBLFVBQU0sUUFBTixJQUFrQixDQUFsQjtBQUNBLElBSE0sTUFHQSxJQUFJNkIsV0FBVyxHQUFmLEVBQW9CO0FBQzFCN0IsVUFBTSxNQUFOLElBQWdCLFVBQWhCO0FBQ0FBLFVBQU0sUUFBTixJQUFrQixDQUFsQjtBQUNBO0FBQ0QsVUFBT0EsS0FBUDtBQUNBLEdBNUxpQixFQTRMZjs7QUFFSFksZ0JBQWMsc0JBQVU1QyxPQUFWLEVBQW1CQyxPQUFuQixFQUE0QitCLEtBQTVCLEVBQW9DO0FBQ2pELE9BQUl1QyxzQkFBc0IsRUFBMUI7QUFDQSxPQUFJQyxZQUFZLEVBQWhCO0FBQ0EsT0FBSUMsa0NBQWtDeEUsUUFBUXlFLHNCQUE5QyxDQUhpRCxDQUdxQjtBQUN0RSxPQUFJQyxtQkFBbUIsU0FBbkJBLGdCQUFtQixDQUFVQyxHQUFWLEVBQWdCO0FBQ3RDLFdBQU9BLElBQUl0RCxPQUFKLENBQWEsV0FBYixFQUEwQixVQUFVdUQsS0FBVixFQUFpQkMsR0FBakIsRUFBdUI7QUFDdkQsWUFBT0MsT0FBT0MsWUFBUCxDQUFxQkYsR0FBckIsQ0FBUDtBQUNBLEtBRk0sQ0FBUDtBQUdBLElBSkQ7QUFLQSxPQUFLLE9BQU96Qyx3QkFBUCxLQUFvQyxXQUF6QyxFQUF1RDtBQUN0RGtDLDBCQUFzQmxDLHlCQUF5QmtDLG1CQUEvQztBQUNBOztBQUVEM0gsS0FBRXFELFFBQVF5RSxzQkFBVixFQUFrQ2hHLElBQWxDLENBQXdDLE9BQXhDLEVBQWlELCtCQUErQnNELE1BQU0sTUFBTixFQUFjaUQsV0FBZCxFQUFoRjs7QUFFQSxPQUFLckksRUFBR3FELFFBQVFxQyxrQkFBWCxFQUFnQ2xELE1BQWhDLEdBQXlDLENBQXpDLElBQThDaUQseUJBQXlCRSxZQUF6QixDQUFzQzJDLFlBQXRDLENBQW1EOUYsTUFBbkQsR0FBNEQsQ0FBL0csRUFBbUg7O0FBRWxILFFBQUssS0FBS3hDLEVBQUdxRCxRQUFReUUsc0JBQVgsRUFBb0N0RixNQUFwQyxHQUE2QyxDQUF2RCxFQUEyRDtBQUMxRHFGLHVDQUFrQ3hFLFFBQVF5RSxzQkFBUixHQUFpQyxJQUFuRTtBQUNBOztBQUVERixnQkFBWW5DLHlCQUF5QkUsWUFBekIsQ0FBc0MyQyxZQUF0QyxDQUFtRDVELE9BQW5ELENBQTREaUQsbUJBQTVELEVBQWlGLEVBQWpGLENBQVo7O0FBRUEsUUFBS0MsY0FBY3hDLE1BQU0sTUFBTixFQUFjaUQsV0FBZCxFQUFuQixFQUFpRDtBQUNoRHJJLE9BQUc2SCwrQkFBSCxFQUFxQzdGLElBQXJDLENBQTJDK0YsaUJBQWtCL0gsRUFBR3FELFFBQVF5RSxzQkFBWCxFQUFvQzFHLElBQXBDLENBQTBDLFNBQTFDLENBQWxCLENBQTNDO0FBQ0EsS0FGRCxNQUVPO0FBQ05wQixPQUFHNkgsK0JBQUgsRUFBcUM3RixJQUFyQyxDQUEyQytGLGlCQUFrQi9ILEVBQUdxRCxRQUFReUUsc0JBQVgsRUFBb0MxRyxJQUFwQyxDQUEwQyxhQUExQyxDQUFsQixDQUEzQztBQUNBO0FBQ0Q7O0FBRURwQixLQUFFcUQsUUFBUWtGLFVBQVYsRUFBc0JsRixRQUFReUUsc0JBQTlCLEVBQXNENUcsSUFBdEQsQ0FBNERrRSxNQUFNLE1BQU4sQ0FBNUQ7QUFFQSxHQTlOaUIsRUE4TmY7O0FBRUh5QixtQkFBaUIseUJBQVUyQixRQUFWLEVBQW9CcEQsS0FBcEIsRUFBMkJoQyxPQUEzQixFQUFvQ0MsT0FBcEMsRUFBOEM7QUFDOURyRCxLQUFHcUQsUUFBUStDLDZCQUFYLEVBQTJDM0QsSUFBM0MsQ0FBaUQsWUFBVztBQUMzRCxRQUFJZ0csUUFBaUJ6SSxFQUFHcUQsUUFBUXVELGFBQVgsRUFBMEI1RyxFQUFFLElBQUYsQ0FBMUIsRUFBb0NrQixJQUFwQyxFQUFyQjtBQUNBLFFBQUl3SCxjQUFpQjFJLEVBQUdxRCxRQUFRdUQsYUFBWCxFQUEwQjVHLEVBQUUsSUFBRixDQUExQixFQUFvQ29CLElBQXBDLENBQXlDLE9BQXpDLENBQXJCO0FBQ0csUUFBSXVILGFBQWlCM0ksRUFBR3FELFFBQVF1RCxhQUFYLEVBQTBCNUcsRUFBRSxJQUFGLENBQTFCLEVBQW9Db0IsSUFBcEMsQ0FBeUMsTUFBekMsQ0FBckI7QUFDQSxRQUFJd0gsYUFBaUI1SSxFQUFHcUQsUUFBUXVELGFBQVgsRUFBMEI1RyxFQUFFLElBQUYsQ0FBMUIsRUFBb0NvQixJQUFwQyxDQUF5QyxVQUF6QyxDQUFyQjtBQUNBLFFBQUlvRSxpQkFBaUJnRCxTQUFTMUMsS0FBVCxDQUFlLEtBQWYsRUFBc0IsQ0FBdEIsQ0FBckI7QUFDQSxRQUFJUCxZQUFpQjJCLFNBQVVzQixTQUFTMUMsS0FBVCxDQUFlLEtBQWYsRUFBc0IsQ0FBdEIsQ0FBVixDQUFyQjs7QUFFQTlGLE1BQUdxRCxRQUFRa0QsNEJBQVgsRUFBMENqRixHQUExQyxDQUErQ2tILFFBQS9DO0FBQ0F4SSxNQUFHcUQsUUFBUWtELDRCQUFYLEVBQTBDekUsSUFBMUMsQ0FBZ0QsVUFBaEQsRUFBNEQwRyxRQUE1RDs7QUFFSCxRQUFLaEQsa0JBQWtCLFdBQXZCLEVBQXFDO0FBQ3BDaUQsYUFBUUMsV0FBUjtBQUNBMUksT0FBR3FELFFBQVF1RCxhQUFYLEVBQTBCNUcsRUFBRSxJQUFGLENBQTFCLEVBQW9DaUIsV0FBcEMsQ0FBaUQsU0FBakQ7QUFDQSxLQUhELE1BR08sSUFBS3VFLGtCQUFrQixVQUF2QixFQUFvQztBQUMxQ2lELGFBQVFFLFVBQVI7QUFDQTNJLE9BQUdxRCxRQUFRdUQsYUFBWCxFQUEwQjVHLEVBQUUsSUFBRixDQUExQixFQUFvQ21CLFFBQXBDLENBQThDLFNBQTlDO0FBQ0EsS0FITSxNQUdBLElBQUlxRSxrQkFBa0IsVUFBdEIsRUFBbUM7QUFDekNpRCxhQUFRRyxVQUFSO0FBQ0E1SSxPQUFHcUQsUUFBUXVELGFBQVgsRUFBMEI1RyxFQUFFLElBQUYsQ0FBMUIsRUFBb0NtQixRQUFwQyxDQUE2QyxTQUE3QztBQUNBOztBQUVEbkIsTUFBR3FELFFBQVF1RCxhQUFYLEVBQTBCNUcsRUFBRSxJQUFGLENBQTFCLEVBQW9Da0IsSUFBcEMsQ0FBMEN1SCxLQUExQztBQUNHekksTUFBR3FELFFBQVFrRCw0QkFBWCxFQUF5Q3ZHLEVBQUUsSUFBRixDQUF6QyxFQUFtRG9CLElBQW5ELENBQXlELFdBQXpELEVBQXNFbUUsU0FBdEU7QUFFSCxJQXpCRDtBQTBCQSxHQTNQaUIsRUEyUGY7O0FBRUh3Qix1QkFBcUIsNkJBQVV5QixRQUFWLEVBQW9CcEQsS0FBcEIsRUFBMkJoQyxPQUEzQixFQUFvQ0MsT0FBcEMsRUFBOEM7QUFDbEVyRCxLQUFHcUQsUUFBUStDLDZCQUFYLEVBQTJDM0QsSUFBM0MsQ0FBaUQsWUFBVztBQUMzRCxRQUFJZ0csUUFBaUJ6SSxFQUFHcUQsUUFBUXVELGFBQVgsRUFBMEI1RyxFQUFFLElBQUYsQ0FBMUIsRUFBb0NrQixJQUFwQyxFQUFyQjtBQUNBLFFBQUl3SCxjQUFpQjFJLEVBQUdxRCxRQUFRdUQsYUFBWCxFQUEwQjVHLEVBQUUsSUFBRixDQUExQixFQUFvQ29CLElBQXBDLENBQXlDLE9BQXpDLENBQXJCO0FBQ0csUUFBSXVILGFBQWlCM0ksRUFBR3FELFFBQVF1RCxhQUFYLEVBQTBCNUcsRUFBRSxJQUFGLENBQTFCLEVBQW9Db0IsSUFBcEMsQ0FBeUMsTUFBekMsQ0FBckI7QUFDQSxRQUFJd0gsYUFBaUI1SSxFQUFHcUQsUUFBUXVELGFBQVgsRUFBMEI1RyxFQUFFLElBQUYsQ0FBMUIsRUFBb0NvQixJQUFwQyxDQUF5QyxVQUF6QyxDQUFyQjtBQUNBLFFBQUlvRSxpQkFBaUJnRCxTQUFTMUMsS0FBVCxDQUFlLEtBQWYsRUFBc0IsQ0FBdEIsQ0FBckI7O0FBRUgsUUFBS04sa0JBQWtCLFdBQXZCLEVBQXFDO0FBQ3BDaUQsYUFBUUMsV0FBUjtBQUNBMUksT0FBR3FELFFBQVF1RCxhQUFYLEVBQTBCNUcsRUFBRSxJQUFGLENBQTFCLEVBQW9DaUIsV0FBcEMsQ0FBaUQsU0FBakQ7QUFDQSxLQUhELE1BR08sSUFBS3VFLGtCQUFrQixVQUF2QixFQUFvQztBQUMxQ2lELGFBQVFFLFVBQVI7QUFDQTNJLE9BQUdxRCxRQUFRdUQsYUFBWCxFQUEwQjVHLEVBQUUsSUFBRixDQUExQixFQUFvQ21CLFFBQXBDLENBQThDLFNBQTlDO0FBQ0EsS0FITSxNQUdBLElBQUlxRSxrQkFBa0IsVUFBdEIsRUFBbUM7QUFDekNpRCxhQUFRRyxVQUFSO0FBQ0E1SSxPQUFHcUQsUUFBUXVELGFBQVgsRUFBMEI1RyxFQUFFLElBQUYsQ0FBMUIsRUFBb0NtQixRQUFwQyxDQUE2QyxTQUE3QztBQUNBOztBQUVEbkIsTUFBR3FELFFBQVF1RCxhQUFYLEVBQTBCNUcsRUFBRSxJQUFGLENBQTFCLEVBQW9Da0IsSUFBcEMsQ0FBMEN1SCxLQUExQztBQUVBLElBcEJEO0FBcUJBLEdBblJpQixFQW1SZjs7QUFFSDFFLG1CQUFpQix5QkFBVVgsT0FBVixFQUFtQkMsT0FBbkIsRUFBNkI7QUFDN0NyRCxLQUFFLGNBQUYsRUFBa0JRLEtBQWxCLENBQXdCLFlBQVc7QUFDbEMsUUFBSXFJLGNBQWM3SSxFQUFHLElBQUgsRUFBVThCLElBQVYsQ0FBZ0IsT0FBaEIsQ0FBbEI7QUFDQSxRQUFJdUQsZUFBZXdELFlBQVlBLFlBQVlyRyxNQUFaLEdBQW9CLENBQWhDLENBQW5CO0FBQ0d4QyxNQUFHcUQsUUFBUStDLDZCQUFYLEVBQTBDaEQsT0FBMUMsRUFBbURuQyxXQUFuRCxDQUFnRSxTQUFoRTtBQUNIakIsTUFBR3FELFFBQVFvRCxzQkFBWCxFQUFtQ3JELE9BQW5DLEVBQTRDbkMsV0FBNUMsQ0FBeUQsUUFBekQ7QUFDR2pCLE1BQUdxRCxRQUFRb0Qsc0JBQVIsR0FBaUMsR0FBakMsR0FBdUNwQixZQUExQyxFQUF3RGpDLE9BQXhELEVBQWtFakMsUUFBbEUsQ0FBNEUsUUFBNUU7QUFDQW5CLE1BQUdxRCxRQUFRb0Qsc0JBQVIsR0FBaUMsR0FBakMsR0FBdUNwQixZQUF2QyxHQUFzRCxHQUF0RCxHQUE0RGhDLFFBQVErQyw2QkFBdkUsRUFBdUdqRixRQUF2RyxDQUFpSCxTQUFqSDtBQUNELElBUEg7QUFRQSxHQTlSaUIsRUE4UmY7O0FBRUg2QyxjQUFZLG9CQUFVWixPQUFWLEVBQW1CQyxPQUFuQixFQUE2QjtBQUN4QyxPQUFJNkIsT0FBTyxJQUFYO0FBQ0FsRixLQUFHb0QsT0FBSCxFQUFhMEYsTUFBYixDQUFxQixVQUFVckksS0FBVixFQUFrQjtBQUN0Q3lFLFNBQUtqQixtQkFBTCxDQUEwQixPQUExQixFQUFtQyxZQUFuQyxFQUFpRCxpQkFBakQsRUFBb0U1RCxTQUFTb0UsUUFBN0U7QUFDQSxJQUZEO0FBR0EsR0FyU2lCLENBcVNmOztBQXJTZSxFQUFuQixDQXpDNkMsQ0FnVjFDOztBQUVIO0FBQ0E7QUFDQXpFLEdBQUUrSSxFQUFGLENBQUs5RixVQUFMLElBQW1CLFVBQVdJLE9BQVgsRUFBcUI7QUFDdkMsU0FBTyxLQUFLWixJQUFMLENBQVUsWUFBWTtBQUM1QixPQUFLLENBQUV6QyxFQUFFb0IsSUFBRixDQUFRLElBQVIsRUFBYyxZQUFZNkIsVUFBMUIsQ0FBUCxFQUFnRDtBQUMvQ2pELE1BQUVvQixJQUFGLENBQVEsSUFBUixFQUFjLFlBQVk2QixVQUExQixFQUFzQyxJQUFJRSxNQUFKLENBQVksSUFBWixFQUFrQkUsT0FBbEIsQ0FBdEM7QUFDQTtBQUNELEdBSk0sQ0FBUDtBQUtBLEVBTkQ7QUFRQSxDQTVWQSxFQTRWR1AsTUE1VkgsRUE0VldDLE1BNVZYLEVBNFZtQkgsUUE1Vm5CIiwiZmlsZSI6Im1pbm5wb3N0LW1lbWJlcnNoaXAtZnJvbnQtZW5kLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKCBmdW5jdGlvbiggJCApIHtcblxuXHRmdW5jdGlvbiBiZW5lZml0Rm9ybSgpIHtcblx0XHRpZiAoIDIgPT09IHBlcmZvcm1hbmNlLm5hdmlnYXRpb24udHlwZSApIHtcblx0XHQgICBsb2NhdGlvbi5yZWxvYWQoIHRydWUgKTtcblx0XHR9XG5cdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uLmEtYnV0dG9uLWRpc2FibGVkJyApLnJlbW92ZUF0dHIoICdkaXNhYmxlZCcgKTtcblx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR2YXIgJGJ1dHRvbiAgPSAkKCB0aGlzICk7XG5cdFx0XHR2YXIgJHN0YXR1cyAgPSAkKCAnLm0tYmVuZWZpdC1tZXNzYWdlJywgJCggdGhpcyApLnBhcmVudCgpICk7XG5cdFx0XHR2YXIgJHNlbGVjdCAgPSAkKCAnc2VsZWN0JywgJCggdGhpcyApLnBhcmVudCgpICk7XG5cdFx0XHR2YXIgc2V0dGluZ3MgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzO1xuXHRcdFx0Ly8gcmVzZXQgdGhlIG1lc3NhZ2UgZm9yIGN1cnJlbnQgc3RhdHVzXG5cdFx0XHRpZiAoICEgJy5tLWJlbmVmaXQtbWVzc2FnZS1zdWNjZXNzJyApIHtcblx0XHRcdFx0JCggJy5tLWJlbmVmaXQtbWVzc2FnZScgKS5yZW1vdmVDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgbS1iZW5lZml0LW1lc3NhZ2UtZXJyb3IgbS1iZW5lZml0LW1lc3NhZ2UtaW5mbycgKTtcblx0XHRcdH1cblx0XHRcdC8vIHNldCBidXR0b24gdG8gcHJvY2Vzc2luZ1xuXHRcdFx0JGJ1dHRvbi50ZXh0KCAnUHJvY2Vzc2luZycgKS5hZGRDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXG5cdFx0XHQvLyBkaXNhYmxlIGFsbCB0aGUgb3RoZXIgYnV0dG9uc1xuXHRcdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLmFkZENsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cblx0XHRcdC8vIHNldCBhamF4IGRhdGFcblx0XHRcdHZhciBkYXRhID0ge307XG5cdFx0XHR2YXIgYmVuZWZpdFR5cGUgPSAkKCAnaW5wdXRbbmFtZT1cImJlbmVmaXQtbmFtZVwiXScgKS52YWwoKTtcblx0XHRcdGlmICggJ3BhcnRuZXItb2ZmZXJzJyA9PT0gYmVuZWZpdFR5cGUgKSB7XG5cdFx0XHQgICAgZGF0YSA9IHtcblx0XHRcdCAgICAgICAgJ2FjdGlvbicgOiAnYmVuZWZpdF9mb3JtX3N1Ym1pdCcsXG5cdFx0XHQgICAgICAgICdtaW5ucG9zdF9tZW1iZXJzaGlwX2JlbmVmaXRfZm9ybV9ub25jZScgOiAkYnV0dG9uLmRhdGEoICdiZW5lZml0LW5vbmNlJyApLFxuXHRcdFx0ICAgICAgICAnY3VycmVudF91cmwnIDogJCggJ2lucHV0W25hbWU9XCJjdXJyZW50X3VybFwiXScpLnZhbCgpLFxuXHRcdFx0ICAgICAgICAnYmVuZWZpdC1uYW1lJzogJCggJ2lucHV0W25hbWU9XCJiZW5lZml0LW5hbWVcIl0nKS52YWwoKSxcblx0XHRcdCAgICAgICAgJ2luc3RhbmNlX2lkJyA6ICQoICdbbmFtZT1cImluc3RhbmNlLWlkLScgKyAkYnV0dG9uLnZhbCgpICsgJ1wiXScgKS52YWwoKSxcblx0XHRcdCAgICAgICAgJ3Bvc3RfaWQnIDogJGJ1dHRvbi52YWwoKSxcblx0XHRcdCAgICAgICAgJ2lzX2FqYXgnIDogJzEnLFxuXHRcdFx0ICAgIH07XG5cdFx0XHQgICAgJC5wb3N0KCBzZXR0aW5ncy5hamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHQgICAgXHQvLyBzdWNjZXNzXG5cdFx0XHRcdCAgICBpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdCAgICBcdC8vY29uc29sZS5kaXIocmVzcG9uc2UpO1xuXHRcdFx0XHQgICAgXHQkYnV0dG9uLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS50ZXh0KCByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICkuYWRkQ2xhc3MoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzICkucHJvcCggcmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSApO1xuXHRcdFx0XHQgICAgXHQkc3RhdHVzLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmFkZENsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSAnICsgcmVzcG9uc2UuZGF0YS5tZXNzYWdlX2NsYXNzICk7XG5cdFx0XHRcdCAgICBcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5ub3QoICRidXR0b24gKS52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkuYXR0ciggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHRcdFx0XHQgICAgfSBlbHNlIHtcblx0XHRcdFx0ICAgIFx0Ly8gZXJyb3Jcblx0XHRcdFx0ICAgIFx0Ly9jb25zb2xlLmRpcihyZXNwb25zZSk7XG5cdFx0XHRcdCAgICBcdGlmICggJycgIT09IHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkge1xuXHRcdFx0XHQgICAgXHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHQgICAgXHRcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdCAgICBcdH0gZWxzZSB7XG5cdFx0XHRcdCAgICBcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdCAgICBcdH1cblx0XHRcdFx0ICAgIFx0aWYgKCAwIDwgcmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWUubGVuZ3RoICkge1xuXHRcdFx0XHQgICAgXHRcdCQoICdvcHRpb24nLCAkc2VsZWN0ICkuZWFjaCggZnVuY3Rpb24oIGkgKSB7XG5cdFx0XHRcdCAgICBcdFx0XHRpZiAoICQoIHRoaXMgKS52YWwoKSA9PT0gcmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWUgKSB7XG5cdFx0XHRcdCAgICBcdFx0XHRcdCQoIHRoaXMgKS5yZW1vdmUoKTtcblx0XHRcdFx0ICAgIFx0XHRcdH1cblxuXHRcdFx0XHQgICAgXHRcdH0pO1xuXHRcdFx0XHQgICAgXHR9XG5cdFx0XHRcdCAgICBcdC8vIHJlLWVuYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdFx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5ub3QoICRidXR0b24gKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXHRcdFx0XHQgICAgXHQkc3RhdHVzLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmFkZENsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSAnICsgcmVzcG9uc2UuZGF0YS5tZXNzYWdlX2NsYXNzICk7XG5cdFx0XHRcdCAgICB9XG5cblx0XHRcdFx0fSk7XG5cdFx0ICAgIH1cblx0XHR9KTtcblx0fVxuXG5cdCQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXHRcdGlmICggMCA8ICQoICcubS1mb3JtLW1lbWJlcnNoaXAtYmVuZWZpdCcgKS5sZW5ndGggKSB7XG5cdFx0XHRiZW5lZml0Rm9ybSgpO1xuXHRcdH1cblx0fSk7XG5cblx0JCggJy5hLXJlZnJlc2gtcGFnZScgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0bG9jYXRpb24ucmVsb2FkKCk7XG5cdH0pO1xuXG59ICkoIGpRdWVyeSApO1xuIiwiLy8gcGx1Z2luXG47KGZ1bmN0aW9uICggJCwgd2luZG93LCBkb2N1bWVudCwgdW5kZWZpbmVkICkge1xuXG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdE1lbWJlcnNoaXAnLFxuXHRkZWZhdWx0cyA9IHtcblx0XHQnZGVidWcnIDogZmFsc2UsIC8vIHRoaXMgY2FuIGJlIHNldCB0byB0cnVlIG9uIHBhZ2UgbGV2ZWwgb3B0aW9uc1xuXHRcdCdhbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZScgOiAnI2Ftb3VudC1pdGVtICNhbW91bnQnLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZScgOiAnLm0tbWVtYmVyc2hpcC1mYXN0LXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdCdsZXZlbF92aWV3ZXJfY29udGFpbmVyJyA6ICcuYS1zaG93LWxldmVsJyxcblx0XHQnbGV2ZWxfbmFtZScgOiAnLmEtbGV2ZWwnLFxuXHRcdCd1c2VyX2N1cnJlbnRfbGV2ZWwnIDogJy5hLWN1cnJlbnQtbGV2ZWwnLFxuXHRcdCd1c2VyX25ld19sZXZlbCcgOiAnLmEtbmV3LWxldmVsJyxcblx0XHQnYW1vdW50X3ZpZXdlcicgOiAnLmFtb3VudCBoMycsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5hLWZvcm0taXRlbS1tZW1iZXJzaGlwLWZyZXF1ZW5jeScsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHNfdHlwZScgOiAnc2VsZWN0Jyxcblx0XHQnbGV2ZWxzX2NvbnRhaW5lcicgOiAnLm8tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWxzJyxcblx0XHQnc2luZ2xlX2xldmVsX2NvbnRhaW5lcicgOiAnLm0tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWwnLFxuXHRcdCdzaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcicgOiAnLm0tbWVtYmVyLWxldmVsLWJyaWVmJyxcblx0XHQnZmxpcHBlZF9pdGVtcycgOiAnZGl2LmFtb3VudCwgZGl2LmVudGVyJyxcblx0XHQnbGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3InIDogJy5zaG93LWZyZXF1ZW5jeScsXG5cdFx0J2Nob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuYW1vdW50IC5hLWJ1dHRvbi1mbGlwJyxcblx0XHQnYW1vdW50X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmVudGVyIGlucHV0LmFtb3VudC1lbnRyeScsXG5cdH07IC8vIGVuZCBkZWZhdWx0c1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblxuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCgge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblxuXHRcdGluaXQ6IGZ1bmN0aW9uKCByZXNldCwgYW1vdW50ICkge1xuXHRcdFx0Ly8gUGxhY2UgaW5pdGlhbGl6YXRpb24gbG9naWMgaGVyZVxuXHRcdFx0Ly8gWW91IGFscmVhZHkgaGF2ZSBhY2Nlc3MgdG8gdGhlIERPTSBlbGVtZW50IGFuZFxuXHRcdFx0Ly8gdGhlIG9wdGlvbnMgdmlhIHRoZSBpbnN0YW5jZSwgZS5nLiB0aGlzLmVsZW1lbnRcblx0XHRcdC8vIGFuZCB0aGlzLm9wdGlvbnNcblx0XHRcdC8vIHlvdSBjYW4gYWRkIG1vcmUgZnVuY3Rpb25zIGxpa2UgdGhlIG9uZSBiZWxvdyBhbmRcblx0XHRcdC8vIGNhbGwgdGhlbSBsaWtlIHNvOiB0aGlzLnlvdXJPdGhlckZ1bmN0aW9uKHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKS5cblx0XHRcdHRoaXMuY2F0Y2hIYXNoTGlua3MoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKTtcblx0XHRcdHRoaXMubGV2ZWxGbGlwcGVyKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdFx0dGhpcy5zdGFydExldmVsQ2xpY2soIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0XHR0aGlzLnN1Ym1pdEZvcm0oIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0fSxcblxuXHRcdGFuYWx5dGljc0V2ZW50VHJhY2s6IGZ1bmN0aW9uKCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKSB7XG5cdFx0XHRpZiAoIHR5cGVvZiBnYSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGlmICggdHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIGFuYWx5dGljc0V2ZW50VHJhY2tcblxuXHRcdGNhdGNoSGFzaExpbmtzOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoJ2FbaHJlZio9XCIjXCJdOm5vdChbaHJlZj1cIiNcIl0pJywgZWxlbWVudCkuY2xpY2soZnVuY3Rpb24oZSkge1xuXHRcdFx0ICAgIHZhciB0YXJnZXQgPSAkKGUudGFyZ2V0KTtcblx0XHRcdCAgICBpZiAodGFyZ2V0LnBhcmVudCgnLmNvbW1lbnQtdGl0bGUnKS5sZW5ndGggPT0gMCAmJiBsb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywnJykgPT0gdGhpcy5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywnJykgJiYgbG9jYXRpb24uaG9zdG5hbWUgPT0gdGhpcy5ob3N0bmFtZSkge1xuXHRcdFx0XHQgICAgdmFyIHRhcmdldCA9ICQodGhpcy5oYXNoKTtcblx0XHRcdFx0ICAgIHRhcmdldCA9IHRhcmdldC5sZW5ndGggPyB0YXJnZXQgOiAkKCdbbmFtZT0nICsgdGhpcy5oYXNoLnNsaWNlKDEpICsnXScpO1xuXHRcdFx0XHRcdGlmICh0YXJnZXQubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHQkKCdodG1sLGJvZHknKS5hbmltYXRlKHtcblx0XHRcdFx0XHRcdFx0c2Nyb2xsVG9wOiB0YXJnZXQub2Zmc2V0KCkudG9wXG5cdFx0XHRcdFx0XHR9LCAxMDAwKTtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBjYXRjaExpbmtzXG5cblx0XHRsZXZlbEZsaXBwZXI6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dmFyIHByZXZpb3VzX2Ftb3VudCA9ICcnO1xuXHRcdFx0dmFyIGFtb3VudCA9IDA7XG5cdFx0XHR2YXIgbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSAwO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9zdHJpbmcgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3kgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9ICcnO1xuXHRcdFx0aWYgKCB0eXBlb2YgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhICE9PSAndW5kZWZpbmVkJyAmJiAkKCBvcHRpb25zLnVzZXJfY3VycmVudF9sZXZlbCApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdHByZXZpb3VzX2Ftb3VudCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIucHJldmlvdXNfYW1vdW50O1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLnZhbCgpO1xuXHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJykudmFsKCk7XG5cdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHQgICAgbGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHQgICAgdGhhdC5zaG93TmV3TGV2ZWwoIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICk7XG5cblx0XHRcdCAgICAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUpLmNoYW5nZSggZnVuY3Rpb24oKSB7XG5cblx0XHRcdCAgICBcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJykudmFsKClcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHQgICAgICBsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLnZhbCgpLCAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJyApLmF0dHIoICdkYXRhLXllYXItZnJlcXVlbmN5JyApLCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHQgICAgICB0aGF0LnNob3dOZXdMZXZlbCggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKTtcblx0XHRcdCAgICB9KTtcblxuXHRcdFx0ICAgICQob3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSkuYmluZCgna2V5dXAgbW91c2V1cCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0ICAgIFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnKS52YWwoKVxuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHQgICAgICBpZigkKHRoaXMpLmRhdGEoJ2xhc3QtdmFsdWUnKSAhPSAkKHRoaXMpLnZhbCgpKSB7XG5cdFx0XHQgICAgICAgICQodGhpcykuZGF0YSgnbGFzdC12YWx1ZScsICQodGhpcykudmFsKCkpO1xuXHRcdFx0ICAgICAgICBsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLnZhbCgpLCAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJyApLmF0dHIoICdkYXRhLXllYXItZnJlcXVlbmN5JyApLCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHQgICAgICAgIHRoYXQuc2hvd05ld0xldmVsKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApO1xuXHRcdFx0ICAgICAgfTtcblx0XHRcdCAgICB9KTtcblxuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmxldmVsc19jb250YWluZXIgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50ICkuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmZsaXBwZWRfaXRlbXMsICQodGhpcykgKS53cmFwQWxsKCAnPGRpdiBjbGFzcz1cImZsaXBwZXJcIi8+JyApO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkub24oJ2NoYW5nZScsIGZ1bmN0aW9uIChldmVudCkge1xuXHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQodGhpcykuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKHRoaXMpLnZhbCgpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRcdCAgICBpZiAoIHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnICkge1xuXG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblxuXHRcdFx0XHRcdFx0aWYgKCBmcmVxdWVuY3kgPT0gMSApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQteWVhcmx5JyApICk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3kgPT0gMTIgKSB7XG5cdFx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LW1vbnRobHknICkgKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXG5cdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRcdHRoYXQuY2hhbmdlRnJlcXVlbmN5KCBmcmVxdWVuY3lfc3RyaW5nLCBsZXZlbFsnbmFtZSddLCBlbGVtZW50LCBvcHRpb25zICk7XG5cblx0XHRcdFx0XHR9IGVsc2UgaWYgKCAkKCBvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRcdCQob3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciwgZWxlbWVudCkudGV4dChmcmVxdWVuY3lfbmFtZSk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJChvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRcdFx0aWYgKCB0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykgKS52YWwoKTtcblx0XHRcdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0dGhhdC5jaGFuZ2VBbW91bnRQcmV2aWV3KCBmcmVxdWVuY3lfc3RyaW5nLCBsZXZlbFsnbmFtZSddLCBlbGVtZW50LCBvcHRpb25zICk7XG5cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoICQoIG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHQkKCBvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykucGFyZW50KCkgKS52YWwoKTtcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKyAnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgKyBsZXZlbF9udW1iZXIgKyAnXCJdJykudmFsKCk7XG5cdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIGxldmVsRmxpcHBlclxuXG5cdFx0Y2hlY2tMZXZlbDogZnVuY3Rpb24oIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0ICB2YXIgdGhpc3llYXIgPSBwYXJzZUludCggYW1vdW50ICkgKiBwYXJzZUludCggZnJlcXVlbmN5ICk7XG5cdFx0ICB2YXIgbGV2ZWwgPSAnJztcblx0XHQgIGlmICggdHlwZW9mIHByZXZpb3VzX2Ftb3VudCAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJldmlvdXNfYW1vdW50ICE9PSAnJyApIHtcblx0XHQgICAgdmFyIHByaW9yX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoIHByZXZpb3VzX2Ftb3VudC5wcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMgKTtcblx0XHQgICAgdmFyIGNvbWluZ195ZWFyX2Ftb3VudCA9IHBhcnNlSW50KCBwcmV2aW91c19hbW91bnQuY29taW5nX3llYXJfY29udHJpYnV0aW9ucyApO1xuXHRcdCAgICB2YXIgYW5udWFsX3JlY3VycmluZ19hbW91bnQgPSBwYXJzZUludCggcHJldmlvdXNfYW1vdW50LmFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICk7XG5cdFx0ICAgIC8vIGNhbGN1bGF0ZSBtZW1iZXIgbGV2ZWwgZm9ybXVsYVxuXHRcdCAgICBpZiAoIHR5cGUgPT09ICdvbmUtdGltZScgKSB7XG5cdFx0ICAgICAgcHJpb3JfeWVhcl9hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0ICAgIH0gZWxzZSB7XG5cdFx0ICAgICAgYW5udWFsX3JlY3VycmluZ19hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0ICAgIH1cblxuXHRcdCAgICB0aGlzeWVhciA9IE1hdGgubWF4KCBwcmlvcl95ZWFyX2Ftb3VudCwgY29taW5nX3llYXJfYW1vdW50LCBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCApO1xuXHRcdCAgfVxuXG5cdFx0ICBsZXZlbCA9IHRoaXMuZ2V0TGV2ZWwoIHRoaXN5ZWFyICk7XG5cblx0XHQgICQoJ2gyJywgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcikuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0ICAgIGlmICggJCh0aGlzKS50ZXh0KCkgPT0gbGV2ZWxbJ25hbWUnXSApIHtcblx0XHQgICAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdCAgICAgICQodGhpcykucGFyZW50KCkucGFyZW50KCkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0ICAgIH1cblx0XHQgIH0gKTtcblx0XHQgIHJldHVybiBsZXZlbDtcblxuXHRcdH0sIC8vIGVuZCBjaGVja0xldmVsXG5cblx0XHRnZXRMZXZlbDogZnVuY3Rpb24oIHRoaXN5ZWFyICkge1xuXHRcdFx0dmFyIGxldmVsID0gW107XG5cdFx0XHRpZiAoIHRoaXN5ZWFyID4gMCAmJiB0aGlzeWVhciA8IDYwICkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ0Jyb256ZSc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDE7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmICh0aGlzeWVhciA+IDU5ICYmIHRoaXN5ZWFyIDwgMTIwKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnU2lsdmVyJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMjtcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAxMTkgJiYgdGhpc3llYXIgPCAyNDApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdHb2xkJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMztcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAyMzkpIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdQbGF0aW51bSc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDQ7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbGV2ZWw7XG5cdFx0fSwgLy8gZW5kIGdldExldmVsXG5cblx0XHRzaG93TmV3TGV2ZWw6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApIHtcblx0XHRcdHZhciBtZW1iZXJfbGV2ZWxfcHJlZml4ID0gJyc7XG5cdFx0XHR2YXIgb2xkX2xldmVsID0gJyc7XG5cdFx0XHR2YXIgbGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciA9IG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lcjsgLy8gdGhpcyBzaG91bGQgY2hhbmdlIHdoZW4gd2UgcmVwbGFjZSB0aGUgdGV4dCwgaWYgdGhlcmUgaXMgYSBsaW5rIGluc2lkZSBpdFxuXHRcdFx0dmFyIGRlY29kZUh0bWxFbnRpdHkgPSBmdW5jdGlvbiggc3RyICkge1xuXHRcdFx0XHRyZXR1cm4gc3RyLnJlcGxhY2UoIC8mIyhcXGQrKTsvZywgZnVuY3Rpb24oIG1hdGNoLCBkZWMgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoIGRlYyApO1xuXHRcdFx0XHR9KTtcblx0XHRcdH07XG5cdFx0XHRpZiAoIHR5cGVvZiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRtZW1iZXJfbGV2ZWxfcHJlZml4ID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLm1lbWJlcl9sZXZlbF9wcmVmaXg7XG5cdFx0XHR9XG5cblx0XHRcdCQob3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyKS5wcm9wKCAnY2xhc3MnLCAnYS1zaG93LWxldmVsIGEtc2hvdy1sZXZlbC0nICsgbGV2ZWxbJ25hbWUnXS50b0xvd2VyQ2FzZSgpICk7XG5cblx0XHRcdGlmICggJCggb3B0aW9ucy51c2VyX2N1cnJlbnRfbGV2ZWwgKS5sZW5ndGggPiAwICYmIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLmxlbmd0aCA+IDAgKSB7XG5cblx0XHRcdFx0aWYgKCAnYScsICQoIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0bGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciA9IG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciArICcgYSc7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRvbGRfbGV2ZWwgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5yZXBsYWNlKCBtZW1iZXJfbGV2ZWxfcHJlZml4LCAnJyApO1xuXG5cdFx0XHRcdGlmICggb2xkX2xldmVsICE9PSBsZXZlbFsnbmFtZSddLnRvTG93ZXJDYXNlKCkgKSB7XG5cdFx0XHRcdFx0JCggbGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciApLmh0bWwoIGRlY29kZUh0bWxFbnRpdHkoICQoIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciApLmRhdGEoICdjaGFuZ2VkJyApICkgKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCBsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yICkuaHRtbCggZGVjb2RlSHRtbEVudGl0eSggJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkuZGF0YSggJ25vdC1jaGFuZ2VkJyApICkgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQkKG9wdGlvbnMubGV2ZWxfbmFtZSwgb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyKS50ZXh0KCBsZXZlbFsnbmFtZSddICk7XG5cblx0XHR9LCAvLyBlbmQgc2hvd05ld0xldmVsXG5cblx0XHRjaGFuZ2VGcmVxdWVuY3k6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdCAgICB2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHQgICAgdmFyIG9uY2VfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnb25lLXRpbWUnKTtcblx0XHRcdCAgICB2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHQgICAgdmFyIGZyZXF1ZW5jeSAgICAgID0gcGFyc2VJbnQoIHNlbGVjdGVkLnNwbGl0KCcgLSAnKVsxXSApO1xuXG5cdFx0XHQgICAgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzICkudmFsKCBzZWxlY3RlZCApO1xuICAgIFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyApLnByb3AoICdzZWxlY3RlZCcsIHNlbGVjdGVkICk7XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcbiAgICBcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykgKS5kYXRhKCAnZnJlcXVlbmN5JywgZnJlcXVlbmN5ICk7XG5cblx0XHRcdH0gKTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlRnJlcXVlbmN5XG5cblx0XHRjaGFuZ2VBbW91bnRQcmV2aWV3OiBmdW5jdGlvbiggc2VsZWN0ZWQsIGxldmVsLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcmFuZ2UgICAgICAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCk7XG5cdFx0XHRcdHZhciBtb250aF92YWx1ZSAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ21vbnRoJyk7XG5cdFx0XHQgICAgdmFyIHllYXJfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgneWVhcicpO1xuXHRcdFx0ICAgIHZhciBvbmNlX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ29uZS10aW1lJyk7XG5cdFx0XHQgICAgdmFyIGZyZXF1ZW5jeV9uYW1lID0gc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHRcdGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciBtb250aCcgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5yZW1vdmVDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgeWVhcicgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gb25jZV92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcygnc21hbGxlcicgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoIHJhbmdlICk7XG5cblx0XHRcdH0gKTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlQW1vdW50UHJldmlld1xuXG5cdFx0c3RhcnRMZXZlbENsaWNrOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoJy5zdGFydC1sZXZlbCcpLmNsaWNrKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgbGV2ZWxfY2xhc3MgPSAkKCB0aGlzICkucHJvcCggJ2NsYXNzJyApO1xuXHRcdFx0XHR2YXIgbGV2ZWxfbnVtYmVyID0gbGV2ZWxfY2xhc3NbbGV2ZWxfY2xhc3MubGVuZ3RoIC0xXTtcblx0XHRcdCAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyLCBlbGVtZW50ICkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICsgJyAnICsgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdCAgfSk7XG5cdFx0fSwgLy8gZW5kIHN0YXJ0TGV2ZWxDbGlja1xuXG5cdFx0c3VibWl0Rm9ybTogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHQkKCBlbGVtZW50ICkuc3VibWl0KCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdHRoYXQuYW5hbHl0aWNzRXZlbnRUcmFjayggJ2V2ZW50JywgJ1N1cHBvcnQgVXMnLCAnQmVjb21lIEEgTWVtYmVyJywgbG9jYXRpb24ucGF0aG5hbWUgKTtcblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBzdWJtaXRGb3JtXG5cblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcblxufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCApO1xuIl19
