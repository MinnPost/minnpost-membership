( function( $ ) {

	function benefitForm() {
		$( '.a-benefit-button.a-button-disabled' ).removeAttr( 'disabled' );
		$( '.a-benefit-button' ).click( function( event ) {
			event.preventDefault();
			var $button  = $( this );
			var settings = minnpost_membership_settings;
			// reset the message for current status
			$( '.m-benefit-message' ).removeClass( 'm-benefit-message-visible m-benefit-message-error m-benefit-message-info m-benefit-message-success' );
			if ( $( $button ).hasClass( 'a-button-disabled' ) ) {
				//thisMessage.html( thisMessage.data( 'message-all-claimed' ) );
				//thisMessage.fadeIn( 'slow' );
			} else {
				// set button to processing
				$button.text( 'Processing' ).addClass( 'a-button-disabled' );
				// set ajax data
				var data = {};
				var benefitType = $( 'input[name="benefit-name"]' ).val();
				if ( 'partner-offers' === benefitType ) {
				    data = {
				        'action' : 'benefit_form_submit',
				        'minnpost_membership_benefit_form_nonce' : $button.data( 'benefit-nonce' ),
				        'current_url' : $( 'input[name="current_url"]').val(),
				        'benefit-name': $( 'input[name="benefit-name"]').val(),
				        'instance_id' : $( 'input[name="instance-id-' + $button.val() + '"]' ).val(),
				        'post_id' : $button.val(),
				        'is_ajax' : '1',
				    };
				    $.post( settings.ajaxurl, data, function( response ) {
					    if ( true === response.success ) {
					    	console.log( 'woooo' );
					    	$button.text( 'Claimed' ).removeClass( 'a-button-disabled' ).addClass( 'a-button-claimed' ).prop( 'disabled', true );
					        // remove button and textarea
					        //$button.remove();
					        //$( '.report-a-bug-message' ).remove();

					        // display success message
					        //$( '.report-a-bug-response' ).html( response.data );
					    } else {
					    	$button.removeClass( 'a-button-disabled' );
					    }

					});
			    }
			}
		});
	}

	$( document ).ready( function() {
		if ( 0 < $( '.m-form-membership-benefit' ).length ) {
			benefitForm();
		}
	});

} )( jQuery );
