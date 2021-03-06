// plugin
;(function ( $, window, document ) {
	// Create the defaults once
	var pluginName = 'minnpostTrackSubmit',
	defaults = {
		type: 'event',
		category: 'Support Us',
		action: 'Become A Member',
		label: location.pathname
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
		init: function () {
			var that = this;
			var options = this.options;

			$( this.element ).submit( function( event ) {
				// this tracks an event submission based on the plugin options
				// it also bubbles the event up to submit the form
				that.analyticsEventTrack(
					options.type,
					options.category,
					options.action,
					options.label
				);
				// if this is the main checkout form, send it to the ec plugin as a checkout
				that.analyticsEcommerceTrack( $( that.element ) );
			});
		},

		analyticsEventTrack: function( type, category, action, label, value ) {
			if ( typeof ga === 'undefined' ) {
				return;
			}

			if ( typeof value === 'undefined' ) {
				ga( 'send', type, category, action, label );
				return;
			}

			ga( 'send', type, category, action, label, value );
		}, // end analyticsEventTrack

		analyticsEcommerceTrack: function( element ) {
			if ( typeof ga === 'undefined' ) {
				return;
			}
			ga( 'require', 'ec' );
			if ( element.hasClass( 'm-form-membership-support' ) ) {
				ga( 'ec:setAction', 'checkout', {
					'step': 1,
				});
			}
		}, // end analyticsEcommerceTrack

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
