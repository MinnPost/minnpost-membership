(function($){

	function showMemberLevelFields() {
		var $toggle = $('#minnpost_membership_use_member_levels');
		// Toggle the field type
		$toggle.on('click', function(e) {
			var checkbox = $(this);
			if (checkbox.is(':checked')) {
				$('.minnpost-membership-member-levels').show();
				$('.minnpost-member-field.minnpost_membership_frequency_options, .minnpost-member-field.minnpost_membership_default_frequency').show();
			} else {
				$('.minnpost-membership-member-levels').hide();
				$('.minnpost-member-field.minnpost_membership_frequency_options, .minnpost-member-field.minnpost_membership_default_frequency').hide();
			}
		});
	}

	$(document).ready(function() {

		// show or hide member level fields
		if ($('.minnpost_membership_use_member_levels').length > 0 ) {
			showMemberLevelFields();
		}

		$('.minnpost-membership-general-settings').minnpost_membership({
			'amount_viewer' : '.amount h5',
			'frequency_selector' : 'input[name="minnpost_membership_default_frequency[]"]',
			'frequency_selector_type' : 'radio',
			'levels_container' : '.minnpost-membership-member-levels',
			'single_level_container' : '.minnpost-membership-member-level',
			'single_level_summary_selector' : '.member-level-brief',
			'flipped_items' : 'div.amount, div.enter',
			'level_frequency_text_selector' : '.show-frequency',
		});

	});

})(jQuery);
