// plugin
;(function ( $, window, document, undefined ) {

	// Create the defaults once
	var pluginName = 'minnpostMembership',
	defaults = {
		'debug' : false, // this can be set to true on page level options
		'amount_selector_standalone' : '#amount-item #amount',
		'frequency_selector_standalone' : '.m-membership-fast-select input[type="radio"]',
		'level_viewer_container' : '.a-show-level',
		'level_name' : '.a-level',
		'user_current_level' : '.a-current-level',
		'user_new_level' : '.a-new-level',
		'amount_viewer' : '.amount h3',
		'frequency_selector_in_levels' : '.a-form-item-membership-frequency',
		'frequency_selector_in_levels_type' : 'select',
		'levels_container' : '.o-membership-member-levels',
		'single_level_container' : '.m-membership-member-level',
		'single_level_summary_selector' : '.m-member-level-brief',
		'flipped_items' : 'div.amount, div.enter',
		'level_frequency_text_selector' : '.show-frequency',
		'choose_amount_selector_in_levels' : '.amount .a-button-flip',
		'amount_selector_in_levels' : '.enter input.amount-entry',
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
			this.catchHashLinks( this.element, this.options);
			this.levelFlipper( this.element, this.options );
			this.startLevelClick( this.element, this.options );
			this.submitForm( this.element, this.options );
		},

		analyticsEventTrack: function( type, category, action, label, value ) {
			if ( typeof ga !== 'undefined' ) {
				if ( typeof value === 'undefined' ) {
					ga( 'send', type, category, action, label );
				} else {
					ga( 'send', type, category, action, label, value );
				}
			} else {
				return;
			}
		}, // end analyticsEventTrack

		catchHashLinks: function( element, options ) {
			$('a[href*="#"]:not([href="#"])', element).click(function(e) {
			    var target = $(e.target);
			    if (target.parent('.comment-title').length == 0 && location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') && location.hostname == this.hostname) {
				    var target = $(this.hash);
				    target = target.length ? target : $('[name=' + this.hash.slice(1) +']');
					if (target.length) {
						$('html,body').animate({
							scrollTop: target.offset().top
						}, 1000);
						return false;
					}
				}
			});
		}, // end catchLinks

		levelFlipper: function( element, options ) {
			var that = this;
			var previous_amount = '';
			var amount = 0;
			var level = '';
			var level_number = 0;
			var frequency_string = '';
			var frequency = '';
			var frequency_name = '';
			if ( typeof minnpost_membership_data !== 'undefined' && $( options.user_current_level ).length > 0 ) {
				previous_amount = minnpost_membership_data.current_user.previous_amount;
			}
			if ( $( options.amount_selector_standalone ).length > 0 ) {
				amount = $( options.amount_selector_standalone ).val();
				frequency_string = $(options.frequency_selector_standalone + ':checked').val();
				frequency = frequency_string.split(' - ')[1];
				frequency_name = frequency_string.split(' - ')[0];

			    level = that.checkLevel( amount, frequency, frequency_name, previous_amount, element, options );
			    that.showNewLevel( element, options, level );

			    $(options.frequency_selector_standalone).change( function() {

			    	frequency_string = $( options.frequency_selector_standalone + ':checked').val()
					frequency = frequency_string.split(' - ')[1];
					frequency_name = frequency_string.split(' - ')[0];

			      level = that.checkLevel( $( options.amount_selector_standalone ).val(), $( options.frequency_selector_standalone + ':checked' ).attr( 'data-year-frequency' ), frequency_name, previous_amount, element, options );
			      that.showNewLevel( element, options, level );
			    });

			    $(options.amount_selector_standalone).bind('keyup mouseup', function() {
			    	frequency_string = $( options.frequency_selector_standalone + ':checked').val()
					frequency = frequency_string.split(' - ')[1];
					frequency_name = frequency_string.split(' - ')[0];
			      if($(this).data('last-value') != $(this).val()) {
			        $(this).data('last-value', $(this).val());
			        level = that.checkLevel( $( options.amount_selector_standalone ).val(), $( options.frequency_selector_standalone + ':checked' ).attr( 'data-year-frequency' ), frequency_name, previous_amount, element, options );
			        that.showNewLevel( element, options, level );
			      };
			    });

			}
			if ( $( options.levels_container ).length > 0 ) {
				$( options.single_level_summary_selector, element ).each(function() {
					$( options.flipped_items, $(this) ).wrapAll( '<div class="flipper"/>' );
				});
				$( options.frequency_selector_in_levels, element ).on('change', function (event) {
					level_number = $(this).data('member-level-number');
					frequency_string = $(this).val();
					frequency = frequency_string.split(' - ')[1];
					frequency_name = frequency_string.split(' - ')[0];
				    if ( typeof level_number !== 'undefined' ) {

						$( options.single_level_summary_selector, element).removeClass( 'flipped' );
						$( options.single_level_container, element).removeClass( 'active' );
						$( event.target ).closest( options.single_level_summary_selector ).addClass( 'flipped' );

						if ( frequency == 1 ) {
							$( options.amount_selector_in_levels, $( options.single_level_container + '-' + level_number ) ).val( $( options.amount_viewer, $( options.single_level_container + '-' + level_number ) ).data('default-yearly' ) );
						} else if ( frequency == 12 ) {
							$( options.amount_selector_in_levels, $( options.single_level_container + '-' + level_number ) ).val( $( options.amount_viewer, $( options.single_level_container + '-' + level_number ) ).data('default-monthly' ) );
						}

						amount = $( options.amount_selector_in_levels + '[data-member-level-number="' + level_number + '"]').val();

						level = that.checkLevel( amount, frequency, frequency_name, previous_amount, element, options );
						that.changeFrequency( frequency_string, level['name'], element, options );

					} else if ( $( options.level_frequency_text_selector ).length > 0 ) {
						$(options.level_frequency_text_selector, element).text(frequency_name);
						$( options.single_level_container ).each( function() {
							level_number = $(options.amount_selector_in_levels, $(this)).data('member-level-number');
							if ( typeof level_number !== 'undefined' ) {
								amount = $( options.amount_selector_in_levels, $(this) ).val();
								level = that.checkLevel( amount, frequency, frequency_name, previous_amount, element, options );
							}
						});
					}

					that.changeAmountPreview( frequency_string, level['name'], element, options );

				});
			}
			if ( $( options.choose_amount_selector_in_levels ).length > 0 ) {
				$( options.choose_amount_selector_in_levels, element ).click( function( event ) {
					level_number = $( options.frequency_selector_in_levels, element ).data('member-level-number');
					$( options.single_level_summary_selector, element).removeClass( 'flipped' );
					$( options.single_level_container, element).removeClass( 'active' );
					$( event.target ).closest( options.single_level_summary_selector ).addClass( 'flipped' );
					frequency_string = $(options.frequency_selector_in_levels, $(this).parent() ).val();
					frequency = frequency_string.split(' - ')[1];
					amount = $( options.amount_selector_in_levels + '[data-member-level-number="' + level_number + '"]').val();
					level = that.checkLevel( amount, frequency, frequency_name, previous_amount, element, options );
					event.preventDefault();
				});
			}
		}, // end levelFlipper

		checkLevel: function( amount, frequency, type, previous_amount, element, options ) {
		  var thisyear = parseInt( amount ) * parseInt( frequency );
		  var level = '';
		  if ( typeof previous_amount !== 'undefined' && previous_amount !== '' ) {
		    var prior_year_amount = parseInt( previous_amount.prior_year_contributions );
		    var coming_year_amount = parseInt( previous_amount.coming_year_contributions );
		    var annual_recurring_amount = parseInt( previous_amount.annual_recurring_amount );
		    // calculate member level formula
		    if ( type === 'one-time' ) {
		      prior_year_amount += thisyear;
		    } else {
		      annual_recurring_amount += thisyear;
		    }

		    thisyear = Math.max( prior_year_amount, coming_year_amount, annual_recurring_amount );
		  }

		  level = this.getLevel( thisyear );

		  $('h2', options.single_level_summary_selector).each( function() {
		    if ( $(this).text() == level['name'] ) {
		      $( options.single_level_container, element).removeClass( 'active' );
		      $(this).parent().parent().addClass( 'active' );
		    }
		  } );
		  return level;

		}, // end checkLevel

		getLevel: function( thisyear ) {
			var level = [];
			if ( thisyear > 0 && thisyear < 60 ) {
				level['name'] = 'Bronze';
				level['number'] = 1;
			}
			else if (thisyear > 59 && thisyear < 120) {
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

		showNewLevel: function( element, options, level ) {
			var member_level_prefix = '';
			var old_level = '';
			var level_viewer_container_selector = options.level_viewer_container; // this should change when we replace the text, if there is a link inside it
			var decodeHtmlEntity = function( str ) {
				return str.replace( /&#(\d+);/g, function( match, dec ) {
					return String.fromCharCode( dec );
				});
			};
			if ( typeof minnpost_membership_data !== 'undefined' ) {
				member_level_prefix = minnpost_membership_data.member_level_prefix;
			}

			if ( $( options.level_viewer_container ).length > 0 ) {

				$(options.level_viewer_container).prop( 'class', 'a-show-level a-show-level-' + level['name'].toLowerCase() );

				if ( $( options.user_current_level ).length > 0 && minnpost_membership_data.current_user.member_level.length > 0 ) {

					if ( 'a', $( options.level_viewer_container ).length > 0 ) {
						level_viewer_container_selector = options.level_viewer_container + ' a';
					}

					old_level = minnpost_membership_data.current_user.member_level.replace( member_level_prefix, '' );

					if ( old_level !== level['name'].toLowerCase() ) {
						$( level_viewer_container_selector ).html( decodeHtmlEntity( $( options.level_viewer_container ).data( 'changed' ) ) );
					} else {
						$( level_viewer_container_selector ).html( decodeHtmlEntity( $( options.level_viewer_container ).data( 'not-changed' ) ) );
					}
				}

				$(options.level_name, options.level_viewer_container).text( level['name'] );
			}

		}, // end showNewLevel

		changeFrequency: function( selected, level, element, options ) {
			$( options.single_level_summary_selector ).each( function() {
				var range          = $( options.amount_viewer, $(this) ).text();
				var month_value    = $( options.amount_viewer, $(this) ).data('month');
			    var year_value     = $( options.amount_viewer, $(this) ).data('year');
			    var once_value     = $( options.amount_viewer, $(this) ).data('one-time');
			    var frequency_name = selected.split(' - ')[0];
			    var frequency      = parseInt( selected.split(' - ')[1] );

			    $( options.frequency_selector_in_levels ).val( selected );
    			$( options.frequency_selector_in_levels ).prop( 'selected', selected );

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
    			$( options.frequency_selector_in_levels, $(this) ).data( 'frequency', frequency );

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

		startLevelClick: function( element, options ) {
			$('.start-level').click(function() {
				var level_class = $( this ).prop( 'class' );
				var level_number = level_class[level_class.length -1];
			    $( options.single_level_summary_selector, element).removeClass( 'flipped' );
				$( options.single_level_container, element).removeClass( 'active' );
			    $( options.single_level_container + '-' + level_number, element ).addClass( 'active' );
			    $( options.single_level_container + '-' + level_number + ' ' + options.single_level_summary_selector ).addClass( 'flipped' );
			  });
		}, // end startLevelClick

		submitForm: function( element, options ) {
			var that = this;
			$( element ).submit( function( event ) {
				that.analyticsEventTrack( 'event', 'Support Us', 'Become A Member', location.pathname );
			});
		}, // end submitForm

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
