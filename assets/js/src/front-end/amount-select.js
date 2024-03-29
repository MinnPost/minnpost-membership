// plugin
(function ($, window, document, MinnPostMembership) {
	// Create the defaults once
	const pluginName = 'minnpostAmountSelect',
		defaults = {
			frequencySelector: '.m-frequency-select input[type="radio"]',
			amountGroup: '.m-frequency-group',
			amountSelector: '.m-amount-select input[type="radio"]',
			amountLabels: '.m-amount-select label',
			amountValue: 'strong',
			amountDescription: '.a-amount-description',
			amountField: '.a-amount-field #amount',
			customAmountFrequency: '#amount-item .a-frequency-text-label',
			levelViewer: '.a-show-level',
			levelName: '.a-level',
			userCurrentLevel: '.a-current-level',
			declineBenefits: '.m-decline-benefits-select input[type="radio"]',
			giftSelectionGroup: '.m-membership-gift-selector',
			giftLevel: '.m-gift-level',
			giftSelector: '.m-gift-level .m-form-item input[type="radio"]',
			giftOptionSelector: '.a-gift-option-select',
			giftLabel: '.m-gift-level .m-form-item input[type="radio"] + label',
			swagEligibilityText:
				'.m-membership-gift-selector .swag-eligibility',
			swagSelector: '.m-select-swag input[type="radio"]',
			swagLabels: '.m-select-swag input[type="radio"] + label',
			minAmounts: '.m-membership-gift-selector .min-amount',
			declineGiftLevel: '.m-decline-level',
		};

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
		init() {
			const $frequency = $(this.element).find(
				this.options.frequencySelector
			);
			const $form = $(this.element);
			const $suggestedAmount = $(this.options.amountSelector);
			const $amount = $(this.element).find(this.options.amountField);
			const $declineBenefits = $(this.element).find(
				this.options.declineBenefits
			);
			const $gifts = $(this.element).find(this.options.giftSelector);
			if (
				!(
					$amount.length > 0 &&
					$frequency.length > 0 &&
					$suggestedAmount.length > 0
				)
			) {
				return;
			}

			// Set up the UI for the current field state on (re-)load
			this.setAmountLabels($frequency.filter(':checked').val());
			this.setMinAmounts($frequency.filter(':checked').val());
			this.checkAndSetLevel(false);

			$frequency.on('change', this.onFrequencyChange.bind(this));
			$suggestedAmount.on(
				'change',
				this.onSuggestedAmountChange.bind(this)
			);
			$amount.on('keyup mouseup', this.onAmountChange.bind(this));

			if (!($declineBenefits.length > 0 && $gifts.length > 0)) {
				return;
			}

			// Set up the UI for the current field state on (re-)load
			if ($gifts.not(this.options.declineGiftLevel).is(':checked')) {
				$(this.element)
					.find(this.options.declineGiftLevel)
					.prop('checked', false);
			}

			this.onDeclineBenefitsChange();
			this.giftOptionSelect();
			this.setRequiredFields($gifts);

			$declineBenefits.on(
				'change',
				this.onDeclineBenefitsChange.bind(this)
			);
			$gifts.on('click', this.onGiftsClick.bind(this));

			// because the next url is generated by WordPress based on what the JavaScript does,
			// we should also use the JavaScript to run a form submit when that link is clicked.
			const form = document.querySelector('.m-form-membership');
			const navForSubmit = document.querySelector('.a-pay-url');
			navForSubmit.addEventListener('click', function (event) {
				form.submit();
				event.preventDefault();
			});

			// when the form is submitted
			document
				.querySelectorAll('.m-form-membership')
				.forEach((membershipForm) =>
					membershipForm.addEventListener('submit', (event) => {
						this.onFormSubmit(event);
					})
				);
		}, // end init

		/*
		 * run an analytics product action
		 */
		analyticsProductAction(level, amount, frequency_label, action, step) {
			const product = this.analyticsProduct(
				level,
				amount,
				frequency_label
			);
			wp.hooks.doAction(
				'minnpostMembershipAnalyticsEcommerceAction',
				'event',
				action,
				product,
				step
			);
		}, // end analyticsProductAction

		/**
		 * Run a dataLayer product action
		 *
		 * @param  level
		 * @param  amount
		 * @param  frequency_label
		 * @param  action
		 */
		dataLayerProductAction(level, amount, frequency_label, action) {
			if (typeof wp !== 'undefined') {
				const product = this.analyticsProduct(
					level,
					amount,
					frequency_label
				);
				const dataLayerContent = {
					action,
					product,
				};
				wp.hooks.doAction(
					'minnpostMembershipDataLayerEcommerceAction',
					dataLayerContent
				);
			}
		}, // end dataLayerProductAction

		/*
		 * run an analytics cart action
		 */
		analyticsCartAction(level, amount, frequency_label) {
			const product = this.analyticsProduct(
				level.name,
				amount,
				frequency_label
			);
			wp.hooks.doAction(
				'minnpostMembershipAnalyticsEcommerceAction',
				'event',
				'add_to_cart',
				product
			);
			wp.hooks.doAction(
				'minnpostMembershipAnalyticsEcommerceAction',
				'event',
				'begin_checkout',
				product
			);
		}, // end analyticsCartAction

		/*
		 * run an dataLayer cart action
		 */
		dataLayerCartAction(level, amount, frequency_label) {
			const product = this.analyticsProduct(
				level.name,
				amount,
				frequency_label
			);
			const dataLayerAddToCart = {
				action: 'add_to_cart',
				product,
			};
			wp.hooks.doAction(
				'minnpostMembershipDataLayerEcommerceAction',
				dataLayerAddToCart
			);
			const dataLayerBeginCheckout = {
				action: 'begin_checkout',
				product,
			};
			wp.hooks.doAction(
				'minnpostMembershipDataLayerEcommerceAction',
				dataLayerBeginCheckout
			);
		}, // end dataLayerCartAction

		/*
		 * create an analytics product variable
		 */
		analyticsProduct(level, amount, frequency_label) {
			const product = {
				item_id: 'minnpost_' + level.toLowerCase() + '_membership',
				item_name:
					'MinnPost ' +
					level.charAt(0).toUpperCase() +
					level.slice(1) +
					' Membership',
				item_category: 'Donation',
				item_brand: 'MinnPost',
				item_variant: frequency_label,
				price: amount,
				quantity: 1,
			};
			return product;
		}, // end analyticsProduct

		onFrequencyChange(event) {
			this.setAmountLabels($(event.target).val());
			this.setMinAmounts($(event.target).val());
			this.checkAndSetLevel(true);
		}, // end onFrequencyChange

		onSuggestedAmountChange(event) {
			$(this.element).find(this.options.amountField).val(null);
			this.checkAndSetLevel(true);
		}, // end onSuggestedAmountChange

		onAmountChange(event) {
			this.clearAmountSelector(event);

			const $target = $(event.target);
			if ($target.data('last-value') != $target.val()) {
				$target.data('last-value', $target.val());
				this.checkAndSetLevel(true);
			}
		}, // end onAmountChange

		onDeclineBenefitsChange(event) {
			const $giftSelectionGroup = $(this.element).find(
				this.options.giftSelectionGroup
			);
			const decline = $(this.element)
				.find(this.options.declineBenefits)
				.filter(':checked')
				.val();

			if (decline === 'true') {
				$giftSelectionGroup.hide();
				return;
			}

			$giftSelectionGroup.show();
		}, // end onDeclineBenefitsChange

		giftOptionSelect() {
			const parent = $(this.options.giftOptionSelector)
				.parent()
				.parent()
				.find('input[type="radio"]');
			$(this.options.giftOptionSelector).change(function () {
				const selectedOption = $(this)
					.children('option:selected')
					.val();
				if ('' !== selectedOption) {
					parent.prop('checked', true);
				}
			});
		}, // end giftOptionSelect

		onGiftsClick(event) {
			const $gifts = $(this.element)
				.find(this.options.giftSelector)
				.not(this.options.declineGiftLevel);
			const $decline = $(this.element).find(
				this.options.declineGiftLevel
			);
			if ($(event.target).is(this.options.declineGiftLevel)) {
				$gifts.prop('checked', false);
				return;
			}
			this.setRequiredFields($gifts);
			$decline.prop('checked', false);
		}, // end onGiftsClick

		setRequiredFields($gifts) {
			const $checkedGifts = $gifts.filter(':checked');
			if ($checkedGifts) {
				$("[data-required='true']").prop('required', false);
				$checkedGifts.each(function () {
					const setRequired = function () {
						$(this).prop('required', true);
					};
					$("[data-required='true']", $(this).parent()).each(
						setRequired
					);
				});
			}
		}, // end setRequiredFields

		onFormSubmit(event) {
			let amount = $(this.options.amountSelector)
				.filter(':checked')
				.val();
			if (typeof amount === 'undefined') {
				amount = $(this.options.amountField).val();
			}
			const frequency_string = $(
				this.options.frequencySelector + ':checked'
			).val();
			const frequency = frequency_string.split(' - ')[1];
			const frequency_name = frequency_string.split(' - ')[0];
			const frequency_id = $(
				this.options.frequencySelector + ':checked'
			).prop('id');
			const frequency_label = $(
				'label[for="' + frequency_id + '"]'
			).text();
			const level = MinnPostMembership.checkLevel(
				amount,
				frequency,
				frequency_name
			);

			const options = {
				type: 'event',
				category: 'Support Us',
				action: 'Become A Member',
				label: location.pathname,
			};
			// this tracks an event submission based on the plugin options
			// it also bubbles the event up to submit the form
			// gtm can detect the form submission itself.
			wp.hooks.doAction(
				'minnpostMembershipAnalyticsEvent',
				options.type,
				options.category,
				options.action,
				options.label
			);
			const hasClass = event.target.classList.contains(
				'm-form-membership-support'
			);
			// if this is the main checkout form, send it to the ec plugin or gtm as a checkout
			if (hasClass) {
				this.analyticsCartAction(level, amount, frequency_label);
				this.dataLayerCartAction(level, amount, frequency_label);
			}
		}, // end onFormSubmit

		clearAmountSelector(event) {
			const $suggestedAmount = $(this.options.amountSelector);

			if ($(event.target).val() === '') {
				return;
			}

			$suggestedAmount.prop('checked', false);
		}, // end clearAmountSelector

		setAmountLabels(frequencyString) {
			const $groups = $(this.options.amountGroup);
			const $selected = $(this.options.amountSelector).filter(':checked');
			const index = $selected.data('index');
			const $customAmountFrequency = $(
				this.options.customAmountFrequency
			);

			$groups.removeClass('active');
			$groups
				.filter('[data-frequency="' + frequencyString + '"]')
				.addClass('active');
			$selected.prop('checked', false);
			$groups
				.filter('.active')
				.find('input[type="radio"][data-index="' + index + '"]')
				.prop('checked', true);

			const currentFrequencyLabel = $groups
				.filter('.active')
				.find('.a-frequency-text-label')
				.first()
				.text();
			$customAmountFrequency.text(currentFrequencyLabel);
		}, // end setAmountLabels

		setMinAmounts(frequencyString) {
			const $elements = $(this.options.minAmounts);
			$elements.removeClass('active');
			$elements
				.filter('[data-frequency="' + frequencyString + '"]')
				.addClass('active');
		}, // end setMinAmounts

		checkAndSetLevel(updated) {
			let amount = $(this.options.amountSelector)
				.filter(':checked')
				.val();
			if (typeof amount === 'undefined') {
				amount = $(this.options.amountField).val();
			}

			const frequency_string = $(
				this.options.frequencySelector + ':checked'
			).val();
			const frequency = frequency_string.split(' - ')[1];
			const frequency_name = frequency_string.split(' - ')[0];
			const frequency_id = $(
				this.options.frequencySelector + ':checked'
			).prop('id');
			const frequency_label = $(
				'label[for="' + frequency_id + '"]'
			).text();

			const level = MinnPostMembership.checkLevel(
				amount,
				frequency,
				frequency_name
			);
			this.showNewLevel(this.element, this.options, level);
			this.setEnabledGifts(level);
			this.analyticsProductAction(
				level.name,
				amount,
				frequency_label,
				'select_content',
				1
			);
			this.dataLayerProductAction(
				level.name,
				amount,
				frequency_label,
				'select_item'
			);
		}, // end checkAndSetLevel

		showNewLevel(element, options, level) {
			let member_level_prefix = '';
			let old_level = '';
			let levelViewerContainer = options.levelViewer; // this should change when we replace the text, if there is a link inside it
			const decodeHtmlEntity = function (str) {
				return str.replace(/&#(\d+);/g, function (match, dec) {
					return String.fromCharCode(dec);
				});
			};
			if (typeof minnpost_membership_data !== 'undefined') {
				member_level_prefix =
					minnpost_membership_data.member_level_prefix;
			}

			if ($(options.levelViewer).length > 0) {
				$(options.levelViewer).prop(
					'class',
					'a-show-level a-show-level-' + level.name.toLowerCase()
				);

				if (
					$(options.userCurrentLevel).length > 0 &&
					minnpost_membership_data.current_user.member_level.length >
						0
				) {
					if (('a', $(options.levelViewer).length > 0)) {
						levelViewerContainer = options.levelViewer + ' a';
					}

					old_level =
						minnpost_membership_data.current_user.member_level.replace(
							member_level_prefix,
							''
						);

					if (old_level !== level.name.toLowerCase()) {
						$(levelViewerContainer).html(
							decodeHtmlEntity(
								$(options.levelViewer).data('changed')
							)
						);
					} else {
						$(levelViewerContainer).html(
							decodeHtmlEntity(
								$(options.levelViewer).data('not-changed')
							)
						);
					}
				}

				$(options.levelName, options.levelViewer).text(level.name);
			}
		}, // end showNewLevel

		setEnabledGifts(level) {
			const setEnabled = function () {
				$(this).prop(
					'disabled',
					level.yearlyAmount < $(this).data('minYearlyAmount')
				);
			};

			$(this.options.giftSelector).each(setEnabled);

			if (
				$(this.options.swagSelector).not('#swag-decline').is(':enabled')
			) {
				$('.swag-disabled').removeClass('active');
				$('.swag-enabled').addClass('active');
			} else {
				$('.swag-disabled').addClass('active');
				$('.swag-enabled').removeClass('active');
			}
		}, // end setEnabledGifts
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
