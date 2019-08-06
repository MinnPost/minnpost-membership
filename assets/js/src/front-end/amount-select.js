// plugin
;(function ( $, window, document ) {
	// Create the defaults once
	var pluginName = 'minnpostAmountSelect',
	defaults = {
		frequencySelector: '.m-frequency-select input[type="radio"]',
		amountSelector: '.m-amount-select input[type="radio"]',
		amountLabels: '.m-amount-select label',
		amountValue: 'strong',
		amountDescription: '.a-amount-description',
		amountField: '.a-amount-field #amount'
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
			var frequencies = $( this.element ).find( this.options.frequencySelector );
			var amounts = $( this.options.amountSelector );
			var amount = $( this.element ).find( this.options.amountField );

			this.setAmountLabels( frequencies.filter(':checked').val() );
			frequencies.change( this.onFrequencyChange.bind(this) );
			amounts.on( 'change', this.clearAmountField.bind(this) );
			amount.on( 'keyup mouseup', this.clearAmountSelector.bind(this) );
		},

		onFrequencyChange: function( event ) {
			this.setAmountLabels( $( event.target ).val() );
		},

		setAmountLabels: function( frequencyString ) {
			var amountElement = this.options.amountValue;
			var descElement = this.options.amountDescription;
			var labels = $( this.options.amountLabels );
			var typeAndFrequency;
			var type;
			var frequency;

			if ( labels.length < 0 || typeof frequencyString === 'undefined' ) {
				return;
			}

			typeAndFrequency = frequencyString.split(' - ');
			type = typeAndFrequency[0];
			frequency = parseInt( typeAndFrequency[1], 10 );

			labels.each( function( index ) {
				var $label = $( this );
				var $amount = $( '#' + $label.attr( 'for' ) );
				var amount = parseInt( $label.data( 'monthly-amount' ), 10 );
				var newAmount = type === 'per year' ? amount * 12 : amount;
				var amountText = '$' + newAmount;
				var desc = $label.data( type === 'per year' ? 'yearly-desc' : 'monthly-desc' );

				$amount.val( newAmount );
				$( this ).find( amountElement ).text( amountText )
				$( this ).find( descElement ).text( desc );
			});
		}, // end setAmountLabels

		clearAmountSelector: function( event ) {
			var amounts = $( this.options.amountSelector );

			if ( $( event.target ).val() === '' ) {
				return;
			}

			amounts.removeAttr('checked');
		},

		clearAmountField: function( event ) {
			$( this.element ).find( this.options.amountField ).val( null );
		},
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
})( jQuery, window, document );
