// plugin
;(function ( $, window, document, undefined ) {

	// Create the defaults once
	var pluginName = 'minnpost_membership',
	defaults = {
		'debug' : false, // this can be set to true on page level options
		'frequency_selector' : '.a-form-item-membership-frequency',
		'frequency_selector_type' : 'select',
		'levels_container' : '.o-membership-member-levels',
		'single_level_container' : '.m-membership-member-level',
		'single_level_summary_selector' : '.m-member-level-brief',
		'flipped_items' : 'div.amount, div.enter',
		'amount_selector' : '.enter input',
		'level_frequency_text_selector' : '.show-frequency',
	}; // end defaults

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

		init: function( reset, amount ) {
			// Place initialization logic here
			// You already have access to the DOM element and
			// the options via the instance, e.g. this.element
			// and this.options
			// you can add more functions like the one below and
			// call them like so: this.yourOtherFunction(this.element, this.options).

			this.frequencySwitcher( this.element, this.options );

		},

		frequencySwitcher: function( element, options ) {
			if ( options.levels_container.length > 0 ) {
				$( options.single_level_summary_selector, element ).each(function() {
					$( options.flipped_items, $(this) ).wrapAll( '<div class="flipper"/>' );
				});
				$( options.frequency_selector, element ).change( function( event ) {
					var level_number = $(this).data('member-level-number');
					var frequencystring = $(this).val();
				    var frequency = frequencystring.split(' - ')[1];
				    var frequency_name = frequencystring.split(' - ')[0];
				    if ( typeof level_number !== 'undefined' ) {
						var amount = $( options.amount_selector + '[data-member-level-number="' + level_number + '"]').val();
						$( options.single_level_summary_selector, element).removeClass( 'flipped' );
						$( options.single_level_summary_selector, element).removeClass( 'active' );
						$( event.target ).closest( options.single_level_summary_selector ).addClass( 'flipped' );
					} else if ( options.level_frequency_text_selector.length > 0 ) {
						$(options.level_frequency_text_selector, element).text(frequency_name);
					}
				});

			}
		}, // end frequencySwitcher

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
