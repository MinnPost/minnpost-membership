( function( $ ) {

	function checkZipCountry(city_field, state_field, zip_field, country_field) {

		var country = country_field.val();
		if (country == '') {
			country = 'US';
			country_field.val(country);
		}
		var zip = zip_field.val();

		if (zip !== '') {

			var location = {
				zip_code: zip,
				country: country
			}

			jQuery.ajax({
		        type: 'GET',
		        url: user_account_management_rest.site_url + user_account_management_rest.rest_namespace + '/check-zip',
		        data: location,
		        dataType: 'json',
		        success: function(response) {
		        	if (response.status === 'success') {
						var location = '';
						location += response.city;
						$(city_field).val(response.city);
						if (response.city !== response.state) {
							location += ', ' + response.state;
							$(state_field).val(response.state);
						}
						if (country !== 'US') {
							location += ', ' + country;
						}
						$('.location small').text(location);
					} else {
						$('.location small').text('');
					}
		        }
		    });
		}
	}

	function benefitButton() {
		$( '.a-benefit-button.a-button-disabled' ).removeAttr( 'disabled' );
		$( '.a-benefit-button' ).click( function( event ) {
			//$( '.m-benefit-message' ).hide();
			$( '.m-benefit-message' ).removeClass()
			var thisMessage = $( this ).parent().find( '.m-benefit-message' );
			if ( $( this ).hasClass( 'a-button-disabled' ) ) {
				//thisMessage.html( thisMessage.data( 'message-all-claimed' ) );
				//thisMessage.fadeIn( 'slow' );
				event.preventDefault(); // this should go on enabled buttons too, but for now just here
			}
		});
	}

	$( document ).ready( function() {
		if ( 0 < $( '.a-benefit-button' ).length ) {
			benefitButton();
		}
	});

} )( jQuery );
