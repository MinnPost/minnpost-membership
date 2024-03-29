// plugin
(function ($, window, document, MinnPostMembership, undefined) {
	// Create the defaults once
	const pluginName = 'minnpostMembership',
		defaults = {
			debug: false, // this can be set to true on page level options
			amount_viewer: '.amount h3',
			frequency_selector_in_levels: '.a-form-item-membership-frequency',
			frequency_selector_in_levels_type: 'select',
			levels_container: '.o-membership-member-levels',
			single_level_container: '.m-membership-member-level',
			single_level_summary_selector: '.m-member-level-brief',
			flipped_items: 'div.amount, div.enter',
			level_frequency_text_selector: '.show-frequency',
			choose_amount_selector_in_levels: '.amount .a-button-flip',
			amount_selector_in_levels: '.enter input.amount-entry',
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
		init(reset, amount) {
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

		catchHashLinks(element, options) {
			$('a[href*="#"]:not([href="#"])', element).click(function (e) {
				var target = $(e.target);
				if (
					target.parent('.comment-title').length == 0 &&
					location.pathname.replace(/^\//, '') ==
						this.pathname.replace(/^\//, '') &&
					location.hostname == this.hostname
				) {
					var target = $(this.hash);
					target = target.length
						? target
						: $('[name=' + this.hash.slice(1) + ']');
					if (target.length) {
						$('html,body').animate(
							{
								scrollTop: target.offset().top,
							},
							1000
						);
						return false;
					}
				}
			});
		}, // end catchLinks

		levelFlipper(element, options) {
			const that = this;
			let amount = 0;
			let level = '';
			let level_number = 0;
			let frequency_string = '';
			let frequency = '';
			let frequency_name = '';

			if ($(options.levels_container).length > 0) {
				$(options.single_level_summary_selector, element).each(
					function () {
						$(options.flipped_items, $(this)).wrapAll(
							'<div class="flipper"/>'
						);
					}
				);
				$(options.frequency_selector_in_levels, element).on(
					'change',
					function (event) {
						level_number = $(this).data('member-level-number');
						frequency_string = $(this).val();
						frequency = frequency_string.split(' - ')[1];
						frequency_name = frequency_string.split(' - ')[0];
						if (typeof level_number !== 'undefined') {
							$(
								options.single_level_summary_selector,
								element
							).removeClass('flipped');
							$(
								options.single_level_container,
								element
							).removeClass('active');
							$(event.target)
								.closest(options.single_level_summary_selector)
								.addClass('flipped');

							if (frequency == 1) {
								$(
									options.amount_selector_in_levels,
									$(
										options.single_level_container +
											'-' +
											level_number
									)
								).val(
									$(
										options.amount_viewer,
										$(
											options.single_level_container +
												'-' +
												level_number
										)
									).data('default-yearly')
								);
							} else if (frequency == 12) {
								$(
									options.amount_selector_in_levels,
									$(
										options.single_level_container +
											'-' +
											level_number
									)
								).val(
									$(
										options.amount_viewer,
										$(
											options.single_level_container +
												'-' +
												level_number
										)
									).data('default-monthly')
								);
							}

							amount = $(
								options.amount_selector_in_levels +
									'[data-member-level-number="' +
									level_number +
									'"]'
							).val();

							level = that.checkLevel(
								amount,
								frequency,
								frequency_name,
								element,
								options
							);
							that.changeFrequency(
								frequency_string,
								level.name,
								element,
								options
							);
						} else if (
							$(options.level_frequency_text_selector).length > 0
						) {
							$(
								options.level_frequency_text_selector,
								element
							).text(frequency_name);
							$(options.single_level_container).each(function () {
								level_number = $(
									options.amount_selector_in_levels,
									$(this)
								).data('member-level-number');
								if (typeof level_number !== 'undefined') {
									amount = $(
										options.amount_selector_in_levels,
										$(this)
									).val();
									level = that.checkLevel(
										amount,
										frequency,
										frequency_name,
										element,
										options
									);
								}
							});
						}

						that.changeAmountPreview(
							frequency_string,
							level.name,
							element,
							options
						);
					}
				);
			}
			if ($(options.choose_amount_selector_in_levels).length > 0) {
				$(options.choose_amount_selector_in_levels, element).click(
					function (event) {
						level_number = $(
							options.frequency_selector_in_levels,
							element
						).data('member-level-number');
						$(
							options.single_level_summary_selector,
							element
						).removeClass('flipped');
						$(options.single_level_container, element).removeClass(
							'active'
						);
						$(event.target)
							.closest(options.single_level_summary_selector)
							.addClass('flipped');
						frequency_string = $(
							options.frequency_selector_in_levels,
							$(this).parent()
						).val();
						frequency = frequency_string.split(' - ')[1];
						amount = $(
							options.amount_selector_in_levels +
								'[data-member-level-number="' +
								level_number +
								'"]'
						).val();
						level = that.checkLevel(
							amount,
							frequency,
							frequency_name,
							element,
							options
						);
						event.preventDefault();
					}
				);
			}
		}, // end levelFlipper

		checkLevel(amount, frequency, type, element, options) {
			const level = MinnPostMembership.checkLevel(
				amount,
				frequency,
				type
			);

			$('h2', options.single_level_summary_selector).each(function () {
				if ($(this).text() == level.name) {
					$(options.single_level_container, element).removeClass(
						'active'
					);
					$(this).parent().parent().addClass('active');
				}
			});

			return level;
		}, // end checkLevel

		changeFrequency(selected, level, element, options) {
			$(options.single_level_summary_selector).each(function () {
				let range = $(options.amount_viewer, $(this)).text();
				const month_value = $(options.amount_viewer, $(this)).data(
					'month'
				);
				const year_value = $(options.amount_viewer, $(this)).data(
					'year'
				);
				const once_value = $(options.amount_viewer, $(this)).data(
					'one-time'
				);
				const frequency_name = selected.split(' - ')[0];
				const frequency = parseInt(selected.split(' - ')[1]);

				$(options.frequency_selector_in_levels).val(selected);
				$(options.frequency_selector_in_levels).prop(
					'selected',
					selected
				);

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
				$(options.frequency_selector_in_levels, $(this)).data(
					'frequency',
					frequency
				);
			});
		}, // end changeFrequency

		changeAmountPreview(selected, level, element, options) {
			$(options.single_level_summary_selector).each(function () {
				let range = $(options.amount_viewer, $(this)).text();
				const month_value = $(options.amount_viewer, $(this)).data(
					'month'
				);
				const year_value = $(options.amount_viewer, $(this)).data(
					'year'
				);
				const once_value = $(options.amount_viewer, $(this)).data(
					'one-time'
				);
				const frequency_name = selected.split(' - ')[0];

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

		startLevelClick(element, options) {
			$('.start-level').click(function () {
				const level_class = $(this).prop('class');
				const level_number = level_class[level_class.length - 1];
				$(options.single_level_summary_selector, element).removeClass(
					'flipped'
				);
				$(options.single_level_container, element).removeClass(
					'active'
				);
				$(
					options.single_level_container + '-' + level_number,
					element
				).addClass('active');
				$(
					options.single_level_container +
						'-' +
						level_number +
						' ' +
						options.single_level_summary_selector
				).addClass('flipped');
			});
		}, // end startLevelClick
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
})(jQuery, window, document, MinnPostMembership);
