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

	function toggleMembershipChangeFields() {
		var $toggle = $('#minnpost_membership_support_post_form_change_for_members');
		var fields = '.minnpost_membership_support_post_form_nochange, .minnpost_membership_support_post_form_change';
		if ($toggle.is(':checked')) {
			$(fields).show();
		} else {
			$(fields).hide();
		}
		$toggle.on('click', function(e) {
			var checkbox = $(this);
			if (checkbox.is(':checked')) {
				$(fields).show();
			} else {
				$(fields).hide();
			}
		});
	}

	$(document).ready(function() {

		// show or hide member level fields
		if ($('.minnpost_membership_use_member_levels').length > 0 ) {
			showMemberLevelFields();
		}

		if ( $('.minnpost_membership_support_post_form_change_for_members').length > 0 ) {
			toggleMembershipChangeFields();
		}

		$('.minnpost-membership-general-settings').minnpostMembership({
			'amount_viewer' : '.amount h5',
			'frequency_selector_in_levels' : 'input[name="minnpost_membership_default_frequency[]"]',
			'frequency_selector_in_levels_type' : 'radio',
			'levels_container' : '.minnpost-membership-member-levels',
			'single_level_container' : '.minnpost-membership-member-level',
			'single_level_summary_selector' : '.member-level-brief',
			'flipped_items' : 'div.amount, div.enter',
			'level_frequency_text_selector' : '.show-frequency',
		});

	});

})(jQuery);
