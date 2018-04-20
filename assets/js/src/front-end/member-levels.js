// plugin
;(function ( $, window, document, undefined ) {

	// Create the defaults once
	var pluginName = 'minnpost_membership',
	defaults = {
		'debug' : false, // this can be set to true on page level options
		'amount_viewer' : '.amount h3',
		'frequency_selector' : '.a-form-item-membership-frequency',
		'frequency_selector_type' : 'select',
		'levels_container' : '.o-membership-member-levels',
		'single_level_container' : '.m-membership-member-level',
		'single_level_summary_selector' : '.m-member-level-brief',
		'flipped_items' : 'div.amount, div.enter',
		'level_frequency_text_selector' : '.show-frequency',
		'choose_amount_selector' : '.amount .a-button-flip',
		'amount_selector' : '.enter input.amount-entry',
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

			this.levelFlipper( this.element, this.options );

		},

		levelFlipper: function( element, options ) {
			var that = this;
			var previous_amount = '';
			var amount = 0;
			var level = '';
			var level_number = 0;
			var frequency_string = '';
			var frequency = '';
			var frequency_name = '';
			if ( typeof minnpost_membership_data !== 'undefined' ) {
				previous_amount = minnpost_membership_data.current_user.previous_amount;
			}
			if ( options.levels_container.length > 0 ) {
				$( options.single_level_summary_selector, element ).each(function() {
					$( options.flipped_items, $(this) ).wrapAll( '<div class="flipper"/>' );
				});
				$( options.frequency_selector, element ).change( function( event ) {
					level_number = $(this).data('member-level-number');
					frequency_string = $(this).val();
					frequency = frequency_string.split(' - ')[1];
					frequency_name = frequency_string.split(' - ')[0];
				    if ( typeof level_number !== 'undefined' ) {
						amount = $( options.amount_selector + '[data-member-level-number="' + level_number + '"]').val();
						$( options.single_level_summary_selector, element).removeClass( 'flipped' );
						$( options.single_level_summary_selector, element).removeClass( 'active' );
						$( event.target ).closest( options.single_level_summary_selector ).addClass( 'flipped' );
						level = that.checkLevel( amount, frequency, frequency_string, previous_amount, element, options );
						that.changeFrequency( frequency_string, level, element, options );

						if ( frequency == 1 ) {
							$( options.amount_selector).val( $( options.amount_viewer, $( options.single_level_container + '-' + level_number ) ).data('default-yearly' ) );
						} else if ( frequency == 12 ) {
							$( options.amount_selector).val( $( options.amount_viewer, $( options.single_level_container + '-' + level_number ) ).data('default-monthly' ) );
						}

					} else if ( options.level_frequency_text_selector.length > 0 ) {
						$(options.level_frequency_text_selector, element).text(frequency_name);
						$( options.single_level_container ).each( function() {
							level_number = $(options.amount_selector, $(this)).data('member-level-number');
							if ( typeof level_number !== 'undefined' ) {
								amount = $( options.amount_selector, $(this) ).val();
								level = that.checkLevel( amount, frequency, frequency_string, previous_amount, element, options );
							}
						});
					}

					that.changeAmountPreview( frequency_string, level, element, options );

				});
			}
			if ( options.choose_amount_selector.length > 0 ) {
				$( options.choose_amount_selector, element ).click( function( event ) {
					level_number = $( options.frequency_selector, element ).data('member-level-number');
					$( options.single_level_summary_selector, element).removeClass( 'flipped' );
					$( options.single_level_summary_selector, element).removeClass( 'active' );
					$( event.target ).closest( options.single_level_summary_selector ).addClass( 'flipped' );
					frequency_string = $(options.frequency_selector, $(this).parent() ).val();
					frequency = frequency_string.split(' - ')[1];
					amount = $( options.amount_selector + '[data-member-level-number="' + level_number + '"]').val();
					level = that.checkLevel( amount, frequency, frequency_string, previous_amount, element, options );
					event.preventDefault();
				});
			}
		}, // end levelFlipper

		checkLevel: function( amount, frequency, type, previous_amount, element, options ) {
		  var thisyear = amount * frequency;
		  var level = '';
		  var level_number = '';

		  if ( typeof previous_amount !== 'undefined' && previous_amount !== '' ) {
		    var prior_year_amount = previous_amount.prior_year_amount;
		    var coming_year_amount = previous_amount.coming_year_amount;
		    var annual_recurring_amount = previous_amount.annual_recurring_amount;

		    // calculate member level formula
		    if ( type === 'one-time' ) {
		      prior_year_amount += thisyear;
		    } else {
		      annual_recurring_amount += thisyear;
		    }

		    thisyear = Math.max( prior_year_amount, coming_year_amount, annual_recurring_amount );
		  }

		  if ( thisyear > 0 && thisyear < 60 ) {
		    level = 'Bronze';
		    level_number = 1;
		  }
		  else if (thisyear > 59 && thisyear < 120) {
		    level = 'Silver';
		    level_number = 2;
		  } else if (thisyear > 119 && thisyear < 240) {
		    level = 'Gold';
		    level_number = 3;
		  } else if (thisyear > 239) {
		    level = 'Platinum';
		    level_number = 4;
		  }
		  //console.log('level is ' + level + ' and amount is ' + thisyear);
		  $('.fast-select .level').text(level);
		  $('.fast-select .show-level').attr('class', 'show-level ' + level_number);

		  if ($('.current-level').length > 0) {
		    //console.dir('compare ' + $('.current-level').text().replace(/(<([^>]+)>)/ig,'') + ' to ' + $('.new-level').text().replace(/(<([^>]+)>)/ig,''));
		    if ( $('.current-level').text().replace(/(<([^>]+)>)/ig,'') != $('.new-level').text().replace(/(<([^>]+)>)/ig,'') ) {
		      $('.show-level .change').show();
		      $('.show-level .nochange').hide();
		    } else {
		      $('.show-level .change').hide();
		      $('.show-level .nochange').show();
		    }
		  }

		  $('h2', options.single_level_summary_selector).each( function() {
		    //console.log('this text is ' + $(this).text() + ' and the level is ' + level);
		    if ( $(this).text() == level ) {
		      $( options.single_level_summary_selector, element).removeClass( 'active' );
		      //var parent = $(this).parent().parent().addClass( 'active' );
		    }
		  } );
		  return level.toLowerCase();

		}, // end checkLevel

		changeFrequency: function( selected, level, element, options ) {
			$( options.single_level_summary_selector ).each( function() {
				var range          = $( options.amount_viewer, $(this) ).text();
				var month_value    = $( options.amount_viewer, $(this) ).data('month');
			    var year_value     = $( options.amount_viewer, $(this) ).data('year');
			    var once_value     = $( options.amount_viewer, $(this) ).data('one-time');
			    var frequency_name = selected.split(' - ')[0];
			    var frequency      = parseInt( selected.split(' - ')[1] );

			    $( options.frequency_selector ).val( selected );
    			$( options.frequency_selector ).prop( 'selected', selected );

				if ( frequency_name == 'per month' ) {
					range = month_value;
					$( options.amount_viewer, $(this) ).removeClass( 'smaller' );
				} else if ( frequency_name == 'per year' ) {
					range = year_value;
					$( options.amount_viewer, $(this) ).addClass( 'smaller' );
				} else if (frequency_name == 'one-time' ) {
					range = once_value;
					$( options.amount_viewer, $(this) ).addClass('smaller' );
				}

				$( options.amount_viewer, $(this) ).text( range );
    			$( options.frequency_selector, $(this) ).data( 'frequency', frequency );

			} );
		}, // end changeFrequency

		changeAmountPreview: function( selected, level, element, options ) {
			$( options.single_level_summary_selector ).each( function() {
				var range          = $( options.amount_viewer, $(this) ).text();
				var month_value    = $( options.amount_viewer, $(this) ).data('month');
			    var year_value     = $( options.amount_viewer, $(this) ).data('year');
			    var once_value     = $( options.amount_viewer, $(this) ).data('one-time');
			    var frequency_name = selected.split(' - ')[0];

				if ( frequency_name == 'per month' ) {
					range = month_value;
					$( options.amount_viewer, $(this) ).removeClass( 'smaller' );
				} else if ( frequency_name == 'per year' ) {
					range = year_value;
					$( options.amount_viewer, $(this) ).addClass( 'smaller' );
				} else if (frequency_name == 'one-time' ) {
					range = once_value;
					$( options.amount_viewer, $(this) ).addClass('smaller' );
				}

				$( options.amount_viewer, $(this) ).text( range );

			} );
		}, // end changeAmountPreview

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
