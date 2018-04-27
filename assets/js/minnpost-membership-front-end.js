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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1lbWJlci1sZXZlbHMuanMiXSwibmFtZXMiOlsiJCIsIndpbmRvdyIsImRvY3VtZW50IiwidW5kZWZpbmVkIiwicGx1Z2luTmFtZSIsImRlZmF1bHRzIiwiUGx1Z2luIiwiZWxlbWVudCIsIm9wdGlvbnMiLCJleHRlbmQiLCJfZGVmYXVsdHMiLCJfbmFtZSIsImluaXQiLCJwcm90b3R5cGUiLCJyZXNldCIsImFtb3VudCIsImNhdGNoSGFzaExpbmtzIiwibGV2ZWxGbGlwcGVyIiwic3RhcnRMZXZlbENsaWNrIiwiY2xpY2siLCJlIiwidGFyZ2V0IiwicGFyZW50IiwibGVuZ3RoIiwibG9jYXRpb24iLCJwYXRobmFtZSIsInJlcGxhY2UiLCJob3N0bmFtZSIsImhhc2giLCJzbGljZSIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiLCJ0aGF0IiwicHJldmlvdXNfYW1vdW50IiwibGV2ZWwiLCJsZXZlbF9udW1iZXIiLCJmcmVxdWVuY3lfc3RyaW5nIiwiZnJlcXVlbmN5IiwiZnJlcXVlbmN5X25hbWUiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEiLCJ1c2VyX2N1cnJlbnRfbGV2ZWwiLCJjdXJyZW50X3VzZXIiLCJhbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSIsInZhbCIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lIiwic3BsaXQiLCJjaGVja0xldmVsIiwic2hvd05ld0xldmVsIiwiY2hhbmdlIiwiYXR0ciIsImJpbmQiLCJkYXRhIiwibGV2ZWxzX2NvbnRhaW5lciIsInNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yIiwiZWFjaCIsImZsaXBwZWRfaXRlbXMiLCJ3cmFwQWxsIiwiZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyIsIm9uIiwiZXZlbnQiLCJyZW1vdmVDbGFzcyIsInNpbmdsZV9sZXZlbF9jb250YWluZXIiLCJjbG9zZXN0IiwiYWRkQ2xhc3MiLCJhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwiYW1vdW50X3ZpZXdlciIsImNoYW5nZUZyZXF1ZW5jeSIsImxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yIiwidGV4dCIsImNoYW5nZUFtb3VudFByZXZpZXciLCJjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsInByZXZlbnREZWZhdWx0IiwidHlwZSIsInRoaXN5ZWFyIiwicGFyc2VJbnQiLCJwcmlvcl95ZWFyX2Ftb3VudCIsInByaW9yX3llYXJfY29udHJpYnV0aW9ucyIsImNvbWluZ195ZWFyX2Ftb3VudCIsImNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMiLCJhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCIsIk1hdGgiLCJtYXgiLCJnZXRMZXZlbCIsIm1lbWJlcl9sZXZlbF9wcmVmaXgiLCJvbGRfbGV2ZWwiLCJsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yIiwibGV2ZWxfdmlld2VyX2NvbnRhaW5lciIsImRlY29kZUh0bWxFbnRpdHkiLCJzdHIiLCJtYXRjaCIsImRlYyIsIlN0cmluZyIsImZyb21DaGFyQ29kZSIsInByb3AiLCJ0b0xvd2VyQ2FzZSIsIm1lbWJlcl9sZXZlbCIsImh0bWwiLCJsZXZlbF9uYW1lIiwic2VsZWN0ZWQiLCJyYW5nZSIsIm1vbnRoX3ZhbHVlIiwieWVhcl92YWx1ZSIsIm9uY2VfdmFsdWUiLCJsZXZlbF9jbGFzcyIsImZuIiwialF1ZXJ5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0EsQ0FBQyxDQUFDLFVBQVdBLENBQVgsRUFBY0MsTUFBZCxFQUFzQkMsUUFBdEIsRUFBZ0NDLFNBQWhDLEVBQTRDOztBQUU3QztBQUNBLEtBQUlDLGFBQWEsb0JBQWpCO0FBQUEsS0FDQUMsV0FBVztBQUNWLFdBQVUsS0FEQSxFQUNPO0FBQ2pCLGdDQUErQixzQkFGckI7QUFHVixtQ0FBa0MsK0NBSHhCO0FBSVYsNEJBQTJCLGVBSmpCO0FBS1YsZ0JBQWUsVUFMTDtBQU1WLHdCQUF1QixrQkFOYjtBQU9WLG9CQUFtQixjQVBUO0FBUVYsbUJBQWtCLFlBUlI7QUFTVixrQ0FBaUMsbUNBVHZCO0FBVVYsdUNBQXNDLFFBVjVCO0FBV1Ysc0JBQXFCLDZCQVhYO0FBWVYsNEJBQTJCLDRCQVpqQjtBQWFWLG1DQUFrQyx1QkFieEI7QUFjVixtQkFBa0IsdUJBZFI7QUFlVixtQ0FBa0MsaUJBZnhCO0FBZ0JWLHNDQUFxQyx3QkFoQjNCO0FBaUJWLCtCQUE4QjtBQWpCcEIsRUFEWCxDQUg2QyxDQXNCMUM7O0FBRUg7QUFDQSxVQUFTQyxNQUFULENBQWlCQyxPQUFqQixFQUEwQkMsT0FBMUIsRUFBb0M7O0FBRW5DLE9BQUtELE9BQUwsR0FBZUEsT0FBZjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQUtDLE9BQUwsR0FBZVIsRUFBRVMsTUFBRixDQUFVLEVBQVYsRUFBY0osUUFBZCxFQUF3QkcsT0FBeEIsQ0FBZjs7QUFFQSxPQUFLRSxTQUFMLEdBQWlCTCxRQUFqQjtBQUNBLE9BQUtNLEtBQUwsR0FBYVAsVUFBYjs7QUFFQSxPQUFLUSxJQUFMO0FBQ0EsRUF2QzRDLENBdUMzQzs7QUFFRk4sUUFBT08sU0FBUCxHQUFtQjs7QUFFbEJELFFBQU0sY0FBVUUsS0FBVixFQUFpQkMsTUFBakIsRUFBMEI7QUFDL0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBS0MsY0FBTCxDQUFxQixLQUFLVCxPQUExQixFQUFtQyxLQUFLQyxPQUF4QztBQUNBLFFBQUtTLFlBQUwsQ0FBbUIsS0FBS1YsT0FBeEIsRUFBaUMsS0FBS0MsT0FBdEM7QUFDQSxRQUFLVSxlQUFMLENBQXNCLEtBQUtYLE9BQTNCLEVBQW9DLEtBQUtDLE9BQXpDO0FBRUEsR0FiaUI7O0FBZWxCUSxrQkFBZ0Isd0JBQVVULE9BQVYsRUFBbUJDLE9BQW5CLEVBQTZCO0FBQzVDUixLQUFFLDhCQUFGLEVBQWtDTyxPQUFsQyxFQUEyQ1ksS0FBM0MsQ0FBaUQsVUFBU0MsQ0FBVCxFQUFZO0FBQ3pELFFBQUlDLFNBQVNyQixFQUFFb0IsRUFBRUMsTUFBSixDQUFiO0FBQ0EsUUFBSUEsT0FBT0MsTUFBUCxDQUFjLGdCQUFkLEVBQWdDQyxNQUFoQyxJQUEwQyxDQUExQyxJQUErQ0MsU0FBU0MsUUFBVCxDQUFrQkMsT0FBbEIsQ0FBMEIsS0FBMUIsRUFBZ0MsRUFBaEMsS0FBdUMsS0FBS0QsUUFBTCxDQUFjQyxPQUFkLENBQXNCLEtBQXRCLEVBQTRCLEVBQTVCLENBQXRGLElBQXlIRixTQUFTRyxRQUFULElBQXFCLEtBQUtBLFFBQXZKLEVBQWlLO0FBQ2hLLFNBQUlOLFNBQVNyQixFQUFFLEtBQUs0QixJQUFQLENBQWI7QUFDQVAsY0FBU0EsT0FBT0UsTUFBUCxHQUFnQkYsTUFBaEIsR0FBeUJyQixFQUFFLFdBQVcsS0FBSzRCLElBQUwsQ0FBVUMsS0FBVixDQUFnQixDQUFoQixDQUFYLEdBQStCLEdBQWpDLENBQWxDO0FBQ0gsU0FBSVIsT0FBT0UsTUFBWCxFQUFtQjtBQUNsQnZCLFFBQUUsV0FBRixFQUFlOEIsT0FBZixDQUF1QjtBQUN0QkMsa0JBQVdWLE9BQU9XLE1BQVAsR0FBZ0JDO0FBREwsT0FBdkIsRUFFRyxJQUZIO0FBR0EsYUFBTyxLQUFQO0FBQ0E7QUFDRDtBQUNELElBWkQ7QUFhQSxHQTdCaUIsRUE2QmY7O0FBRUhoQixnQkFBYyxzQkFBVVYsT0FBVixFQUFtQkMsT0FBbkIsRUFBNkI7QUFDMUMsT0FBSTBCLE9BQU8sSUFBWDtBQUNBLE9BQUlDLGtCQUFrQixFQUF0QjtBQUNBLE9BQUlwQixTQUFTLENBQWI7QUFDQSxPQUFJcUIsUUFBUSxFQUFaO0FBQ0EsT0FBSUMsZUFBZSxDQUFuQjtBQUNBLE9BQUlDLG1CQUFtQixFQUF2QjtBQUNBLE9BQUlDLFlBQVksRUFBaEI7QUFDQSxPQUFJQyxpQkFBaUIsRUFBckI7QUFDQSxPQUFLLE9BQU9DLHdCQUFQLEtBQW9DLFdBQXBDLElBQW1EekMsRUFBR1EsUUFBUWtDLGtCQUFYLEVBQWdDbkIsTUFBaEMsR0FBeUMsQ0FBakcsRUFBcUc7QUFDcEdZLHNCQUFrQk0seUJBQXlCRSxZQUF6QixDQUFzQ1IsZUFBeEQ7QUFDQTtBQUNELE9BQUtuQyxFQUFHUSxRQUFRb0MsMEJBQVgsRUFBd0NyQixNQUF4QyxHQUFpRCxDQUF0RCxFQUEwRDtBQUN6RFIsYUFBU2YsRUFBR1EsUUFBUW9DLDBCQUFYLEVBQXdDQyxHQUF4QyxFQUFUO0FBQ0FQLHVCQUFtQnRDLEVBQUVRLFFBQVFzQyw2QkFBUixHQUF3QyxVQUExQyxFQUFzREQsR0FBdEQsRUFBbkI7QUFDQU4sZ0JBQVlELGlCQUFpQlMsS0FBakIsQ0FBdUIsS0FBdkIsRUFBOEIsQ0FBOUIsQ0FBWjtBQUNBUCxxQkFBaUJGLGlCQUFpQlMsS0FBakIsQ0FBdUIsS0FBdkIsRUFBOEIsQ0FBOUIsQ0FBakI7O0FBRUdYLFlBQVFGLEtBQUtjLFVBQUwsQ0FBaUJqQyxNQUFqQixFQUF5QndCLFNBQXpCLEVBQW9DQyxjQUFwQyxFQUFvREwsZUFBcEQsRUFBcUU1QixPQUFyRSxFQUE4RUMsT0FBOUUsQ0FBUjtBQUNBMEIsU0FBS2UsWUFBTCxDQUFtQjFDLE9BQW5CLEVBQTRCQyxPQUE1QixFQUFxQzRCLEtBQXJDOztBQUVBcEMsTUFBRVEsUUFBUXNDLDZCQUFWLEVBQXlDSSxNQUF6QyxDQUFpRCxZQUFXOztBQUUzRFosd0JBQW1CdEMsRUFBR1EsUUFBUXNDLDZCQUFSLEdBQXdDLFVBQTNDLEVBQXVERCxHQUF2RCxFQUFuQjtBQUNITixpQkFBWUQsaUJBQWlCUyxLQUFqQixDQUF1QixLQUF2QixFQUE4QixDQUE5QixDQUFaO0FBQ0FQLHNCQUFpQkYsaUJBQWlCUyxLQUFqQixDQUF1QixLQUF2QixFQUE4QixDQUE5QixDQUFqQjs7QUFFSVgsYUFBUUYsS0FBS2MsVUFBTCxDQUFpQmhELEVBQUdRLFFBQVFvQywwQkFBWCxFQUF3Q0MsR0FBeEMsRUFBakIsRUFBZ0U3QyxFQUFHUSxRQUFRc0MsNkJBQVIsR0FBd0MsVUFBM0MsRUFBd0RLLElBQXhELENBQThELHFCQUE5RCxDQUFoRSxFQUF1SlgsY0FBdkosRUFBdUtMLGVBQXZLLEVBQXdMNUIsT0FBeEwsRUFBaU1DLE9BQWpNLENBQVI7QUFDQTBCLFVBQUtlLFlBQUwsQ0FBbUIxQyxPQUFuQixFQUE0QkMsT0FBNUIsRUFBcUM0QixLQUFyQztBQUNELEtBUkQ7O0FBVUFwQyxNQUFFUSxRQUFRb0MsMEJBQVYsRUFBc0NRLElBQXRDLENBQTJDLGVBQTNDLEVBQTRELFlBQVc7QUFDdEVkLHdCQUFtQnRDLEVBQUdRLFFBQVFzQyw2QkFBUixHQUF3QyxVQUEzQyxFQUF1REQsR0FBdkQsRUFBbkI7QUFDSE4saUJBQVlELGlCQUFpQlMsS0FBakIsQ0FBdUIsS0FBdkIsRUFBOEIsQ0FBOUIsQ0FBWjtBQUNBUCxzQkFBaUJGLGlCQUFpQlMsS0FBakIsQ0FBdUIsS0FBdkIsRUFBOEIsQ0FBOUIsQ0FBakI7QUFDSSxTQUFHL0MsRUFBRSxJQUFGLEVBQVFxRCxJQUFSLENBQWEsWUFBYixLQUE4QnJELEVBQUUsSUFBRixFQUFRNkMsR0FBUixFQUFqQyxFQUFnRDtBQUM5QzdDLFFBQUUsSUFBRixFQUFRcUQsSUFBUixDQUFhLFlBQWIsRUFBMkJyRCxFQUFFLElBQUYsRUFBUTZDLEdBQVIsRUFBM0I7QUFDQVQsY0FBUUYsS0FBS2MsVUFBTCxDQUFpQmhELEVBQUdRLFFBQVFvQywwQkFBWCxFQUF3Q0MsR0FBeEMsRUFBakIsRUFBZ0U3QyxFQUFHUSxRQUFRc0MsNkJBQVIsR0FBd0MsVUFBM0MsRUFBd0RLLElBQXhELENBQThELHFCQUE5RCxDQUFoRSxFQUF1SlgsY0FBdkosRUFBdUtMLGVBQXZLLEVBQXdMNUIsT0FBeEwsRUFBaU1DLE9BQWpNLENBQVI7QUFDQTBCLFdBQUtlLFlBQUwsQ0FBbUIxQyxPQUFuQixFQUE0QkMsT0FBNUIsRUFBcUM0QixLQUFyQztBQUNEO0FBQ0YsS0FURDtBQVdIO0FBQ0QsT0FBS3BDLEVBQUdRLFFBQVE4QyxnQkFBWCxFQUE4Qi9CLE1BQTlCLEdBQXVDLENBQTVDLEVBQWdEO0FBQy9DdkIsTUFBR1EsUUFBUStDLDZCQUFYLEVBQTBDaEQsT0FBMUMsRUFBb0RpRCxJQUFwRCxDQUF5RCxZQUFXO0FBQ25FeEQsT0FBR1EsUUFBUWlELGFBQVgsRUFBMEJ6RCxFQUFFLElBQUYsQ0FBMUIsRUFBb0MwRCxPQUFwQyxDQUE2Qyx3QkFBN0M7QUFDQSxLQUZEO0FBR0ExRCxNQUFHUSxRQUFRbUQsNEJBQVgsRUFBeUNwRCxPQUF6QyxFQUFtRHFELEVBQW5ELENBQXNELFFBQXRELEVBQWdFLFVBQVVDLEtBQVYsRUFBaUI7QUFDaEZ4QixvQkFBZXJDLEVBQUUsSUFBRixFQUFRcUQsSUFBUixDQUFhLHFCQUFiLENBQWY7QUFDQWYsd0JBQW1CdEMsRUFBRSxJQUFGLEVBQVE2QyxHQUFSLEVBQW5CO0FBQ0FOLGlCQUFZRCxpQkFBaUJTLEtBQWpCLENBQXVCLEtBQXZCLEVBQThCLENBQTlCLENBQVo7QUFDQVAsc0JBQWlCRixpQkFBaUJTLEtBQWpCLENBQXVCLEtBQXZCLEVBQThCLENBQTlCLENBQWpCO0FBQ0csU0FBSyxPQUFPVixZQUFQLEtBQXdCLFdBQTdCLEVBQTJDOztBQUU3Q3JDLFFBQUdRLFFBQVErQyw2QkFBWCxFQUEwQ2hELE9BQTFDLEVBQW1EdUQsV0FBbkQsQ0FBZ0UsU0FBaEU7QUFDQTlELFFBQUdRLFFBQVF1RCxzQkFBWCxFQUFtQ3hELE9BQW5DLEVBQTRDdUQsV0FBNUMsQ0FBeUQsUUFBekQ7QUFDQTlELFFBQUc2RCxNQUFNeEMsTUFBVCxFQUFrQjJDLE9BQWxCLENBQTJCeEQsUUFBUStDLDZCQUFuQyxFQUFtRVUsUUFBbkUsQ0FBNkUsU0FBN0U7O0FBRUEsVUFBSzFCLGFBQWEsQ0FBbEIsRUFBc0I7QUFDckJ2QyxTQUFHUSxRQUFRMEQseUJBQVgsRUFBc0NyQixHQUF0QyxDQUEyQzdDLEVBQUdRLFFBQVEyRCxhQUFYLEVBQTBCbkUsRUFBR1EsUUFBUXVELHNCQUFSLEdBQWlDLEdBQWpDLEdBQXVDMUIsWUFBMUMsQ0FBMUIsRUFBcUZnQixJQUFyRixDQUEwRixnQkFBMUYsQ0FBM0M7QUFDQSxPQUZELE1BRU8sSUFBS2QsYUFBYSxFQUFsQixFQUF1QjtBQUM3QnZDLFNBQUdRLFFBQVEwRCx5QkFBWCxFQUFzQ3JCLEdBQXRDLENBQTJDN0MsRUFBR1EsUUFBUTJELGFBQVgsRUFBMEJuRSxFQUFHUSxRQUFRdUQsc0JBQVIsR0FBaUMsR0FBakMsR0FBdUMxQixZQUExQyxDQUExQixFQUFxRmdCLElBQXJGLENBQTBGLGlCQUExRixDQUEzQztBQUNBOztBQUVEdEMsZUFBU2YsRUFBR1EsUUFBUTBELHlCQUFSLEdBQW9DLDZCQUFwQyxHQUFvRTdCLFlBQXBFLEdBQW1GLElBQXRGLEVBQTRGUSxHQUE1RixFQUFUOztBQUVBVCxjQUFRRixLQUFLYyxVQUFMLENBQWlCakMsTUFBakIsRUFBeUJ3QixTQUF6QixFQUFvQ0MsY0FBcEMsRUFBb0RMLGVBQXBELEVBQXFFNUIsT0FBckUsRUFBOEVDLE9BQTlFLENBQVI7QUFDQTBCLFdBQUtrQyxlQUFMLENBQXNCOUIsZ0JBQXRCLEVBQXdDRixNQUFNLE1BQU4sQ0FBeEMsRUFBdUQ3QixPQUF2RCxFQUFnRUMsT0FBaEU7QUFFQSxNQWpCRSxNQWlCSSxJQUFLUixFQUFHUSxRQUFRNkQsNkJBQVgsRUFBMkM5QyxNQUEzQyxHQUFvRCxDQUF6RCxFQUE2RDtBQUNuRXZCLFFBQUVRLFFBQVE2RCw2QkFBVixFQUF5QzlELE9BQXpDLEVBQWtEK0QsSUFBbEQsQ0FBdUQ5QixjQUF2RDtBQUNBeEMsUUFBR1EsUUFBUXVELHNCQUFYLEVBQW9DUCxJQUFwQyxDQUEwQyxZQUFXO0FBQ3BEbkIsc0JBQWVyQyxFQUFFUSxRQUFRMEQseUJBQVYsRUFBcUNsRSxFQUFFLElBQUYsQ0FBckMsRUFBOENxRCxJQUE5QyxDQUFtRCxxQkFBbkQsQ0FBZjtBQUNBLFdBQUssT0FBT2hCLFlBQVAsS0FBd0IsV0FBN0IsRUFBMkM7QUFDMUN0QixpQkFBU2YsRUFBR1EsUUFBUTBELHlCQUFYLEVBQXNDbEUsRUFBRSxJQUFGLENBQXRDLEVBQWdENkMsR0FBaEQsRUFBVDtBQUNBVCxnQkFBUUYsS0FBS2MsVUFBTCxDQUFpQmpDLE1BQWpCLEVBQXlCd0IsU0FBekIsRUFBb0NDLGNBQXBDLEVBQW9ETCxlQUFwRCxFQUFxRTVCLE9BQXJFLEVBQThFQyxPQUE5RSxDQUFSO0FBQ0E7QUFDRCxPQU5EO0FBT0E7O0FBRUQwQixVQUFLcUMsbUJBQUwsQ0FBMEJqQyxnQkFBMUIsRUFBNENGLE1BQU0sTUFBTixDQUE1QyxFQUEyRDdCLE9BQTNELEVBQW9FQyxPQUFwRTtBQUVBLEtBbkNEO0FBb0NBO0FBQ0QsT0FBS1IsRUFBR1EsUUFBUWdFLGdDQUFYLEVBQThDakQsTUFBOUMsR0FBdUQsQ0FBNUQsRUFBZ0U7QUFDL0R2QixNQUFHUSxRQUFRZ0UsZ0NBQVgsRUFBNkNqRSxPQUE3QyxFQUF1RFksS0FBdkQsQ0FBOEQsVUFBVTBDLEtBQVYsRUFBa0I7QUFDL0V4QixvQkFBZXJDLEVBQUdRLFFBQVFtRCw0QkFBWCxFQUF5Q3BELE9BQXpDLEVBQW1EOEMsSUFBbkQsQ0FBd0QscUJBQXhELENBQWY7QUFDQXJELE9BQUdRLFFBQVErQyw2QkFBWCxFQUEwQ2hELE9BQTFDLEVBQW1EdUQsV0FBbkQsQ0FBZ0UsU0FBaEU7QUFDQTlELE9BQUdRLFFBQVF1RCxzQkFBWCxFQUFtQ3hELE9BQW5DLEVBQTRDdUQsV0FBNUMsQ0FBeUQsUUFBekQ7QUFDQTlELE9BQUc2RCxNQUFNeEMsTUFBVCxFQUFrQjJDLE9BQWxCLENBQTJCeEQsUUFBUStDLDZCQUFuQyxFQUFtRVUsUUFBbkUsQ0FBNkUsU0FBN0U7QUFDQTNCLHdCQUFtQnRDLEVBQUVRLFFBQVFtRCw0QkFBVixFQUF3QzNELEVBQUUsSUFBRixFQUFRc0IsTUFBUixFQUF4QyxFQUEyRHVCLEdBQTNELEVBQW5CO0FBQ0FOLGlCQUFZRCxpQkFBaUJTLEtBQWpCLENBQXVCLEtBQXZCLEVBQThCLENBQTlCLENBQVo7QUFDQWhDLGNBQVNmLEVBQUdRLFFBQVEwRCx5QkFBUixHQUFvQyw2QkFBcEMsR0FBb0U3QixZQUFwRSxHQUFtRixJQUF0RixFQUE0RlEsR0FBNUYsRUFBVDtBQUNBVCxhQUFRRixLQUFLYyxVQUFMLENBQWlCakMsTUFBakIsRUFBeUJ3QixTQUF6QixFQUFvQ0MsY0FBcEMsRUFBb0RMLGVBQXBELEVBQXFFNUIsT0FBckUsRUFBOEVDLE9BQTlFLENBQVI7QUFDQXFELFdBQU1ZLGNBQU47QUFDQSxLQVZEO0FBV0E7QUFDRCxHQWhJaUIsRUFnSWY7O0FBRUh6QixjQUFZLG9CQUFVakMsTUFBVixFQUFrQndCLFNBQWxCLEVBQTZCbUMsSUFBN0IsRUFBbUN2QyxlQUFuQyxFQUFvRDVCLE9BQXBELEVBQTZEQyxPQUE3RCxFQUF1RTtBQUNqRixPQUFJbUUsV0FBV0MsU0FBVTdELE1BQVYsSUFBcUI2RCxTQUFVckMsU0FBVixDQUFwQztBQUNBLE9BQUlILFFBQVEsRUFBWjtBQUNBLE9BQUssT0FBT0QsZUFBUCxLQUEyQixXQUEzQixJQUEwQ0Esb0JBQW9CLEVBQW5FLEVBQXdFO0FBQ3RFLFFBQUkwQyxvQkFBb0JELFNBQVV6QyxnQkFBZ0IyQyx3QkFBMUIsQ0FBeEI7QUFDQSxRQUFJQyxxQkFBcUJILFNBQVV6QyxnQkFBZ0I2Qyx5QkFBMUIsQ0FBekI7QUFDQSxRQUFJQywwQkFBMEJMLFNBQVV6QyxnQkFBZ0I4Qyx1QkFBMUIsQ0FBOUI7QUFDQTtBQUNBLFFBQUtQLFNBQVMsVUFBZCxFQUEyQjtBQUN6QkcsMEJBQXFCRixRQUFyQjtBQUNELEtBRkQsTUFFTztBQUNMTSxnQ0FBMkJOLFFBQTNCO0FBQ0Q7O0FBRURBLGVBQVdPLEtBQUtDLEdBQUwsQ0FBVU4saUJBQVYsRUFBNkJFLGtCQUE3QixFQUFpREUsdUJBQWpELENBQVg7QUFDRDs7QUFFRDdDLFdBQVEsS0FBS2dELFFBQUwsQ0FBZVQsUUFBZixDQUFSOztBQUVBM0UsS0FBRSxJQUFGLEVBQVFRLFFBQVErQyw2QkFBaEIsRUFBK0NDLElBQS9DLENBQXFELFlBQVc7QUFDOUQsUUFBS3hELEVBQUUsSUFBRixFQUFRc0UsSUFBUixNQUFrQmxDLE1BQU0sTUFBTixDQUF2QixFQUF1QztBQUNyQ3BDLE9BQUdRLFFBQVF1RCxzQkFBWCxFQUFtQ3hELE9BQW5DLEVBQTRDdUQsV0FBNUMsQ0FBeUQsUUFBekQ7QUFDQTlELE9BQUUsSUFBRixFQUFRc0IsTUFBUixHQUFpQkEsTUFBakIsR0FBMEIyQyxRQUExQixDQUFvQyxRQUFwQztBQUNEO0FBQ0YsSUFMRDtBQU1BLFVBQU83QixLQUFQO0FBRUQsR0E3SmlCLEVBNkpmOztBQUVIZ0QsWUFBVSxrQkFBVVQsUUFBVixFQUFxQjtBQUM5QixPQUFJdkMsUUFBUSxFQUFaO0FBQ0EsT0FBS3VDLFdBQVcsQ0FBWCxJQUFnQkEsV0FBVyxFQUFoQyxFQUFxQztBQUNwQ3ZDLFVBQU0sTUFBTixJQUFnQixRQUFoQjtBQUNBQSxVQUFNLFFBQU4sSUFBa0IsQ0FBbEI7QUFDQSxJQUhELE1BSUssSUFBSXVDLFdBQVcsRUFBWCxJQUFpQkEsV0FBVyxHQUFoQyxFQUFxQztBQUN6Q3ZDLFVBQU0sTUFBTixJQUFnQixRQUFoQjtBQUNBQSxVQUFNLFFBQU4sSUFBa0IsQ0FBbEI7QUFDQSxJQUhJLE1BR0UsSUFBSXVDLFdBQVcsR0FBWCxJQUFrQkEsV0FBVyxHQUFqQyxFQUFzQztBQUM1Q3ZDLFVBQU0sTUFBTixJQUFnQixNQUFoQjtBQUNBQSxVQUFNLFFBQU4sSUFBa0IsQ0FBbEI7QUFDQSxJQUhNLE1BR0EsSUFBSXVDLFdBQVcsR0FBZixFQUFvQjtBQUMxQnZDLFVBQU0sTUFBTixJQUFnQixVQUFoQjtBQUNBQSxVQUFNLFFBQU4sSUFBa0IsQ0FBbEI7QUFDQTtBQUNELFVBQU9BLEtBQVA7QUFDQSxHQWhMaUIsRUFnTGY7O0FBRUhhLGdCQUFjLHNCQUFVMUMsT0FBVixFQUFtQkMsT0FBbkIsRUFBNEI0QixLQUE1QixFQUFvQztBQUNqRCxPQUFJaUQsc0JBQXNCLEVBQTFCO0FBQ0EsT0FBSUMsWUFBWSxFQUFoQjtBQUNBLE9BQUlDLGtDQUFrQy9FLFFBQVFnRixzQkFBOUMsQ0FIaUQsQ0FHcUI7QUFDdEUsT0FBSUMsbUJBQW1CLFNBQW5CQSxnQkFBbUIsQ0FBVUMsR0FBVixFQUFnQjtBQUN0QyxXQUFPQSxJQUFJaEUsT0FBSixDQUFhLFdBQWIsRUFBMEIsVUFBVWlFLEtBQVYsRUFBaUJDLEdBQWpCLEVBQXVCO0FBQ3ZELFlBQU9DLE9BQU9DLFlBQVAsQ0FBcUJGLEdBQXJCLENBQVA7QUFDQSxLQUZNLENBQVA7QUFHQSxJQUpEO0FBS0EsT0FBSyxPQUFPbkQsd0JBQVAsS0FBb0MsV0FBekMsRUFBdUQ7QUFDdEQ0QywwQkFBc0I1Qyx5QkFBeUI0QyxtQkFBL0M7QUFDQTs7QUFFRHJGLEtBQUVRLFFBQVFnRixzQkFBVixFQUFrQ08sSUFBbEMsQ0FBd0MsT0FBeEMsRUFBaUQsK0JBQStCM0QsTUFBTSxNQUFOLEVBQWM0RCxXQUFkLEVBQWhGOztBQUVBLE9BQUtoRyxFQUFHUSxRQUFRa0Msa0JBQVgsRUFBZ0NuQixNQUFoQyxHQUF5QyxDQUF6QyxJQUE4Q2tCLHlCQUF5QkUsWUFBekIsQ0FBc0NzRCxZQUF0QyxDQUFtRDFFLE1BQW5ELEdBQTRELENBQS9HLEVBQW1IOztBQUVsSCxRQUFLLEtBQUt2QixFQUFHUSxRQUFRZ0Ysc0JBQVgsRUFBb0NqRSxNQUFwQyxHQUE2QyxDQUF2RCxFQUEyRDtBQUMxRGdFLHVDQUFrQy9FLFFBQVFnRixzQkFBUixHQUFpQyxJQUFuRTtBQUNBOztBQUVERixnQkFBWTdDLHlCQUF5QkUsWUFBekIsQ0FBc0NzRCxZQUF0QyxDQUFtRHZFLE9BQW5ELENBQTREMkQsbUJBQTVELEVBQWlGLEVBQWpGLENBQVo7O0FBRUEsUUFBS0MsY0FBY2xELE1BQU0sTUFBTixFQUFjNEQsV0FBZCxFQUFuQixFQUFpRDtBQUNoRGhHLE9BQUd1RiwrQkFBSCxFQUFxQ1csSUFBckMsQ0FBMkNULGlCQUFrQnpGLEVBQUdRLFFBQVFnRixzQkFBWCxFQUFvQ25DLElBQXBDLENBQTBDLFNBQTFDLENBQWxCLENBQTNDO0FBQ0EsS0FGRCxNQUVPO0FBQ05yRCxPQUFHdUYsK0JBQUgsRUFBcUNXLElBQXJDLENBQTJDVCxpQkFBa0J6RixFQUFHUSxRQUFRZ0Ysc0JBQVgsRUFBb0NuQyxJQUFwQyxDQUEwQyxhQUExQyxDQUFsQixDQUEzQztBQUNBO0FBQ0Q7O0FBRURyRCxLQUFFUSxRQUFRMkYsVUFBVixFQUFzQjNGLFFBQVFnRixzQkFBOUIsRUFBc0RsQixJQUF0RCxDQUE0RGxDLE1BQU0sTUFBTixDQUE1RDtBQUVBLEdBbE5pQixFQWtOZjs7QUFFSGdDLG1CQUFpQix5QkFBVWdDLFFBQVYsRUFBb0JoRSxLQUFwQixFQUEyQjdCLE9BQTNCLEVBQW9DQyxPQUFwQyxFQUE4QztBQUM5RFIsS0FBR1EsUUFBUStDLDZCQUFYLEVBQTJDQyxJQUEzQyxDQUFpRCxZQUFXO0FBQzNELFFBQUk2QyxRQUFpQnJHLEVBQUdRLFFBQVEyRCxhQUFYLEVBQTBCbkUsRUFBRSxJQUFGLENBQTFCLEVBQW9Dc0UsSUFBcEMsRUFBckI7QUFDQSxRQUFJZ0MsY0FBaUJ0RyxFQUFHUSxRQUFRMkQsYUFBWCxFQUEwQm5FLEVBQUUsSUFBRixDQUExQixFQUFvQ3FELElBQXBDLENBQXlDLE9BQXpDLENBQXJCO0FBQ0csUUFBSWtELGFBQWlCdkcsRUFBR1EsUUFBUTJELGFBQVgsRUFBMEJuRSxFQUFFLElBQUYsQ0FBMUIsRUFBb0NxRCxJQUFwQyxDQUF5QyxNQUF6QyxDQUFyQjtBQUNBLFFBQUltRCxhQUFpQnhHLEVBQUdRLFFBQVEyRCxhQUFYLEVBQTBCbkUsRUFBRSxJQUFGLENBQTFCLEVBQW9DcUQsSUFBcEMsQ0FBeUMsVUFBekMsQ0FBckI7QUFDQSxRQUFJYixpQkFBaUI0RCxTQUFTckQsS0FBVCxDQUFlLEtBQWYsRUFBc0IsQ0FBdEIsQ0FBckI7QUFDQSxRQUFJUixZQUFpQnFDLFNBQVV3QixTQUFTckQsS0FBVCxDQUFlLEtBQWYsRUFBc0IsQ0FBdEIsQ0FBVixDQUFyQjs7QUFFQS9DLE1BQUdRLFFBQVFtRCw0QkFBWCxFQUEwQ2QsR0FBMUMsQ0FBK0N1RCxRQUEvQztBQUNBcEcsTUFBR1EsUUFBUW1ELDRCQUFYLEVBQTBDb0MsSUFBMUMsQ0FBZ0QsVUFBaEQsRUFBNERLLFFBQTVEOztBQUVILFFBQUs1RCxrQkFBa0IsV0FBdkIsRUFBcUM7QUFDcEM2RCxhQUFRQyxXQUFSO0FBQ0F0RyxPQUFHUSxRQUFRMkQsYUFBWCxFQUEwQm5FLEVBQUUsSUFBRixDQUExQixFQUFvQzhELFdBQXBDLENBQWlELFNBQWpEO0FBQ0EsS0FIRCxNQUdPLElBQUt0QixrQkFBa0IsVUFBdkIsRUFBb0M7QUFDMUM2RCxhQUFRRSxVQUFSO0FBQ0F2RyxPQUFHUSxRQUFRMkQsYUFBWCxFQUEwQm5FLEVBQUUsSUFBRixDQUExQixFQUFvQ2lFLFFBQXBDLENBQThDLFNBQTlDO0FBQ0EsS0FITSxNQUdBLElBQUl6QixrQkFBa0IsVUFBdEIsRUFBbUM7QUFDekM2RCxhQUFRRyxVQUFSO0FBQ0F4RyxPQUFHUSxRQUFRMkQsYUFBWCxFQUEwQm5FLEVBQUUsSUFBRixDQUExQixFQUFvQ2lFLFFBQXBDLENBQTZDLFNBQTdDO0FBQ0E7O0FBRURqRSxNQUFHUSxRQUFRMkQsYUFBWCxFQUEwQm5FLEVBQUUsSUFBRixDQUExQixFQUFvQ3NFLElBQXBDLENBQTBDK0IsS0FBMUM7QUFDR3JHLE1BQUdRLFFBQVFtRCw0QkFBWCxFQUF5QzNELEVBQUUsSUFBRixDQUF6QyxFQUFtRHFELElBQW5ELENBQXlELFdBQXpELEVBQXNFZCxTQUF0RTtBQUVILElBekJEO0FBMEJBLEdBL09pQixFQStPZjs7QUFFSGdDLHVCQUFxQiw2QkFBVTZCLFFBQVYsRUFBb0JoRSxLQUFwQixFQUEyQjdCLE9BQTNCLEVBQW9DQyxPQUFwQyxFQUE4QztBQUNsRVIsS0FBR1EsUUFBUStDLDZCQUFYLEVBQTJDQyxJQUEzQyxDQUFpRCxZQUFXO0FBQzNELFFBQUk2QyxRQUFpQnJHLEVBQUdRLFFBQVEyRCxhQUFYLEVBQTBCbkUsRUFBRSxJQUFGLENBQTFCLEVBQW9Dc0UsSUFBcEMsRUFBckI7QUFDQSxRQUFJZ0MsY0FBaUJ0RyxFQUFHUSxRQUFRMkQsYUFBWCxFQUEwQm5FLEVBQUUsSUFBRixDQUExQixFQUFvQ3FELElBQXBDLENBQXlDLE9BQXpDLENBQXJCO0FBQ0csUUFBSWtELGFBQWlCdkcsRUFBR1EsUUFBUTJELGFBQVgsRUFBMEJuRSxFQUFFLElBQUYsQ0FBMUIsRUFBb0NxRCxJQUFwQyxDQUF5QyxNQUF6QyxDQUFyQjtBQUNBLFFBQUltRCxhQUFpQnhHLEVBQUdRLFFBQVEyRCxhQUFYLEVBQTBCbkUsRUFBRSxJQUFGLENBQTFCLEVBQW9DcUQsSUFBcEMsQ0FBeUMsVUFBekMsQ0FBckI7QUFDQSxRQUFJYixpQkFBaUI0RCxTQUFTckQsS0FBVCxDQUFlLEtBQWYsRUFBc0IsQ0FBdEIsQ0FBckI7O0FBRUgsUUFBS1Asa0JBQWtCLFdBQXZCLEVBQXFDO0FBQ3BDNkQsYUFBUUMsV0FBUjtBQUNBdEcsT0FBR1EsUUFBUTJELGFBQVgsRUFBMEJuRSxFQUFFLElBQUYsQ0FBMUIsRUFBb0M4RCxXQUFwQyxDQUFpRCxTQUFqRDtBQUNBLEtBSEQsTUFHTyxJQUFLdEIsa0JBQWtCLFVBQXZCLEVBQW9DO0FBQzFDNkQsYUFBUUUsVUFBUjtBQUNBdkcsT0FBR1EsUUFBUTJELGFBQVgsRUFBMEJuRSxFQUFFLElBQUYsQ0FBMUIsRUFBb0NpRSxRQUFwQyxDQUE4QyxTQUE5QztBQUNBLEtBSE0sTUFHQSxJQUFJekIsa0JBQWtCLFVBQXRCLEVBQW1DO0FBQ3pDNkQsYUFBUUcsVUFBUjtBQUNBeEcsT0FBR1EsUUFBUTJELGFBQVgsRUFBMEJuRSxFQUFFLElBQUYsQ0FBMUIsRUFBb0NpRSxRQUFwQyxDQUE2QyxTQUE3QztBQUNBOztBQUVEakUsTUFBR1EsUUFBUTJELGFBQVgsRUFBMEJuRSxFQUFFLElBQUYsQ0FBMUIsRUFBb0NzRSxJQUFwQyxDQUEwQytCLEtBQTFDO0FBRUEsSUFwQkQ7QUFxQkEsR0F2UWlCLEVBdVFmOztBQUVIbkYsbUJBQWlCLHlCQUFVWCxPQUFWLEVBQW1CQyxPQUFuQixFQUE2QjtBQUM3Q1IsS0FBRSxjQUFGLEVBQWtCbUIsS0FBbEIsQ0FBd0IsWUFBVztBQUNsQyxRQUFJc0YsY0FBY3pHLEVBQUcsSUFBSCxFQUFVK0YsSUFBVixDQUFnQixPQUFoQixDQUFsQjtBQUNBLFFBQUkxRCxlQUFlb0UsWUFBWUEsWUFBWWxGLE1BQVosR0FBb0IsQ0FBaEMsQ0FBbkI7QUFDR3ZCLE1BQUdRLFFBQVErQyw2QkFBWCxFQUEwQ2hELE9BQTFDLEVBQW1EdUQsV0FBbkQsQ0FBZ0UsU0FBaEU7QUFDSDlELE1BQUdRLFFBQVF1RCxzQkFBWCxFQUFtQ3hELE9BQW5DLEVBQTRDdUQsV0FBNUMsQ0FBeUQsUUFBekQ7QUFDRzlELE1BQUdRLFFBQVF1RCxzQkFBUixHQUFpQyxHQUFqQyxHQUF1QzFCLFlBQTFDLEVBQXdEOUIsT0FBeEQsRUFBa0UwRCxRQUFsRSxDQUE0RSxRQUE1RTtBQUNBakUsTUFBR1EsUUFBUXVELHNCQUFSLEdBQWlDLEdBQWpDLEdBQXVDMUIsWUFBdkMsR0FBc0QsR0FBdEQsR0FBNEQ3QixRQUFRK0MsNkJBQXZFLEVBQXVHVSxRQUF2RyxDQUFpSCxTQUFqSDtBQUNELElBUEg7QUFRQSxHQWxSaUIsQ0FrUmY7O0FBbFJlLEVBQW5CLENBekM2QyxDQTZUMUM7O0FBRUg7QUFDQTtBQUNBakUsR0FBRTBHLEVBQUYsQ0FBS3RHLFVBQUwsSUFBbUIsVUFBV0ksT0FBWCxFQUFxQjtBQUN2QyxTQUFPLEtBQUtnRCxJQUFMLENBQVUsWUFBWTtBQUM1QixPQUFLLENBQUV4RCxFQUFFcUQsSUFBRixDQUFRLElBQVIsRUFBYyxZQUFZakQsVUFBMUIsQ0FBUCxFQUFnRDtBQUMvQ0osTUFBRXFELElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWWpELFVBQTFCLEVBQXNDLElBQUlFLE1BQUosQ0FBWSxJQUFaLEVBQWtCRSxPQUFsQixDQUF0QztBQUNBO0FBQ0QsR0FKTSxDQUFQO0FBS0EsRUFORDtBQVFBLENBelVBLEVBeVVHbUcsTUF6VUgsRUF5VVcxRyxNQXpVWCxFQXlVbUJDLFFBelVuQiIsImZpbGUiOiJtaW5ucG9zdC1tZW1iZXJzaGlwLWZyb250LWVuZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQsIHVuZGVmaW5lZCApIHtcblxuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0dmFyIHBsdWdpbk5hbWUgPSAnbWlubnBvc3RNZW1iZXJzaGlwJyxcblx0ZGVmYXVsdHMgPSB7XG5cdFx0J2RlYnVnJyA6IGZhbHNlLCAvLyB0aGlzIGNhbiBiZSBzZXQgdG8gdHJ1ZSBvbiBwYWdlIGxldmVsIG9wdGlvbnNcblx0XHQnYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUnIDogJyNhbW91bnQtaXRlbSAjYW1vdW50Jyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUnIDogJy5tLW1lbWJlcnNoaXAtZmFzdC1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHQnbGV2ZWxfdmlld2VyX2NvbnRhaW5lcicgOiAnLmEtc2hvdy1sZXZlbCcsXG5cdFx0J2xldmVsX25hbWUnIDogJy5hLWxldmVsJyxcblx0XHQndXNlcl9jdXJyZW50X2xldmVsJyA6ICcuYS1jdXJyZW50LWxldmVsJyxcblx0XHQndXNlcl9uZXdfbGV2ZWwnIDogJy5hLW5ldy1sZXZlbCcsXG5cdFx0J2Ftb3VudF92aWV3ZXInIDogJy5hbW91bnQgaDMnLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuYS1mb3JtLWl0ZW0tbWVtYmVyc2hpcC1mcmVxdWVuY3knLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzX3R5cGUnIDogJ3NlbGVjdCcsXG5cdFx0J2xldmVsc19jb250YWluZXInIDogJy5vLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVscycsXG5cdFx0J3NpbmdsZV9sZXZlbF9jb250YWluZXInIDogJy5tLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVsJyxcblx0XHQnc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3InIDogJy5tLW1lbWJlci1sZXZlbC1icmllZicsXG5cdFx0J2ZsaXBwZWRfaXRlbXMnIDogJ2Rpdi5hbW91bnQsIGRpdi5lbnRlcicsXG5cdFx0J2xldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yJyA6ICcuc2hvdy1mcmVxdWVuY3knLFxuXHRcdCdjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmFtb3VudCAuYS1idXR0b24tZmxpcCcsXG5cdFx0J2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5lbnRlciBpbnB1dC5hbW91bnQtZW50cnknLFxuXHR9OyAvLyBlbmQgZGVmYXVsdHNcblxuXHQvLyBUaGUgYWN0dWFsIHBsdWdpbiBjb25zdHJ1Y3RvclxuXHRmdW5jdGlvbiBQbHVnaW4oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cblx0XHRpbml0OiBmdW5jdGlvbiggcmVzZXQsIGFtb3VudCApIHtcblx0XHRcdC8vIFBsYWNlIGluaXRpYWxpemF0aW9uIGxvZ2ljIGhlcmVcblx0XHRcdC8vIFlvdSBhbHJlYWR5IGhhdmUgYWNjZXNzIHRvIHRoZSBET00gZWxlbWVudCBhbmRcblx0XHRcdC8vIHRoZSBvcHRpb25zIHZpYSB0aGUgaW5zdGFuY2UsIGUuZy4gdGhpcy5lbGVtZW50XG5cdFx0XHQvLyBhbmQgdGhpcy5vcHRpb25zXG5cdFx0XHQvLyB5b3UgY2FuIGFkZCBtb3JlIGZ1bmN0aW9ucyBsaWtlIHRoZSBvbmUgYmVsb3cgYW5kXG5cdFx0XHQvLyBjYWxsIHRoZW0gbGlrZSBzbzogdGhpcy55b3VyT3RoZXJGdW5jdGlvbih0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucykuXG5cdFx0XHR0aGlzLmNhdGNoSGFzaExpbmtzKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyk7XG5cdFx0XHR0aGlzLmxldmVsRmxpcHBlciggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHRcdHRoaXMuc3RhcnRMZXZlbENsaWNrKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXG5cdFx0fSxcblxuXHRcdGNhdGNoSGFzaExpbmtzOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoJ2FbaHJlZio9XCIjXCJdOm5vdChbaHJlZj1cIiNcIl0pJywgZWxlbWVudCkuY2xpY2soZnVuY3Rpb24oZSkge1xuXHRcdFx0ICAgIHZhciB0YXJnZXQgPSAkKGUudGFyZ2V0KTtcblx0XHRcdCAgICBpZiAodGFyZ2V0LnBhcmVudCgnLmNvbW1lbnQtdGl0bGUnKS5sZW5ndGggPT0gMCAmJiBsb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywnJykgPT0gdGhpcy5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywnJykgJiYgbG9jYXRpb24uaG9zdG5hbWUgPT0gdGhpcy5ob3N0bmFtZSkge1xuXHRcdFx0XHQgICAgdmFyIHRhcmdldCA9ICQodGhpcy5oYXNoKTtcblx0XHRcdFx0ICAgIHRhcmdldCA9IHRhcmdldC5sZW5ndGggPyB0YXJnZXQgOiAkKCdbbmFtZT0nICsgdGhpcy5oYXNoLnNsaWNlKDEpICsnXScpO1xuXHRcdFx0XHRcdGlmICh0YXJnZXQubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHQkKCdodG1sLGJvZHknKS5hbmltYXRlKHtcblx0XHRcdFx0XHRcdFx0c2Nyb2xsVG9wOiB0YXJnZXQub2Zmc2V0KCkudG9wXG5cdFx0XHRcdFx0XHR9LCAxMDAwKTtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBjYXRjaExpbmtzXG5cblx0XHRsZXZlbEZsaXBwZXI6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dmFyIHByZXZpb3VzX2Ftb3VudCA9ICcnO1xuXHRcdFx0dmFyIGFtb3VudCA9IDA7XG5cdFx0XHR2YXIgbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSAwO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9zdHJpbmcgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3kgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9ICcnO1xuXHRcdFx0aWYgKCB0eXBlb2YgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhICE9PSAndW5kZWZpbmVkJyAmJiAkKCBvcHRpb25zLnVzZXJfY3VycmVudF9sZXZlbCApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdHByZXZpb3VzX2Ftb3VudCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIucHJldmlvdXNfYW1vdW50O1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLnZhbCgpO1xuXHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJykudmFsKCk7XG5cdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHQgICAgbGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHQgICAgdGhhdC5zaG93TmV3TGV2ZWwoIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICk7XG5cblx0XHRcdCAgICAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUpLmNoYW5nZSggZnVuY3Rpb24oKSB7XG5cblx0XHRcdCAgICBcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJykudmFsKClcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHQgICAgICBsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLnZhbCgpLCAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJyApLmF0dHIoICdkYXRhLXllYXItZnJlcXVlbmN5JyApLCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHQgICAgICB0aGF0LnNob3dOZXdMZXZlbCggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKTtcblx0XHRcdCAgICB9KTtcblxuXHRcdFx0ICAgICQob3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSkuYmluZCgna2V5dXAgbW91c2V1cCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0ICAgIFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnKS52YWwoKVxuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHQgICAgICBpZigkKHRoaXMpLmRhdGEoJ2xhc3QtdmFsdWUnKSAhPSAkKHRoaXMpLnZhbCgpKSB7XG5cdFx0XHQgICAgICAgICQodGhpcykuZGF0YSgnbGFzdC12YWx1ZScsICQodGhpcykudmFsKCkpO1xuXHRcdFx0ICAgICAgICBsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLnZhbCgpLCAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJyApLmF0dHIoICdkYXRhLXllYXItZnJlcXVlbmN5JyApLCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHQgICAgICAgIHRoYXQuc2hvd05ld0xldmVsKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApO1xuXHRcdFx0ICAgICAgfTtcblx0XHRcdCAgICB9KTtcblxuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmxldmVsc19jb250YWluZXIgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50ICkuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmZsaXBwZWRfaXRlbXMsICQodGhpcykgKS53cmFwQWxsKCAnPGRpdiBjbGFzcz1cImZsaXBwZXJcIi8+JyApO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkub24oJ2NoYW5nZScsIGZ1bmN0aW9uIChldmVudCkge1xuXHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQodGhpcykuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKHRoaXMpLnZhbCgpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRcdCAgICBpZiAoIHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnICkge1xuXG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblxuXHRcdFx0XHRcdFx0aWYgKCBmcmVxdWVuY3kgPT0gMSApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LXllYXJseScgKSApO1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5ID09IDEyICkge1xuXHRcdFx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMpLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQtbW9udGhseScgKSApO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKyAnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgKyBsZXZlbF9udW1iZXIgKyAnXCJdJykudmFsKCk7XG5cblx0XHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0dGhhdC5jaGFuZ2VGcmVxdWVuY3koIGZyZXF1ZW5jeV9zdHJpbmcsIGxldmVsWyduYW1lJ10sIGVsZW1lbnQsIG9wdGlvbnMgKTtcblxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoICQoIG9wdGlvbnMubGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRcdFx0JChvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yLCBlbGVtZW50KS50ZXh0KGZyZXF1ZW5jeV9uYW1lKTtcblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSkuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdFx0XHRpZiAoIHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSApLnZhbCgpO1xuXHRcdFx0XHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR0aGF0LmNoYW5nZUFtb3VudFByZXZpZXcoIGZyZXF1ZW5jeV9zdHJpbmcsIGxldmVsWyduYW1lJ10sIGVsZW1lbnQsIG9wdGlvbnMgKTtcblxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHQkKCBldmVudC50YXJnZXQgKS5jbG9zZXN0KCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKS5wYXJlbnQoKSApLnZhbCgpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArICdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArIGxldmVsX251bWJlciArICdcIl0nKS52YWwoKTtcblx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgbGV2ZWxGbGlwcGVyXG5cblx0XHRjaGVja0xldmVsOiBmdW5jdGlvbiggYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHQgIHZhciB0aGlzeWVhciA9IHBhcnNlSW50KCBhbW91bnQgKSAqIHBhcnNlSW50KCBmcmVxdWVuY3kgKTtcblx0XHQgIHZhciBsZXZlbCA9ICcnO1xuXHRcdCAgaWYgKCB0eXBlb2YgcHJldmlvdXNfYW1vdW50ICE9PSAndW5kZWZpbmVkJyAmJiBwcmV2aW91c19hbW91bnQgIT09ICcnICkge1xuXHRcdCAgICB2YXIgcHJpb3JfeWVhcl9hbW91bnQgPSBwYXJzZUludCggcHJldmlvdXNfYW1vdW50LnByaW9yX3llYXJfY29udHJpYnV0aW9ucyApO1xuXHRcdCAgICB2YXIgY29taW5nX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoIHByZXZpb3VzX2Ftb3VudC5jb21pbmdfeWVhcl9jb250cmlidXRpb25zICk7XG5cdFx0ICAgIHZhciBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCA9IHBhcnNlSW50KCBwcmV2aW91c19hbW91bnQuYW5udWFsX3JlY3VycmluZ19hbW91bnQgKTtcblx0XHQgICAgLy8gY2FsY3VsYXRlIG1lbWJlciBsZXZlbCBmb3JtdWxhXG5cdFx0ICAgIGlmICggdHlwZSA9PT0gJ29uZS10aW1lJyApIHtcblx0XHQgICAgICBwcmlvcl95ZWFyX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHQgICAgfSBlbHNlIHtcblx0XHQgICAgICBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHQgICAgfVxuXG5cdFx0ICAgIHRoaXN5ZWFyID0gTWF0aC5tYXgoIHByaW9yX3llYXJfYW1vdW50LCBjb21pbmdfeWVhcl9hbW91bnQsIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICk7XG5cdFx0ICB9XG5cblx0XHQgIGxldmVsID0gdGhpcy5nZXRMZXZlbCggdGhpc3llYXIgKTtcblxuXHRcdCAgJCgnaDInLCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHQgICAgaWYgKCAkKHRoaXMpLnRleHQoKSA9PSBsZXZlbFsnbmFtZSddICkge1xuXHRcdCAgICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0ICAgICAgJCh0aGlzKS5wYXJlbnQoKS5wYXJlbnQoKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHQgICAgfVxuXHRcdCAgfSApO1xuXHRcdCAgcmV0dXJuIGxldmVsO1xuXG5cdFx0fSwgLy8gZW5kIGNoZWNrTGV2ZWxcblxuXHRcdGdldExldmVsOiBmdW5jdGlvbiggdGhpc3llYXIgKSB7XG5cdFx0XHR2YXIgbGV2ZWwgPSBbXTtcblx0XHRcdGlmICggdGhpc3llYXIgPiAwICYmIHRoaXN5ZWFyIDwgNjAgKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnQnJvbnplJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKHRoaXN5ZWFyID4gNTkgJiYgdGhpc3llYXIgPCAxMjApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdTaWx2ZXInO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAyO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDExOSAmJiB0aGlzeWVhciA8IDI0MCkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ0dvbGQnO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAzO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDIzOSkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ1BsYXRpbnVtJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gNDtcblx0XHRcdH1cblx0XHRcdHJldHVybiBsZXZlbDtcblx0XHR9LCAvLyBlbmQgZ2V0TGV2ZWxcblxuXHRcdHNob3dOZXdMZXZlbDogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICkge1xuXHRcdFx0dmFyIG1lbWJlcl9sZXZlbF9wcmVmaXggPSAnJztcblx0XHRcdHZhciBvbGRfbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yID0gb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyOyAvLyB0aGlzIHNob3VsZCBjaGFuZ2Ugd2hlbiB3ZSByZXBsYWNlIHRoZSB0ZXh0LCBpZiB0aGVyZSBpcyBhIGxpbmsgaW5zaWRlIGl0XG5cdFx0XHR2YXIgZGVjb2RlSHRtbEVudGl0eSA9IGZ1bmN0aW9uKCBzdHIgKSB7XG5cdFx0XHRcdHJldHVybiBzdHIucmVwbGFjZSggLyYjKFxcZCspOy9nLCBmdW5jdGlvbiggbWF0Y2gsIGRlYyApIHtcblx0XHRcdFx0XHRyZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSggZGVjICk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fTtcblx0XHRcdGlmICggdHlwZW9mIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdG1lbWJlcl9sZXZlbF9wcmVmaXggPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEubWVtYmVyX2xldmVsX3ByZWZpeDtcblx0XHRcdH1cblxuXHRcdFx0JChvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIpLnByb3AoICdjbGFzcycsICdhLXNob3ctbGV2ZWwgYS1zaG93LWxldmVsLScgKyBsZXZlbFsnbmFtZSddLnRvTG93ZXJDYXNlKCkgKTtcblxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLnVzZXJfY3VycmVudF9sZXZlbCApLmxlbmd0aCA+IDAgJiYgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwubGVuZ3RoID4gMCApIHtcblxuXHRcdFx0XHRpZiAoICdhJywgJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yID0gb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICsgJyBhJztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdG9sZF9sZXZlbCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLnJlcGxhY2UoIG1lbWJlcl9sZXZlbF9wcmVmaXgsICcnICk7XG5cblx0XHRcdFx0aWYgKCBvbGRfbGV2ZWwgIT09IGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApIHtcblx0XHRcdFx0XHQkKCBsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yICkuaHRtbCggZGVjb2RlSHRtbEVudGl0eSggJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkuZGF0YSggJ2NoYW5nZWQnICkgKSApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoIGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgKS5odG1sKCBkZWNvZGVIdG1sRW50aXR5KCAkKCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKS5kYXRhKCAnbm90LWNoYW5nZWQnICkgKSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdCQob3B0aW9ucy5sZXZlbF9uYW1lLCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIpLnRleHQoIGxldmVsWyduYW1lJ10gKTtcblxuXHRcdH0sIC8vIGVuZCBzaG93TmV3TGV2ZWxcblxuXHRcdGNoYW5nZUZyZXF1ZW5jeTogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0ICAgIHZhciB5ZWFyX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ3llYXInKTtcblx0XHRcdCAgICB2YXIgb25jZV92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdvbmUtdGltZScpO1xuXHRcdFx0ICAgIHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdCAgICB2YXIgZnJlcXVlbmN5ICAgICAgPSBwYXJzZUludCggc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzFdICk7XG5cblx0XHRcdCAgICAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMgKS52YWwoIHNlbGVjdGVkICk7XG4gICAgXHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzICkucHJvcCggJ3NlbGVjdGVkJywgc2VsZWN0ZWQgKTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuICAgIFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSApLmRhdGEoICdmcmVxdWVuY3knLCBmcmVxdWVuY3kgKTtcblxuXHRcdFx0fSApO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VGcmVxdWVuY3lcblxuXHRcdGNoYW5nZUFtb3VudFByZXZpZXc6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdCAgICB2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHQgICAgdmFyIG9uY2VfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnb25lLXRpbWUnKTtcblx0XHRcdCAgICB2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcblxuXHRcdFx0fSApO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VBbW91bnRQcmV2aWV3XG5cblx0XHRzdGFydExldmVsQ2xpY2s6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnLnN0YXJ0LWxldmVsJykuY2xpY2soZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBsZXZlbF9jbGFzcyA9ICQoIHRoaXMgKS5wcm9wKCAnY2xhc3MnICk7XG5cdFx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSBsZXZlbF9jbGFzc1tsZXZlbF9jbGFzcy5sZW5ndGggLTFdO1xuXHRcdFx0ICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIsIGVsZW1lbnQgKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKyAnICcgKyBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0ICB9KTtcblx0XHR9LCAvLyBlbmQgc3RhcnRMZXZlbENsaWNrXG5cblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcblxufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCApO1xuIl19
