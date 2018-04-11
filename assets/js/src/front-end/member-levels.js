// plugin
;(function ( $, window, document, undefined ) {

	// Create the defaults once
	var pluginName = 'minnpost-membership',
	defaults = {
		'debug' : false, // this can be set to true on page level options
		'frequency_selector' : 'input[name="minnpost_membership_default_frequency"]',
		'frequency_selector_type' : 'radio',
		'levels_container' : '.minnpost-membership-member-levels',
		'single_level_container' : '.minnpost-membership-member-level',
		'summary_selector' : '.member-level-brief',
		'amount_selector' : '.amount h5'
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

		init: function(reset, amount) {
			// Place initialization logic here
			// You already have access to the DOM element and
			// the options via the instance, e.g. this.element
			// and this.options
			// you can add more functions like the one below and
			// call them like so: this.yourOtherFunction(this.element, this.options).
		},

	};

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
