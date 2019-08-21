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
		levelViewer: '.a-show-level',
		levelName: '.a-level',
		userCurrentLevel: '.a-current-level',
		declineBenefits: '.m-decline-benefits-select input[type="radio"]',
		giftSelectionGroup: '.m-membership-gift-selector',
		swagSelector: '.m-select-swag input[type="radio"]',
		subscriptionsSelector: '.m-select-subscription input[type="checkbox"]',
		declineSubscriptions: '#subscription-decline'
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
			var $suggestedAmount = $( this.options.amountSelector );
			var $amount = $( this.element ).find( this.options.amountField );
			var $declineBenefits = $( this.element ).find( this.options.declineBenefits );
			var $subscriptions = $( this.element ).find( this.options.subscriptionsSelector );
			if ( !( $amount.length > 0 &&
			        $frequency.length > 0 &&
			        $suggestedAmount.length > 0 ) ) {
				return;
			}

			// setup Analytics Enhanced Ecommerce plugin
			if ( typeof ga !== 'undefined' ) {
				ga( 'require', 'ec' );
			}

			// Set up the UI for the current field state on (re-)load
			this.setAmountLabels( $frequency.filter(':checked').val() );
			this.checkAndSetLevel();

			$frequency.on( 'change', this.onFrequencyChange.bind(this) );
			$suggestedAmount.on( 'change', this.onSuggestedAmountChange.bind(this) );
			$amount.on( 'keyup mouseup', this.onAmountChange.bind(this) );

			if ( ! ( $declineBenefits.length > 0 && $subscriptions.length > 0 ) ) {
				return;
			}

			// Set up the UI for the current field state on (re-)load
			if ( $subscriptions.not( this.options.declineSubscriptions ).is( ':checked' ) ) {
				$( this.element ).find( this.options.declineSubscriptions ).prop( 'checked', false );
			}
			this.onDeclineBenefitsChange();

			$declineBenefits.on( 'change', this.onDeclineBenefitsChange.bind( this ) );
			$subscriptions.on( 'click', this.onSubscriptionsClick.bind( this ) );
		}, // end init

		 // step is the integer for the step in the ecommerce process.
		 // for this purpose, it's probably always 1.
		 // things we need to know: the level name, the amount, and the frequency
		 // example:
		 /*
		 Running command: ga("ec:addProduct", {id: "minnpost_silver_membership", name: "MinnPost Silver Membership", category: "Donation", brand: "MinnPost", variant: "Monthly", price: "5", quantity: 1})
		 */
		analyticsTracker: function( level, amount, frequency_label ) {
			if ( typeof ga !== 'undefined' ) {
				ga( 'ec:addProduct', {
					'id': 'minnpost_' + level.toLowerCase() + '_membership',
					'name': 'MinnPost ' + level.charAt(0).toUpperCase() + level.slice(1) + ' Membership',
					'category': 'Donation',
					'brand': 'MinnPost',
					'variant':  frequency_label,
					'price': amount,
					'quantity': 1
				});
			} else {
				return;
			}
		}, // end analyticsTracker

		onFrequencyChange: function( event ) {
			this.setAmountLabels( $( event.target ).val() );
			this.checkAndSetLevel();
		}, // end onFrequencyChange

		onSuggestedAmountChange: function( event ) {
			$( this.element ).find( this.options.amountField ).val( null );
			this.checkAndSetLevel();
		}, // end onSuggestedAmountChange

		onAmountChange: function( event ) {
			this.clearAmountSelector( event );

			var $target = $( event.target );
			if ( $target.data( 'last-value' ) != $target.val() ) {
				$target.data( 'last-value', $target.val() );
				this.checkAndSetLevel();
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

		onSubscriptionsClick: function( event ) {
			var $subscriptions = $( this.element ).find( this.options.subscriptionsSelector ).not( this.options.declineSubscriptions );
			var $decline = $( this.element ).find( this.options.declineSubscriptions );

			if ( $( event.target ).is( this.options.declineSubscriptions ) ) {
				$subscriptions.prop( 'checked', false );
				return;
			}

			$decline.prop( 'checked', false );
		}, // end onSubscriptionsChange

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

			$groups.removeClass( 'active' );
			$groups.filter( '[data-frequency="' + frequencyString + '"]' )
				.addClass( 'active' );
			$selected.prop( 'checked', false );
			$groups.filter( '.active' )
				.find( 'input[type="radio"][data-index="' + index + '"]' )
				.prop( 'checked', true );
		}, // end setAmountLabels

		checkAndSetLevel: function() {
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
			this.analyticsTracker( level['name'], amount, frequency_label );
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

			$( this.options.swagSelector ).each( setEnabled );
			$( this.options.subscriptionsSelector ).each( setEnabled );
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
