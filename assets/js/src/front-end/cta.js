( function( $ ) {
	function mp_membership_analytics_tracking_event( type, category, action, label, value ) {
		if ( typeof ga !== 'undefined' ) {
			if ( typeof value === 'undefined' ) {
				ga( 'send', type, category, action, label );
			} else {
				ga( 'send', type, category, action, label, value );
			}
		} else {
			return;
		}
	}

	$( document ).ready( function() { 
		$( '.m-support-cta-top .a-support-button' ).click( function( event ) {
			var value = '';
			if ( $( 'svg', $( this ) ).length > 0 ) {
				value = $( 'svg', $( this ) ).attr( 'title' ) + ' ';
			}
			value = value + $( this ).text();
			mp_membership_analytics_tracking_event( 'event', 'Support CTA - Header', 'Click: ' + value, location.pathname );
		});
	});

} )( jQuery );
