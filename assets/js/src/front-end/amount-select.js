// plugin
;(function ( $, window, document, MinnPostMembership ) {
	// Create the defaults once
	var pluginName = 'minnpostAmountSelect',
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
		giftLabel: '.m-gift-level .m-form-item input[type="radio"] + label',
		swagEligibilityText: '.m-membership-gift-selector .swag-eligibility',
		swagSelector: '.m-select-swag input[type="radio"]',
		swagLabels: '.m-select-swag input[type="radio"] + label',
		minAmounts: '.m-membership-gift-selector .min-amount',
		declineGiftLevel: '.m-decline-level',
	};

	// The actual plugin constructor
	function Plugin( element, options ) {
		this.element = element;

		// jQuery has an extend method which merges the contents of two or
		// more objects, storing the result in the first object. The first object
		// is generally empty as we don't want to alter the default options for
		// future instances of the plugin
		this.options = $.extend( {}, defaults, options );

		this._defaults = defaults;
		this._name = pluginName;

		this.init();
	} // end constructor

	Plugin.prototype = {
		init: function() {
			var $frequency = $( this.element ).find( this.options.frequencySelector );
			var $form = $( this.element );
			var $suggestedAmount = $( this.options.amountSelector );
			var $amount = $( this.element ).find( this.options.amountField );
			var $declineBenefits = $( this.element ).find( this.options.declineBenefits );
			var $gifts = $( this.element ).find( this.options.giftSelector );
			if ( !( $amount.length > 0 &&
			        $frequency.length > 0 &&
			        $suggestedAmount.length > 0 ) ) {
				return;
			}

			// Set up the UI for the current field state on (re-)load
			this.setAmountLabels( $frequency.filter(':checked').val() );
			this.setMinAmounts( $frequency.filter(':checked').val() );
			this.checkAndSetLevel( false );

			$frequency.on( 'change', this.onFrequencyChange.bind(this) );
			$suggestedAmount.on( 'change', this.onSuggestedAmountChange.bind(this) );
			$amount.on( 'keyup mouseup', this.onAmountChange.bind(this) );

			if ( ! ( $declineBenefits.length > 0 && $gifts.length > 0 ) ) {
				return;
			}

			// Set up the UI for the current field state on (re-)load
			if ( $gifts.not( this.options.declineGiftLevel ).is( ':checked' ) ) {
				$( this.element ).find( this.options.declineGiftLevel ).prop( 'checked', false );
			}

			this.onDeclineBenefitsChange();

			$declineBenefits.on( 'change', this.onDeclineBenefitsChange.bind( this ) );
			$gifts.on( 'click', this.onGiftLevelClick.bind( this ) );

			// when the form is submitted
			document.querySelectorAll( ".m-form-membership" ).forEach(
				membershipForm => membershipForm.addEventListener( "submit", ( event ) => {
					this.onFormSubmit( event );
				} )
			);

		}, // end init

		 /*
		  * run an analytics product action
		 */
		 analyticsProductAction: function( level, amount, frequency_label, action, step ) {
			var product = this.analyticsProduct(level, amount, frequency_label );
			wp.hooks.doAction( 'minnpostMembershipAnalyticsEcommerceAction', 'event', action, product, step );
		}, // end analyticsProductAction

		/*
		  * create an analytics product variable
		 */
		analyticsProduct: function( level, amount, frequency_label ) {
			let product = {
				'id': 'minnpost_' + level.toLowerCase() + '_membership',
				'name': 'MinnPost ' + level.charAt(0).toUpperCase() + level.slice(1) + ' Membership',
				'category': 'Donation',
				'brand': 'MinnPost',
				'variant':  frequency_label,
				'price': amount,
				'quantity': 1
			}
			return product;
		}, // end analyticsProduct

		onFrequencyChange: function( event ) {
			this.setAmountLabels( $( event.target ).val() );
			this.setMinAmounts( $( event.target ).val() );
			this.checkAndSetLevel( true );
		}, // end onFrequencyChange

		onSuggestedAmountChange: function( event ) {
			$( this.element ).find( this.options.amountField ).val( null );
			this.checkAndSetLevel( true);
		}, // end onSuggestedAmountChange

		onAmountChange: function( event ) {
			this.clearAmountSelector( event );

			var $target = $( event.target );
			if ( $target.data( 'last-value' ) != $target.val() ) {
				$target.data( 'last-value', $target.val() );
				this.checkAndSetLevel( true );
			}
		}, // end onAmountChange

		onDeclineBenefitsChange: function( event ) {
			var $giftSelectionGroup = $( this.element ).find( this.options.giftSelectionGroup );
			var decline = $( this.element ).find( this.options.declineBenefits ).filter( ':checked' ).val();

			if ( decline === 'true' ) {
				$giftSelectionGroup.hide();
				return;
			}

			$giftSelectionGroup.show();
		}, // end onDeclineBenefitsChange

		onGiftLevelClick: function( event ) {
			var $gifts = $( this.element ).find( this.options.giftSelector ).not( this.options.declineGiftLevel );
			var $decline = $( this.element ).find( this.options.declineGiftLevel );
			if ( $( event.target ).is( this.options.declineGiftLevel ) ) {
				$gifts.prop( 'checked', false );
				return;
			}

			$decline.prop( 'checked', false );
		}, // end onGiftLevelClick

		onFormSubmit: function( event ) {
			var amount = $( this.options.amountSelector ).filter( ':checked' ).val();
			if ( typeof amount === 'undefined' ) {
				amount = $( this.options.amountField ).val();
			}
			var frequency_string = $( this.options.frequencySelector + ':checked' ).val();
			var frequency = frequency_string.split(' - ')[1];
			var frequency_name = frequency_string.split(' - ')[0];
			var frequency_id = $( this.options.frequencySelector + ':checked' ).prop( 'id' );
			var frequency_label = $( 'label[for="' + frequency_id + '"]' ).text();
			var level = MinnPostMembership.checkLevel( amount, frequency, frequency_name );

			var options = {
				type: 'event',
				category: 'Support Us',
				action: 'Become A Member',
				label: location.pathname
			};
			// this tracks an event submission based on the plugin options
			// it also bubbles the event up to submit the form
			wp.hooks.doAction(
				'minnpostMembershipAnalyticsEvent',
				options.type,
				options.category,
				options.action,
				options.label
			);
			var hasClass = event.target.classList.contains( "m-form-membership-support" );
			// if this is the main checkout form, send it to the ec plugin as a checkout
			if ( hasClass ) {
				var product = this.analyticsProduct( level['name'], amount, frequency_label );
				wp.hooks.doAction( 'minnpostMembershipAnalyticsEcommerceAction', 'event', 'add_to_cart', product );
				wp.hooks.doAction( 'minnpostMembershipAnalyticsEcommerceAction', 'event', 'begin_checkout', product );
			}
		}, // end onFormSubmit

		clearAmountSelector: function( event ) {
			var $suggestedAmount = $( this.options.amountSelector );

			if ( $( event.target ).val() === '' ) {
				return;
			}

			$suggestedAmount.prop( 'checked', false );
		}, // end clearAmountSelector

		setAmountLabels: function( frequencyString ) {
			var $groups = $( this.options.amountGroup );
			var $selected = $( this.options.amountSelector )
			    .filter( ':checked' );
			var index = $selected.data( 'index' );
			var $customAmountFrequency = $( this.options.customAmountFrequency );

			$groups.removeClass( 'active' );
			$groups.filter( '[data-frequency="' + frequencyString + '"]' )
				.addClass( 'active' );
			$selected.prop( 'checked', false );
			$groups.filter( '.active' )
				.find( 'input[type="radio"][data-index="' + index + '"]' )
				.prop( 'checked', true );

			var currentFrequencyLabel = $groups.filter( '.active' ).find('.a-frequency-text-label').first().text();
			$customAmountFrequency.text( currentFrequencyLabel );
		}, // end setAmountLabels

		setMinAmounts: function( frequencyString ) {
			var $elements = $( this.options.minAmounts );
			$elements.removeClass( 'active' );
			$elements.filter( '[data-frequency="' + frequencyString + '"]' )
				.addClass( 'active' );
		}, // end setMinAmounts

		checkAndSetLevel: function( updated ) {
			var amount = $( this.options.amountSelector ).filter( ':checked' ).val();
			if ( typeof amount === 'undefined' ) {
				amount = $( this.options.amountField ).val();
			}

			var frequency_string = $( this.options.frequencySelector + ':checked' ).val();
			var frequency = frequency_string.split(' - ')[1];
			var frequency_name = frequency_string.split(' - ')[0];
			var frequency_id = $( this.options.frequencySelector + ':checked' ).prop( 'id' );
			var frequency_label = $( 'label[for="' + frequency_id + '"]' ).text();

			var level = MinnPostMembership.checkLevel( amount, frequency, frequency_name );
			this.showNewLevel( this.element, this.options, level );
			this.setEnabledGifts( level );
			this.analyticsProductAction( level['name'], amount, frequency_label, 'select_content', 1 );
		}, // end checkAndSetLevel

		showNewLevel: function( element, options, level ) {
			var member_level_prefix = '';
			var old_level = '';
			var levelViewerContainer = options.levelViewer; // this should change when we replace the text, if there is a link inside it
			var decodeHtmlEntity = function( str ) {
				return str.replace( /&#(\d+);/g, function( match, dec ) {
					return String.fromCharCode( dec );
				});
			};
			if ( typeof minnpost_membership_data !== 'undefined' ) {
				member_level_prefix = minnpost_membership_data.member_level_prefix;
			}

			if ( $( options.levelViewer ).length > 0 ) {

				$(options.levelViewer).prop( 'class', 'a-show-level a-show-level-' + level['name'].toLowerCase() );

				if ( $( options.userCurrentLevel ).length > 0 && minnpost_membership_data.current_user.member_level.length > 0 ) {

					if ( 'a', $( options.levelViewer ).length > 0 ) {
						levelViewerContainer = options.levelViewer + ' a';
					}

					old_level = minnpost_membership_data.current_user.member_level.replace( member_level_prefix, '' );

					if ( old_level !== level['name'].toLowerCase() ) {
						$( levelViewerContainer ).html( decodeHtmlEntity( $( options.levelViewer ).data( 'changed' ) ) );
					} else {
						$( levelViewerContainer ).html( decodeHtmlEntity( $( options.levelViewer ).data( 'not-changed' ) ) );
					}
				}

				$(options.levelName, options.levelViewer).text( level['name'] );
			}
		}, // end showNewLevel

		setEnabledGifts: function( level ) {
			var setEnabled = function() {
				$( this ).prop( 'disabled', level.yearlyAmount < $( this ).data( 'minYearlyAmount' ) );
			};

			$( this.options.giftSelector ).each( setEnabled );

			if ( $( this.options.swagSelector ).not( '#swag-decline' ).is( ':enabled' ) ) {
				$( '.swag-disabled' ).removeClass( 'active' );
				$( '.swag-enabled' ).addClass( 'active' );
			} else {
				$( '.swag-disabled' ).addClass( 'active' );
				$( '.swag-enabled' ).removeClass( 'active' );
			}
		}, // end setEnabledGifts
	}; // end Plugin.prototype


	// A really lightweight plugin wrapper around the constructor,
	// preventing against multiple instantiations
	$.fn[pluginName] = function ( options ) {
		return this.each(function () {
			if ( ! $.data( this, 'plugin_' + pluginName ) ) {
				$.data( this, 'plugin_' + pluginName, new Plugin( this, options ) );
			}
		});
	};
})( jQuery, window, document, MinnPostMembership );
