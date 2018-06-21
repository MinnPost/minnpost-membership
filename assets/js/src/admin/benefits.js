( function( $ ) {

	function clearDateTimeFields() {
		if ( $( '.cmb-type-text-datetime-timestamp' ).length > 0 ) {
			$( '.cmb2-timepicker' ).after( '<button type="button" class="button button-secondary clear-datetime">Clear Date &amp; Time</button>' );
		}

		$( '.clear-datetime' ).click( function() {
			var parent = $( this ).parent();
			$( 'input', parent ).val( '' );
		});
	}

	$( document ).ready( function() {
		clearDateTimeFields();
	});

})(jQuery);
