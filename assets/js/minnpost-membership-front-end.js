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
						if (0 < $select.length) {
							$select.prop('disabled', true);
						}
						$('.a-benefit-button').not($button).val(response.data.button_value).attr('disabled', true);
					} else {
						// error
						//console.dir(response);
						if ('undefined' === typeof response.data.remove_instance_value) {
							if ('' !== response.data.button_label) {
								$button.show();
								$button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
							} else {
								$button.hide();
							}
						} else {
							$('option', $select).each(function (i) {
								if ($(this).val() === response.data.remove_instance_value) {
									$(this).remove();
								}
							});
							if ('' !== response.data.button_label) {
								$button.show();
								$button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
							} else {
								$button.hide();
							}
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJlbmVmaXRzLmpzIiwibWVtYmVyLWxldmVscy5qcyJdLCJuYW1lcyI6WyIkIiwiYmVuZWZpdEZvcm0iLCJwZXJmb3JtYW5jZSIsIm5hdmlnYXRpb24iLCJ0eXBlIiwibG9jYXRpb24iLCJyZWxvYWQiLCJyZW1vdmVBdHRyIiwiY2xpY2siLCJldmVudCIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsIiRzdGF0dXMiLCJwYXJlbnQiLCIkc2VsZWN0Iiwic2V0dGluZ3MiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzIiwicmVtb3ZlQ2xhc3MiLCJ0ZXh0IiwiYWRkQ2xhc3MiLCJkYXRhIiwiYmVuZWZpdFR5cGUiLCJ2YWwiLCJwb3N0IiwiYWpheHVybCIsInJlc3BvbnNlIiwic3VjY2VzcyIsImJ1dHRvbl92YWx1ZSIsImJ1dHRvbl9sYWJlbCIsImJ1dHRvbl9jbGFzcyIsInByb3AiLCJidXR0b25fYXR0ciIsImh0bWwiLCJtZXNzYWdlIiwibWVzc2FnZV9jbGFzcyIsImxlbmd0aCIsIm5vdCIsImF0dHIiLCJyZW1vdmVfaW5zdGFuY2VfdmFsdWUiLCJzaG93IiwiaGlkZSIsImVhY2giLCJpIiwicmVtb3ZlIiwiZG9jdW1lbnQiLCJyZWFkeSIsImpRdWVyeSIsIndpbmRvdyIsInVuZGVmaW5lZCIsInBsdWdpbk5hbWUiLCJkZWZhdWx0cyIsIlBsdWdpbiIsImVsZW1lbnQiLCJvcHRpb25zIiwiZXh0ZW5kIiwiX2RlZmF1bHRzIiwiX25hbWUiLCJpbml0IiwicHJvdG90eXBlIiwicmVzZXQiLCJhbW91bnQiLCJjYXRjaEhhc2hMaW5rcyIsImxldmVsRmxpcHBlciIsInN0YXJ0TGV2ZWxDbGljayIsInN1Ym1pdEZvcm0iLCJhbmFseXRpY3NFdmVudFRyYWNrIiwiY2F0ZWdvcnkiLCJhY3Rpb24iLCJsYWJlbCIsInZhbHVlIiwiZ2EiLCJlIiwidGFyZ2V0IiwicGF0aG5hbWUiLCJyZXBsYWNlIiwiaG9zdG5hbWUiLCJoYXNoIiwic2xpY2UiLCJhbmltYXRlIiwic2Nyb2xsVG9wIiwib2Zmc2V0IiwidG9wIiwidGhhdCIsInByZXZpb3VzX2Ftb3VudCIsImxldmVsIiwibGV2ZWxfbnVtYmVyIiwiZnJlcXVlbmN5X3N0cmluZyIsImZyZXF1ZW5jeSIsImZyZXF1ZW5jeV9uYW1lIiwibWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhIiwidXNlcl9jdXJyZW50X2xldmVsIiwiY3VycmVudF91c2VyIiwiYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUiLCJmcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSIsInNwbGl0IiwiY2hlY2tMZXZlbCIsInNob3dOZXdMZXZlbCIsImNoYW5nZSIsImJpbmQiLCJsZXZlbHNfY29udGFpbmVyIiwic2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IiLCJmbGlwcGVkX2l0ZW1zIiwid3JhcEFsbCIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJvbiIsInNpbmdsZV9sZXZlbF9jb250YWluZXIiLCJjbG9zZXN0IiwiYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsImFtb3VudF92aWV3ZXIiLCJjaGFuZ2VGcmVxdWVuY3kiLCJsZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciIsImNoYW5nZUFtb3VudFByZXZpZXciLCJjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsInRoaXN5ZWFyIiwicGFyc2VJbnQiLCJwcmlvcl95ZWFyX2Ftb3VudCIsInByaW9yX3llYXJfY29udHJpYnV0aW9ucyIsImNvbWluZ195ZWFyX2Ftb3VudCIsImNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMiLCJhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCIsIk1hdGgiLCJtYXgiLCJnZXRMZXZlbCIsIm1lbWJlcl9sZXZlbF9wcmVmaXgiLCJvbGRfbGV2ZWwiLCJsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yIiwibGV2ZWxfdmlld2VyX2NvbnRhaW5lciIsImRlY29kZUh0bWxFbnRpdHkiLCJzdHIiLCJtYXRjaCIsImRlYyIsIlN0cmluZyIsImZyb21DaGFyQ29kZSIsInRvTG93ZXJDYXNlIiwibWVtYmVyX2xldmVsIiwibGV2ZWxfbmFtZSIsInNlbGVjdGVkIiwicmFuZ2UiLCJtb250aF92YWx1ZSIsInllYXJfdmFsdWUiLCJvbmNlX3ZhbHVlIiwibGV2ZWxfY2xhc3MiLCJzdWJtaXQiLCJmbiJdLCJtYXBwaW5ncyI6Ijs7QUFBQSxDQUFFLFVBQVVBLENBQVYsRUFBYzs7QUFFZixVQUFTQyxXQUFULEdBQXVCO0FBQ3RCLE1BQUssTUFBTUMsWUFBWUMsVUFBWixDQUF1QkMsSUFBbEMsRUFBeUM7QUFDdENDLFlBQVNDLE1BQVQsQ0FBaUIsSUFBakI7QUFDRjtBQUNETixJQUFHLHFDQUFILEVBQTJDTyxVQUEzQyxDQUF1RCxVQUF2RDtBQUNBUCxJQUFHLG1CQUFILEVBQXlCUSxLQUF6QixDQUFnQyxVQUFVQyxLQUFWLEVBQWtCO0FBQ2pEQSxTQUFNQyxjQUFOO0FBQ0EsT0FBSUMsVUFBV1gsRUFBRyxJQUFILENBQWY7QUFDQSxPQUFJWSxVQUFXWixFQUFHLG9CQUFILEVBQXlCQSxFQUFHLElBQUgsRUFBVWEsTUFBVixFQUF6QixDQUFmO0FBQ0EsT0FBSUMsVUFBV2QsRUFBRyxRQUFILEVBQWFBLEVBQUcsSUFBSCxFQUFVYSxNQUFWLEVBQWIsQ0FBZjtBQUNBLE9BQUlFLFdBQVdDLDRCQUFmO0FBQ0E7QUFDQSxPQUFLLENBQUUsNEJBQVAsRUFBc0M7QUFDckNoQixNQUFHLG9CQUFILEVBQTBCaUIsV0FBMUIsQ0FBdUMsMEVBQXZDO0FBQ0E7QUFDRDtBQUNBTixXQUFRTyxJQUFSLENBQWMsWUFBZCxFQUE2QkMsUUFBN0IsQ0FBdUMsbUJBQXZDOztBQUVBO0FBQ0FuQixLQUFHLG1CQUFILEVBQXlCbUIsUUFBekIsQ0FBbUMsbUJBQW5DOztBQUVBO0FBQ0EsT0FBSUMsT0FBTyxFQUFYO0FBQ0EsT0FBSUMsY0FBY3JCLEVBQUcsNEJBQUgsRUFBa0NzQixHQUFsQyxFQUFsQjtBQUNBLE9BQUsscUJBQXFCRCxXQUExQixFQUF3QztB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QUFILEVBQWEwRixNQUFiLENBQXFCLFVBQVVySSxLQUFWLEVBQWtCO0FBQ3RDeUUsU0FBS2pCLG1CQUFMLENBQTBCLE9BQTFCLEVBQW1DLFlBQW5DLEVBQWlELGlCQUFqRCxFQUFvRTVELFNBQVNvRSxRQUE3RTtBQUNBLElBRkQ7QUFHQSxHQXJTaUIsQ0FxU2Y7O0FBclNlLEVBQW5CLENBekM2QyxDQWdWMUM7O0FBRUg7QUFDQTtBQUNBekUsR0FBRStJLEVBQUYsQ0FBSzlGLFVBQUwsSUFBbUIsVUFBV0ksT0FBWCxFQUFxQjtBQUN2QyxTQUFPLEtBQUtaLElBQUwsQ0FBVSxZQUFZO0FBQzVCLE9BQUssQ0FBRXpDLEVBQUVvQixJQUFGLENBQVEsSUFBUixFQUFjLFlBQVk2QixVQUExQixDQUFQLEVBQWdEO0FBQy9DakQsTUFBRW9CLElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWTZCLFVBQTFCLEVBQXNDLElBQUlFLE1BQUosQ0FBWSxJQUFaLEVBQWtCRSxPQUFsQixDQUF0QztBQUNBO0FBQ0QsR0FKTSxDQUFQO0FBS0EsRUFORDtBQVFBLENBNVZBLEVBNFZHUCxNQTVWSCxFQTRWV0MsTUE1VlgsRUE0Vm1CSCxRQTVWbkIiLCJmaWxlIjoibWlubnBvc3QtbWVtYmVyc2hpcC1mcm9udC1lbmQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoIGZ1bmN0aW9uKCAkICkge1xuXG5cdGZ1bmN0aW9uIGJlbmVmaXRGb3JtKCkge1xuXHRcdGlmICggMiA9PT0gcGVyZm9ybWFuY2UubmF2aWdhdGlvbi50eXBlICkge1xuXHRcdCAgIGxvY2F0aW9uLnJlbG9hZCggdHJ1ZSApO1xuXHRcdH1cblx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24uYS1idXR0b24tZGlzYWJsZWQnICkucmVtb3ZlQXR0ciggJ2Rpc2FibGVkJyApO1xuXHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHZhciAkYnV0dG9uICA9ICQoIHRoaXMgKTtcblx0XHRcdHZhciAkc3RhdHVzICA9ICQoICcubS1iZW5lZml0LW1lc3NhZ2UnLCAkKCB0aGlzICkucGFyZW50KCkgKTtcblx0XHRcdHZhciAkc2VsZWN0ICA9ICQoICdzZWxlY3QnLCAkKCB0aGlzICkucGFyZW50KCkgKTtcblx0XHRcdHZhciBzZXR0aW5ncyA9IG1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3M7XG5cdFx0XHQvLyByZXNldCB0aGUgbWVzc2FnZSBmb3IgY3VycmVudCBzdGF0dXNcblx0XHRcdGlmICggISAnLm0tYmVuZWZpdC1tZXNzYWdlLXN1Y2Nlc3MnICkge1xuXHRcdFx0XHQkKCAnLm0tYmVuZWZpdC1tZXNzYWdlJyApLnJlbW92ZUNsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSBtLWJlbmVmaXQtbWVzc2FnZS1lcnJvciBtLWJlbmVmaXQtbWVzc2FnZS1pbmZvJyApO1xuXHRcdFx0fVxuXHRcdFx0Ly8gc2V0IGJ1dHRvbiB0byBwcm9jZXNzaW5nXG5cdFx0XHQkYnV0dG9uLnRleHQoICdQcm9jZXNzaW5nJyApLmFkZENsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cblx0XHRcdC8vIGRpc2FibGUgYWxsIHRoZSBvdGhlciBidXR0b25zXG5cdFx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkuYWRkQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblxuXHRcdFx0Ly8gc2V0IGFqYXggZGF0YVxuXHRcdFx0dmFyIGRhdGEgPSB7fTtcblx0XHRcdHZhciBiZW5lZml0VHlwZSA9ICQoICdpbnB1dFtuYW1lPVwiYmVuZWZpdC1uYW1lXCJdJyApLnZhbCgpO1xuXHRcdFx0aWYgKCAncGFydG5lci1vZmZlcnMnID09PSBiZW5lZml0VHlwZSApIHtcblx0XHRcdCAgICBkYXRhID0ge1xuXHRcdFx0ICAgICAgICAnYWN0aW9uJyA6ICdiZW5lZml0X2Zvcm1fc3VibWl0Jyxcblx0XHRcdCAgICAgICAgJ21pbm5wb3N0X21lbWJlcnNoaXBfYmVuZWZpdF9mb3JtX25vbmNlJyA6ICRidXR0b24uZGF0YSggJ2JlbmVmaXQtbm9uY2UnICksXG5cdFx0XHQgICAgICAgICdjdXJyZW50X3VybCcgOiAkKCAnaW5wdXRbbmFtZT1cImN1cnJlbnRfdXJsXCJdJykudmFsKCksXG5cdFx0XHQgICAgICAgICdiZW5lZml0LW5hbWUnOiAkKCAnaW5wdXRbbmFtZT1cImJlbmVmaXQtbmFtZVwiXScpLnZhbCgpLFxuXHRcdFx0ICAgICAgICAnaW5zdGFuY2VfaWQnIDogJCggJ1tuYW1lPVwiaW5zdGFuY2UtaWQtJyArICRidXR0b24udmFsKCkgKyAnXCJdJyApLnZhbCgpLFxuXHRcdFx0ICAgICAgICAncG9zdF9pZCcgOiAkYnV0dG9uLnZhbCgpLFxuXHRcdFx0ICAgICAgICAnaXNfYWpheCcgOiAnMScsXG5cdFx0XHQgICAgfTtcblxuXHRcdFx0ICAgICQucG9zdCggc2V0dGluZ3MuYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0ICAgIFx0Ly8gc3VjY2Vzc1xuXHRcdFx0XHQgICAgaWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHQgICAgXHQvL2NvbnNvbGUuZGlyKHJlc3BvbnNlKTtcblx0XHRcdFx0ICAgIFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0ICAgIFx0JHN0YXR1cy5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5hZGRDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzcyApO1xuXHRcdFx0XHQgICAgXHRpZiAoIDAgPCAkc2VsZWN0Lmxlbmd0aCApIHtcblx0XHRcdFx0ICAgIFx0XHQkc2VsZWN0LnByb3AoICdkaXNhYmxlZCcsIHRydWUgKTtcblx0XHRcdFx0ICAgIFx0fVxuXHRcdFx0XHQgICAgXHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkubm90KCAkYnV0dG9uICkudmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLmF0dHIoICdkaXNhYmxlZCcsIHRydWUgKTtcblx0XHRcdFx0ICAgIH0gZWxzZSB7XG5cdFx0XHRcdCAgICBcdC8vIGVycm9yXG5cdFx0XHRcdCAgICBcdC8vY29uc29sZS5kaXIocmVzcG9uc2UpO1xuXHRcdFx0XHQgICAgXHRpZiAoICd1bmRlZmluZWQnID09PSB0eXBlb2YgcmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWUgKSB7XG5cdFx0XHRcdFx0ICAgIFx0aWYgKCAnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKSB7XG5cdFx0XHRcdFx0ICAgIFx0XHQkYnV0dG9uLnNob3coKTtcblx0XHRcdFx0XHQgICAgXHRcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdFx0ICAgIFx0fSBlbHNlIHtcblx0XHRcdFx0XHQgICAgXHRcdCRidXR0b24uaGlkZSgpO1xuXHRcdFx0XHRcdCAgICBcdH1cblx0XHRcdFx0XHQgICAgfSBlbHNlIHtcblx0XHRcdFx0ICAgIFx0XHQkKCAnb3B0aW9uJywgJHNlbGVjdCApLmVhY2goIGZ1bmN0aW9uKCBpICkge1xuXHRcdFx0XHQgICAgXHRcdFx0aWYgKCAkKCB0aGlzICkudmFsKCkgPT09IHJlc3BvbnNlLmRhdGEucmVtb3ZlX2luc3RhbmNlX3ZhbHVlICkge1xuXHRcdFx0XHQgICAgXHRcdFx0XHQkKCB0aGlzICkucmVtb3ZlKCk7XG5cdFx0XHRcdCAgICBcdFx0XHR9XG5cdFx0XHRcdCAgICBcdFx0fSk7XG5cdFx0XHRcdCAgICBcdFx0aWYgKCAnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKSB7XG5cdFx0XHRcdFx0ICAgIFx0XHQkYnV0dG9uLnNob3coKTtcblx0XHRcdFx0XHQgICAgXHRcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdFx0ICAgIFx0fSBlbHNlIHtcblx0XHRcdFx0XHQgICAgXHRcdCRidXR0b24uaGlkZSgpO1xuXHRcdFx0XHRcdCAgICBcdH1cblx0XHRcdFx0ICAgIFx0fVxuXHRcdFx0XHQgICAgXHQvLyByZS1lbmFibGUgYWxsIHRoZSBvdGhlciBidXR0b25zXG5cdFx0XHRcdFx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkubm90KCAkYnV0dG9uICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblx0XHRcdFx0ICAgIFx0JHN0YXR1cy5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5hZGRDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzcyApO1xuXHRcdFx0XHQgICAgfVxuXG5cdFx0XHRcdH0pO1xuXHRcdCAgICB9XG5cdFx0fSk7XG5cdH1cblxuXHQkKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblx0XHRpZiAoIDAgPCAkKCAnLm0tZm9ybS1tZW1iZXJzaGlwLWJlbmVmaXQnICkubGVuZ3RoICkge1xuXHRcdFx0YmVuZWZpdEZvcm0oKTtcblx0XHR9XG5cdH0pO1xuXG5cdCQoICcuYS1yZWZyZXNoLXBhZ2UnICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdGxvY2F0aW9uLnJlbG9hZCgpO1xuXHR9KTtcblxufSApKCBqUXVlcnkgKTtcbiIsIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQsIHVuZGVmaW5lZCApIHtcblxuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0dmFyIHBsdWdpbk5hbWUgPSAnbWlubnBvc3RNZW1iZXJzaGlwJyxcblx0ZGVmYXVsdHMgPSB7XG5cdFx0J2RlYnVnJyA6IGZhbHNlLCAvLyB0aGlzIGNhbiBiZSBzZXQgdG8gdHJ1ZSBvbiBwYWdlIGxldmVsIG9wdGlvbnNcblx0XHQnYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUnIDogJyNhbW91bnQtaXRlbSAjYW1vdW50Jyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUnIDogJy5tLW1lbWJlcnNoaXAtZmFzdC1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHQnbGV2ZWxfdmlld2VyX2NvbnRhaW5lcicgOiAnLmEtc2hvdy1sZXZlbCcsXG5cdFx0J2xldmVsX25hbWUnIDogJy5hLWxldmVsJyxcblx0XHQndXNlcl9jdXJyZW50X2xldmVsJyA6ICcuYS1jdXJyZW50LWxldmVsJyxcblx0XHQndXNlcl9uZXdfbGV2ZWwnIDogJy5hLW5ldy1sZXZlbCcsXG5cdFx0J2Ftb3VudF92aWV3ZXInIDogJy5hbW91bnQgaDMnLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuYS1mb3JtLWl0ZW0tbWVtYmVyc2hpcC1mcmVxdWVuY3knLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzX3R5cGUnIDogJ3NlbGVjdCcsXG5cdFx0J2xldmVsc19jb250YWluZXInIDogJy5vLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVscycsXG5cdFx0J3NpbmdsZV9sZXZlbF9jb250YWluZXInIDogJy5tLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVsJyxcblx0XHQnc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3InIDogJy5tLW1lbWJlci1sZXZlbC1icmllZicsXG5cdFx0J2ZsaXBwZWRfaXRlbXMnIDogJ2Rpdi5hbW91bnQsIGRpdi5lbnRlcicsXG5cdFx0J2xldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yJyA6ICcuc2hvdy1mcmVxdWVuY3knLFxuXHRcdCdjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmFtb3VudCAuYS1idXR0b24tZmxpcCcsXG5cdFx0J2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5lbnRlciBpbnB1dC5hbW91bnQtZW50cnknLFxuXHR9OyAvLyBlbmQgZGVmYXVsdHNcblxuXHQvLyBUaGUgYWN0dWFsIHBsdWdpbiBjb25zdHJ1Y3RvclxuXHRmdW5jdGlvbiBQbHVnaW4oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cblx0XHRpbml0OiBmdW5jdGlvbiggcmVzZXQsIGFtb3VudCApIHtcblx0XHRcdC8vIFBsYWNlIGluaXRpYWxpemF0aW9uIGxvZ2ljIGhlcmVcblx0XHRcdC8vIFlvdSBhbHJlYWR5IGhhdmUgYWNjZXNzIHRvIHRoZSBET00gZWxlbWVudCBhbmRcblx0XHRcdC8vIHRoZSBvcHRpb25zIHZpYSB0aGUgaW5zdGFuY2UsIGUuZy4gdGhpcy5lbGVtZW50XG5cdFx0XHQvLyBhbmQgdGhpcy5vcHRpb25zXG5cdFx0XHQvLyB5b3UgY2FuIGFkZCBtb3JlIGZ1bmN0aW9ucyBsaWtlIHRoZSBvbmUgYmVsb3cgYW5kXG5cdFx0XHQvLyBjYWxsIHRoZW0gbGlrZSBzbzogdGhpcy55b3VyT3RoZXJGdW5jdGlvbih0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucykuXG5cdFx0XHR0aGlzLmNhdGNoSGFzaExpbmtzKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyk7XG5cdFx0XHR0aGlzLmxldmVsRmxpcHBlciggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHRcdHRoaXMuc3RhcnRMZXZlbENsaWNrKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdFx0dGhpcy5zdWJtaXRGb3JtKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdH0sXG5cblx0XHRhbmFseXRpY3NFdmVudFRyYWNrOiBmdW5jdGlvbiggdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICkge1xuXHRcdFx0aWYgKCB0eXBlb2YgZ2EgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRpZiAoIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwgKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBhbmFseXRpY3NFdmVudFRyYWNrXG5cblx0XHRjYXRjaEhhc2hMaW5rczogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCdhW2hyZWYqPVwiI1wiXTpub3QoW2hyZWY9XCIjXCJdKScsIGVsZW1lbnQpLmNsaWNrKGZ1bmN0aW9uKGUpIHtcblx0XHRcdCAgICB2YXIgdGFyZ2V0ID0gJChlLnRhcmdldCk7XG5cdFx0XHQgICAgaWYgKHRhcmdldC5wYXJlbnQoJy5jb21tZW50LXRpdGxlJykubGVuZ3RoID09IDAgJiYgbG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpID09IHRoaXMucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpICYmIGxvY2F0aW9uLmhvc3RuYW1lID09IHRoaXMuaG9zdG5hbWUpIHtcblx0XHRcdFx0ICAgIHZhciB0YXJnZXQgPSAkKHRoaXMuaGFzaCk7XG5cdFx0XHRcdCAgICB0YXJnZXQgPSB0YXJnZXQubGVuZ3RoID8gdGFyZ2V0IDogJCgnW25hbWU9JyArIHRoaXMuaGFzaC5zbGljZSgxKSArJ10nKTtcblx0XHRcdFx0XHRpZiAodGFyZ2V0Lmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0JCgnaHRtbCxib2R5JykuYW5pbWF0ZSh7XG5cdFx0XHRcdFx0XHRcdHNjcm9sbFRvcDogdGFyZ2V0Lm9mZnNldCgpLnRvcFxuXHRcdFx0XHRcdFx0fSwgMTAwMCk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgY2F0Y2hMaW5rc1xuXG5cdFx0bGV2ZWxGbGlwcGVyOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHZhciBwcmV2aW91c19hbW91bnQgPSAnJztcblx0XHRcdHZhciBhbW91bnQgPSAwO1xuXHRcdFx0dmFyIGxldmVsID0gJyc7XG5cdFx0XHR2YXIgbGV2ZWxfbnVtYmVyID0gMDtcblx0XHRcdHZhciBmcmVxdWVuY3lfc3RyaW5nID0gJyc7XG5cdFx0XHR2YXIgZnJlcXVlbmN5ID0gJyc7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSAnJztcblx0XHRcdGlmICggdHlwZW9mIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSAhPT0gJ3VuZGVmaW5lZCcgJiYgJCggb3B0aW9ucy51c2VyX2N1cnJlbnRfbGV2ZWwgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRwcmV2aW91c19hbW91bnQgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLnByZXZpb3VzX2Ftb3VudDtcblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS52YWwoKTtcblx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcpLnZhbCgpO1xuXHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0ICAgIGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0ICAgIHRoYXQuc2hvd05ld0xldmVsKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApO1xuXG5cdFx0XHQgICAgJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lKS5jaGFuZ2UoIGZ1bmN0aW9uKCkge1xuXG5cdFx0XHQgICAgXHRmcmVxdWVuY3lfc3RyaW5nID0gJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcpLnZhbCgpXG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0ICAgICAgbGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS52YWwoKSwgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcgKS5hdHRyKCAnZGF0YS15ZWFyLWZyZXF1ZW5jeScgKSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0ICAgICAgdGhhdC5zaG93TmV3TGV2ZWwoIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICk7XG5cdFx0XHQgICAgfSk7XG5cblx0XHRcdCAgICAkKG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUpLmJpbmQoJ2tleXVwIG1vdXNldXAnLCBmdW5jdGlvbigpIHtcblx0XHRcdCAgICBcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJykudmFsKClcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0ICAgICAgaWYoJCh0aGlzKS5kYXRhKCdsYXN0LXZhbHVlJykgIT0gJCh0aGlzKS52YWwoKSkge1xuXHRcdFx0ICAgICAgICAkKHRoaXMpLmRhdGEoJ2xhc3QtdmFsdWUnLCAkKHRoaXMpLnZhbCgpKTtcblx0XHRcdCAgICAgICAgbGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS52YWwoKSwgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcgKS5hdHRyKCAnZGF0YS15ZWFyLWZyZXF1ZW5jeScgKSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0ICAgICAgICB0aGF0LnNob3dOZXdMZXZlbCggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKTtcblx0XHRcdCAgICAgIH07XG5cdFx0XHQgICAgfSk7XG5cblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5sZXZlbHNfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCApLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5mbGlwcGVkX2l0ZW1zLCAkKHRoaXMpICkud3JhcEFsbCggJzxkaXYgY2xhc3M9XCJmbGlwcGVyXCIvPicgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKHRoaXMpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJCh0aGlzKS52YWwoKTtcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0XHQgICAgaWYgKCB0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJyApIHtcblxuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHRcdCQoIGV2ZW50LnRhcmdldCApLmNsb3Nlc3QoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cblx0XHRcdFx0XHRcdGlmICggZnJlcXVlbmN5ID09IDEgKSB7XG5cdFx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LXllYXJseScgKSApO1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5ID09IDEyICkge1xuXHRcdFx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkudmFsKCAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkuZGF0YSgnZGVmYXVsdC1tb250aGx5JyApICk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArICdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArIGxldmVsX251bWJlciArICdcIl0nKS52YWwoKTtcblxuXHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHR0aGF0LmNoYW5nZUZyZXF1ZW5jeSggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdFx0fSBlbHNlIGlmICggJCggb3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IsIGVsZW1lbnQpLnRleHQoZnJlcXVlbmN5X25hbWUpO1xuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQob3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0XHRcdGlmICggdHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkudmFsKCk7XG5cdFx0XHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHRoYXQuY2hhbmdlQW1vdW50UHJldmlldyggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0JCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdCQoIGV2ZW50LnRhcmdldCApLmNsb3Nlc3QoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpLnBhcmVudCgpICkudmFsKCk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBsZXZlbEZsaXBwZXJcblxuXHRcdGNoZWNrTGV2ZWw6IGZ1bmN0aW9uKCBhbW91bnQsIGZyZXF1ZW5jeSwgdHlwZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdCAgdmFyIHRoaXN5ZWFyID0gcGFyc2VJbnQoIGFtb3VudCApICogcGFyc2VJbnQoIGZyZXF1ZW5jeSApO1xuXHRcdCAgdmFyIGxldmVsID0gJyc7XG5cdFx0ICBpZiAoIHR5cGVvZiBwcmV2aW91c19hbW91bnQgIT09ICd1bmRlZmluZWQnICYmIHByZXZpb3VzX2Ftb3VudCAhPT0gJycgKSB7XG5cdFx0ICAgIHZhciBwcmlvcl95ZWFyX2Ftb3VudCA9IHBhcnNlSW50KCBwcmV2aW91c19hbW91bnQucHJpb3JfeWVhcl9jb250cmlidXRpb25zICk7XG5cdFx0ICAgIHZhciBjb21pbmdfeWVhcl9hbW91bnQgPSBwYXJzZUludCggcHJldmlvdXNfYW1vdW50LmNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMgKTtcblx0XHQgICAgdmFyIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ID0gcGFyc2VJbnQoIHByZXZpb3VzX2Ftb3VudC5hbm51YWxfcmVjdXJyaW5nX2Ftb3VudCApO1xuXHRcdCAgICAvLyBjYWxjdWxhdGUgbWVtYmVyIGxldmVsIGZvcm11bGFcblx0XHQgICAgaWYgKCB0eXBlID09PSAnb25lLXRpbWUnICkge1xuXHRcdCAgICAgIHByaW9yX3llYXJfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdCAgICB9IGVsc2Uge1xuXHRcdCAgICAgIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdCAgICB9XG5cblx0XHQgICAgdGhpc3llYXIgPSBNYXRoLm1heCggcHJpb3JfeWVhcl9hbW91bnQsIGNvbWluZ195ZWFyX2Ftb3VudCwgYW5udWFsX3JlY3VycmluZ19hbW91bnQgKTtcblx0XHQgIH1cblxuXHRcdCAgbGV2ZWwgPSB0aGlzLmdldExldmVsKCB0aGlzeWVhciApO1xuXG5cdFx0ICAkKCdoMicsIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IpLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdCAgICBpZiAoICQodGhpcykudGV4dCgpID09IGxldmVsWyduYW1lJ10gKSB7XG5cdFx0ICAgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHQgICAgICAkKHRoaXMpLnBhcmVudCgpLnBhcmVudCgpLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdCAgICB9XG5cdFx0ICB9ICk7XG5cdFx0ICByZXR1cm4gbGV2ZWw7XG5cblx0XHR9LCAvLyBlbmQgY2hlY2tMZXZlbFxuXG5cdFx0Z2V0TGV2ZWw6IGZ1bmN0aW9uKCB0aGlzeWVhciApIHtcblx0XHRcdHZhciBsZXZlbCA9IFtdO1xuXHRcdFx0aWYgKCB0aGlzeWVhciA+IDAgJiYgdGhpc3llYXIgPCA2MCApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdCcm9uemUnO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAxO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAodGhpc3llYXIgPiA1OSAmJiB0aGlzeWVhciA8IDEyMCkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ1NpbHZlcic7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDI7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMTE5ICYmIHRoaXN5ZWFyIDwgMjQwKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnR29sZCc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDM7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMjM5KSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnUGxhdGludW0nO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSA0O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGxldmVsO1xuXHRcdH0sIC8vIGVuZCBnZXRMZXZlbFxuXG5cdFx0c2hvd05ld0xldmVsOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKSB7XG5cdFx0XHR2YXIgbWVtYmVyX2xldmVsX3ByZWZpeCA9ICcnO1xuXHRcdFx0dmFyIG9sZF9sZXZlbCA9ICcnO1xuXHRcdFx0dmFyIGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgPSBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXI7IC8vIHRoaXMgc2hvdWxkIGNoYW5nZSB3aGVuIHdlIHJlcGxhY2UgdGhlIHRleHQsIGlmIHRoZXJlIGlzIGEgbGluayBpbnNpZGUgaXRcblx0XHRcdHZhciBkZWNvZGVIdG1sRW50aXR5ID0gZnVuY3Rpb24oIHN0ciApIHtcblx0XHRcdFx0cmV0dXJuIHN0ci5yZXBsYWNlKCAvJiMoXFxkKyk7L2csIGZ1bmN0aW9uKCBtYXRjaCwgZGVjICkge1xuXHRcdFx0XHRcdHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKCBkZWMgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9O1xuXHRcdFx0aWYgKCB0eXBlb2YgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0bWVtYmVyX2xldmVsX3ByZWZpeCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5tZW1iZXJfbGV2ZWxfcHJlZml4O1xuXHRcdFx0fVxuXG5cdFx0XHQkKG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lcikucHJvcCggJ2NsYXNzJywgJ2Etc2hvdy1sZXZlbCBhLXNob3ctbGV2ZWwtJyArIGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApO1xuXG5cdFx0XHRpZiAoICQoIG9wdGlvbnMudXNlcl9jdXJyZW50X2xldmVsICkubGVuZ3RoID4gMCAmJiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5sZW5ndGggPiAwICkge1xuXG5cdFx0XHRcdGlmICggJ2EnLCAkKCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRcdGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgPSBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKyAnIGEnO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0b2xkX2xldmVsID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwucmVwbGFjZSggbWVtYmVyX2xldmVsX3ByZWZpeCwgJycgKTtcblxuXHRcdFx0XHRpZiAoIG9sZF9sZXZlbCAhPT0gbGV2ZWxbJ25hbWUnXS50b0xvd2VyQ2FzZSgpICkge1xuXHRcdFx0XHRcdCQoIGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgKS5odG1sKCBkZWNvZGVIdG1sRW50aXR5KCAkKCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKS5kYXRhKCAnY2hhbmdlZCcgKSApICk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JCggbGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciApLmh0bWwoIGRlY29kZUh0bWxFbnRpdHkoICQoIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciApLmRhdGEoICdub3QtY2hhbmdlZCcgKSApICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0JChvcHRpb25zLmxldmVsX25hbWUsIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lcikudGV4dCggbGV2ZWxbJ25hbWUnXSApO1xuXG5cdFx0fSwgLy8gZW5kIHNob3dOZXdMZXZlbFxuXG5cdFx0Y2hhbmdlRnJlcXVlbmN5OiBmdW5jdGlvbiggc2VsZWN0ZWQsIGxldmVsLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcmFuZ2UgICAgICAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCk7XG5cdFx0XHRcdHZhciBtb250aF92YWx1ZSAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ21vbnRoJyk7XG5cdFx0XHQgICAgdmFyIHllYXJfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgneWVhcicpO1xuXHRcdFx0ICAgIHZhciBvbmNlX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ29uZS10aW1lJyk7XG5cdFx0XHQgICAgdmFyIGZyZXF1ZW5jeV9uYW1lID0gc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0ICAgIHZhciBmcmVxdWVuY3kgICAgICA9IHBhcnNlSW50KCBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMV0gKTtcblxuXHRcdFx0ICAgICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyApLnZhbCggc2VsZWN0ZWQgKTtcbiAgICBcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMgKS5wcm9wKCAnc2VsZWN0ZWQnLCBzZWxlY3RlZCApO1xuXG5cdFx0XHRcdGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciBtb250aCcgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5yZW1vdmVDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgeWVhcicgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gb25jZV92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcygnc21hbGxlcicgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoIHJhbmdlICk7XG4gICAgXHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkuZGF0YSggJ2ZyZXF1ZW5jeScsIGZyZXF1ZW5jeSApO1xuXG5cdFx0XHR9ICk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUZyZXF1ZW5jeVxuXG5cdFx0Y2hhbmdlQW1vdW50UHJldmlldzogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0ICAgIHZhciB5ZWFyX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ3llYXInKTtcblx0XHRcdCAgICB2YXIgb25jZV92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdvbmUtdGltZScpO1xuXHRcdFx0ICAgIHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuXG5cdFx0XHR9ICk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUFtb3VudFByZXZpZXdcblxuXHRcdHN0YXJ0TGV2ZWxDbGljazogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCcuc3RhcnQtbGV2ZWwnKS5jbGljayhmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGxldmVsX2NsYXNzID0gJCggdGhpcyApLnByb3AoICdjbGFzcycgKTtcblx0XHRcdFx0dmFyIGxldmVsX251bWJlciA9IGxldmVsX2NsYXNzW2xldmVsX2NsYXNzLmxlbmd0aCAtMV07XG5cdFx0XHQgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0ICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciwgZWxlbWVudCApLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0ICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciArICcgJyArIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHQgIH0pO1xuXHRcdH0sIC8vIGVuZCBzdGFydExldmVsQ2xpY2tcblxuXHRcdHN1Ym1pdEZvcm06IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0JCggZWxlbWVudCApLnN1Ym1pdCggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHR0aGF0LmFuYWx5dGljc0V2ZW50VHJhY2soICdldmVudCcsICdTdXBwb3J0IFVzJywgJ0JlY29tZSBBIE1lbWJlcicsIGxvY2F0aW9uLnBhdGhuYW1lICk7XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgc3VibWl0Rm9ybVxuXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblx0Ly8gQSByZWFsbHkgbGlnaHR3ZWlnaHQgcGx1Z2luIHdyYXBwZXIgYXJvdW5kIHRoZSBjb25zdHJ1Y3Rvcixcblx0Ly8gcHJldmVudGluZyBhZ2FpbnN0IG11bHRpcGxlIGluc3RhbnRpYXRpb25zXG5cdCQuZm5bcGx1Z2luTmFtZV0gPSBmdW5jdGlvbiAoIG9wdGlvbnMgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoICEgJC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lICkgKSB7XG5cdFx0XHRcdCQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSwgbmV3IFBsdWdpbiggdGhpcywgb3B0aW9ucyApICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG5cbn0pKCBqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQgKTtcbiJdfQ==
